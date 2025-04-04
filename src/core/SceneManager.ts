// src/core/SceneManager.ts
import { Scene } from './Scene';
import { GameState } from './GameState'; // Import GameState if needed for scene transitions

export class SceneManager {
    private scenes: Map<string, Scene>;
    private _currentScene: Scene | null;
    private gameState: GameState; // Optional: Pass GameState for context
    private sceneChangeListeners: Array<(scene: Scene | null) => void> = [];

    constructor(gameState: GameState) { // Pass GameState if needed
        this.scenes = new Map<string, Scene>();
        this._currentScene = null;
        this.gameState = gameState; // Store GameState
        console.log("SceneManager initialized");
    }

    // Add a listener for scene changes
    public onSceneChanged(callback: (scene: Scene | null) => void): void {
        this.sceneChangeListeners.push(callback);
    }

    public addScene(name: string, scene: Scene): void {
        if (this.scenes.has(name)) {
            console.warn(`SceneManager: Scene with name "${name}" already exists. Overwriting.`);
        }
        this.scenes.set(name, scene);
        console.log(`SceneManager: Scene "${name}" added.`);
    }

    public setScene(name: string): void {
        const newScene = this.scenes.get(name);
        if (!newScene) {
            console.error(`SceneManager: Scene with name "${name}" not found.`);
            return;
        }

        // Optional: Call exit method on the old scene
        // if (this._currentScene && typeof this._currentScene.onExit === 'function') {
        //     this._currentScene.onExit();
        // }

        this._currentScene = newScene;
        this.gameState.setScene(name); // Update game state
        console.log(`SceneManager: Current scene set to "${name}". Initializing...`);

        // Initialize the new scene
        this._currentScene.init();

        // Notify listeners about scene change
        for (const listener of this.sceneChangeListeners) {
            listener(this._currentScene);
        }

        // Optional: Call enter method on the new scene
        // if (typeof this._currentScene.onEnter === 'function') {
        //     this._currentScene.onEnter();
        // }
    }

    public get currentScene(): Scene | null {
        return this._currentScene;
    }

    public changeScene(sceneId: string): void {
        this.setScene(sceneId);
    }
}