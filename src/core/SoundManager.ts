// src/core/SoundManager.ts
import * as THREE from 'three';
import { AssetLoader } from '../utils/AssetLoader';

export class SoundManager {
    private audioListener: THREE.AudioListener;
    private sounds: Map<string, THREE.Audio>;
    private backgroundSounds: Map<string, THREE.Audio>;
    private assetLoader: AssetLoader;
    private loadingPromises: Map<string, Promise<void>> = new Map(); // Track loading sounds
    private isAudioAllowed = false;
    private queuedSounds: Array<() => void> = [];

    constructor(camera: THREE.Camera, assetLoader: AssetLoader) {
        this.audioListener = new THREE.AudioListener();
        camera.add(this.audioListener);
        this.sounds = new Map();
        this.backgroundSounds = new Map();
        this.assetLoader = assetLoader;
        this.loadingPromises = new Map();

        // Add multiple interaction handlers to enable audio
        const enableAudio = () => {
            if (!this.isAudioAllowed) {
                this.isAudioAllowed = true;
                this.playQueuedSounds();
                // Remove all interaction listeners
                window.removeEventListener('click', enableAudio);
                window.removeEventListener('keydown', enableAudio);
                window.removeEventListener('touchstart', enableAudio);
                window.removeEventListener('mousedown', enableAudio);
            }
        };
        // Listen for various user interactions
        window.addEventListener('click', enableAudio);
        window.addEventListener('keydown', enableAudio);
        window.addEventListener('touchstart', enableAudio);
        window.addEventListener('mousedown', enableAudio);
    }

    private playQueuedSounds() {
        this.queuedSounds.forEach(play => play());
        this.queuedSounds = [];
    }

    public loadSound(name: string, url: string, isBackground: boolean = false): Promise<void> {
        // If already loaded or loading, return existing promise or resolve immediately
        if (this.sounds.has(name) || this.backgroundSounds.has(name)) {
            console.log(`[SoundManager] Sound ${name} already loaded.`);
            return Promise.resolve();
        }
        if (this.loadingPromises.has(name)) {
            console.log(`[SoundManager] Sound ${name} is already loading. Returning existing promise.`);
            return this.loadingPromises.get(name)!;
        }

        console.log(`[SoundManager] Starting load for sound ${name} from ${url}`);
        const loadPromise = (async () => {
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
                console.error(`[SoundManager] Failed to load sound ${name}:`, error);
                // Rethrow so the caller knows loading failed
                throw error;
            } finally {
                // Remove the promise from the map once loading finishes or fails
                this.loadingPromises.delete(name);
                console.log(`[SoundManager] Removed loading promise for ${name}`);
            }
        })(); // Immediately invoke the async IIFE

        // Store the promise and return it
        this.loadingPromises.set(name, loadPromise);
        return loadPromise;
    }

    public async playSound(name: string, volume: number = 0.5): Promise<void> {
        if (!this.isAudioAllowed) {
            this.queuedSounds.push(() => this.playSound(name, volume));
            return;
        }

        let sound = this.sounds.get(name);

        // If sound not found, check if it's currently loading
        if (!sound && this.loadingPromises.has(name)) {
            console.log(`[SoundManager] Sound ${name} not loaded yet, awaiting loading promise...`);
            try {
                await this.loadingPromises.get(name);
                sound = this.sounds.get(name); // Try getting the sound again
                console.log(`[SoundManager] Sound ${name} finished loading.`);
            } catch (error) {
                console.error(`[SoundManager] Error awaiting loading promise for sound ${name}:`, error);
                // Don't proceed if loading failed
                return;
            }
        }

        // Now try to play the sound if it exists
        if (sound) {
            console.log(`[SoundManager] Playing sound ${name} at volume ${volume}`);
            sound.setVolume(volume);
            // Ensure sound is not already playing if play() doesn't handle it
            if (sound.isPlaying) {
                sound.stop();
            }
            sound.play();
        } else {
            console.warn(`[SoundManager] Sound ${name} not found or failed to load.`);
        }
    }

    public async playBackground(name: string, volume: number = 0.3): Promise<void> {
        if (!this.isAudioAllowed) {
            this.queuedSounds.push(() => this.playBackground(name, volume));
            return;
        }

        let sound = this.backgroundSounds.get(name);

        // If sound not found, check if it's currently loading
        if (!sound && this.loadingPromises.has(name)) {
            console.log(`[SoundManager] Background sound ${name} not loaded yet, awaiting loading promise...`);
            try {
                await this.loadingPromises.get(name);
                sound = this.backgroundSounds.get(name); // Try getting the sound again
                console.log(`[SoundManager] Background sound ${name} finished loading.`);
            } catch (error) {
                console.error(`[SoundManager] Error awaiting loading promise for background sound ${name}:`, error);
                // Don't proceed if loading failed
                return;
            }
        }

        // Now try to play the sound if it exists
        if (sound) {
            const buffer = sound.buffer;
            if (buffer && buffer.duration > 0) { // Check duration > 0 to avoid issues with empty buffers
                const duration = buffer.duration;
                const randomOffset = Math.random() * duration;
                console.log(`[SoundManager] Playing background sound ${name} at volume ${volume}, starting at ${randomOffset.toFixed(2)}s of ${duration.toFixed(2)}s`);
                sound.setVolume(volume);
                // Ensure sound is stopped before setting offset and playing again
                if (sound.isPlaying) {
                    sound.stop();
                }
                sound.offset = randomOffset;
                sound.play();
            } else {
                console.warn(`[SoundManager] Background sound ${name} has no valid buffer loaded (duration: ${buffer?.duration}). Cannot play.`);
            }
        } else {
            console.warn(`[SoundManager] Background sound ${name} not found or failed to load.`);
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