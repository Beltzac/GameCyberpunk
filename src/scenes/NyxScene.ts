// src/scenes/NyxScene.ts
import * as THREE from 'three';
import { Scene } from '../core/Scene';
// import { AssetLoader } from '../utils/AssetLoader';
// import { UIManager } from '../ui/UIManager';

export class NyxScene extends Scene {
    // private assetLoader: AssetLoader;
    // private uiManager: UIManager;
    private sphere: THREE.Mesh | null = null; // Example object (different shape)

    constructor(/* pass managers if needed */) {
        super();
        // this.assetLoader = assetLoader;
        // this.uiManager = uiManager;
        console.log("NyxScene created");
    }

    init(): void {
        console.log("NyxScene initializing...");
        // Scene-specific initialization logic
        // Example: Add a different simple object
        const geometry = new THREE.SphereGeometry(0.75, 32, 16); // Sphere
        const material = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Magenta sphere
        this.sphere = new THREE.Mesh(geometry, material);
        this.sphere.name = "NyxTestSphere"; // Assign name for raycasting
        this.threeScene.add(this.sphere);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.threeScene.add(ambientLight);
        const pointLight = new THREE.PointLight(0xffffff, 0.8);
        pointLight.position.set(0, 2, 3);
        this.threeScene.add(pointLight);

        console.log("NyxScene initialized.");
    }

    update(deltaTime: number): void {
        // console.log(`NyxScene update: ${deltaTime}`);
        // Update scene objects
        if (this.sphere) {
            // Example movement
            this.sphere.position.y = Math.sin(performance.now() * 0.001) * 0.5;
        }
    }

    render(renderer: THREE.WebGLRenderer): void {
        // console.log("NyxScene render");
        // Custom rendering logic for this scene, if any
    }

    // Optional: Implement onEnter/onExit if needed
    // onEnter(): void { console.log("Entering NyxScene"); }
    // onExit(): void { console.log("Exiting NyxScene"); }
}