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

    // Spark particles properties
    private sparks: THREE.Points | null = null;
    private sparkGeometry = new THREE.BufferGeometry();
    private sparkMaterial = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.1,
        transparent: true,
        opacity: 0.8,
        depthTest: false,
        blending: THREE.AdditiveBlending
    });
    private sparkVelocities: Float32Array | null = null;

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

            this.startButton.position.set(0, 0, 0.1);
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
        // Initialize empty spark particles
        const positions = new Float32Array(100 * 3); // 100 particles
        this.sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.sparks = new THREE.Points(this.sparkGeometry, this.sparkMaterial);
        this.sparks.visible = false;
        this.threeScene.add(this.sparks);
    }

    private createSparkBurst(origin: THREE.Vector3): void {
        if (!this.sparks) return;

        const particleCount = 100;
        const positions = new Float32Array(particleCount * 3);
        this.sparkVelocities = new Float32Array(particleCount * 3);

        // Create particles exploding outward from origin
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = origin.x;
            positions[i * 3 + 1] = origin.y;
            positions[i * 3 + 2] = origin.z + 0.1;

            // Random outward velocity
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.05 + Math.random() * 0.1;
            this.sparkVelocities[i * 3] = Math.cos(angle) * speed;
            this.sparkVelocities[i * 3 + 1] = Math.sin(angle) * speed;
            this.sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
        }

        this.sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.sparks.visible = true;
    }

    async onEnter(): Promise<void> {
        // No special setup needed
    }

    async onExit(): Promise<void> {
        // No cleanup needed
    }

    update(deltaTime: number): void {
        // Pulsing animation (maintain aspect ratio)
        if (this.startButton) {
            this.buttonScale += this.pulseDirection * deltaTime * 0.2;
            if (this.buttonScale > 1.1 || this.buttonScale < 0.9) {
                this.pulseDirection *= -1;
            }
            let aspect = 1;
            if (this.buttonNormalTexture?.image) {
                aspect = this.buttonNormalTexture.image.width / this.buttonNormalTexture.image.height;
            }
            const baseWidth = 4; // Match creation scale
            this.startButton.scale.set(
                baseWidth * this.buttonScale,
                (baseWidth / aspect) * this.buttonScale,
                1
            );
        }

        // Update spark particles
        if (this.sparks && this.sparkVelocities) {
            const positions = this.sparkGeometry.attributes.position.array as Float32Array;

            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += this.sparkVelocities[i];
                positions[i + 1] += this.sparkVelocities[i + 1];
                positions[i + 2] += this.sparkVelocities[i + 2];

                // Fade out particles
                this.sparkVelocities[i] *= 0.95;
                this.sparkVelocities[i + 1] *= 0.95;
                this.sparkVelocities[i + 2] *= 0.95;
            }

            this.sparkGeometry.attributes.position.needsUpdate = true;
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