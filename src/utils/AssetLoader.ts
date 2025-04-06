// src/utils/AssetLoader.ts
import * as THREE from 'three';

export class AssetLoader {
    private loadingManager: THREE.LoadingManager;
    private textureLoader: THREE.TextureLoader;
    private textureCache: Map<string, THREE.Texture>;

    constructor() {
        this.loadingManager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.textureCache = new Map();
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

    // Add methods for loading models, audio, etc.
    // public async loadModel(url: string): Promise<THREE.Group> { ... }
    // public async loadAudio(url: string): Promise<AudioBuffer> { ... }

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
        return new Promise((resolve) => {
            this.loadingManager.onLoad = () => resolve();
        });
    }
}