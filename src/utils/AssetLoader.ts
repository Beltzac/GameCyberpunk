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
            this.textureLoader.load(
                url,
                (texture) => {
                    this.textureCache.set(url, texture);
                    resolve(texture);
                },
                undefined,
                (error) => {
                    reject(new Error(`Failed to load texture from ${url}: ${error}`));
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
}