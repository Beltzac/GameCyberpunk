// src/scenes/Cena1TrabalhoScene.ts
import * as THREE from 'three';
import { Scene } from '../core/Scene';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneManager } from '../core/SceneManager';
import { Cena2RuaScene } from './Cena2RuaScene';

export class Cena1TrabalhoScene extends Scene {
    private assetLoader: AssetLoader;
    private sceneManager: SceneManager;
    private backgroundSprite: THREE.Sprite | null = null;
    private notebookSprite: THREE.Sprite | null = null;
    private notebookOpenTexture: THREE.Texture | null = null;
    private notebookClosedTexture: THREE.Texture | null = null;
    private isNotebookOpen: boolean = true;

    constructor(assetLoader: AssetLoader, sceneManager: SceneManager) {
        super();
        this.assetLoader = assetLoader;
        this.sceneManager = sceneManager;
        console.log("Cena1TrabalhoScene created");
    }

    async init(): Promise<void> {
        try{
        console.log("Cena1TrabalhoScene initializing...");

        // Load all required assets
        console.log('Loading background texture...');
        const backgroundTexture = await this.assetLoader.loadTexture('cena_1_trabalho/background.png')
            .catch(error => {
                console.error('Failed to load background texture:', error);
                throw error;
            });

        console.log('Loading notebook open texture...');
        this.notebookOpenTexture = await this.assetLoader.loadTexture('cena_1_trabalho/notebook_aberto.png')
            .catch(error => {
                console.error('Failed to load notebook open texture:', error);
                throw error;
            });

        console.log('Loading notebook closed texture...');
        this.notebookClosedTexture = await this.assetLoader.loadTexture('cena_1_trabalho/notebook_fechado.png')
            .catch(error => {
                console.error('Failed to load notebook closed texture:', error);
                throw error;
            });

            // Create background sprite (full screen, non-interactive)
            const backgroundMaterial = new THREE.SpriteMaterial({ map: backgroundTexture });
            this.backgroundSprite = new THREE.Sprite(backgroundMaterial);
            this.backgroundSprite.scale.set(window.innerWidth / 100, window.innerHeight / 100, 1);
            this.backgroundSprite.userData.isBackground = true; // Mark as background
            this.threeScene.add(this.backgroundSprite);

            // Create notebook sprite (interactive object)
            const notebookMaterial = new THREE.SpriteMaterial({
                map: this.notebookOpenTexture,
                transparent: true
            });
            this.notebookSprite = new THREE.Sprite(notebookMaterial);
            this.notebookSprite.scale.set(5, 5, 1);
            this.notebookSprite.position.set(1, -1.5, 0.1); // Slightly in front of background
            this.notebookSprite.name = "Notebook";
            this.threeScene.add(this.notebookSprite);

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

            console.log("Cena1TrabalhoScene initialized.");
        } catch (error) {
            console.error("Failed to initialize Cena1TrabalhoScene:", error);
            throw error;
        }
    }

    update(deltaTime: number): void {
        // Update logic if needed
    }

    render(renderer: THREE.WebGLRenderer): void {
        // Custom rendering if needed
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

        // Transition to next scene when closing notebook
        if (!this.isNotebookOpen) {
            console.log('Preparing to transition to street scene...');
            if (this.sceneManager) {
                this.sceneManager.changeScene('cena2_rua');
            }
        }
    }

    // Raycasting handler can be added here if needed
    public handleClick(intersects: THREE.Intersection[]): void {
        if (!intersects.length) {
            console.log('No objects clicked');
            return;
        }

        const clickedObject = intersects[0].object;
        console.log(`Clicked object: ${clickedObject.name}`);

        if (clickedObject.name === "Notebook") {
            console.log('Notebook clicked - toggling');
            this.toggleNotebook();
        }
    }
}