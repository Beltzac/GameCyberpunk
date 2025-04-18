import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { InputManager } from './InputManager';
import { UIManager } from '../ui/UIManager'; // Import UIManager
import { GameState } from './GameState';
import { AssetLoader } from '../utils/AssetLoader';
import { SoundManager } from './SoundManager';
import { createGameLoop } from '@wmcmurray/game-loop-js';

const CAMERA_FRUSTUM_SIZE = 8; // Centralized camera frustum size
const TARGET_FPS = 60;

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private renderer: THREE.WebGLRenderer;
    public getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }
    public camera: THREE.OrthographicCamera; // Made public

    public gameState: GameState;
    public sceneManager: SceneManager; // Keep only one declaration
    public inputManager: InputManager;
    public uiManager: UIManager; // Add UIManager property
    public assetLoader: AssetLoader;
    public soundManager: SoundManager;
    private gameLoop: any;
    private clock: THREE.Clock;
    private animationFrameId: number | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        console.log("GameEngine: Initializing...");

        // Basic Three.js Setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true, // Enable anti-aliasing
        });

        this.renderer.localClippingEnabled = true; // Re-enable for post clipping
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // Basic Camera
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = CAMERA_FRUSTUM_SIZE; // Use constant

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
        this.assetLoader = new AssetLoader(this); // Initialize assetLoader *before* inputManager
        this.soundManager = new SoundManager(this.camera, this.assetLoader);
        this.gameState = new GameState();
        this.sceneManager = new SceneManager(this.gameState, this);
        this.uiManager = new UIManager(); // Instantiate UIManager
        this.inputManager = new InputManager(this.canvas, this.camera, this.sceneManager, this.assetLoader, this.uiManager, this.soundManager); // Pass uiManager and soundManager

        // Set renderer in SceneManager for transitions
        this.sceneManager.setRenderer(this.renderer);
        this.uiManager.setSceneManager(this.sceneManager); // Connect UIManager and SceneManager

        // Handle window resizing
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        console.log("GameEngine: Initialization complete.");
    }

    public async start(): Promise<void> {
        if (this.animationFrameId !== null) {
            console.warn("GameEngine: start() called but engine is already running.");
            return;
        }
        console.log("GameEngine: Starting...");

        // Set initial scene based on localStorage or default
        const initialSceneName = this.uiManager.getInitialScene();
        const availableScenes = this.sceneManager.getSceneNames();

        if (initialSceneName && availableScenes.includes(initialSceneName)) {
            console.log(`GameEngine: Setting initial scene from localStorage: ${initialSceneName}`);
            await this.sceneManager.setScene(initialSceneName); // Set without transition
        } else if (availableScenes.length > 0) {
            const defaultScene = availableScenes[0]; // Use the first registered scene as default
            console.log(`GameEngine: No valid initial scene in localStorage or none set. Setting default scene: ${defaultScene}`);
            await this.sceneManager.setScene(defaultScene); // Set default without transition
        } else {
            // This case should ideally not happen if scenes are registered before start()
            console.error("GameEngine: No scenes registered! Cannot start.");
            // Optionally throw an error or prevent starting
            return; // Prevent starting if no scenes
        }

        console.log("GameEngine: Starting main loop...");
        this.clock.start();
        this.startGameLoop(); // Start the loop
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

    private startGameLoop(): void {
        this.gameLoop = createGameLoop((deltaTime: number) => {
            const currentScene = this.sceneManager.currentScene;

            if (currentScene) {
                // Measure update time
                const updateStartTime = performance.now();
                currentScene.update(deltaTime);
                const updateEndTime = performance.now();
                const updateTime = updateEndTime - updateStartTime;

                // Get object count
                let objectCount = 0;
                currentScene.threeScene.traverse(() => {
                    objectCount++;
                });

                // 2. Update InputManager (handles cursor position and click animations)
                this.inputManager.update(deltaTime);

                // Get scene-specific performance data
                const scenePerformanceData = currentScene.getPerformanceData();

                // Update UI Manager with performance metrics
                this.uiManager.update(deltaTime, updateTime, objectCount, scenePerformanceData);

                // 3. Render the scene
                this.renderer.render(currentScene.threeScene, this.camera);
            } else {
                // Optionally clear the screen if no scene is active
                this.renderer.clear();
                // Still update UI Manager even if no scene, maybe show a loading state or similar
                this.uiManager.update(deltaTime, 0, 0, {}); // Pass empty object for performance data
            }
        }, TARGET_FPS);

        this.renderer.setAnimationLoop(this.gameLoop.loop.bind(this.gameLoop));
    }

    private onWindowResize(): void {
        // Update camera
        const aspect = window.innerWidth / window.innerHeight;
        const frustumSize = CAMERA_FRUSTUM_SIZE; // Use constant

        this.camera.left = frustumSize * aspect / - 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / - 2;
        this.camera.updateProjectionMatrix();

        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        console.log("GameEngine: Window resized.");
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
