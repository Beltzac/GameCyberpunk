// src/scenes/JoaoScene.ts
import * as THREE from 'three';
import { Scene } from '../core/Scene';
// import { AssetLoader } from '../utils/AssetLoader'; // If needed for assets
// import { UIManager } from '../ui/UIManager'; // If needed for UI

export class JoaoScene extends Scene {
    // private assetLoader: AssetLoader;
    // private uiManager: UIManager;
    private cube: THREE.Mesh | null = null; // Example object

    constructor(/* pass managers if needed: assetLoader: AssetLoader, uiManager: UIManager */) {
        super(); // Calls the base Scene constructor
        // this.assetLoader = assetLoader;
        // this.uiManager = uiManager;
        console.log("JoaoScene created");
    }

    init(): void {
        console.log("JoaoScene initializing...");
        // Scene-specific initialization logic
        // Example: Add a simple object
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green cube
        this.cube = new THREE.Mesh(geometry, material);
        this.cube.name = "JoaoTestCube"; // Assign name for raycasting
        this.threeScene.add(this.cube);

        // Add lights if needed
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.threeScene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(1, 1, 1);
        this.threeScene.add(directionalLight);

        console.log("JoaoScene initialized.");
    }

    update(deltaTime: number): void {
        // console.log(`JoaoScene update: ${deltaTime}`); // Can be noisy
        // Update scene objects, animations, logic
        if (this.cube) {
            this.cube.rotation.x += deltaTime * 0.5;
            this.cube.rotation.y += deltaTime * 0.5;
        }
    }

    render(renderer: THREE.WebGLRenderer): void {
        // console.log("JoaoScene render"); // Usually not needed if engine handles rendering
        // Custom rendering logic for this scene, if any (e.g., post-processing)
        // The GameEngine currently handles the basic render call
    }

    // Optional: Implement onEnter/onExit if needed
    // onEnter(): void { console.log("Entering JoaoScene"); }
    // onExit(): void { console.log("Exiting JoaoScene"); }
}