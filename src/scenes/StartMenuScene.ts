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
    private sparks: THREE.Points | null = null;
    private sparkGeometry = new THREE.BufferGeometry();
    private sparkMaterials = [
        new THREE.PointsMaterial({ // Gold sparks
            color: 0xffaa00,
            size: 0.8,
            transparent: true,
            opacity: 0.8,
            depthTest: false,
            blending: THREE.AdditiveBlending
        }),
        new THREE.PointsMaterial({ // Red hearts
            color: 0xff3366,
            size: 1.0,
            transparent: true,
            opacity: 0.9,
            depthTest: false,
            blending: THREE.AdditiveBlending
        }),
        new THREE.PointsMaterial({ // Blue stars
            color: 0x3399ff,
            size: 0.9,
            transparent: true,
            opacity: 0.85,
            depthTest: false,
            blending: THREE.AdditiveBlending
        })
    ];
    private sparkVelocities: Float32Array | null = null;
    private sparkTypes: Float32Array | null = null;

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

            // Load button textures
            this.buttonNormalTexture = await this.assetLoader.loadTexture('assets/start_menu/button_normal.png');
            this.buttonHoverTexture = await this.assetLoader.loadTexture('assets/start_menu/button_hover.png');

            // Create background sprite (full screen, non-interactive)
            const backgroundMaterial = new THREE.SpriteMaterial({ map: backgroundTexture });
            this.backgroundSprite = new THREE.Sprite(backgroundMaterial);
            const camera = this.gameEngine.camera;
            const scaleX = (camera.right - camera.left);
            const scaleY = (camera.top - camera.bottom);
            this.backgroundSprite.scale.set(scaleX, scaleY, 1);
            this.backgroundSprite.userData.isBackground = true;
            this.threeScene.add(this.backgroundSprite);

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
            this.setupSparks();

            console.log("StartMenuScene initialized.");
        } catch (error) {
            console.error("Failed to initialize StartMenuScene:", error);
            throw error;
        }
    }

    private setupSparks(): void {
        // Initialize empty particles
        const positions = new Float32Array(100 * 3); // 100 particles
        const types = new Float32Array(100);
        this.sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.sparkGeometry.setAttribute('type', new THREE.BufferAttribute(types, 1));

        // Create points with custom material handling
        this.sparks = new THREE.Points(this.sparkGeometry, this.sparkMaterials[0]);
        this.sparks.visible = false;
        this.threeScene.add(this.sparks);
    }

    private createSparkBurst(origin: THREE.Vector3): void {
        if (!this.sparks) return;

        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        this.sparkVelocities = new Float32Array(particleCount * 3);
        this.sparkTypes = new Float32Array(particleCount);

        // Create particles exploding outward from origin
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = origin.x;
            positions[i * 3 + 1] = origin.y;
            positions[i * 3 + 2] = origin.z - 0.1; // Behind button

            // Random outward velocity with more spread for larger particles
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.1 + Math.random() * 0.3; // Faster speed for bigger particles
            this.sparkVelocities[i * 3] = Math.cos(angle) * speed;
            this.sparkVelocities[i * 3 + 1] = Math.sin(angle) * speed;
            this.sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

            // Random particle type (0-2)
            this.sparkTypes[i] = Math.floor(Math.random() * 3);
        }

        this.sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.sparkGeometry.setAttribute('type', new THREE.BufferAttribute(this.sparkTypes, 1));
        this.sparks.visible = true;
    }

    async onEnter(): Promise<void> {
        // No special setup needed
    }

    async onExit(): Promise<void> {
        // No cleanup needed
    }

    update(deltaTime: number): void {
        // Update particles
        if (this.sparks && this.sparkVelocities && this.sparkTypes) {
            const positions = this.sparkGeometry.attributes.position.array as Float32Array;
            const types = this.sparkGeometry.attributes.type.array as Float32Array;

            for (let i = 0; i < positions.length / 3; i++) {
                const typeIdx = Math.floor(types[i]);
                if (typeIdx >= 0 && typeIdx < this.sparkMaterials.length) {
                    // Update position
                    positions[i * 3] += this.sparkVelocities[i * 3];
                    positions[i * 3 + 1] += this.sparkVelocities[i * 3 + 1];
                    positions[i * 3 + 2] += this.sparkVelocities[i * 3 + 2];

                    // Apply different physics based on particle type
                    switch (typeIdx) {
                        case 0: // Gold sparks
                            this.sparkVelocities[i * 3] *= 0.95;
                            this.sparkVelocities[i * 3 + 1] *= 0.95;
                            this.sparkVelocities[i * 3 + 2] *= 0.95;
                            break;
                        case 1: // Hearts - slower fade
                            this.sparkVelocities[i * 3] *= 0.97;
                            this.sparkVelocities[i * 3 + 1] *= 0.97;
                            this.sparkVelocities[i * 3 + 2] *= 0.97;
                            break;
                        case 2: // Stars - faster movement
                            this.sparkVelocities[i * 3] *= 0.92;
                            this.sparkVelocities[i * 3 + 1] *= 0.92;
                            this.sparkVelocities[i * 3 + 2] *= 0.92;
                            break;
                    }
                }
            }

            this.sparkGeometry.attributes.position.needsUpdate = true;
            this.sparkGeometry.attributes.type.needsUpdate = true;
        }
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
                setTimeout(async () => {
                    if (this.sceneManager) {
                        await this.sceneManager.changeScene('cena1_trabalho', 'fade');
                    }
                }, 1000);
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
}