// src/core/Scene.ts
import * as THREE from 'three';

export abstract class Scene {
    public threeScene: THREE.Scene; // Made public for direct access

    constructor() {
        this.threeScene = new THREE.Scene();
        console.log(`Base Scene created`);
    }

    // Called once when the scene is set as the current scene
    abstract init(): void;

    // Called every frame
    abstract update(deltaTime: number): void;

    // Called every frame to render the scene
    abstract render(renderer: THREE.WebGLRenderer): void;

    // Removed getThreeScene() as threeScene is now public

    // Optional: Add methods for handling scene activation/deactivation
    // public onEnter(): void {}
    // public onExit(): void {}
}