// src/utils/AssetLoader.ts
import * as THREE from 'three';

export class AssetLoader {
    private loadingManager: THREE.LoadingManager;
    private textureLoader: THREE.TextureLoader;
    private audioLoader: THREE.AudioLoader;
    private textureCache: Map<string, THREE.Texture>;
    private audioCache: Map<string, AudioBuffer>;
    private _isLoadComplete: boolean = false; // Flag to track initial load completion

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

        return new Promise((resolve, reject) => {
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
    }

    public async loadAudio(url: string): Promise<AudioBuffer> {
        // Check cache first
        if (this.audioCache.has(url)) {
            return this.audioCache.get(url)!;
        }

        return new Promise((resolve, reject) => {
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

    public isEverythingLoaded(): Promise<void> {
        console.log(`[AssetLoader] isEverythingLoaded called. Current _isLoadComplete flag: ${this._isLoadComplete}`);

        // If the main LoadingManager already reported completion, resolve immediately.
        if (this._isLoadComplete) {
            console.log(`[AssetLoader] Load already complete. Resolving immediately.`);
            return Promise.resolve();
        }

        // Otherwise, return a promise that waits for the LoadingManager's callbacks.
        // This handles cases where this is called *while* loading is still in progress.
        console.log(`[AssetLoader] Load not yet complete. Setting up promise with onLoad/onError handlers.`);
        return new Promise((resolve, reject) => {
            // Store original handlers if they exist (assigned in constructor)
            const originalOnLoad = this.loadingManager.onLoad;
            const originalOnError = this.loadingManager.onError;

            // Handler for successful loading completion for *this specific check*
            this.loadingManager.onLoad = () => {
                console.log(`[AssetLoader] loadingManager.onLoad triggered (isEverythingLoaded). Resolving promise.`);
                this._isLoadComplete = true; // Ensure flag is set
                if (originalOnLoad) originalOnLoad(); // Call constructor's handler
                resolve();
            };

            // Handler for loading errors for *this specific check*
            this.loadingManager.onError = (url) => {
                console.error(`[AssetLoader] loadingManager.onError triggered for URL: ${url} (isEverythingLoaded). Rejecting promise.`);
                 if (originalOnError) originalOnError(url); // Call constructor's handler
                // Decide if errors should mark loading as "complete" for this check
                // this._isLoadComplete = true;
                reject(new Error(`Asset loading failed for URL: ${url}`));
            };
        });
    }
}