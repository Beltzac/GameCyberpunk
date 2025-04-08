// src/core/InputManager.ts
import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { Scene } from './Scene';
import { AssetLoader } from '../utils/AssetLoader'; // Import AssetLoader
import { Easing } from '../utils/Easing'; // Import Easing
import { UIManager } from '../ui/UIManager'; // Import UIManager
import { SoundManager } from './SoundManager'; // Import SoundManager

export class InputManager {
    private canvas: HTMLCanvasElement;
    private camera: THREE.Camera; // Add camera reference
    private sceneManager: SceneManager; // Add SceneManager reference
    private uiManager: UIManager; // Add UIManager reference
    private clickRaycaster: THREE.Raycaster; // Renamed for clarity
    private soundManager: SoundManager; // Add SoundManager reference
    private mouse: THREE.Vector2;
    private assetLoader: AssetLoader; // Add AssetLoader reference
    private cursorTexture: THREE.Texture | null = null;
    private cursorMesh: THREE.Mesh | null = null;
    private cursorMaterial: THREE.MeshPhongMaterial | null = null;
    private hoverRaycaster: THREE.Raycaster = new THREE.Raycaster(); // Raycaster for hover checks
    private isOverClickable: boolean = false;
    private textureCanvasCache: Map<string, { canvas: HTMLCanvasElement, context: CanvasRenderingContext2D }> = new Map();

    private activeClickAnimations: Array<{ mesh: THREE.Mesh, startTime: number, duration: number, startScale: number, endScale: number, startOpacity: number, endOpacity: number, easingFunc: (t: number) => number }> = [];
    // Mouse position in screen coordinates
    private mouseX: number = 0;
    private mouseY: number = 0;

    // Mouse move callback
    private mouseMoveCallbacks: Array<(x: number, y: number) => void> = [];

    // Add uiManager and soundManager to constructor
    constructor(canvas: HTMLCanvasElement, camera: THREE.Camera, sceneManager: SceneManager, assetLoader: AssetLoader, uiManager: UIManager, soundManager: SoundManager) {
        this.canvas = canvas;
        this.camera = camera;
        this.sceneManager = sceneManager;
        this.assetLoader = assetLoader;
        this.uiManager = uiManager; // Store UIManager
        this.soundManager = soundManager; // Store SoundManager
        this.clickRaycaster = new THREE.Raycaster(); // Initialize click raycaster
        this.mouse = new THREE.Vector2();
        this.setupEventListeners();
        this.loadCursorTexture().then(() => {
            // Initial position update after texture loads
            this.updateCursorPosition();
        });
        // Load the click sound
        this.soundManager.loadSound('ui_click', 'assets/sounds/click.wav').catch(error => {
            console.error("InputManager: Failed to load click sound:", error);
        });
        console.log("InputManager initialized with Camera, SceneManager, AssetLoader, UIManager, and SoundManager");
    }

    private setupEventListeners(): void {
        // Bind handlers to ensure 'this' context is correct
        this.handleCanvasClick = this.handleCanvasClick.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this); // Bind keydown handler

        // Example: Click listener
        this.canvas.addEventListener('click', this.handleCanvasClick);

        // Add mouse move listener
        this.canvas.addEventListener('mousemove', this.handleMouseMove);

        // Add keydown listener to the window
        window.addEventListener('keydown', this.handleKeyDown);

        // Add other listeners as needed (e.g., keyup)
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

    private async handleCanvasClick(event: MouseEvent): Promise<void> {
        // Play click sound immediately on any click attempt
        if (this.soundManager) { // Check if soundManager is initialized
            this.soundManager.playSound('ui_click', 0.7);
        } else {
            console.warn("InputManager: SoundManager not available to play click sound.");
        }
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
        const allIntersects = this.clickRaycaster.intersectObjects(
            currentScene.threeScene.children.filter(obj =>
                !obj.userData.isCustomCursor && !obj.userData.isBackground && obj.visible
            ),
            true // recursive
        );

        // Filter intersects based on alpha value
        const validIntersects = allIntersects.filter(intersect => {
            const uv = intersect.uv;
            const object = intersect.object as THREE.Mesh; // Assume Mesh for material/texture access
            if (uv && object.material) {
                const material = Array.isArray(object.material) ? object.material[0] : object.material;
                if (material instanceof THREE.MeshBasicMaterial ||
                    material instanceof THREE.MeshStandardMaterial ||
                    material instanceof THREE.MeshPhongMaterial ||
                    material instanceof THREE.SpriteMaterial) { // Check common material types with maps
                    const texture = material.map;
                    if (texture && texture.image) {
                        const alpha = this.getAlphaAtUV(texture, uv);
                        return alpha > 0.1; // Alpha threshold
                    }
                }
            }
            // If no texture/uv or alpha is low, consider it a hit on the geometry anyway
            // unless alpha check is strictly required for all objects.
            // For now, let's assume if we can't check alpha, it's a valid hit.
            // If strict alpha checking is needed, return false here.
            return true; // Fallback: if alpha check fails/not applicable, treat as hit
        });

        const intersects = validIntersects; // Use the filtered list

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
            await currentScene.handleClick(intersects);

            // Create click animation at the intersection point
            // Create click animation at the NDC position of the click
            this.createClickAnimation(this.mouse); // Pass the NDC mouse vector

        } else {
            // Optional: Log if nothing was hit
            // console.log("InputManager: Raycast hit nothing.");
        }
    }

    // Handler for keydown events
    private handleKeyDown(event: KeyboardEvent): void {
        // console.log(`InputManager: Key down - ${event.key}`); // Optional: Log key presses
        if (event.key.toLowerCase() === 'p') {
            console.log("InputManager: 'P' key pressed. Toggling debug overlay.");
            this.uiManager.toggleDebugOverlay();
        }
        // Notify relevant systems if needed for other keys
    }

    // Example handler for keyup
    // private handleKeyUp(event: KeyboardEvent): void {
    //     console.log(`InputManager: Key up - ${event.key}`);
    //     // Notify relevant systems
    // }

    // Method to remove listeners if needed (e.g., when stopping the engine)
    public dispose(): void {
        this.canvas.removeEventListener('click', this.handleCanvasClick);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('keydown', this.handleKeyDown); // Remove keydown listener
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
            const basePosX = x * (this.camera.right);
            const basePosY = y * (this.camera.top);
            // Offset position so top-left corner aligns with the pointer
            const cursorWidth = 0.5; // Must match PlaneGeometry width
            const cursorHeight = 0.5; // Must match PlaneGeometry height
            this.cursorMesh.position.x = basePosX + cursorWidth / 2;
            this.cursorMesh.position.y = basePosY - cursorHeight / 2;
            this.cursorMesh.position.z = -1; // Keep close to the camera plane
        } else if (this.camera instanceof THREE.PerspectiveCamera) {
            // For Perspective camera, unproject NDC to a point in world space
            const cursorWorldPos = new THREE.Vector3(x, y, 0.5); // 0.5 is halfway between near and far plane
            cursorWorldPos.unproject(this.camera);
            // Optional: Keep cursor at a fixed distance from the camera
            const dir = cursorWorldPos.sub(this.camera.position).normalize();
            const distance = 5; // Adjust distance as needed
            const basePos = this.camera.position.clone().add(dir.multiplyScalar(distance));
            // Apply offset in camera space (requires projecting offset vector)
            // This is more complex for perspective. A simpler approach for perspective
            // might be to adjust the PlaneGeometry itself, but let's try offsetting first.
            // For now, we'll apply the offset directly, which might not be perfectly accurate
            // visually in perspective but works for orthographic.
            // TODO: Refine offset calculation for perspective camera if needed.
            const cursorWidth = 0.5;
            const cursorHeight = 0.5;
            // Applying offset directly in world space - might need adjustment based on camera orientation
            this.cursorMesh.position.copy(basePos);
            // A more robust perspective offset requires projecting the offset from screen space
            // For simplicity, we'll keep the orthographic offset logic for now.
            // If perspective is primary, consider adjusting geometry center instead.
            this.cursorMesh.position.x += cursorWidth / 2; // Approximate offset
            this.cursorMesh.position.y -= cursorHeight / 2; // Approximate offset
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
        const allIntersects = this.hoverRaycaster.intersectObjects(objects, true); // Recursive check

        // Find the first intersection that passes the alpha test
        let firstValidIntersect: THREE.Intersection | null = null;
        for (const intersect of allIntersects) {
            const uv = intersect.uv;
            const object = intersect.object as THREE.Mesh;
            if (uv && object.material) {
                const material = Array.isArray(object.material) ? object.material[0] : object.material;
                if (material instanceof THREE.MeshBasicMaterial ||
                    material instanceof THREE.MeshStandardMaterial ||
                    material instanceof THREE.MeshPhongMaterial ||
                    material instanceof THREE.SpriteMaterial) {
                    const texture = material.map;
                    if (texture && texture.image) {
                        const alpha = this.getAlphaAtUV(texture, uv);
                        if (alpha > 0.1) { // Alpha threshold
                            firstValidIntersect = intersect;
                            break; // Found the first valid one
                        }
                    } else {
                        // No texture, treat as valid geometry hit
                        firstValidIntersect = intersect;
                        break;
                    }
                } else {
                    // Unsupported material type for alpha check, treat as valid geometry hit
                    firstValidIntersect = intersect;
                    break;
                }
            } else {
                // No UV coordinates, treat as valid geometry hit
                firstValidIntersect = intersect;
                break;
            }
        }
        // Update isOverClickable flag
        this.isOverClickable = firstValidIntersect !== null;
    } // <-- End of checkCursorOverClickable

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
    } // <-- End of updateCursorAppearance

    // Helper function to get alpha value from texture at specific UV coordinates
    private getAlphaAtUV(texture: THREE.Texture, uv: THREE.Vector2): number {
        if (!texture.image) {
            return 1; // Assume opaque if no image data
        }

        const image = texture.image;
        const textureKey = texture.uuid; // Use texture UUID as cache key

        let cacheEntry = this.textureCanvasCache.get(textureKey);

        if (!cacheEntry) {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true }); // Important for getImageData performance

            if (!context) {
                console.warn("Could not get 2D context for alpha checking.");
                return 1; // Cannot check alpha
            }

            canvas.width = image.naturalWidth || image.width;
            canvas.height = image.naturalHeight || image.height;

            // Draw the image onto the canvas
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            cacheEntry = { canvas, context };
            this.textureCanvasCache.set(textureKey, cacheEntry);
            // Optional: Add logic to clear cache if textures change or are disposed
        }

        const { context, canvas } = cacheEntry;

        // Flip UV y-coordinate if texture is flipped
        const u = uv.x;
        const v = texture.flipY ? 1 - uv.y : uv.y; // Adjust v based on texture.flipY

        // Clamp UV coordinates to [0, 1] range
        const clampedU = Math.max(0, Math.min(1, u));
        const clampedV = Math.max(0, Math.min(1, v));


        // Map UV coordinates to pixel coordinates
        const x = Math.floor(clampedU * (canvas.width - 1)); // -1 because pixel indices are 0 to width-1
        const y = Math.floor(clampedV * (canvas.height - 1)); // -1 because pixel indices are 0 to height-1


        try {
            // Get pixel data (returns Uint8ClampedArray [R, G, B, A, R, G, B, A, ...])
            const pixelData = context.getImageData(x, y, 1, 1).data;
            // Alpha value is the 4th component (index 3), normalized to 0-1 range
            const alpha = pixelData[3] / 255;
            return alpha;
        } catch (e) {
            // Security errors can happen if the image is cross-origin and CORS isn't set up
            // console.warn(`Could not get pixel data for texture ${textureKey} at (${x}, ${y}). Check CORS policy if image is external.`, e); // Reduce noise
            return 1; // Assume opaque on error
        }
    } // <-- End of getAlphaAtUV

    // --- Click Animation Logic ---

    // Update active animations
    public update(deltaTime: number): void {
        const now = performance.now() / 1000; // Current time in seconds
        const animationsToRemove: number[] = [];
        const currentScene = this.sceneManager.currentScene?.threeScene;

        if (!currentScene) return; // No scene to update animations in

        this.activeClickAnimations.forEach((anim, index) => {
            const elapsedTime = now - anim.startTime;
            let progress = Math.min(elapsedTime / anim.duration, 1); // Clamp progress to [0, 1]

            // Apply easing
            const easedProgress = anim.easingFunc(progress);

            // Interpolate scale
            const currentScale = anim.startScale + (anim.endScale - anim.startScale) * easedProgress;
            anim.mesh.scale.set(currentScale, currentScale, currentScale);

            // Interpolate opacity
            const currentOpacity = anim.startOpacity + (anim.endOpacity - anim.startOpacity) * easedProgress;
            if (anim.mesh.material instanceof THREE.MeshBasicMaterial ||
                anim.mesh.material instanceof THREE.MeshStandardMaterial ||
                anim.mesh.material instanceof THREE.MeshPhongMaterial) {
                // Ensure material is transparent and update opacity
                if (!anim.mesh.material.transparent) {
                    anim.mesh.material.transparent = true;
                }
                anim.mesh.material.opacity = currentOpacity;
                anim.mesh.material.needsUpdate = true; // Important for opacity changes
            }


            // Check if animation is finished
            if (progress >= 1) {
                animationsToRemove.push(index);
            }
        });

        // Remove completed animations (iterate backwards to avoid index issues)
        for (let i = animationsToRemove.length - 1; i >= 0; i--) {
            const indexToRemove = animationsToRemove[i];
            const animToRemove = this.activeClickAnimations[indexToRemove];

            // Remove mesh from scene
            currentScene.remove(animToRemove.mesh);

            // Dispose geometry and material to free memory
            animToRemove.mesh.geometry.dispose();
            if (Array.isArray(animToRemove.mesh.material)) {
                animToRemove.mesh.material.forEach(m => m.dispose());
            } else {
                animToRemove.mesh.material.dispose();
            }


            // Remove from active animations array
            this.activeClickAnimations.splice(indexToRemove, 1);
        }
    } // <-- End of update

    // Creates the click visual effect at a specific screen position (NDC)
    private createClickAnimation(mouseNDC: THREE.Vector2): void {
        if (!this.sceneManager.currentScene) return;

        const geometry = new THREE.RingGeometry(
            0.01, // innerRadius - start small
            0.05, // outerRadius - start small
            32    // thetaSegments
        );
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff, // Cyan color
            opacity: 0.8,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false // Render on top without depth testing issues
        });
        const ringMesh = new THREE.Mesh(geometry, material);

        // Position the ring in screen space using NDC, similar to the cursor
        if (this.camera instanceof THREE.OrthographicCamera) {
            ringMesh.position.x = mouseNDC.x * this.camera.right;
            ringMesh.position.y = mouseNDC.y * this.camera.top;
            ringMesh.position.z = -1.5; // Slightly behind the cursor
        } else if (this.camera instanceof THREE.PerspectiveCamera) {
            // Unproject NDC to a point near the camera for perspective
            const ringWorldPos = new THREE.Vector3(mouseNDC.x, mouseNDC.y, 0.5); // Z=0.5 is between near/far
            ringWorldPos.unproject(this.camera);
            const dir = ringWorldPos.sub(this.camera.position).normalize();
            const distance = 4.5; // Slightly behind cursor distance
            ringMesh.position.copy(this.camera.position).add(dir.multiplyScalar(distance));
            // For perspective, we might still want it to face the camera plane
            ringMesh.quaternion.copy(this.camera.quaternion); // Align with camera rotation
        } else {
            console.warn("Unsupported camera type for click animation positioning.");
            // Fallback position (might not look right)
            ringMesh.position.set(0, 0, -1.5);
        }

        // Do NOT use lookAt - keep it parallel to the screen plane

        ringMesh.renderOrder = 999; // Render below cursor (1000) but above most other things
        ringMesh.layers.set(1); // Put animation on the same layer as the cursor

        // Add to scene
        this.sceneManager.currentScene.threeScene.add(ringMesh);

        // Define animation parameters
        const animationData = {
            mesh: ringMesh,
            startTime: performance.now() / 1000, // Start time in seconds
            duration: 0.4, // Animation duration in seconds
            startScale: 1.0,
            endScale: 8.0, // Expand outwards
            startOpacity: 0.8,
            endOpacity: 0.0, // Fade out
            easingFunc: Easing.easeOutQuad // Use an easing function
        };

        this.activeClickAnimations.push(animationData);
    } // <-- End of createClickAnimation
} // <-- End of class InputManager
