// src/core/GameEngine.ts
import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { GameState } from './GameState';
import { Scene } from './Scene'; // Import base Scene type
import { AssetLoader } from '../utils/AssetLoader';

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private clock: THREE.Clock;

    public gameState: GameState;
    public sceneManager: SceneManager;
    public inputManager: InputManager;
    public assetLoader: AssetLoader;
    private cursorTexture: THREE.Texture | null = null;
    private cursorMesh: THREE.Mesh | null = null;
    private cursorMaterial: THREE.MeshPhongMaterial | null = null;
    private mouseX: number = 0;
    private mouseY: number = 0;
    private raycaster: THREE.Raycaster = new THREE.Raycaster();
    private isOverClickable: boolean = false;

    private animationFrameId: number | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        console.log("GameEngine: Initializing...");

        // Basic Three.js Setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true, // Enable anti-aliasing
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // Configure renderer further if needed (e.g., shadow maps, output encoding)
        // this.renderer.shadowMap.enabled = true;
        // this.renderer.outputEncoding = THREE.sRGBEncoding;

        // Basic Camera
        this.camera = new THREE.PerspectiveCamera(
            75, // Field of view
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        this.camera.position.z = 5; // Default camera position
        this.camera.layers.enable(1); // Enable layer 1 for cursor visibility

        this.clock = new THREE.Clock();

        // Core Managers
        this.gameState = new GameState(); // Instantiate GameState
        this.sceneManager = new SceneManager(this.gameState); // Pass GameState to SceneManager
        this.inputManager = new InputManager(this.canvas, this.camera, this.sceneManager); // Pass canvas, camera, and sceneManager
        this.assetLoader = new AssetLoader();

        // Set renderer in SceneManager for transitions
        this.sceneManager.setRenderer(this.renderer);

        // Add ambient light for phong materials
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        ambientLight.layers.enable(1);

        // Add light to each scene when it's created
        this.sceneManager.onSceneChanged((scene) => {
            if (scene && scene.threeScene) {
                scene.threeScene.add(ambientLight);
            }
        });

        // Load cursor texture after InputManager is initialized
        this.loadCursorTexture();

        // Handle window resizing
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        console.log("GameEngine: Initialization complete.");
    }

    public start(): void {
        if (this.animationFrameId !== null) {
            console.warn("GameEngine: start() called but engine is already running.");
            return;
        }
        console.log("GameEngine: Starting main loop...");
        this.clock.start();
        this.gameLoop(); // Start the loop
    }

    public stop(): void {
        if (this.animationFrameId !== null) {
            console.log("GameEngine: Stopping main loop...");
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
            this.clock.stop();
        } else {
            console.warn("GameEngine: stop() called but engine is not running.");
        }
    }

    private gameLoop(): void {
        this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));

        const deltaTime = this.clock.getDelta();
        const currentScene = this.sceneManager.currentScene;

        if (currentScene) {
            // 1. Update game logic
            currentScene.update(deltaTime);

            // 2. Update cursor position
            this.updateCursorPosition();

            // 3. Render the scene
            this.renderer.render(currentScene.threeScene, this.camera);
        } else {
            // Optionally clear the screen if no scene is active
            this.renderer.clear();
            // console.log("GameEngine: No active scene to render/update."); // Avoid logging every frame
        }
    }

    private onWindowResize(): void {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();

        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        console.log("GameEngine: Window resized.");
        // Notify current scene about resize if needed
        // if (this.sceneManager.currentScene && typeof this.sceneManager.currentScene.onResize === 'function') {
        //     this.sceneManager.currentScene.onResize(window.innerWidth, window.innerHeight);
        // }
    }

    // Optional: Method to clean up resources
    public dispose(): void {
        this.stop();
        this.inputManager.dispose(); // Clean up input listeners
        window.removeEventListener('resize', this.onWindowResize);
        // Dispose Three.js resources (geometry, materials, textures) if necessary
        this.renderer.dispose();
        console.log("GameEngine: Disposed.");
    }

    private async loadCursorTexture(): Promise<void> {
        try {
            // Use absolute path from project root
            const texture = await this.assetLoader.loadTexture('assets/cursor/cursor_normal.png');
            this.cursorTexture = texture;

            // Create cursor material with glow effect capability
            this.cursorMaterial = new THREE.MeshPhongMaterial({
                map: texture,
                transparent: true,
                depthTest: false,
                side: THREE.DoubleSide, // Make visible from both sides
                color: new THREE.Color(0xffffff), // Default white color
                emissive: new THREE.Color(0x000000),
                emissiveIntensity: 0,
                shininess: 0
            });

            // Create cursor mesh
            this.cursorMesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.06, 0.06), // Adjust size for better visibility
                this.cursorMaterial
            );
            this.cursorMesh.renderOrder = 999; // Ensure it renders on top

            // Make cursor non-interactive for raycasting
            this.cursorMesh.userData.isCustomCursor = true;
            this.cursorMesh.layers.set(1); // Put cursor on a different layer

            // Hide system cursor
            document.body.style.cursor = 'none';
            this.canvas.style.cursor = 'none';

            // Use InputManager's mouse position instead of adding our own listener
            this.inputManager.onMouseMove((x, y) => {
                this.mouseX = x;
                this.mouseY = y;
            });

        } catch (error) {
            console.error('Failed to load cursor texture:', error);
        }
    }

    private updateCursorPosition(): void {
        if (!this.cursorMesh || !this.cursorMaterial || !this.sceneManager.currentScene) return;

        // Convert mouse coordinates to normalized device coordinates
        const rect = this.canvas.getBoundingClientRect();
        const x = ((this.mouseX - rect.left) / rect.width) * 2 - 1;
        const y = -((this.mouseY - rect.top) / rect.height) * 2 + 1;

        // Create a fixed distance from camera for consistent cursor size
        const distance = 0.5; // Closer to camera for better visibility

        // Update cursor position in 3D space
        this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

        // Check if cursor is over a clickable object
        this.checkCursorOverClickable(new THREE.Vector2(x, y));

        // Position the cursor along the ray at a fixed distance
        const cursorPosition = new THREE.Vector3();
        cursorPosition.copy(this.raycaster.ray.origin).addScaledVector(this.raycaster.ray.direction, distance);
        this.cursorMesh.position.copy(cursorPosition);

        // Make cursor face the camera
        //this.cursorMesh.lookAt(this.camera.position);

        // Add cursor to current scene if not already present
        const currentScene = this.sceneManager.currentScene.threeScene;
        if (!currentScene.children.includes(this.cursorMesh)) {
            currentScene.add(this.cursorMesh);
        }

        // Update cursor appearance based on whether it's over a clickable object
        this.updateCursorAppearance();
    }

    private checkCursorOverClickable(mousePosition: THREE.Vector2): void {
        if (!this.sceneManager.currentScene) return;

        // Create a temporary raycaster for checking clickable objects
        const tempRaycaster = new THREE.Raycaster();
        tempRaycaster.setFromCamera(mousePosition, this.camera);

        // Get all objects in the scene except the cursor
        const objects = this.sceneManager.currentScene.threeScene.children.filter(
            obj => !obj.userData.isCustomCursor && !obj.userData.isBackground
        );

        // Check for intersections
        const intersects = tempRaycaster.intersectObjects(objects, true);

        // Update isOverClickable flag
        this.isOverClickable = intersects.length > 0;
    }

    private updateCursorAppearance(): void {
        if (!this.cursorMaterial) return;

        if (this.isOverClickable) {
            // Make cursor glow when over clickable object
            this.cursorMaterial.color.set(0xffff00); // Yellow glow
            this.cursorMaterial.emissive.set(0xffff00);
            this.cursorMaterial.emissiveIntensity = 0.5;
            this.cursorMaterial.needsUpdate = true;
        } else {
            // Reset to normal appearance
            this.cursorMaterial.color.set(0xffffff); // White (normal)
            this.cursorMaterial.emissive.set(0x000000);
            this.cursorMaterial.emissiveIntensity = 0;
            this.cursorMaterial.needsUpdate = true;
        }
    }
}