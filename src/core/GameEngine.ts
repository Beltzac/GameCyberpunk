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
    private camera: THREE.OrthographicCamera;
    private clock: THREE.Clock;

    public gameState: GameState;
    public sceneManager: SceneManager; // Keep only one declaration
    public inputManager: InputManager;
    public assetLoader: AssetLoader;
    // Removed cursor properties: cursorTexture, cursorMesh, cursorMaterial, mouseX, mouseY, raycaster, isOverClickable
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
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 5; // Adjust as needed

        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / - 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / - 2,
            0.1,
            1000
        );
        this.camera.position.z = 5; // Default camera position
        console.log("Camera Layer: ", this.camera.layers.mask);
        this.camera.layers.enable(1); // Enable layer 1 for cursor visibility

        this.clock = new THREE.Clock();

        // Core Managers
        this.gameState = new GameState();
        this.assetLoader = new AssetLoader(); // Initialize assetLoader *before* inputManager
        this.sceneManager = new SceneManager(this.gameState, this);
        this.inputManager = new InputManager(this.canvas, this.camera, this.sceneManager, this.assetLoader); // Now assetLoader is initialized

        // Set renderer in SceneManager for transitions
        this.sceneManager.setRenderer(this.renderer);

        // Add ambient light for phong materials
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Adjusted intensity slightly
        // Removed ambientLight.layers.set(1) - Layer 1 is now managed by InputManager for the cursor
        // Keep camera layer 1 enabled as InputManager uses it.

        // Add light to each scene when it's created
        this.sceneManager.onSceneChanged((scene) => {
            if (scene && scene.threeScene) {
                // Add ambient light if not already present
                if (!scene.threeScene.children.some(child => child instanceof THREE.AmbientLight)) {
                     scene.threeScene.add(ambientLight.clone()); // Clone to avoid issues if light is removed elsewhere
                }
            }
        });

        // Removed loadCursorTexture call - InputManager handles this now

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
            // Removed call to this.updateCursorPosition() - InputManager handles this
            // 3. Render the scene
            this.renderer.render(currentScene.threeScene, this.camera);
        } else {
            // Optionally clear the screen if no scene is active
            this.renderer.clear();
            // console.log("GameEngine: No active scene to render/update."); // Avoid logging every frame
        }
    }

    private onWindowResize(): void {
        // Update camera
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = 5;

        this.camera.left = frustumSize * aspect / - 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / - 2;
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

    // Removed cursor methods: loadCursorTexture, updateCursorPosition, checkCursorOverClickable, updateCursorAppearance
}