// src/scenes/Cena2RuaScene.ts
import * as THREE from 'three';
import { Scene } from '../core/Scene';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneManager } from '../core/SceneManager';

export class Cena2RuaScene extends Scene {
    private assetLoader: AssetLoader;
    private sceneManager: SceneManager;

    private backgroundSprite: THREE.Sprite | null = null;
    private handSprite: THREE.Sprite | null = null;
    private handTexture: THREE.Texture | null = null;
    private thoughtButtonTextures: THREE.Texture[] = [];
    private thoughtButtons: THREE.Sprite[] = [];
    private rainParticles: THREE.Points | null = null;
    private rainGeometry = new THREE.BufferGeometry();
    private rainMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });
    private timeAccumulator = 0;
    private buttonOffsets: number[] = [0, 0, 0];

    constructor(assetLoader: AssetLoader, sceneManager: SceneManager) {
        super();
        this.assetLoader = assetLoader;
        this.sceneManager = sceneManager;
        console.log("Cena2RuaScene created");
    }

    async init(): Promise<void> {
        console.log("Cena2RuaScene initializing...");

        try {
            // Load all required assets
            const backgroundTexture = await this.assetLoader.loadTexture('assets/cena_2_rua/background.png');
           this.handTexture = await this.assetLoader.loadTexture('assets/cena_2_rua/mao.png');

           // Load thought button textures
           this.thoughtButtonTextures = [
               await this.assetLoader.loadTexture('assets/cena_2_rua/thought1.png'),
               await this.assetLoader.loadTexture('assets/cena_2_rua/thought2.png'),
               await this.assetLoader.loadTexture('assets/cena_2_rua/thought3.png')
           ];

            // Create background sprite (full screen, non-interactive)
            const backgroundMaterial = new THREE.SpriteMaterial({ map: backgroundTexture });
            this.backgroundSprite = new THREE.Sprite(backgroundMaterial);
            this.backgroundSprite.scale.set(window.innerWidth / 100, window.innerHeight / 100, 1);
            this.backgroundSprite.userData.isBackground = true; // Mark as background
            this.threeScene.add(this.backgroundSprite);

            // Create hand sprite (interactive object)
            const handMaterial = new THREE.SpriteMaterial({
                map: this.handTexture,
                transparent: true
            });
            this.handSprite = new THREE.Sprite(handMaterial);
            this.handSprite.scale.set(7.25, 5, 1);
            this.handSprite.position.set(3, -2, 0.1); // Positioned at bottom
            this.handSprite.name = "Hand";
            this.threeScene.add(this.handSprite);

            // Setup rain particles
            this.setupRain();

           // Create thought buttons
           for (let i = 0; i < this.thoughtButtonTextures.length; i++) {
               const material = new THREE.SpriteMaterial({
                   map: this.thoughtButtonTextures[i],
                   transparent: true
               });
               const button = new THREE.Sprite(material);
               button.scale.set(2, 2, 1);
               button.position.set(-5, 2 - (i * 2), 0.1); // Left side, vertically stacked
               button.name = `ThoughtButton${i+1}`;
               this.thoughtButtons.push(button);
               this.threeScene.add(button);
           }

           // Add ambient light with cyberpunk colors
           const ambientLight = new THREE.AmbientLight(0x404040);
            this.threeScene.add(ambientLight);

            // Add colored lights for cyberpunk effect
            const cyanLight = new THREE.PointLight(0x00ffff, 0.5);
            cyanLight.position.set(-5, 2, 3);
            this.threeScene.add(cyanLight);

            const magentaLight = new THREE.PointLight(0xff00ff, 0.5);
            magentaLight.position.set(5, 2, 3);
            this.threeScene.add(magentaLight);

            console.log("Cena2RuaScene initialized.");
        } catch (error) {
            console.error("Failed to initialize Cena2RuaScene:", error);
            throw error;
        }
    }

    private setupRain(): void {
        const particleCount = 1000;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20; // x
            positions[i * 3 + 1] = Math.random() * 10; // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
        }

        this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.rainParticles = new THREE.Points(this.rainGeometry, this.rainMaterial);
        this.rainParticles.userData.isBackground = true; // Mark rain as non-interactive
        this.threeScene.add(this.rainParticles);
    }

    update(deltaTime: number): void {
        // Animate rain
        if (this.rainParticles) {
            const positions = this.rainGeometry.attributes.position.array as Float32Array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 0.1; // Move rain down
                if (positions[i + 1] < -5) {
                    positions[i + 1] = 10; // Reset to top
                }
            }
            this.rainGeometry.attributes.position.needsUpdate = true;
        }

        // Animate hand bobbing
        if (this.handSprite) {
            this.timeAccumulator += deltaTime;
            this.handSprite.position.y = -1.5 + Math.sin(this.timeAccumulator * 5) * 0.1;

           // Animate thought buttons with random floating
           for (let i = 0; i < this.thoughtButtons.length; i++) {
               this.buttonOffsets[i] = this.buttonOffsets[i] || Math.random() * Math.PI * 2;
               const button = this.thoughtButtons[i];
               const offset = this.buttonOffsets[i];
               button.position.x = -7 + Math.sin(this.timeAccumulator * 2 + offset) * 0.2;
               button.position.y = (3 - (i * 1.5)) + Math.cos(this.timeAccumulator * 3 + offset) * 0.1;
           }
        }
    }

    render(renderer: THREE.WebGLRenderer): void {
        // Custom rendering if needed
    }

    public handleClick(intersects: THREE.Intersection[]): void {
        if (!intersects.length) return;

        const clickedObject = intersects[0].object;
        if (clickedObject.name === "Hand") {
           // Handle hand/phone interaction
           console.log("Hand/phone clicked");
       } else if (clickedObject.name.startsWith("ThoughtButton")) {
           const buttonIndex = parseInt(clickedObject.name.replace("ThoughtButton", "")) - 1;
           console.log(`Thought button ${buttonIndex + 1} clicked`);
           // Add thought-specific logic here later

           if (this.sceneManager) {
                this.sceneManager.changeScene('cena1_trabalho');
           }
        }
    }
}