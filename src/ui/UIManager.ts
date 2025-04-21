// src/ui/UIManager.ts
import * as THREE from 'three'; // Import THREE
import { SceneManager } from '../core/SceneManager'; // Import SceneManager
import { SoundManager } from '../core/SoundManager'; // Import SoundManager

export class UIManager {
    private debugOverlay: HTMLElement | null = null;
    private sceneManager: SceneManager | null = null;
    private soundManager: SoundManager | null = null;
    private readonly initialSceneStorageKey = 'debug_initialScene';
    private fpsCounter: HTMLElement | null = null;
    private lastFrameTime: number = 0;
    private frameCount: number = 0;

    // Properties for 2D message text
    private messageSprite: THREE.Sprite | null = null;
    private messageCanvas: HTMLCanvasElement | null = null;
    private messageContext: CanvasRenderingContext2D | null = null;
    private messageTexture: THREE.CanvasTexture | null = null;
    private messageTimeout: number | null = null;
    private currentScene: THREE.Scene | null = null; // Reference to the current scene
    private messageFontLoaded: boolean = false; // Flag to track font loading

    constructor() {
        console.log("UIManager initialized");
        this.createDebugOverlay();
        this.hideDebugOverlay();
        this.lastFrameTime = performance.now();
        this.loadMessageFont(); // Start loading the font
    }

    // Method to inject SceneManager dependency
    public setSceneManager(sceneManager: SceneManager): void {
        this.sceneManager = sceneManager;
        // Populate scenes once SceneManager is available
        this.populateSceneSelector();
    }

    public setSoundManager(soundManager: SoundManager): void {
        this.soundManager = soundManager;
    }

    // Method to set the current Three.js scene
    public setCurrentScene(scene: THREE.Scene): void {
        this.currentScene = scene;
        // If a message is currently displayed, add it to the new scene
        if (this.messageSprite) {
            this.currentScene.add(this.messageSprite);
        }
    }

    private createDebugOverlay(): void {
        this.debugOverlay = document.createElement('div');
        this.debugOverlay.id = 'debug-overlay';
        this.debugOverlay.style.position = 'absolute';
        this.debugOverlay.style.top = '10px';
        this.debugOverlay.style.left = '10px';
        this.debugOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.debugOverlay.style.color = 'white';
        this.debugOverlay.style.padding = '15px';
        this.debugOverlay.style.border = '1px solid white';
        this.debugOverlay.style.borderRadius = '5px';
        this.debugOverlay.style.fontFamily = 'Arial, sans-serif';
        this.debugOverlay.style.zIndex = '1001'; // Ensure it's above the canvas cursor layer
        this.debugOverlay.style.display = 'none'; // Start hidden

        const title = document.createElement('h3');
        title.textContent = 'Debug Overlay';
        title.style.marginTop = '0';
        this.debugOverlay.appendChild(title);

        // Initial Scene Section
        const initialSceneLabel = document.createElement('label');
        initialSceneLabel.textContent = 'Initial Scene: ';
        initialSceneLabel.style.display = 'block';
        initialSceneLabel.style.marginBottom = '5px';
        this.debugOverlay.appendChild(initialSceneLabel);

        const initialSceneValue = document.createElement('span');
        initialSceneValue.id = 'debug-initial-scene-value';
        initialSceneValue.textContent = localStorage.getItem(this.initialSceneStorageKey) || 'None';
        initialSceneValue.style.fontWeight = 'bold';
        initialSceneLabel.appendChild(initialSceneValue);

        // Scene Selector Section
        const sceneSelectLabel = document.createElement('label');
        sceneSelectLabel.textContent = 'Go to Scene: ';
        sceneSelectLabel.style.display = 'block';
        sceneSelectLabel.style.marginTop = '10px';
        this.debugOverlay.appendChild(sceneSelectLabel);

        const sceneSelect = document.createElement('select');
        sceneSelect.id = 'debug-scene-selector';
        sceneSelect.style.marginRight = '10px';
        this.debugOverlay.appendChild(sceneSelect);

        const goToButton = document.createElement('button');
        goToButton.textContent = 'Go';
        goToButton.onclick = () => this.goToSelectedScene();
        this.debugOverlay.appendChild(goToButton);

        const setInitialButton = document.createElement('button');
        setInitialButton.textContent = 'Set as Initial';
        setInitialButton.style.marginLeft = '5px';
        setInitialButton.onclick = () => this.setInitialScene();
        this.debugOverlay.appendChild(setInitialButton);

        // Close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close (P)';
        closeButton.style.marginTop = '15px';
        closeButton.style.display = 'block';
        closeButton.onclick = () => this.hideDebugOverlay();
        this.debugOverlay.appendChild(closeButton);

        // Sound Toggle Section
        const soundToggleLabel = document.createElement('label');
        soundToggleLabel.textContent = 'Disable Sound: ';
        soundToggleLabel.style.display = 'block';
        soundToggleLabel.style.marginTop = '10px';
        this.debugOverlay.appendChild(soundToggleLabel);

        const soundToggle = document.createElement('input');
        soundToggle.type = 'checkbox';
        soundToggle.id = 'debug-sound-toggle';
        soundToggle.onchange = () => this.toggleSound();
        soundToggleLabel.appendChild(soundToggle);

        // FPS Counter Section
        const fpsLabel = document.createElement('label');
        fpsLabel.textContent = 'FPS: ';
        fpsLabel.style.display = 'block';
        fpsLabel.style.marginTop = '10px';
        this.debugOverlay.appendChild(fpsLabel);

        this.fpsCounter = document.createElement('span');
        this.fpsCounter.id = 'debug-fps-counter';
        this.fpsCounter.textContent = '0';
        this.fpsCounter.style.fontWeight = 'bold';
        fpsLabel.appendChild(this.fpsCounter);

        // Performance Metrics Section
        const updateTimeLabel = document.createElement('label');
        updateTimeLabel.textContent = 'Update Time: ';
        updateTimeLabel.style.display = 'block';
        updateTimeLabel.style.marginTop = '10px';
        this.debugOverlay.appendChild(updateTimeLabel);

        const updateTimeValue = document.createElement('span');
        updateTimeValue.id = 'debug-update-time-value';
        updateTimeValue.textContent = 'N/A';
        updateTimeValue.style.fontWeight = 'bold';
        updateTimeLabel.appendChild(updateTimeValue);

        const objectCountLabel = document.createElement('label');
        objectCountLabel.textContent = 'Object Count: ';
        objectCountLabel.style.display = 'block';
        objectCountLabel.style.marginTop = '10px';
        this.debugOverlay.appendChild(objectCountLabel);

        const objectCountValue = document.createElement('span');
        objectCountValue.id = 'debug-object-count-value';
        objectCountValue.textContent = 'N/A';
        objectCountValue.style.fontWeight = 'bold';
        objectCountLabel.appendChild(objectCountValue);

        // Scene Performance Metrics Section
        const scenePerformanceLabel = document.createElement('h4');
        scenePerformanceLabel.textContent = 'Scene Object Update Times (ms):';
        scenePerformanceLabel.style.marginTop = '15px';
        scenePerformanceLabel.style.marginBottom = '5px';
        this.debugOverlay.appendChild(scenePerformanceLabel);

        const scenePerformanceList = document.createElement('ul');
        scenePerformanceList.id = 'debug-scene-performance-list';
        scenePerformanceList.style.listStyle = 'none';
        scenePerformanceList.style.padding = '0';
        this.debugOverlay.appendChild(scenePerformanceList);


        document.body.appendChild(this.debugOverlay);
        console.log("Debug overlay created.");
    }

    // Method to load the message font
    private async loadMessageFont(): Promise<void> {
        try {
            const fontFace = new (window as any).FontFace('Thata-Regular', 'url(assets/fonts/Thata-Regular-2024-08-15.ttf)');
            await (document as any).fonts.add(fontFace);
            await fontFace.load();
            this.messageFontLoaded = true;
            console.log("Message font 'Thata-Regular' loaded successfully.");
        } catch (error) {
            console.error("Error loading message font:", error);
            this.messageFontLoaded = false; // Ensure flag is false on error
        }
    }

    // Method to create a 2D canvas texture for the message
    private createMessageTexture(message: string): THREE.CanvasTexture {
        // Dispose of previous texture and canvas if they exist
        if (this.messageTexture) {
            this.messageTexture.dispose();
        }
        if (this.messageCanvas) {
            this.messageCanvas = null;
            this.messageContext = null;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error("Could not get 2D context for message texture");
        }

        this.messageCanvas = canvas;
        this.messageContext = context;

        // Set font and measure text to determine canvas size
        const fontSize = 60; // Adjust font size as needed
        // Use the loaded font
        context.font = `${fontSize}px Thata-Regular, sans-serif`;
        const metrics = context.measureText(message);
        const textWidth = metrics.width;
        const textHeight = fontSize * 1.2; // Estimate height with some padding

        // Set canvas dimensions (add some padding)
        const canvasWidth = textWidth + 40;
        const canvasHeight = textHeight + 20;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Redraw text on the resized canvas
        context.font = `${fontSize}px Thata-Regular, sans-serif`;
        context.fillStyle = 'white'; // Text color
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(message, canvasWidth / 2, canvasHeight / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        this.messageTexture = texture;
        return texture;
    }

    // Method to show 2D message text
    public async showMessage(message: string, duration: number = 2000, position?: THREE.Vector3): Promise<THREE.Sprite | null> {
        if (!this.currentScene) {
            console.error("showMessage: Current scene not set. Cannot show message.");
            return null;
        }

        // Wait for the font to load if it hasn't already
        if (!this.messageFontLoaded) {
            console.log("showMessage: Font not loaded yet, waiting...");
            await this.loadMessageFont();
            if (!this.messageFontLoaded) {
                console.error("showMessage: Failed to load font. Cannot show message.");
                return null;
            }
        }

        // Clear any existing message and timeout
        this.hideMessage();

        console.log("showMessage: Creating message sprite", { message, duration, position, scene: this.currentScene });

        try {
            const messageTexture = this.createMessageTexture(message);

            const material = new THREE.SpriteMaterial({
                map: messageTexture,
                transparent: true,
                depthTest: false // Ensure it renders on top
            });

            this.messageSprite = new THREE.Sprite(material);

            // Set scale based on texture dimensions to maintain aspect ratio
            const aspect = messageTexture.image.width / messageTexture.image.height;
            const baseHeight = 1; // Base height for the sprite
            this.messageSprite.scale.set(baseHeight * aspect, baseHeight, 1);

            // Set position - default to a position if none provided
            if (position) {
                this.messageSprite.position.copy(position);
            } else {
                // Default position: slightly in front of the camera's assumed default position
                this.messageSprite.position.set(0, 0, 0.1); // Adjust Z based on camera setup
            }

            // Add to the current scene
            this.currentScene.add(this.messageSprite);

            console.log("showMessage: Sprite created and added to scene", this.messageSprite);

            // Set timeout to hide the message sprite
            this.messageTimeout = setTimeout(() => {
                this.hideMessage();
            }, duration) as any;

            return this.messageSprite; // Return the created sprite
        } catch (error) {
            console.error("Error creating message sprite:", error);
            return null;
        }
    }

    // Method to hide the 2D message text
    public hideMessage(): void {
        if (this.messageSprite && this.currentScene) {
            this.currentScene.remove(this.messageSprite);
            if (this.messageSprite.material) {
                if (Array.isArray(this.messageSprite.material)) {
                    this.messageSprite.material.forEach(m => m.dispose());
                } else {
                    this.messageSprite.material.dispose();
                }
            }
            this.messageSprite = null;
        }
        if (this.messageTexture) {
            this.messageTexture.dispose();
            this.messageTexture = null;
        }
        if (this.messageCanvas) {
            this.messageCanvas = null;
            this.messageContext = null;
        }
        if (this.messageTimeout !== null) {
            clearTimeout(this.messageTimeout);
            this.messageTimeout = null;
        }
    }


    private populateSceneSelector(): void {
        if (!this.sceneManager || !this.debugOverlay) return;

        const sceneSelect = this.debugOverlay.querySelector<HTMLSelectElement>('#debug-scene-selector');
        if (!sceneSelect) return;

        // Clear existing options
        sceneSelect.innerHTML = '<option value="">-- Select Scene --</option>';

        const sceneNames = this.sceneManager.getSceneNames(); // Need to implement this in SceneManager
        sceneNames.forEach((name: string) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            sceneSelect.appendChild(option);
        });
        console.log("Debug overlay populated with scenes:", sceneNames);
    }

    private async goToSelectedScene(): Promise<void> {
        if (!this.sceneManager || !this.debugOverlay) return;
        const sceneSelect = this.debugOverlay.querySelector<HTMLSelectElement>('#debug-scene-selector');
        const selectedScene = sceneSelect?.value;

        if (selectedScene) {
            console.log(`Debug Overlay: Requesting scene change to "${selectedScene}"`);
            // Assuming changeScene handles transitions etc.
            await this.sceneManager.changeScene(selectedScene);
            this.hideDebugOverlay(); // Hide after selection
        } else {
            console.warn("Debug Overlay: No scene selected.");
        }
    }

    private setInitialScene(): void {
        if (!this.debugOverlay) return;
        const sceneSelect = this.debugOverlay.querySelector<HTMLSelectElement>('#debug-scene-selector');
        const selectedScene = sceneSelect?.value;

        if (selectedScene) {
            localStorage.setItem(this.initialSceneStorageKey, selectedScene);
            const initialSceneValue = this.debugOverlay.querySelector<HTMLSpanElement>('#debug-initial-scene-value');
            if (initialSceneValue) {
                initialSceneValue.textContent = selectedScene;
            }
            console.log(`Debug Overlay: Initial scene set to "${selectedScene}" in localStorage.`);
        } else {
            console.warn("Debug Overlay: No scene selected to set as initial.");
        }
    }

    public getInitialScene(): string | null {
        return localStorage.getItem(this.initialSceneStorageKey);
    }

    public toggleDebugOverlay(): void {
        if (!this.debugOverlay) return;
        if (this.debugOverlay.style.display === 'none') {
            this.showDebugOverlay();
        } else {
            this.hideDebugOverlay();
        }
    }

    public showDebugOverlay(): void {
        if (!this.debugOverlay) return;
        // Re-populate scenes every time it's shown in case new scenes were added
        this.populateSceneSelector();
        this.debugOverlay.style.display = 'block';
        console.log("Debug overlay shown.");
    }

    public hideDebugOverlay(): void {
        if (!this.debugOverlay) return;
        this.debugOverlay.style.display = 'none';
        console.log("Debug overlay hidden.");
    }

    // Methods for updating UI, showing/hiding elements, etc.
    public update(deltaTime: number, updateTime: number, objectCount: number, scenePerformanceData: { [key: string]: number }): void {
        this.updateFPSCounter();
        this.updatePerformanceMetrics(updateTime, objectCount);
        this.updateScenePerformanceMetrics(scenePerformanceData);
    }

    private updatePerformanceMetrics(updateTime: number, objectCount: number): void {
        const updateTimeElement = this.debugOverlay?.querySelector<HTMLSpanElement>('#debug-update-time-value');
        if (updateTimeElement) {
            updateTimeElement.textContent = `${updateTime.toFixed(2)} ms`;
        }

        const objectCountElement = this.debugOverlay?.querySelector<HTMLSpanElement>('#debug-object-count-value');
        if (objectCountElement) {
            objectCountElement.textContent = objectCount.toString();
        }
    }

    private updateScenePerformanceMetrics(performanceData: { [key: string]: number }): void {
        const performanceList = this.debugOverlay?.querySelector<HTMLUListElement>('#debug-scene-performance-list');
        if (!performanceList) return;

        // Clear previous list items
        performanceList.innerHTML = '';

        // Add new list items for each performance metric
        for (const key in performanceData) {
            if (Object.prototype.hasOwnProperty.call(performanceData, key)) {
                const listItem = document.createElement('li');
                listItem.textContent = `${key}: ${performanceData[key].toFixed(2)} ms`;
                performanceList.appendChild(listItem);
            }
        }
    }

private updateFPSCounter(): void {
    if (!this.fpsCounter) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    if (deltaTime >= 1000) {
        this.fpsCounter.textContent = this.frameCount.toString();
        this.frameCount = 0;
        this.lastFrameTime = currentTime;
    } else {
        this.frameCount++;
    }
}

public showScreen(screenId: string): void {
    console.log(`UIManager: Showing screen ${screenId} (placeholder)`);
    // Placeholder for other UI screens
}

public hideScreen(screenId: string): void {
    console.log(`UIManager: Hiding screen ${screenId} (placeholder)`);
    // Placeholder for other UI screens
}

private toggleSound(): void {
    const soundToggle = this.debugOverlay?.querySelector<HTMLInputElement>('#debug-sound-toggle');
    if (soundToggle && this.soundManager) {
        this.soundManager.muteAll(soundToggle.checked);
        console.log(`Sound ${soundToggle.checked ? 'muted' : 'unmuted'}`);
    }
}
}
