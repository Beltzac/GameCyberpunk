// src/core/InputManager.ts
import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { Scene } from './Scene';
import { AssetLoader } from '../utils/AssetLoader'; // Import AssetLoader
export class InputManager {
    private canvas: HTMLCanvasElement;
    private camera: THREE.Camera; // Add camera reference
    private sceneManager: SceneManager; // Add SceneManager reference
    private clickRaycaster: THREE.Raycaster; // Renamed for clarity
    private mouse: THREE.Vector2;
    private assetLoader: AssetLoader; // Add AssetLoader reference
    private cursorTexture: THREE.Texture | null = null;
    private cursorMesh: THREE.Mesh | null = null;
    private cursorMaterial: THREE.MeshPhongMaterial | null = null;
    private hoverRaycaster: THREE.Raycaster = new THREE.Raycaster(); // Raycaster for hover checks
    private isOverClickable: boolean = false;

    // Mouse position in screen coordinates
    private mouseX: number = 0;
    private mouseY: number = 0;

    // Mouse move callback
    private mouseMoveCallbacks: Array<(x: number, y: number) => void> = [];

    constructor(canvas: HTMLCanvasElement, camera: THREE.Camera, sceneManager: SceneManager, assetLoader: AssetLoader) { // Add assetLoader
        this.canvas = canvas;
        this.camera = camera;
        this.sceneManager = sceneManager;
        this.assetLoader = assetLoader; // Store assetLoader
        this.clickRaycaster = new THREE.Raycaster(); // Initialize click raycaster
        this.mouse = new THREE.Vector2();
        this.setupEventListeners();
        this.loadCursorTexture().then(() => {
             // Initial position update after texture loads
             this.updateCursorPosition();
        });
        console.log("InputManager initialized with Camera, SceneManager, and AssetLoader");
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

        // Update cursor position on mouse move
        this.updateCursorPosition();
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

        // Update the picking ray with the camera and mouse position for clicks
        this.clickRaycaster.setFromCamera(this.mouse, this.camera);

        // Calculate objects intersecting the picking ray, filtering out non-interactive objects
        const intersects = this.clickRaycaster.intersectObjects(
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

        // Dispose cursor resources
        this.cursorTexture?.dispose();
        this.cursorMaterial?.dispose();
        // Geometry is shared PlaneGeometry, might not need disposal here unless created uniquely
        // If cursorMesh is in scene, remove it
        if (this.cursorMesh && this.sceneManager.currentScene) {
            this.sceneManager.currentScene.threeScene.remove(this.cursorMesh);
        }
         // Restore system cursor
         document.body.style.cursor = 'auto';
         this.canvas.style.cursor = 'auto';

        console.log("InputManager disposed");
    }

    // --- Custom Cursor Logic ---

    private async loadCursorTexture(): Promise<void> {
        try {
            const texture = await this.assetLoader.loadTexture('assets/cursor/cursor_normal.png');
            this.cursorTexture = texture;

            this.cursorMaterial = new THREE.MeshPhongMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
                side: THREE.DoubleSide,
                color: new THREE.Color(0xffffff),
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0,
                shininess: 0
            });

            this.cursorMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.5, 0.5), // Adjust size
                this.cursorMaterial
            );
            this.cursorMesh.renderOrder = 1000; // Ensure it renders on top
            this.cursorMesh.userData.isCustomCursor = true; // Mark as cursor
            this.cursorMesh.layers.set(1); // Put cursor on layer 1

            // Add cursor to the scene when the scene is ready
            const addCursorToScene = (scene: Scene | null) => {
                if (scene && this.cursorMesh && !scene.threeScene.children.includes(this.cursorMesh)) {
                    scene.threeScene.add(this.cursorMesh);
                    console.log("Cursor added to scene:", scene.constructor.name);
                }
            };

            // Add to current scene immediately if available
            addCursorToScene(this.sceneManager.currentScene);

            // Add listener to add cursor when scene changes
            this.sceneManager.onSceneChanged(addCursorToScene);


            // Hide system cursor
            document.body.style.cursor = 'none';
            this.canvas.style.cursor = 'none';

            console.log("Custom cursor initialized.");

        } catch (error) {
            console.error('Failed to load cursor texture:', error);
            // Restore system cursor on failure
            document.body.style.cursor = 'auto';
            this.canvas.style.cursor = 'auto';
        }
    }

    private updateCursorPosition(): void {
        if (!this.cursorMesh || !this.cursorMaterial || !this.sceneManager.currentScene) {
            // Don't log every frame, it's too noisy
            // console.log("Cursor or scene not initialized, skipping cursor update.");
            return;
        }

        // Convert screen mouse coordinates to normalized device coordinates (NDC)
        const rect = this.canvas.getBoundingClientRect();
        const x = ((this.mouseX - rect.left) / rect.width) * 2 - 1;
        const y = -((this.mouseY - rect.top) / rect.height) * 2 + 1;
        const mouseNDC = new THREE.Vector2(x, y);

        // Update cursor mesh position in 3D space based on camera type
        if (this.camera instanceof THREE.OrthographicCamera) {
            // For Orthographic camera, map NDC directly to view coordinates
            this.cursorMesh.position.x = x * (this.camera.right);
            this.cursorMesh.position.y = y * (this.camera.top);
            this.cursorMesh.position.z = -1; // Keep close to the camera plane
        } else if (this.camera instanceof THREE.PerspectiveCamera) {
            // For Perspective camera, unproject NDC to a point in world space
            const cursorWorldPos = new THREE.Vector3(x, y, 0.5); // 0.5 is halfway between near and far plane
            cursorWorldPos.unproject(this.camera);
            // Optional: Keep cursor at a fixed distance from the camera
            const dir = cursorWorldPos.sub(this.camera.position).normalize();
            const distance = 5; // Adjust distance as needed
            this.cursorMesh.position.copy(this.camera.position).add(dir.multiplyScalar(distance));
        } else {
             console.warn("Unsupported camera type for cursor positioning.");
             return;
        }


        // Ensure cursor is in the current scene (might have been removed during scene change)
        const currentScene = this.sceneManager.currentScene.threeScene;
        if (!currentScene.children.includes(this.cursorMesh)) {
             console.log("Re-adding cursor to scene:", this.sceneManager.currentScene.constructor.name);
             currentScene.add(this.cursorMesh);
        }


        // Check if cursor is over a clickable object
        this.checkCursorOverClickable(mouseNDC);

        // Update cursor appearance based on hover state
        this.updateCursorAppearance();
    }

    private checkCursorOverClickable(mousePositionNDC: THREE.Vector2): void {
        if (!this.sceneManager.currentScene) return;

        // Use the dedicated hover raycaster
        // Explicitly set raycaster to check layer 0 (where clickable objects likely are)
        this.hoverRaycaster.layers.set(0);
        this.hoverRaycaster.setFromCamera(mousePositionNDC, this.camera);

        // Get interactive objects from the current scene
        const objects = this.sceneManager.currentScene.threeScene.children.filter(
            obj => !obj.userData.isCustomCursor && !obj.userData.isBackground && obj.visible // Check visibility
        );

        // Check for intersections
        const intersects = this.hoverRaycaster.intersectObjects(objects, true); // Recursive check

        // Update isOverClickable flag based on whether the first hit is interactive
        // (You might refine this logic based on specific needs, e.g., checking userData.isClickable)
        this.isOverClickable = intersects.length > 0;
    }

    private updateCursorAppearance(): void {
        if (!this.cursorMaterial) return;

        const needsUpdate =
            (this.isOverClickable && this.cursorMaterial.emissiveIntensity === 0) ||
            (!this.isOverClickable && this.cursorMaterial.emissiveIntensity > 0);

        if (needsUpdate) {
             console.log(`InputManager: Updating cursor appearance. isOverClickable: ${this.isOverClickable}`); // Add log for debugging
            if (this.isOverClickable) {
                this.cursorMaterial.color.set(0xffff00); // Yellow
                this.cursorMaterial.emissive.set(0xffff00);
                this.cursorMaterial.emissiveIntensity = 0.5;
            } else {
                this.cursorMaterial.color.set(0xffffff); // White
                this.cursorMaterial.emissive.set(0x000000);
                this.cursorMaterial.emissiveIntensity = 0;
            }
            this.cursorMaterial.needsUpdate = true;
        }
    }
}