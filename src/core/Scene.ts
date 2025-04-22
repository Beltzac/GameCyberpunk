// src/core/Scene.ts
import * as THREE from 'three';

import { GameEngine } from './GameEngine'; // Import GameEngine

export abstract class Scene {
    public threeScene: THREE.Scene; // Made public for direct access
    protected gameEngine: GameEngine; // Store reference to GameEngine
    // public camera: THREE.Camera; // Removed - Use GameEngine's camera

    constructor(gameEngine: GameEngine) { // Removed camera parameter
        this.threeScene = new THREE.Scene();
        this.gameEngine = gameEngine;
        // this.camera = camera; // Removed assignment
        console.log(`Base Scene created`);
    }

    // Called once when the scene is set as the current scene
    abstract init(): void;

    // Called every frame
    abstract update(deltaTime: number): void;

    // Called every frame to render the scene
    abstract render(renderer: THREE.WebGLRenderer): void;

    // Handle click events on scene objects
    abstract handleClick(intersects: THREE.Intersection[]): Promise<void>;

    // Handle mouse move events on scene objects (optional)
    handleMouseMove(_intersects: THREE.Intersection[]): void { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Default empty implementation
    }

    // Method to get performance data (to be implemented by subclasses)
    getPerformanceData(): { [key: string]: number } {
        return {}; // Default empty implementation
    }

    // Methods for handling scene activation/deactivation
    abstract onEnter(): Promise<void>;
    abstract onExit(): Promise<void>;

    protected createBackground(texture: THREE.Texture): THREE.Sprite {
        const backgroundMaterial = new THREE.SpriteMaterial({ map: texture });
        const backgroundSprite = new THREE.Sprite(backgroundMaterial);
        const camera = this.gameEngine.camera;
        const scaleX = (camera.right - camera.left);
        const scaleY = (camera.top - camera.bottom);
        backgroundSprite.scale.set(scaleX, scaleY, 1);
        backgroundSprite.position.set(0, 0, -1); // Set z position to -1 to be behind other objects
        backgroundSprite.userData.isBackground = true;
        this.threeScene.add(backgroundSprite);
        return backgroundSprite;
    }
}