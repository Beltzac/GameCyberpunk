// src/core/InputManager.ts
import * as THREE from 'three'; // Import THREE
import { SceneManager } from './SceneManager'; // Import SceneManager
import { Scene } from './Scene'; // Import Scene for type checking

export class InputManager {
    private canvas: HTMLCanvasElement;
    private camera: THREE.Camera; // Add camera reference
    private sceneManager: SceneManager; // Add SceneManager reference
    private raycaster: THREE.Raycaster; // Add raycaster instance
    private mouse: THREE.Vector2; // Add mouse vector

    constructor(canvas: HTMLCanvasElement, camera: THREE.Camera, sceneManager: SceneManager) { // Update constructor signature
        this.canvas = canvas;
        this.camera = camera; // Store camera
        this.sceneManager = sceneManager; // Store sceneManager
        this.raycaster = new THREE.Raycaster(); // Initialize raycaster
        this.mouse = new THREE.Vector2(); // Initialize mouse vector
        this.setupEventListeners();
        console.log("InputManager initialized with Camera and SceneManager"); // Updated log
    }

    private setupEventListeners(): void {
        // Example: Click listener
        this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));

        // Add other listeners as needed (e.g., keydown, keyup, mousemove)
        // window.addEventListener('keydown', this.handleKeyDown.bind(this));
        // window.addEventListener('keyup', this.handleKeyUp.bind(this));
        // this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    private handleCanvasClick(event: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();

        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = ((event.clientX - rect.left) / this.canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.canvas.clientHeight) * 2 + 1;

        console.log(`InputManager: Canvas clicked NDC (${this.mouse.x.toFixed(2)}, ${this.mouse.y.toFixed(2)})`);

        const currentScene: Scene | null = this.sceneManager.currentScene;

        if (!currentScene) {
            console.warn("InputManager: No current scene available for raycasting.");
            return;
        }

        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(currentScene.threeScene.children);

        if (intersects.length > 0) {
            // Log the name or UUID of the first intersected object
            const firstIntersected = intersects[0].object;
            const objectId = firstIntersected.name || firstIntersected.uuid;
            console.log(`InputManager: Raycast hit object: ${objectId}`);

            // Forward intersects to current scene's click handler
            currentScene.handleClick(intersects);
        } else {
            // Optional: Log if nothing was hit
            // console.log("InputManager: Raycast hit nothing.");
        }
    }

    // Example handler for keydown
    // private handleKeyDown(event: KeyboardEvent): void {
    //     console.log(`InputManager: Key down - ${event.key}`);
    //     // Notify relevant systems
    // }

    // Example handler for keyup
    // private handleKeyUp(event: KeyboardEvent): void {
    //     console.log(`InputManager: Key up - ${event.key}`);
    //     // Notify relevant systems
    // }

     // Example handler for mouse move
    // private handleMouseMove(event: MouseEvent): void {
    //     const rect = this.canvas.getBoundingClientRect();
    //     const x = event.clientX - rect.left;
    //     const y = event.clientY - rect.top;
    //     // console.log(`InputManager: Mouse move at (${x.toFixed(2)}, ${y.toFixed(2)})`); // Can be noisy
    //     // Notify relevant systems
    // }

    // Method to remove listeners if needed (e.g., when stopping the engine)
    public dispose(): void {
        this.canvas.removeEventListener('click', this.handleCanvasClick);
        // Remove other listeners
        console.log("InputManager disposed");
    }
}