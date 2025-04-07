// src/scenes/Cena1TrabalhoScene.ts
import * as THREE from 'three';
import { Scene } from '../core/Scene';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneManager } from '../core/SceneManager';
// import { Cena2RuaScene } from './Cena2RuaScene'; // Not strictly needed here unless referencing types
import { GameEngine } from '../core/GameEngine';

export class Cena1TrabalhoScene extends Scene {
    private assetLoader: AssetLoader;
    private sceneManager: SceneManager;
    // No need to store gameEngine here, it's in the base class
    private backgroundSprite: THREE.Sprite | null = null;
    private notebookSprite: THREE.Sprite | null = null;
    private notebookOpenTexture: THREE.Texture | null = null;
    private notebookClosedTexture: THREE.Texture | null = null;
    private isNotebookOpen: boolean = true;

    // Dust Motes Properties
    private dustParticles: THREE.Points | null = null;
    private dustGeometry = new THREE.BufferGeometry();
    private dustMaterial = new THREE.PointsMaterial({
        color: 0xffffee,
        size: 0.05,
        transparent: true,
        opacity: 0.5,
        depthTest: false,
        blending: THREE.AdditiveBlending
    });
    private dustVelocities: Float32Array | null = null;
    private dustTimeAccumulator = 0;

    // Static Light Properties (Animation Removed)
    private cyanLight: THREE.PointLight | null = null;
    private magentaLight: THREE.PointLight | null = null;

    // Notebook Cursor Properties REMOVED
    // private cursorSprite: THREE.Sprite | null = null;
    // private cursorBlinkAccumulator = 0;
    // private readonly CURSOR_BLINK_RATE = 0.6;

    constructor(gameEngine: GameEngine, assetLoader: AssetLoader, sceneManager: SceneManager) {
        super(gameEngine);
        this.assetLoader = assetLoader;
        this.sceneManager = sceneManager;
        console.log("Cena1TrabalhoScene created");
    }

    async init(): Promise<void> {
        try {
            console.log("Cena1TrabalhoScene initializing...");

            // Load assets (background, notebook textures)
            console.log('Loading background texture...');
            const backgroundTexture = await this.assetLoader.loadTexture('cena_1_trabalho/background.png')
                .catch(error => { console.error('Failed to load background texture:', error); throw error; });

            console.log('Loading notebook open texture...');
            this.notebookOpenTexture = await this.assetLoader.loadTexture('cena_1_trabalho/notebook_aberto.png')
                .catch(error => { console.error('Failed to load notebook open texture:', error); throw error; });

            console.log('Loading notebook closed texture...');
            this.notebookClosedTexture = await this.assetLoader.loadTexture('cena_1_trabalho/notebook_fechado.png')
                .catch(error => { console.error('Failed to load notebook closed texture:', error); throw error; });

            // Create background sprite
            const backgroundMaterial = new THREE.SpriteMaterial({ map: backgroundTexture });
            this.backgroundSprite = new THREE.Sprite(backgroundMaterial);
            const camera = this.gameEngine.camera;
            const scaleX = (camera.right - camera.left);
            const scaleY = (camera.top - camera.bottom);
            this.backgroundSprite.scale.set(scaleX, scaleY, 1);
            this.backgroundSprite.userData.isBackground = true;
            this.threeScene.add(this.backgroundSprite);

            // Create notebook sprite
            const notebookMaterial = new THREE.SpriteMaterial({ map: this.notebookOpenTexture, transparent: true });
            this.notebookSprite = new THREE.Sprite(notebookMaterial);
            this.notebookSprite.scale.set(5, 5, 1);
            this.notebookSprite.position.set(1, -1.5, 0.1);
            this.notebookSprite.name = "Notebook";
            this.threeScene.add(this.notebookSprite);

            // Add ambient light
            const ambientLight = new THREE.AmbientLight(0x404040);
            this.threeScene.add(ambientLight);

            // Add colored point lights and store references (Static)
            this.cyanLight = new THREE.PointLight(0x00ffff, 0.5);
            this.cyanLight.position.set(-5, 2, 3);
            this.threeScene.add(this.cyanLight);

            this.magentaLight = new THREE.PointLight(0xff00ff, 0.5);
            this.magentaLight.position.set(5, 2, 3);
            this.threeScene.add(this.magentaLight);

            // Create cursor sprite REMOVED
            // this.cursorSprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffffff }));
            // ... cursor positioning logic removed ...
            // this.threeScene.add(this.cursorSprite);

            // Setup effects
            this.setupDustMotes();

            console.log("Cena1TrabalhoScene initialized.");
        } catch (error) {
            console.error("Failed to initialize Cena1TrabalhoScene:", error);
            throw error;
        }
    }

    private setupDustMotes(): void {
        const particleCount = 150;
        const positions = new Float32Array(particleCount * 3);
        this.dustVelocities = new Float32Array(particleCount * 3);

        const spawnAreaWidth = this.gameEngine.camera.right - this.gameEngine.camera.left;
        const spawnAreaHeight = this.gameEngine.camera.top - this.gameEngine.camera.bottom;
        const baseSpeed = 0.01;
        const speedVariation = 0.02;

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spawnAreaWidth;
            positions[i * 3 + 1] = (Math.random() - 0.5) * spawnAreaHeight;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

            const angle = Math.random() * Math.PI * 2;
            const speed = baseSpeed + Math.random() * speedVariation;
            this.dustVelocities[i * 3] = Math.cos(angle) * speed;
            this.dustVelocities[i * 3 + 1] = Math.sin(angle) * speed;
            this.dustVelocities[i * 3 + 2] = (Math.random() - 0.5) * baseSpeed * 0.1;
        }

        this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.dustParticles = new THREE.Points(this.dustGeometry, this.dustMaterial);
        this.dustParticles.position.z = 0;
        this.dustParticles.renderOrder = 10;
        this.dustParticles.userData.isBackground = true;
        this.threeScene.add(this.dustParticles);
        console.log("Dust motes added.");
    }

    update(deltaTime: number): void {
        const effectiveDeltaTime = Math.min(deltaTime, 0.1); // Clamp delta time

        // Update dust motes
        if (this.dustParticles && this.dustVelocities) {
            this.dustTimeAccumulator += effectiveDeltaTime;
            const positions = this.dustGeometry.attributes.position.array as Float32Array;
            const velocities = this.dustVelocities;
            const bounds = {
                x: (this.gameEngine.camera.right - this.gameEngine.camera.left) / 2 + 1,
                y: (this.gameEngine.camera.top - this.gameEngine.camera.bottom) / 2 + 1,
                z: 2
            };

            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += velocities[i] * effectiveDeltaTime * 60;
                positions[i + 1] += velocities[i + 1] * effectiveDeltaTime * 60;
                positions[i + 2] += velocities[i + 2] * effectiveDeltaTime * 60;

                // Simple boundary wrapping
                if (Math.abs(positions[i]) > bounds.x) velocities[i] *= -1;
                if (Math.abs(positions[i + 1]) > bounds.y) velocities[i + 1] *= -1;
                if (Math.abs(positions[i + 2]) > bounds.z) velocities[i + 2] *= -1;

                // Optional random drift change
                if (Math.random() < 0.001) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = (0.01 + Math.random() * 0.02);
                    velocities[i] = Math.cos(angle) * speed;
                    velocities[i + 1] = Math.sin(angle) * speed;
                }
            }
            this.dustGeometry.attributes.position.needsUpdate = true;
        }

        // Animate light intensity REMOVED
        // if (this.cyanLight && this.magentaLight) {
        //     ... animation logic removed ...
        // }

        // Update cursor blink REMOVED
        // if (this.cursorSprite && this.isNotebookOpen) {
        //     ... blink logic removed ...
        // } else if (this.cursorSprite && !this.isNotebookOpen) {
        //      this.cursorSprite.visible = false;
        // }
    }

    render(renderer: THREE.WebGLRenderer): void {
        // Custom rendering if needed (currently none)
    }

    public toggleNotebook(): void {
        if (!this.notebookSprite || !this.notebookOpenTexture || !this.notebookClosedTexture) {
            console.error('Missing required notebook components');
            return;
        }

        this.isNotebookOpen = !this.isNotebookOpen;
        console.log(`Toggling notebook. New state: ${this.isNotebookOpen ? 'open' : 'closed'}`);

        const material = this.notebookSprite.material as THREE.SpriteMaterial;
        material.map = this.isNotebookOpen ? this.notebookOpenTexture : this.notebookClosedTexture;
        material.needsUpdate = true;

        // Update cursor visibility immediately when toggling REMOVED
        // if (this.cursorSprite) {
        //     this.cursorSprite.visible = this.isNotebookOpen;
        //     if (this.isNotebookOpen) {
        //         this.cursorBlinkAccumulator = 0;
        //     }
        // }

        // Transition to next scene when closing notebook
        if (!this.isNotebookOpen) {
            console.log('Preparing to transition to street scene...');
            if (this.sceneManager) {
                this.sceneManager.changeScene('cena2_rua');
            }
        }
    }

    public handleClick(intersects: THREE.Intersection[]): void {
        if (!intersects.length) {
            // console.log('No objects clicked');
            return;
        }

        const clickedObject = intersects[0].object;
        // console.log(`Clicked object: ${clickedObject.name}`);

        if (clickedObject.name === "Notebook") {
            console.log('Notebook clicked - toggling');
            this.toggleNotebook();
        }
    }
}