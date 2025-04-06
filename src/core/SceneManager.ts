// src/core/SceneManager.ts
import * as THREE from 'three';
import { Scene } from './Scene';
import { GameState } from './GameState';
import { AssetLoader } from '../utils/AssetLoader';
import { Easing } from '../utils/Easing';

export class SceneManager {
    private scenes: Map<string, Scene>;
    private _currentScene: Scene | null;
    private gameState: GameState;
    private sceneChangeListeners: Array<(scene: Scene | null) => void> = [];
    private fadeOverlay: THREE.Mesh | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private isTransitioning: boolean = false;
    private initializedScenes: Set<string> = new Set();

    constructor(gameState: GameState) {
        this.scenes = new Map<string, Scene>();
        this._currentScene = null;
        this.gameState = gameState;
        this.isTransitioning = false;
        console.log("SceneManager initialized");
    }

    public setRenderer(renderer: THREE.WebGLRenderer): void {
        this.renderer = renderer;
        this.createFadeOverlay();
    }

    private createFadeOverlay(): void {
        if (!this.renderer) return;

        // Create overlay that covers the entire viewport
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0,
            depthTest: false
        });
        this.fadeOverlay = new THREE.Mesh(geometry, material);
        this.fadeOverlay.renderOrder = 999;
        this.fadeOverlay.frustumCulled = false;

        // Position and scale overlay to cover entire screen
        if (this.renderer) {
            // Make overlay large enough to cover any viewport size
            this.fadeOverlay.scale.set(10, 10, 1);
            // Position at camera's near plane (z = -1 in NDC)
            this.fadeOverlay.position.z = -0.6;
        }
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

        // Initialize the new scene if not already initialized
        if (!this.initializedScenes.has(name)) {
            this._currentScene.init();
            this.initializedScenes.add(name);
        }

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

    private nextSceneId: string | null = null;

    public async changeScene(sceneId: string, assetLoader?: AssetLoader): Promise<void> {

        if (this.isTransitioning) {
            if (this.nextSceneId === sceneId) {
                return;
            }
            console.warn(`SceneManager: Already transitioning to scene "${this.nextSceneId}". Request to change to "${sceneId}" ignored.`);
            return;
        }

        if (!this.renderer || !this.fadeOverlay) {
            this.setScene(sceneId);
            return;
        }

        this.nextSceneId = sceneId;

        this.isTransitioning = true;

        try {
            // Fade out current scene
            await this.fade(1, 1000, Easing.easeInCubic);

            // Change scene
            this.setScene(sceneId);

            // Wait for assets to load if AssetLoader is provided
            if (assetLoader) {
                await assetLoader.isEverythingLoaded();
            }

            // Fade in new scene
            await this.fade(0, 1000, Easing.easeOutCubic);
        } finally {
            this.isTransitioning = false;
            this.nextSceneId = null;
        }
    }

    private async fade(targetOpacity: number, duration: number, easingFn: (t: number) => number = Easing.linear): Promise<void> {
        if (!this.fadeOverlay || !this.renderer || !this._currentScene) return;

        const startOpacity = Array.isArray(this.fadeOverlay.material)
            ? this.fadeOverlay.material[0].opacity
            : this.fadeOverlay.material.opacity;
        const startTime = performance.now();

        // Add overlay to scene if not already present
        if (!this._currentScene.threeScene.children.includes(this.fadeOverlay)) {
            this._currentScene.threeScene.add(this.fadeOverlay);
        }

        return new Promise((resolve) => {
            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const material = this.fadeOverlay!.material as THREE.MeshBasicMaterial;
                if (Array.isArray(material)) {
                    material[0].opacity = startOpacity + (targetOpacity - startOpacity) * easingFn(progress);
                } else {
                    material.opacity = startOpacity + (targetOpacity - startOpacity) * easingFn(progress);
                }

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }
}