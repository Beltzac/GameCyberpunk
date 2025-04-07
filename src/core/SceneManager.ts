// src/core/SceneManager.ts
import * as THREE from 'three';
import { Scene } from './Scene';
import { GameEngine } from './GameEngine';
import { GameState } from './GameState';
import { AssetLoader } from '../utils/AssetLoader';
import { Easing } from '../utils/Easing';
import { SoundManager } from './SoundManager';


export type TransitionType = 'fade' | 'glitch';
export class SceneManager {
    private scenes: Map<string, Scene>;
    private _currentScene: Scene | null;
    public gameEngine: GameEngine; // Reference to the main GameEngine
    private gameState: GameState;
    private sceneChangeListeners: Array<(scene: Scene | null) => void> = [];
    private fadeOverlay: THREE.Mesh | null = null;
    private renderer: THREE.WebGLRenderer | null = null;
    private glitchMaterial: THREE.ShaderMaterial | null = null;
    private fadeMaterial: THREE.MeshBasicMaterial | null = null;
    private isTransitioning: boolean = false;
    private initializedScenes: Set<string> = new Set();

    private glitchSoundLoaded: boolean = false;

    constructor(gameState: GameState, gameEngine: any) {
        this.scenes = new Map<string, Scene>();
        this._currentScene = null;
        this.gameEngine = gameEngine;
        this.gameState = gameState;
        this.isTransitioning = false;
        console.log("SceneManager initialized");

        // Load glitch sound if SoundManager is available
        if (this.gameEngine.soundManager) {
            this.gameEngine.soundManager.loadSound(
                'glitch_transition',
                'sounds/glitch_transition.wav'
            ).then(() => {
                this.glitchSoundLoaded = true;
            }).catch(error => {
                console.error('Failed to load glitch sound:', error);
            });

            this.gameEngine.soundManager.loadSound(
                'glitch_transition_2',
                'sounds/glitch_transition_2.wav'
            ).then(() => {
                this.glitchSoundLoaded = true;
            }).catch(error => {
                console.error('Failed to load glitch sound:', error);
            });
        }
    }

    public setRenderer(renderer: THREE.WebGLRenderer): void {
        this.renderer = renderer;
        this.createFadeOverlay();
        this.createGlitchMaterial();
    }

    private createFadeOverlay(): void {
        if (!this.renderer || !this.gameEngine || !this.gameEngine.camera) {
            console.error("SceneManager: Cannot create fade overlay without renderer, gameEngine, or camera.");
            return;
        }
        const camera = this.gameEngine.camera;

        // Calculate the size needed to fill the frustum at the near plane
        const distance = camera.near + 0.01; // Place slightly in front of near plane
        let height: number;
        let width: number;

        // Assuming OrthographicCamera based on user instruction
        if (camera.type === 'OrthographicCamera') {
             // Explicitly cast after checking type
            const orthographicCamera = camera as THREE.OrthographicCamera;
            height = orthographicCamera.top - orthographicCamera.bottom;
            width = orthographicCamera.right - orthographicCamera.left;
        } else {
             console.error(`SceneManager: Expected OrthographicCamera but received ${camera.type}. Overlay sizing might be incorrect.`);
             // Fallback sizing if not Orthographic
             height = 2; // Default height
             width = 2 * (window.innerWidth / window.innerHeight); // Approximate aspect
        }

        // Create overlay geometry with calculated size
        const geometry = new THREE.PlaneGeometry(width, height);
        this.fadeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0,
            depthTest: false
        });
        const material = this.fadeMaterial; // Start with fade material
        this.fadeOverlay = new THREE.Mesh(geometry, material);
        this.fadeOverlay.renderOrder = 999;
        this.fadeOverlay.frustumCulled = false;

        // Position the overlay relative to the camera
        // Place it at the calculated distance along the camera's look direction
        this.fadeOverlay.position.copy(camera.position);
        const lookDirection = new THREE.Vector3();
        camera.getWorldDirection(lookDirection);
        this.fadeOverlay.position.addScaledVector(lookDirection, distance);
        // Make the overlay look at the camera's position
        this.fadeOverlay.lookAt(camera.position);
    }

    private createGlitchMaterial(): void {
        this.glitchMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                intensity: { value: 0.0 },
                tDiffuse: { value: null } // Will be set dynamically
            },
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform float time;
              uniform float intensity;
              uniform sampler2D tDiffuse;
              varying vec2 vUv;

              float rand(vec2 co){
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
              }

              void main() {
                vec2 uv = vUv;
                float glitchTime = mod(time * 0.5 + intensity * 5.0, 2.0);
                float displacement = intensity * (rand(vec2(glitchTime)) - 0.5) * 0.1;
                float colorShift = intensity * (rand(vec2(glitchTime + 0.1)) - 0.5) * 0.05;

                if (rand(vec2(floor(glitchTime * 10.0))) > 0.85) {
                    uv.x += displacement;
                }

                vec4 color = texture2D(tDiffuse, uv);

                if (rand(vec2(floor(glitchTime * 15.0))) > 0.9) {
                    color.r = texture2D(tDiffuse, uv + vec2(colorShift, 0.0)).r;
                    color.g = texture2D(tDiffuse, uv - vec2(colorShift, 0.0)).g;
                }

                float noise = rand(uv + mod(time, 1.0)) * 0.2 * intensity;
                color.rgb -= noise;

                gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 0.0), vec4(color.rgb, 1.0), intensity);
              }
            `,
            transparent: true,
            depthTest: false
        });
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

    public async setScene(name: string): Promise<void> {
        const newScene = this.scenes.get(name);
        if (!newScene) {
            console.error(`SceneManager: Scene with name "${name}" not found.`);
            return;
        }

        // Call exit method on the old scene if it exists
        if (this._currentScene && typeof this._currentScene.onExit === 'function') {
            await this._currentScene.onExit();
        }

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

        // Call enter method on the new scene if it exists
        if (this._currentScene && typeof this._currentScene.onEnter === 'function') {
            //await this.gameEngine.assetLoader.isEverythingLoaded();
            await this._currentScene.onEnter();
        }
    }

    public get currentScene(): Scene | null {
        return this._currentScene;
    }

    public getSceneNames(): string[] {
        return Array.from(this.scenes.keys());
    }


    private nextSceneId: string | null = null;

    public async changeScene(sceneId: string, transitionType: TransitionType = 'fade', assetLoader?: AssetLoader): Promise<void> {
        console.log(`[SceneManager] Starting transition to scene "${sceneId}" with ${transitionType} transition`);

        if (this.isTransitioning) {
            if (this.nextSceneId === sceneId) {
                return; // Already transitioning to the requested scene
            }
            console.warn(`SceneManager: Already transitioning to scene "${this.nextSceneId}". Request to change to "${sceneId}" ignored.`);
            return;
        }

        // Log component status before the check
        console.log(`[SceneManager] Checking transition readiness: renderer=${!!this.renderer}, fadeOverlay=${!!this.fadeOverlay}, fadeMaterial=${!!this.fadeMaterial}, glitchMaterial=${!!this.glitchMaterial}`);

        if (!this.renderer || !this.fadeOverlay || !this.fadeMaterial || !this.glitchMaterial) {
            console.warn(`[SceneManager] Transition aborted: Renderer or transition materials not ready. Switching scene directly.`); // Ensure this logs
            try {
                await this.setScene(sceneId);
            } catch (error) {
                 console.error(`[SceneManager] Error calling setScene directly after failed readiness check:`, error);
            }
            return; // Exit after direct switch
        }

        this.nextSceneId = sceneId;
        this.isTransitioning = true;

        try {
            console.log(`[SceneManager] Beginning transition out from current scene`);
            // Transition out current scene
            if (transitionType === 'fade') {
                console.log(`[SceneManager] Starting fade out transition`);
                await this.fade(1, 1000, Easing.easeInCubic);
            } else { // glitch
                // Play glitch sound if loaded
                if (this.glitchSoundLoaded && this.gameEngine.soundManager) {
                    try {
                        await this.gameEngine.soundManager.playSound('glitch_transition', 0.5);
                    } catch (error) {
                        console.error('Failed to play glitch transition sound:', error);
                    }
                }
                await this.glitchTransition(1, 1000, Easing.easeInCubic);
            }

            // Change scene
            console.log(`[SceneManager] Performing scene change to "${sceneId}"`);
            await this.setScene(sceneId);
            console.log(`[SceneManager] Scene change to "${sceneId}" completed`);

            // Wait for assets to load if AssetLoader is provided
            if (assetLoader) {
                //await assetLoader.isEverythingLoaded();
            }

            // Transition in new scene
            console.log(`[SceneManager] Beginning transition into new scene`);
            if (transitionType === 'fade') {
                console.log(`[SceneManager] Starting fade in transition`);
                await this.fade(0, 1000, Easing.easeOutCubic);
            } else { // glitch
                await this.glitchTransition(0, 1000, Easing.easeOutCubic);
                // Play glitch sound again when transitioning in
                if (this.glitchSoundLoaded && this.gameEngine.soundManager) {
                    try {
                        await this.gameEngine.soundManager.playSound('glitch_transition_2', 0.5);
                    } catch (error) {
                        console.error('Failed to play glitch transition sound:', error);
                    }
                }
            }

            console.log(`[SceneManager] Transition to "${sceneId}" completed successfully`);
        } catch (error) {
            console.error(`[SceneManager] Error during transition to "${sceneId}":`, error);
            // Don't rethrow here, let finally handle cleanup
        } finally {
            this.isTransitioning = false;
            this.nextSceneId = null;
            console.log(`[SceneManager] Transition state reset`);
        }
    }

    private async fade(targetOpacity: number, duration: number, easingFn: (t: number) => number = Easing.linear): Promise<void> {
        if (!this.fadeOverlay || !this.renderer || !this._currentScene) return;

        const material = this.fadeOverlay.material as THREE.MeshBasicMaterial; // Assume it's MeshBasicMaterial for fade
        const startOpacity = material.opacity;
        const startTime = performance.now();

        // Add overlay to scene if not already present
        if (!this._currentScene.threeScene.children.includes(this.fadeOverlay)) {
            this._currentScene.threeScene.add(this.fadeOverlay);
        }
        // Ensure the correct material is set
        this.fadeOverlay.material = this.fadeMaterial!;

        return new Promise((resolve) => {
            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                const currentMaterial = this.fadeOverlay!.material as THREE.MeshBasicMaterial;
                currentMaterial.opacity = startOpacity + (targetOpacity - startOpacity) * easingFn(progress);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // If fading out completely (opacity 0), remove overlay from scene
                    if (targetOpacity === 0 && this._currentScene && this.fadeOverlay) {
                        this._currentScene.threeScene.remove(this.fadeOverlay);
                    }
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    private async glitchTransition(targetIntensity: number, duration: number, easingFn: (t: number) => number = Easing.linear): Promise<void> {
        // Log component status IMMEDIATELY upon entry
        console.log(`[glitchTransition] Entered. Status: glitchMaterial=${!!this.glitchMaterial}, renderer=${!!this.renderer}, currentScene=${!!this._currentScene}, fadeOverlay=${!!this.fadeOverlay}`);

        if (!this.glitchMaterial || !this.renderer || !this._currentScene || !this.fadeOverlay) {
             console.warn(`[glitchTransition] Aborting: One or more required components are missing.`);
             return; // Exit if components are missing
        }

        console.log(`[glitchTransition] Starting animation. Target intensity: ${targetIntensity}, Duration: ${duration}`);
        const startIntensity = this.glitchMaterial.uniforms.intensity.value;
        const startTime = performance.now();

        // Ensure the overlay mesh uses the glitch material
        this.fadeOverlay.material = this.glitchMaterial;

        // Add overlay to scene if not already present
        if (!this._currentScene.threeScene.children.includes(this.fadeOverlay)) {
            this._currentScene.threeScene.add(this.fadeOverlay);
        }

        // We need a render target to capture the current scene
        // Ensure renderer dimensions are valid
        const width = this.renderer.domElement.width;
        const height = this.renderer.domElement.height;
        if (width <= 0 || height <= 0) {
            console.error(`[glitchTransition] Invalid renderer dimensions (${width}x${height}). Cannot create render target.`);
            return;
        }
        const renderTarget = new THREE.WebGLRenderTarget(width, height);

        return new Promise<void>((resolve) => { // Explicitly type Promise
            const animate = (currentTime: number) => {
                // console.log(`[glitchTransition] animate frame at time: ${currentTime.toFixed(2)}`); // Optional: Very verbose log

                // Re-check components inside loop in case something changes (e.g., scene disposed)
                if (!this.glitchMaterial || !this.renderer || !this._currentScene || !this.fadeOverlay) {
                    console.warn(`[glitchTransition] Animation aborted mid-loop: Missing required components.`);
                    renderTarget.dispose();
                    resolve();
                    return;
                }

                try {
                    // 1. Render the current scene to the render target (excluding the overlay)
                    this.fadeOverlay.visible = false; // Hide overlay temporarily
                    this.renderer.setRenderTarget(renderTarget);

                    if (this.gameEngine.camera) {
                        this.renderer.render(this._currentScene.threeScene, this.gameEngine.camera);
                    } else {
                        console.error("[glitchTransition] GameEngine does not have a 'camera' property.");
                        this.renderer.setRenderTarget(null); // Reset render target before exiting
                        renderTarget.dispose();
                        resolve(); // Resolve promise even on error to avoid hanging
                        return;
                    }
                    this.renderer.setRenderTarget(null); // Reset render target
                    this.fadeOverlay.visible = true; // Make overlay visible again

                    // 2. Update glitch shader uniforms
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easedProgress = easingFn(progress);
                    const currentIntensity = startIntensity + (targetIntensity - startIntensity) * easedProgress;
                    // console.log(`[glitchTransition] Progress: ${progress.toFixed(3)}, Eased: ${easedProgress.toFixed(3)}, Intensity: ${currentIntensity.toFixed(3)}`);

                    this.glitchMaterial.uniforms.time.value = currentTime * 0.001;
                    this.glitchMaterial.uniforms.intensity.value = currentIntensity;
                    this.glitchMaterial.uniforms.tDiffuse.value = renderTarget.texture;

                    // 3. The GameEngine's render loop handles rendering the overlay

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        console.log(`[glitchTransition] Animation loop finished. Final intensity: ${currentIntensity.toFixed(3)}`);
                        // Reset intensity and switch back material after transition completes
                        this.glitchMaterial.uniforms.intensity.value = targetIntensity; // Ensure final value is set

                        if (targetIntensity === 0 && this.fadeMaterial && this.fadeOverlay) {
                           console.log(`[glitchTransition] Resetting material to fade and removing overlay.`);
                           this.fadeOverlay.material = this.fadeMaterial;
                           if (this._currentScene) {
                               this._currentScene.threeScene.remove(this.fadeOverlay);
                           }
                        }
                        renderTarget.dispose();
                        console.log(`[glitchTransition] Resolving promise.`);
                        resolve();
                    }
                } catch (error) {
                    console.error("[glitchTransition] Error inside animation loop:", error);
                    renderTarget.dispose(); // Ensure cleanup on error
                    resolve(); // Resolve promise even on error to avoid hanging
                }
            }; // End of animate function definition

            requestAnimationFrame(animate);
        }); // End of Promise constructor
    } // End of glitchTransition method

}
