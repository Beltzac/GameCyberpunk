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
    abstract handleClick(intersects: THREE.Intersection[]): void;

    // Removed getThreeScene() as threeScene is now public

    // Optional: Add methods for handling scene activation/deactivation
    // public onEnter(): void {}
    // public onExit(): void {}
}