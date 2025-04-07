// src/core/SoundManager.ts
import * as THREE from 'three';
import { AssetLoader } from '../utils/AssetLoader';

export class SoundManager {
    private audioListener: THREE.AudioListener;
    private sounds: Map<string, THREE.Audio>;
    private backgroundSounds: Map<string, THREE.Audio>;
    private assetLoader: AssetLoader;

    constructor(camera: THREE.Camera, assetLoader: AssetLoader) {
        this.audioListener = new THREE.AudioListener();
        camera.add(this.audioListener);
        this.sounds = new Map();
        this.backgroundSounds = new Map();
        this.assetLoader = assetLoader;
    }

    public async loadSound(name: string, url: string, isBackground: boolean = false): Promise<void> {
        try {
            const audioBuffer = await this.assetLoader.loadAudio(url);
            const sound = new THREE.Audio(this.audioListener);
            sound.setBuffer(audioBuffer);

            if (isBackground) {
                sound.setLoop(true);
                this.backgroundSounds.set(name, sound);
            } else {
                this.sounds.set(name, sound);
            }
        } catch (error) {
            console.error(`Failed to load sound ${name}:`, error);
            throw error;
        }
    }

    public playSound(name: string, volume: number = 0.5): void {
        const sound = this.sounds.get(name);
        if (sound) {
            sound.setVolume(volume);
            sound.play();
        }
    }

    public playBackground(name: string, volume: number = 0.3): void {
        this.stopAllBackground();
        const sound = this.backgroundSounds.get(name);
        if (sound) {
            sound.setVolume(volume);
            sound.play();
        }
    }

    public stopAllBackground(): void {
        this.backgroundSounds.forEach(sound => {
            sound.stop();
        });
    }

    public dispose(): void {
        this.stopAllBackground();
        this.sounds.clear();
        this.backgroundSounds.clear();
    }
}