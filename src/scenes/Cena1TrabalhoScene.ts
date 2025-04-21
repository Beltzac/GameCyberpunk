// src/scenes/Cena1TrabalhoScene.ts
import * as THREE from 'three';

import { Scene } from '../core/Scene';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneManager } from '../core/SceneManager';
import { GameEngine } from '../core/GameEngine';
import { VisualEffectManager, DustMotesEffect, CoffeeSteamEffect } from '../utils/VisualEffectManager';


export class Cena1TrabalhoScene extends Scene {
    private assetLoader: AssetLoader;
    private sceneManager: SceneManager;
    private backgroundSprite: THREE.Sprite | null = null;
    private notebookSprite: THREE.Sprite | null = null;
    private notebookOpenTexture: THREE.Texture | null = null;
    private notebookClosedTexture: THREE.Texture | null = null;
    private isNotebookOpen: boolean = true;
    private dustMotesEffect: DustMotesEffect | null = null;
    private coffeeSteamEffect: CoffeeSteamEffect | null = null; // Add coffee steam effect property
    private performanceData: { [key: string]: number } = {};

    // New interactable objects
    private coffeeMugSprite: THREE.Sprite | null = null;
    private penSprite: THREE.Sprite | null = null;
    private papersSprite: THREE.Sprite | null = null;

    private coffeeMugTexture: THREE.Texture | null = null;
    private penTexture: THREE.Texture | null = null;
    private papersTexture: THREE.Texture | null = null;

    // Static Light Properties (Animation Removed)
    private cyanLight: THREE.PointLight | null = null;
    private magentaLight: THREE.PointLight | null = null;

    // Notebook Cursor Properties REMOVED
    // private cursorSprite: THREE.Sprite | null = null;
    // private cursorBlinkAccumulator = 0;
    // private readonly CURSOR_BLINK_RATE = 0.6;

    constructor(gameEngine: GameEngine, assetLoader: AssetLoader, sceneManager: SceneManager) { // Removed camera parameter
        super(gameEngine); // Removed camera from super call
        this.assetLoader = assetLoader;
        this.sceneManager = sceneManager;
        console.log("Cena1TrabalhoScene created");
    }

    async init(): Promise<void> {
        try {
            console.log("Cena1TrabalhoScene initializing...");

            // Load the custom font for UI messages


            // Load sounds
            await this.gameEngine.soundManager.loadSound(
                'city_ambient',
                'cena_1_trabalho/sounds/city_ambient.mp3',
                true
            );

            await this.gameEngine.soundManager.loadSound(
                'ac_ambient',
                'cena_1_trabalho/sounds/ac_ambient.mp3',
                true
            );

            await this.gameEngine.soundManager.loadSound(
                'lid_open',
                'cena_1_trabalho/sounds/lid_open.mp3'
            );

            await this.gameEngine.soundManager.loadSound(
                'lid_close',
                'cena_1_trabalho/sounds/lid_close.mp3'
            );

            // Load assets (background, notebook textures)
            console.log('Loading background texture...');
            const backgroundTexture = await this.assetLoader.loadTexture('cena_1_trabalho/background.png');

            console.log('Loading notebook open texture...');
            this.notebookOpenTexture = await this.assetLoader.loadTexture('cena_1_trabalho/notebook_aberto.png');

            console.log('Loading notebook closed texture...');
            this.notebookClosedTexture = await this.assetLoader.loadTexture('cena_1_trabalho/notebook_fechado.png');

            // Load textures for new interactables
            this.coffeeMugTexture = await this.assetLoader.loadTexture('assets/cena_1_trabalho/coffee_mug.png');
            this.penTexture = await this.assetLoader.loadTexture('assets/cena_1_trabalho/pen.png');
            this.papersTexture = await this.assetLoader.loadTexture('assets/cena_1_trabalho/papers.png');

            // Create background sprite using base class method
            this.backgroundSprite = this.createBackground(backgroundTexture);

            // Create notebook sprite
            const notebookMaterial = new THREE.SpriteMaterial({ map: this.notebookOpenTexture, transparent: true });
            this.notebookSprite = new THREE.Sprite(notebookMaterial);
            this.notebookSprite.scale.set(5, 5, 1);
            this.notebookSprite.position.set(1, -1.5, 0.1);
            this.notebookSprite.name = "Notebook";
            this.threeScene.add(this.notebookSprite);

            // Create new interactable sprites
            if (this.coffeeMugTexture) {
                const material = new THREE.SpriteMaterial({ map: this.coffeeMugTexture, transparent: true });
                this.coffeeMugSprite = new THREE.Sprite(material);
                this.coffeeMugSprite.scale.set(1, 1, 1);
                this.coffeeMugSprite.position.set(-2, -1, 0.9); // Example position
                this.coffeeMugSprite.name = "CoffeeMug";
                this.threeScene.add(this.coffeeMugSprite);
            }

            // Create coffee steam effect
            if (this.coffeeMugSprite) {
                this.coffeeSteamEffect = VisualEffectManager.createCoffeeSteamEffect(
                    this.threeScene,
                    this.coffeeMugSprite.position
                );
            }

            if (this.penTexture) {
                const material = new THREE.SpriteMaterial({ map: this.penTexture, transparent: true });
                this.penSprite = new THREE.Sprite(material);
                this.penSprite.scale.set(1, 1, 1);
                this.penSprite.position.set(-2.5, -3.2, 0.9); // Example position
                this.penSprite.name = "Pen";
                this.threeScene.add(this.penSprite);
            }

            if (this.papersTexture) {
                const material = new THREE.SpriteMaterial({ map: this.papersTexture, transparent: true });
                this.papersSprite = new THREE.Sprite(material);
                this.papersSprite.scale.set(2, 1.5, 1);
                this.papersSprite.position.set(4, -1.8, 0.9); // Example position
                this.papersSprite.name = "Papers";
                this.threeScene.add(this.papersSprite);
            }

            // Setup effects
            this.setupDustMotes();

            console.log("Cena1TrabalhoScene initialized.");
        } catch (error) {
            console.error("Failed to initialize Cena1TrabalhoScene:", error);
            throw error;
        }
    }

    async onEnter(): Promise<void> {
        // Set the current scene in the UIManager for 3D text rendering
        this.gameEngine.uiManager.setCurrentScene(this.threeScene);

        // Play ambient sounds
        await this.gameEngine.soundManager.playBackground('city_ambient', 3.0);
        await this.gameEngine.soundManager.playBackground('ac_ambient', 3.0);
    }

    async onExit(): Promise<void> {
        // Stop sounds before changing scene
        this.gameEngine.soundManager.stopAllBackground();
    }

    private setupDustMotes(): void {
        this.dustMotesEffect = VisualEffectManager.createDustMotesEffect(this.threeScene, this.gameEngine.camera);
    }

    update(deltaTime: number): void {
        this.performanceData = {}; // Clear previous frame's data

        // Update dust motes effect
        const dustMotesStartTime = performance.now();
        if (this.dustMotesEffect) {
            this.dustMotesEffect.update(deltaTime);
        }
        this.performanceData['Dust Motes Effect'] = performance.now() - dustMotesStartTime;

        // Update coffee steam effect
        const coffeeSteamStartTime = performance.now();
        if (this.coffeeSteamEffect) {
            this.coffeeSteamEffect.update(deltaTime);
        }
        this.performanceData['Coffee Steam Effect'] = performance.now() - coffeeSteamStartTime;
    }

    render(renderer: THREE.WebGLRenderer): void {
        // Custom rendering if needed (currently none)
    }

    public async toggleNotebook(): Promise<void> {
        if (!this.notebookSprite || !this.notebookOpenTexture || !this.notebookClosedTexture) {
            console.error('Missing required notebook components');
            return;
        }

        this.isNotebookOpen = !this.isNotebookOpen;
        console.log(`Toggling notebook. New state: ${this.isNotebookOpen ? 'open' : 'closed'}`);

        const material = this.notebookSprite.material as THREE.SpriteMaterial;
        material.map = this.isNotebookOpen ? this.notebookOpenTexture : this.notebookClosedTexture;
        material.needsUpdate = true;

        if (this.isNotebookOpen) {
            await this.gameEngine.soundManager.playSound('lid_open', 5);
        } else {
            await this.gameEngine.soundManager.playSound('lid_close', 5);
        }

        // Transition to next scene when closing notebook
        if (!this.isNotebookOpen) {
            console.log('Preparing to transition to street scene...');

            if (this.sceneManager) {
                await this.sceneManager.changeScene('cena2_rua', 'glitch', 2000);
            }
        }
    }

    public async handleClick(intersects: THREE.Intersection[]): Promise<void> {
        if (!intersects.length) {
            return;
        }

        const clickedObject = intersects[0].object;

        if (clickedObject.name === "Notebook") {
            console.log('Notebook clicked - toggling');
            await this.toggleNotebook();
        } else if (clickedObject.name === "CoffeeMug") {
            const messageSpriteCoffee = await this.gameEngine.uiManager.showMessage("João thinks: 'Another cup...'", 2000, new THREE.Vector3(2, -0.5, 1)); // Example 3D position
            if (messageSpriteCoffee) {
                this.threeScene.add(messageSpriteCoffee);
            }
            // Add more complex interaction here later if needed
        } else if (clickedObject.name === "Pen") {
            const messageSpritePen = await this.gameEngine.uiManager.showMessage("João doodles absently on a notepad.", 2000, new THREE.Vector3(-1, -2, 1)); // Example 3D position
            if (messageSpritePen) {
                this.threeScene.add(messageSpritePen);
            }
            // Add more complex interaction here later if needed
        } else if (clickedObject.name === "Papers") {
            const messageSpritePapers = await this.gameEngine.uiManager.showMessage("João sighs at the endless stack of papers.", 2000, new THREE.Vector3(3, -1, 1)); // Example 3D position
            if (messageSpritePapers) {
                this.threeScene.add(messageSpritePapers);
            }
            // Add more complex interaction here later if needed
        }
    }
    getPerformanceData(): { [key: string]: number } {
        return this.performanceData;
    }
}
