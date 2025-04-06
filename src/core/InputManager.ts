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

    // Mouse position in screen coordinates
    private mouseX: number = 0;
    private mouseY: number = 0;

    // Mouse move callback
    private mouseMoveCallbacks: Array<(x: number, y: number) => void> = [];

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
        this.canvas.addEventListener('click', (event) => {
            this.handleCanvasClick(event);
        });

        // Add mouse move listener
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));

        // Add other listeners as needed (e.g., keydown, keyup)
        // window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    // Register a callback for mouse move events
    public onMouseMove(callback: (x: number, y: number) => void): void {
        this.mouseMoveCallbacks.push(callback);
    }

    // Handle mouse move events
    private handleMouseMove(event: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();

        // Store mouse position in screen coordinates
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;

        // Calculate mouse position in normalized device coordinates (-1 to +1)
        this.mouse.x = ((event.clientX - rect.left) / this.canvas.clientWidth) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / this.canvas.clientHeight) * 2 + 1;

        // Notify all registered callbacks
        for (const callback of this.mouseMoveCallbacks) {
            callback(this.mouseX, this.mouseY);
        }
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

        // Calculate objects intersecting the picking ray, filtering out non-interactive objects
        const intersects = this.raycaster.intersectObjects(
            currentScene.threeScene.children.filter(obj =>
                !obj.userData.isCustomCursor && !obj.userData.isBackground
            )
        );

        if (intersects.length > 0) {
            // Log the name or UUID of the first intersected object
            const firstIntersected = intersects[0].object;
            const objectName = firstIntersected.name;
            const objectType = firstIntersected.type;
            const objectUuid = firstIntersected.uuid;
            let logMessage = `InputManager: Raycast hit object: `;

            // Add Name or Type
            if (objectName) {
                logMessage += `Name='${objectName}'`;
            } else {
                logMessage += `Type='${objectType}'`;
            }

            // Add Texture Name if available
            try {
                let textureName: string | undefined = undefined;
                const objectWithMaterial = firstIntersected as any; // Use 'any' for broader compatibility

                if (objectWithMaterial.material) {
                    const material = objectWithMaterial.material;
                    // Handle potential array of materials
                    const effectiveMaterial = Array.isArray(material) ? material[0] : material;

                    if (effectiveMaterial && effectiveMaterial.map && effectiveMaterial.map.name) {
                        textureName = effectiveMaterial.map.name;
                    }
                }

                if (textureName) {
                    logMessage += `, Texture='${textureName}'`;
                } else {
                     // Optional: Log if texture name couldn't be found for debugging
                     // console.log(`InputManager: Texture name not found for object ${objectUuid}`);
                }
            } catch (e) {
                console.warn(`InputManager: Error accessing texture name for object ${objectUuid}:`, e);
            }

            logMessage += ` (UUID: ${objectUuid})`; // Always include UUID for certainty
            console.log(logMessage);

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
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        // Clear all callbacks
        this.mouseMoveCallbacks = [];
        console.log("InputManager disposed");
    }
}