// src/utils/AssetLoader.ts
import * as THREE from 'three';

export class AssetLoader {
    private loadingManager: THREE.LoadingManager;
    private textureLoader: THREE.TextureLoader;
    private audioLoader: THREE.AudioLoader;
    private textureCache: Map<string, THREE.Texture>;
    private audioCache: Map<string, AudioBuffer>;
    private _isLoadComplete: boolean = false; // Flag to track initial load completion
    private pendingPromises: Promise<any>[] = []; // Track all pending load operations

    constructor() {
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
        this.audioLoader = new THREE.AudioLoader(this.loadingManager);
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
                    console.error(`AssetLoader: Full error details for ${cleanPath}:`, {
                        errorType: typeof error,
                        errorObject: error,
                        stack: error instanceof Error ? error.stack : undefined
                    });
                    reject(new Error(`Failed to load texture from ${cleanPath}: ${errorMessage}`));
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
                    reject(new Error(`Failed to load audio from ${cleanPath}: ${errorMessage}`));
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
                } // Add cases for 'model', 'audio', etc.
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