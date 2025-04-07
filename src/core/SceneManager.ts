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
        // Removed extra closing brace from here
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

    public getSceneNames(): string[] {
        return Array.from(this.scenes.keys());
    }


    private nextSceneId: string | null = null;

    public async changeScene(sceneId: string, transitionType: TransitionType = 'fade', assetLoader?: AssetLoader): Promise<void> {

        if (this.isTransitioning) {
            if (this.nextSceneId === sceneId) {
                return;
            }
            console.warn(`SceneManager: Already transitioning to scene "${this.nextSceneId}". Request to change to "${sceneId}" ignored.`);
            return;
        }

        if (!this.renderer || !this.fadeOverlay || !this.fadeMaterial || !this.glitchMaterial) {
            console.warn("SceneManager: Renderer or transition materials not ready. Switching scene without transition.");
            this.setScene(sceneId);
            return;
        }

        this.nextSceneId = sceneId;



        this.isTransitioning = true;

        try {
            // Transition out current scene
            if (transitionType === 'fade') {
                await this.fade(1, 1000, Easing.easeInCubic);
            } else { // glitch
                // Play glitch sound if loaded
                if (this.glitchSoundLoaded && this.gameEngine.soundManager) {
                    this.gameEngine.soundManager.playSound('glitch_transition', 0.5);
                }
                await this.glitchTransition(1, 1000, Easing.easeInCubic);
            }

            // Change scene
            this.setScene(sceneId);

            // Wait for assets to load if AssetLoader is provided
            if (assetLoader) {
                await assetLoader.isEverythingLoaded();
            }

            // Transition in new scene
            if (transitionType === 'fade') {
                await this.fade(0, 1000, Easing.easeOutCubic);
            } else { // glitch
                await this.glitchTransition(0, 1000, Easing.easeOutCubic);
                // Play glitch sound again when transitioning in
                if (this.glitchSoundLoaded && this.gameEngine.soundManager) {
                    this.gameEngine.soundManager.playSound('glitch_transition_2',  0.5);
                }
            }
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
                    // If fading out completely, remove overlay from scene
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
        if (!this.glitchMaterial || !this.renderer || !this._currentScene || !this.fadeOverlay) return;

        const startIntensity = this.glitchMaterial.uniforms.intensity.value;
        const startTime = performance.now();

        // Ensure the overlay mesh uses the glitch material
        this.fadeOverlay.material = this.glitchMaterial;

        // Add overlay to scene if not already present
        if (!this._currentScene.threeScene.children.includes(this.fadeOverlay)) {
            this._currentScene.threeScene.add(this.fadeOverlay);
        }

        // We need a render target to capture the current scene
        const renderTarget = new THREE.WebGLRenderTarget(this.renderer.domElement.width, this.renderer.domElement.height);

        return new Promise((resolve) => {
            const animate = (currentTime: number) => {
                if (!this.glitchMaterial || !this.renderer || !this._currentScene) {
                    renderTarget.dispose(); // Clean up render target on early exit
                    resolve(); // Exit if scene or renderer becomes invalid
                    return;
                }

                // 1. Render the current scene to the render target (excluding the overlay)
                this.fadeOverlay!.visible = false; // Hide overlay temporarily
                this.renderer.setRenderTarget(renderTarget);
                // Render the current scene using the GameEngine's main camera
                if (this.gameEngine.camera) {
                    this.renderer.render(this._currentScene.threeScene, this.gameEngine.camera);
                } else {
                    console.error("SceneManager: GameEngine does not have a 'camera' property for glitch transition.");
                    renderTarget.dispose();
                    resolve();
                    return;
                }
                this.renderer.setRenderTarget(null); // Reset render target
                this.fadeOverlay!.visible = true; // Make overlay visible again

                // 2. Update glitch shader uniforms
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const easedProgress = easingFn(progress);

                this.glitchMaterial.uniforms.time.value = currentTime * 0.001; // Pass time for animation
                this.glitchMaterial.uniforms.intensity.value = startIntensity + (targetIntensity - startIntensity) * easedProgress;
                this.glitchMaterial.uniforms.tDiffuse.value = renderTarget.texture;

                // 3. The GameEngine's render loop handles rendering the overlay

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Reset intensity and switch back material after transition completes
                    this.glitchMaterial.uniforms.intensity.value = targetIntensity;
                    if (targetIntensity === 0 && this.fadeMaterial && this.fadeOverlay) { // If glitching out (intensity -> 0) and materials/overlay exist
                       this.fadeOverlay.material = this.fadeMaterial; // Switch back to fade material
                       // Also remove overlay from scene
                       if (this._currentScene) {
                           this._currentScene.threeScene.remove(this.fadeOverlay);
                       }
                    }
                    renderTarget.dispose(); // Clean up render target
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

}



