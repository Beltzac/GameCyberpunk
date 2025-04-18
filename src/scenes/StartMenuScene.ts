// src/scenes/StartMenuScene.ts
import * as THREE from 'three';
import { Scene } from '../core/Scene';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneManager } from '../core/SceneManager';
import { GameEngine } from '../core/GameEngine';

export class StartMenuScene extends Scene {
    private assetLoader: AssetLoader;
    private sceneManager: SceneManager;
    private backgroundSprite: THREE.Sprite | null = null;
    private startButton: THREE.Sprite | null = null;
    private buttonScale = 1;
    private pulseDirection = 1;
    private buttonNormalTexture: THREE.Texture | null = null;
    private buttonHoverTexture: THREE.Texture | null = null;

    // Particles properties
    private sparks: THREE.Points[] = [];
    private sparkGeometries: THREE.BufferGeometry[] = [];
    private sparkMaterials: THREE.PointsMaterial[] = []; // Initialize in init after generating textures
    private sparkVelocities: Float32Array | null = null;
    private sparkTypes: Float32Array | null = null; // Keep if needed for type-specific logic later
    private performanceData: { [key: string]: number } = {};

    constructor(gameEngine: GameEngine, assetLoader: AssetLoader, sceneManager: SceneManager) {
        super(gameEngine);
        this.assetLoader = assetLoader;
        this.sceneManager = sceneManager;
        console.log("StartMenuScene created");
    }

    async init(): Promise<void> {
        try {
            console.log("StartMenuScene initializing...");

            // Create simple background
            const backgroundTexture = await this.assetLoader.loadTexture('assets/start_menu/background.png');

            // Create text texture
            const canvas = document.createElement('canvas');
            canvas.width = 1024;
            canvas.height = 256;
            const context = canvas.getContext('2d');
            if (context) {
                // Load font
                const fontFace = new (window as any).FontFace('Thata-Regular', 'url(assets/fonts/Thata-Regular-2024-08-15.ttf)');
                await (document as any).fonts.add(fontFace);
                await fontFace.load();

                context.fillStyle = '#ffcc00';
                context.font = '200px Thata-Regular';
                context.textAlign = 'center';
                context.textBaseline = 'middle';

                // Rotate canvas 5 degrees before drawing text
                context.translate(canvas.width / 2, canvas.height / 2);
                context.rotate(-10 * Math.PI / 180);
                context.fillText('AION', -70, -50);
                context.fillText('♦☻♥', 70, 50);
                context.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

                const texture = new THREE.Texture(canvas);
                texture.needsUpdate = true;

                const material = new THREE.SpriteMaterial({
                    map: texture,
                    transparent: true
                });
                const sprite = new THREE.Sprite(material);
                sprite.scale.set(10 * 3, 2.5 * 3, 1);
                sprite.position.set(0, 0, 0.1);
                sprite.rotation.z = 20 * (Math.PI / 180); // Rotate 5 degrees
                this.threeScene.add(sprite);
            }

            // Load button textures
            this.buttonNormalTexture = await this.assetLoader.loadTexture('assets/start_menu/button_normal.png');
            this.buttonHoverTexture = await this.assetLoader.loadTexture('assets/start_menu/button_hover.png');

            // Generate particle textures
            const sparkTexture = this.createSparkTexture();
            const heartTexture = this.createHeartTexture();
            const starTexture = this.createStarTexture();

            // Initialize particle materials with generated textures
            this.sparkMaterials = [
                new THREE.PointsMaterial({ // Gold sparks
                    map: sparkTexture,
                    size: 20.0, // Increased size
                    sizeAttenuation: true,
                    transparent: true,
                    opacity: 0.9,
                    depthTest: false,
                    blending: THREE.AdditiveBlending,
                    color: 0xffdd88 // Tint the texture slightly gold
                }),
                new THREE.PointsMaterial({ // Red hearts
                    map: heartTexture,
                    size: 20.0, // Increased size
                    sizeAttenuation: true,
                    transparent: true,
                    opacity: 0.95,
                    depthTest: false,
                    blending: THREE.AdditiveBlending,
                    color: 0xff88aa // Tint the texture slightly red
                }),
                new THREE.PointsMaterial({ // Blue stars
                    map: starTexture,
                    size: 20.0, // Increased size
                    sizeAttenuation: true,
                    transparent: true,
                    opacity: 0.9,
                    depthTest: false,
                    blending: THREE.AdditiveBlending,
                    color: 0x88aaff // Tint the texture slightly blue
                })
            ];
            console.log("Particle materials initialized with generated textures.");


            // Create background sprite using base class method
            this.backgroundSprite = this.createBackground(backgroundTexture);

            // Create start button with proper aspect ratio
            const buttonMaterial = new THREE.SpriteMaterial({
                map: this.buttonNormalTexture,
                transparent: true
            });
            this.startButton = new THREE.Sprite(buttonMaterial);

            // Set scale based on texture dimensions (default to 1:1 if textures not loaded)
            let aspect = 1;
            if (this.buttonNormalTexture?.image) {
                aspect = this.buttonNormalTexture.image.width / this.buttonNormalTexture.image.height;
            }
            const baseWidth = 4; // Larger base width
            this.startButton.scale.set(baseWidth, baseWidth / aspect, 1);

            this.startButton.position.set(0, 0, 0.2);
            this.startButton.name = "StartButton";
            this.startButton.userData.isButton = true;
            this.threeScene.add(this.startButton);

            // Setup spark particles
            this.setupSparks(); // Ensure materials are ready before setup
            console.log("StartMenuScene initialized.");
        } catch (error) {
            console.error("Failed to initialize StartMenuScene:", error);
            throw error;
        }
    }

    private setupSparks(): void {
        // Initialize particles for each material type
        for (let i = 0; i < this.sparkMaterials.length; i++) {
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(100 * 3); // 100 particles per type
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const points = new THREE.Points(geometry, this.sparkMaterials[i]);
            points.visible = false;
            this.threeScene.add(points);

            this.sparks.push(points);
            this.sparkGeometries.push(geometry);
        }
    }

    private createSparkBurst(origin: THREE.Vector3): void {
        if (this.sparks.length === 0) return;

        const particlesPerType = 200; // 200 particles per type (600 total)
        this.sparkVelocities = new Float32Array(particlesPerType * this.sparks.length * 3);

        // Create particles for each type
        for (let typeIdx = 0; typeIdx < this.sparks.length; typeIdx++) {
            const positions = new Float32Array(particlesPerType * 3);
            const geometry = this.sparkGeometries[typeIdx];

            for (let i = 0; i < particlesPerType; i++) {
                const particleIdx = typeIdx * particlesPerType + i;

                positions[i * 3] = origin.x;
                positions[i * 3 + 1] = origin.y;
                positions[i * 3 + 2] = origin.z - 0.1; // Behind button

                // Random outward velocity
                const angle = Math.random() * Math.PI * 2;
                const speed = 0.1 + Math.random() * 0.4;
                this.sparkVelocities[particleIdx * 3] = Math.cos(angle) * speed;
                this.sparkVelocities[particleIdx * 3 + 1] = Math.sin(angle) * speed;
                this.sparkVelocities[particleIdx * 3 + 2] = (Math.random() - 0.5) * 0.1;
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            this.sparks[typeIdx].visible = true;
        }
    }

    async onEnter(): Promise<void> {
        // No special setup needed
    }

    async onExit(): Promise<void> {
        // No cleanup needed
    }

    update(deltaTime: number): void {
        this.performanceData = {}; // Clear previous frame's data

        // Update particles
        const particleUpdateTime = performance.now();
        if (this.sparkVelocities && this.sparks.length > 0) {
            const particlesPerType = 200;

            for (let typeIdx = 0; typeIdx < this.sparks.length; typeIdx++) {
                const geometry = this.sparkGeometries[typeIdx];
                const positions = geometry.attributes.position.array as Float32Array;

                for (let i = 0; i < particlesPerType; i++) {
                    const particleIdx = typeIdx * particlesPerType + i;

                    // Update position
                    positions[i * 3] += this.sparkVelocities[particleIdx * 3];
                    positions[i * 3 + 1] += this.sparkVelocities[particleIdx * 3 + 1];
                    positions[i * 3 + 2] += this.sparkVelocities[particleIdx * 3 + 2];

                    // Apply physics based on particle type
                    switch (typeIdx) {
                        case 0: // Gold sparks
                            this.sparkVelocities[particleIdx * 3] *= 0.95;
                            this.sparkVelocities[particleIdx * 3 + 1] *= 0.95;
                            this.sparkVelocities[particleIdx * 3 + 2] *= 0.95;
                            break;
                        case 1: // Hearts - slower fade
                            this.sparkVelocities[particleIdx * 3] *= 0.97;
                            this.sparkVelocities[particleIdx * 3 + 1] *= 0.97;
                            this.sparkVelocities[particleIdx * 3 + 2] *= 0.97;
                            break;
                        case 2: // Stars - faster movement
                            this.sparkVelocities[particleIdx * 3] *= 0.92;
                            this.sparkVelocities[particleIdx * 3 + 1] *= 0.92;
                            this.sparkVelocities[particleIdx * 3 + 2] *= 0.92;
                            break;
                    }
                }

                geometry.attributes.position.needsUpdate = true;
            }
        }
        this.performanceData['Particle Update'] = performance.now() - particleUpdateTime;
    }

    render(renderer: THREE.WebGLRenderer): void {
        // No custom rendering needed
    }

    public async handleClick(intersects: THREE.Intersection[]): Promise<void> {
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;

            // Check if start button was clicked
            if (clickedObject.userData.isButton) {
                // Change button texture to show pressed state
                if (this.startButton) {
                    const material = this.startButton.material as THREE.SpriteMaterial;
                    material.map = this.buttonHoverTexture;
                    material.needsUpdate = true;
                }

                // Create spark burst effect
                if (this.startButton) {
                    this.createSparkBurst(this.startButton.position);
                }

                // Transition to scene 1 with fade effect after short delay
                if (this.sceneManager) {
                    await this.sceneManager.changeScene('cena1_trabalho', 'fade', 1000);
                }
            }
        }
    }

    public handleMouseMove(intersects: THREE.Intersection[]): void {
        if (this.startButton) {
            const material = this.startButton.material as THREE.SpriteMaterial;
            const isHovering = intersects.some(i => i.object === this.startButton);

            // Update texture immediately on hover state change
            if (isHovering && material.map !== this.buttonHoverTexture) {
                material.map = this.buttonHoverTexture;
                material.needsUpdate = true;
            } else if (!isHovering && material.map !== this.buttonNormalTexture) {
                material.map = this.buttonNormalTexture;
                material.needsUpdate = true;
            }
        }
    }

    // --- Particle Texture Generation ---

    private createSparkTexture(): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        const size = 64; // Texture size
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Could not get 2D context for spark texture");


        // Simple radial gradient for a spark/glow
        const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.4, 'rgba(255, 220, 150, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 180, 0, 0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    private createHeartTexture(): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Could not get 2D context for heart texture");

        const x = size / 2;
        const y = size / 2.5; // Adjust position slightly
        const width = size * 0.4;
        const height = size * 0.4;

        context.fillStyle = 'white'; // Draw in white, tint with material color
        context.beginPath();
        context.moveTo(x, y + height / 4);
        context.bezierCurveTo(x, y, x - width / 2, y, x - width / 2, y + height / 2);
        context.bezierCurveTo(x - width / 2, y + height, x, y + height * 1.2, x, y + height * 1.2); // Bottom point sharper
        context.bezierCurveTo(x, y + height * 1.2, x + width / 2, y + height, x + width / 2, y + height / 2);
        context.bezierCurveTo(x + width / 2, y, x, y, x, y + height / 4);
        context.closePath();
        context.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    private createStarTexture(points = 5, outerRadiusFactor = 0.5, innerRadiusFactor = 0.2): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Could not get 2D context for star texture");

        const centerX = size / 2;
        const centerY = size / 2;
        const outerRadius = size * outerRadiusFactor;
        const innerRadius = size * innerRadiusFactor;

        context.fillStyle = 'white'; // Draw in white, tint with material color
        context.beginPath();
        context.moveTo(centerX, centerY - outerRadius); // Start at top point

        for (let i = 0; i < points; i++) {
            const outerAngle = Math.PI / points * (2 * i) - Math.PI / 2;
            const innerAngle = outerAngle + Math.PI / points;

            // Outer point
            context.lineTo(
                centerX + Math.cos(outerAngle) * outerRadius,
                centerY + Math.sin(outerAngle) * outerRadius
            );
            // Inner point
            context.lineTo(
                centerX + Math.cos(innerAngle) * innerRadius,
                centerY + Math.sin(innerAngle) * innerRadius
            );
        }

        context.closePath();
        context.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    getPerformanceData(): { [key: string]: number } {
        return this.performanceData;
    }
} // End of StartMenuScene class