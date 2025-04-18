// src/ui/UIManager.ts
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

    constructor() {
        console.log("UIManager initialized");
        this.createDebugOverlay();
        this.hideDebugOverlay();
        this.lastFrameTime = performance.now();
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
