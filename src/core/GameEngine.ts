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

        this.clock = new THREE.Clock();

        // Core Managers
        this.gameState = new GameState(); // Instantiate GameState
        this.sceneManager = new SceneManager(this.gameState); // Pass GameState to SceneManager
        this.inputManager = new InputManager(this.canvas, this.camera, this.sceneManager); // Pass canvas, camera, and sceneManager
        this.assetLoader = new AssetLoader();

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

            // 2. Render the current scene's THREE.Scene
            // The scene's render method might do more, but the core is rendering its internal threeScene
            // For simplicity now, we render the scene directly here.
            // A scene's render method could be used for post-processing effects later.
            // currentScene.render(this.renderer); // Option 1: Delegate rendering
            this.renderer.render(currentScene.threeScene, this.camera); // Option 2: Engine renders directly (using public property)
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
}