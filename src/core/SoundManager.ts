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
            console.log(`[SoundManager] Loaded audio buffer for ${name}`);
            const sound = new THREE.Audio(this.audioListener);
            sound.setBuffer(audioBuffer);

            if (isBackground) {
                sound.setLoop(true);
                this.backgroundSounds.set(name, sound);
                console.log(`[SoundManager] Added background sound ${name}`);
            } else {
                this.sounds.set(name, sound);
                console.log(`[SoundManager] Added sound effect ${name}`);
            }
        } catch (error) {
            console.error(`Failed to load sound ${name}:`, error);
            throw error;
        }
    }

    public async playSound(name: string, volume: number = 0.5): Promise<void> {
        try {
            await this.assetLoader.isEverythingLoaded();
            const sound = this.sounds.get(name);
            if (sound) {
                console.log(`[SoundManager] Playing sound ${name} at volume ${volume}`);
                sound.setVolume(volume);
                sound.play();
            } else {
                console.warn(`[SoundManager] Sound ${name} not found`);
            }
        } catch (error) {
            console.error(`[SoundManager] Error waiting for assets to load before playing ${name}:`, error);
            throw error;
        }
    }

    public async playBackground(name: string, volume: number = 0.3): Promise<void> {
        try {
            await this.assetLoader.isEverythingLoaded();
            const sound = this.backgroundSounds.get(name);
            if (sound) {
                const buffer = sound.buffer;
                if (buffer) {
                    const duration = buffer.duration;
                    const randomOffset = Math.random() * duration;
                    console.log(`[SoundManager] Playing background sound ${name} at volume ${volume}, starting at ${randomOffset.toFixed(2)}s of ${duration.toFixed(2)}s`);
                    sound.setVolume(volume);
                    sound.offset = randomOffset;
                    sound.play();
                } else {
                    console.warn(`[SoundManager] Background sound ${name} has no buffer loaded`);
                }
            } else {
                console.warn(`[SoundManager] Background sound ${name} not found`);
            }
        } catch (error) {
            console.error(`[SoundManager] Error waiting for assets to load before playing background ${name}:`, error);
            throw error;
        }
    }

    public stopAllBackground(): void {
        this.backgroundSounds.forEach(sound => {
            sound.stop();
            console.log(`[SoundManager] Stopped background sound`);
        });
    }

    public dispose(): void {
        this.stopAllBackground();
        this.sounds.clear();
        console.log('[SoundManager] Cleared all sound effects');
        this.backgroundSounds.clear();
        console.log('[SoundManager] Cleared all background sounds');
    }
}