// src/utils/AssetLoader.ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GameEngine } from '../core/GameEngine';

export class AssetLoader {
    private loadingManager: THREE.LoadingManager;
    private textureLoader: THREE.TextureLoader;
    private audioLoader: THREE.AudioLoader;
    private textureCache: Map<string, THREE.Texture>;
    private audioCache: Map<string, AudioBuffer>;
    private modelCache: Map<string, THREE.Group>;
    private defaultTexture: THREE.Texture;
    private defaultAudioBuffer: AudioBuffer;
    private ktx2Loader: KTX2Loader;

    private _isLoadComplete: boolean = false; // Flag to track initial load completion
    private pendingPromises: Promise<any>[] = []; // Track all pending load operations

    constructor(private gameEngine: GameEngine) {
        this.defaultTexture = this.createDefaultTexture();
        this.defaultTexture.name = 'default_checkered';

        this.loadingManager = new THREE.LoadingManager(
            // onLoad callback for the manager itself
            () => {
                console.log('[AssetLoader] Initial loading complete (LoadingManager onLoad).');
                this._isLoadComplete = true;
            },
            // onProgress (optional)
            undefined,
            // onError callback for the manager itself
            (url) => {
                console.error(`[AssetLoader] Loading error on URL: ${url} (LoadingManager onError).`);
                // We might still consider loading "complete" even on error, depending on desired behavior
                // this._isLoadComplete = true; // Uncomment if errors shouldn't block completion check
            }
        );
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.textureCache = new Map();
        this.audioCache = new Map();
        this.modelCache = new Map();
        this.audioLoader = new THREE.AudioLoader(this.loadingManager);

        // Initialize KTX2 loader for GLTF models
        this.ktx2Loader = new KTX2Loader(this.loadingManager)
            .setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/libs/basis/')
            .detectSupport(this.gameEngine.getRenderer());
        // Create default silent audio buffer
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.defaultAudioBuffer = audioContext.createBuffer(1, 1, 22050); // 1 channel, 1 sample, 22.05kHz
    }

    private createDefaultTexture(): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d')!;

        // Create purple and black checkered pattern
        const size = 8;
        for (let y = 0; y < canvas.height; y += size) {
            for (let x = 0; x < canvas.width; x += size) {
                const isPurple = Math.floor(x / size) % 2 === Math.floor(y / size) % 2;
                context.fillStyle = isPurple ? '#800080' : '#000000';
                context.fillRect(x, y, size, size);
            }
        }

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    public async loadTexture(url: string): Promise<THREE.Texture> {
        // Check cache first
        if (this.textureCache.has(url)) {
            return this.textureCache.get(url)!;
        }

        const loadPromise = new Promise<THREE.Texture>((resolve, reject) => {
            // Handle paths that may or may not already include 'assets/'
            const cleanPath = url.startsWith('assets/') ? url : `assets/${url}`;
            console.log(`AssetLoader: Loading texture from resolved path: ${cleanPath}`);
            this.textureLoader.load(
                cleanPath,
                (texture) => {
                    texture.name = cleanPath; // Set the texture name to the path it was loaded from
                    console.log(`AssetLoader: Successfully loaded texture from ${cleanPath} (Name: ${texture.name})`);
                    this.textureCache.set(url, texture); // Cache using the original URL key
                    resolve(texture);
                },
                undefined,
                (error: unknown) => {
                    console.error(`AssetLoader: Error loading texture from ${cleanPath}:`, error);
                    let errorMessage = 'Unknown error';
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    } else if (error && typeof error === 'object' && 'type' in error) {
                        errorMessage = 'Network or file loading error';
                    } else {
                        errorMessage = String(error);
                    }
                    console.error(`AssetLoader: Using default texture for ${cleanPath} due to error: ${errorMessage}`);
                    console.error(`AssetLoader: Full error details for ${cleanPath}:`, {
                        errorType: typeof error,
                        errorObject: error,
                        stack: error instanceof Error ? error.stack : undefined
                    });
                    this.textureCache.set(url, this.defaultTexture);
                    resolve(this.defaultTexture);
                }
            );
        });
        this.pendingPromises.push(loadPromise);
        return loadPromise;
    }

    public async loadAudio(url: string): Promise<AudioBuffer> {
        // Check cache first
        if (this.audioCache.has(url)) {
            return this.audioCache.get(url)!;
        }

        const loadPromise = new Promise<AudioBuffer>((resolve, reject) => {
            // Handle paths that may or may not already include 'assets/'
            const cleanPath = url.startsWith('assets/') ? url : `assets/${url}`;
            console.log(`AssetLoader: Loading audio from resolved path: ${cleanPath}`);

            this.audioLoader.load(
                cleanPath,
                (audioBuffer) => {
                    console.log(`AssetLoader: Successfully loaded audio from ${cleanPath}`);
                    this.audioCache.set(url, audioBuffer);
                    resolve(audioBuffer);
                },
                undefined,
                (error: unknown) => {
                    console.error(`AssetLoader: Error loading audio from ${cleanPath}:`, error);
                    let errorMessage = 'Unknown error';
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    } else if (error && typeof error === 'object' && 'type' in error) {
                        errorMessage = 'Network or file loading error';
                    } else {
                        errorMessage = String(error);
                    }
                    console.error(`AssetLoader: Full error details for ${cleanPath}:`, {
                        errorType: typeof error,
                        errorObject: error,
                        stack: error instanceof Error ? error.stack : undefined
                    });
                    console.error(`AssetLoader: Using default silent audio for ${cleanPath} due to error: ${errorMessage}`);
                    this.audioCache.set(url, this.defaultAudioBuffer);
                    resolve(this.defaultAudioBuffer);
                }
            );
        });
        this.pendingPromises.push(loadPromise);
        return loadPromise;
    }

    public async loadModel(url: string): Promise<THREE.Group> {
        // Check cache first
        if (this.modelCache.has(url)) {
            return this.modelCache.get(url)!;
        }

        const gltfLoader = new GLTFLoader(this.loadingManager)
            .setKTX2Loader(this.ktx2Loader)
            .setMeshoptDecoder(MeshoptDecoder);
        const loadPromise = new Promise<THREE.Group>((resolve, reject) => {
            const cleanPath = url.startsWith('assets/') ? url : `assets/${url}`;
            console.log(`AssetLoader: Loading model from resolved path: ${cleanPath}`);

            gltfLoader.load(
                cleanPath,
                (gltf) => {
                    console.log(`AssetLoader: Successfully loaded model from ${cleanPath}`);
                    const model = gltf.scene;

                    // Create pivot group for centered rotation
                    const pivot = new THREE.Group();
                    const box = new THREE.Box3().setFromObject(model);
                    const center = new THREE.Vector3();
                    box.getCenter(center);

                    // Position pivot at scene center (0,0,0)
                    pivot.position.set(0, 0, 0);
                    pivot.add(model);

                    // Offset model within pivot to center it
                    model.position.copy(center).negate();

                    // Apply scale to pivot (1:1 by default)
                    pivot.scale.set(1, 1, 1);
                    pivot.name = `${url}_pivot`; // Name the pivot for potential debugging

                    this.modelCache.set(url, pivot); // Cache the pivot group
                    resolve(pivot); // Resolve the promise with the pivot group
                },
                undefined,
                (error: unknown) => {
                    console.error(`AssetLoader: Error loading model from ${cleanPath}:`, error);
                    let errorMessage = 'Unknown error';
                    if (error instanceof Error) {
                        errorMessage = error.message;
                    } else if (error && typeof error === 'object' && 'type' in error) {
                        errorMessage = 'Network or file loading error';
                    } else {
                        errorMessage = String(error);
                    }
                    console.error(`AssetLoader: Full error details for ${cleanPath}:`, {
                        errorType: typeof error,
                        errorObject: error,
                        stack: error instanceof Error ? error.stack : undefined
                    });
                    reject(new Error(`Failed to load model from ${cleanPath}: ${errorMessage}`));
                }
            );
        });
        this.pendingPromises.push(loadPromise);
        return loadPromise;
    }

    // Method to load multiple assets, perhaps for a specific scene
    public async loadAssets(assetList: { type: string, url: string, name: string }[]): Promise<Map<string, any>> {
        console.log("AssetLoader: Loading multiple assets (placeholder)");
        const loadedAssets = new Map<string, any>();
        // Implement logic to iterate through assetList and call appropriate load methods
        for (const asset of assetList) {
            try {
                if (asset.type === 'texture') {
                    const texture = await this.loadTexture(asset.url);
                    loadedAssets.set(asset.name, texture);
                } else if (asset.type === 'model') {
                    const model = await this.loadModel(asset.url);
                    loadedAssets.set(asset.name, model);
                } else if (asset.type === 'audio') {
                    const audio = await this.loadAudio(asset.url);
                    loadedAssets.set(asset.name, audio);
                }
            } catch (error) {
                console.error(`AssetLoader: Failed to load asset ${asset.name} from ${asset.url}`, error);
            }
        }
        console.log("AssetLoader: Finished loading assets (placeholder)");
        return loadedAssets;
    }

    public async isEverythingLoaded(): Promise<void> {
        console.log(`[AssetLoader] isEverythingLoaded called. Current _isLoadComplete: ${this._isLoadComplete}, pending promises: ${this.pendingPromises.length}`);

        // Wait for both:
        // 1. LoadingManager's onLoad callback
        // 2. All individual load promises to complete
        await new Promise<void>((resolve, reject) => {
            const originalOnLoad = this.loadingManager.onLoad;
            const originalOnError = this.loadingManager.onError;

            this.loadingManager.onLoad = () => {
                console.log(`[AssetLoader] LoadingManager onLoad triggered`);
                this._isLoadComplete = true;
                if (originalOnLoad) originalOnLoad();
                resolve();
            };

            this.loadingManager.onError = (url) => {
                console.error(`[AssetLoader] LoadingManager onError for URL: ${url}`);
                if (originalOnError) originalOnError(url);
                reject(new Error(`Asset loading failed for URL: ${url}`));
            };

            // If already complete, resolve immediately
            if (this._isLoadComplete) {
                resolve();
            }
        });

        // Wait for all individual load operations to complete
        if (this.pendingPromises.length > 0) {
            console.log(`[AssetLoader] Waiting for ${this.pendingPromises.length} pending operations`);
            await Promise.all(this.pendingPromises);
            this.pendingPromises = []; // Clear completed promises
        }

        console.log(`[AssetLoader] All assets loaded confirmed`);
    }
}