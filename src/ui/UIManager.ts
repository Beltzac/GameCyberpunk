// src/ui/UIManager.ts
import * as THREE from 'three'; // Import THREE
import { SceneManager } from '../core/SceneManager'; // Import SceneManager
import { GameEngine } from '../core/GameEngine';

export class UIManager {
    private debugOverlay: HTMLElement | null = null;
    private readonly initialSceneStorageKey = 'debug_initialScene';
    private fpsCounter: HTMLElement | null = null;
    private lastFrameTime: number = 0;
    private frameCount: number = 0;
    private gameEngine: GameEngine;

    // Properties for 2D message text
    private messages: {
        sprite: THREE.Sprite;
        texture: THREE.CanvasTexture;
        canvas: HTMLCanvasElement;
        context: CanvasRenderingContext2D;
        timeout: number;
        fadeStartTime: number;
        isFading: boolean;
        isFadeIn: boolean;
    }[] = [];

    private messageFontLoaded: boolean = false; // Flag to track font loading
    private messageGlitchMaterial: THREE.ShaderMaterial | null = null;
    private fadeOutDuration: number = 800; // milliseconds - Reduced duration for faster fade

    // Glitch sound properties
    private glitchSounds: string[] = [];
    private glitchSoundLoaded: boolean = false;
    private lastGlitchSoundIndex: number = -1;

    // Shader effect constants
    private readonly shaderIntensities = {
        // RGB Shift: Creates chromatic aberration by offsetting color channels (0.0-1.0)
        // Implemented by distorting UV coordinates differently per channel in rgbShiftUV()
        rgbShift: 0.15, //Good

        // Noise: Digital static/glitch effect (0.0-1.0)
        // Currently disabled (commented out in shader code)
        noise: 0.7,

        // Highlight: Enhances bright areas with neon glow (0.0-1.0)
        // Detects bright pixels (r+g+b > 1.5) and boosts them with colored highlights
        highlight: 0.4,

        // Scan Lines: Adds horizontal CRT-style scan lines (0.0-5.0)
        scanLine: 5, //Good

        // Tear: Creates vertical screen tearing artifacts (0.0-5.0)
        // Randomly shifts horizontal UV coordinates to simulate screen tearing
        tear: 0.1, //Good
    };

    constructor(GameEngine: GameEngine) {
        this.gameEngine = GameEngine;
        console.log("UIManager initialized");
        this.createDebugOverlay();
        this.hideDebugOverlay();
        this.lastFrameTime = performance.now();
        this.loadMessageFont(); // Start loading the font

        this.loadGlitchSounds().then(() => {
            console.log("Glitch sounds loaded successfully.");
        }).catch(error => {
            console.error("Error loading glitch sounds:", error);
        });

        if (!this.messageGlitchMaterial) {
            this.createMessageGlitchMaterial();
        }

        this.populateSceneSelector();
    }

    private async loadGlitchSounds(): Promise<void> {
        if (!this.gameEngine.soundManager || this.glitchSoundLoaded) {
            if (!this.gameEngine.soundManager) {
                console.warn("SoundManager not available for glitch sounds");
            } else {
                console.log("Glitch sounds already loaded.");
            }
            return;
        }

        const soundFiles = [
            'sounds/glitch_1.mp3',
            'sounds/glitch_2.mp3',
            'sounds/glitch_3.mp3',
            'sounds/glitch_4.mp3',
            'sounds/glitch_5.mp3',
            'sounds/glitch_6.mp3',
            'sounds/glitch_7.mp3',
            'sounds/glitch_8.mp3',
            'sounds/glitch_9.mp3',
            'sounds/glitch_10.mp3'
        ];

        const loadPromises = soundFiles.map((file, index) => {
            return this.gameEngine.soundManager!.loadSound(
                `ui_glitch_${index}`,
                file
            ).then(() => {
                this.glitchSounds.push(`ui_glitch_${index}`);
                return true;
            }).catch(error => {
                console.error(`Failed to load glitch sound ${file}:`, error);
                return false;
            });
        });

        Promise.all(loadPromises).then(results => {
            if (results.some(r => r)) {
                this.glitchSoundLoaded = true;
            }
        });
    }

    private async playRandomGlitchSound(): Promise<void> {
        if (!this.glitchSoundLoaded || !this.gameEngine.soundManager || this.glitchSounds.length === 0) return;

        try {
            let randomIndex: number;
            if (this.glitchSounds.length > 1) {
                do {
                    randomIndex = Math.floor(Math.random() * this.glitchSounds.length);
                } while (randomIndex === this.lastGlitchSoundIndex);
            } else {
                randomIndex = 0;
            }
            this.lastGlitchSoundIndex = randomIndex;
            await this.gameEngine.soundManager.playSound(this.glitchSounds[randomIndex], 0.3);
        } catch (error) {
            console.error('Failed to play glitch sound:', error);
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

    // Method to create the glitch shader material for messages
    private createMessageGlitchMaterial(): void {
        // Adapt the shader code from SceneManager
        this.messageGlitchMaterial = new THREE.ShaderMaterial({
            uniforms: {
              time:               { value: 0.0 },
              rgbShiftIntensity:  { value: this.shaderIntensities.rgbShift },
              scanLineIntensity:  { value: this.shaderIntensities.scanLine },
              noiseIntensity:     { value: this.shaderIntensities.noise },
              tearIntensity:      { value: this.shaderIntensities.tear },
              highlightIntensity: { value: this.shaderIntensities.highlight },
              opacity:            { value: 1.0 },      // layer strength
              tDiffuse:           { value: null }      // <- set this each frame/pass
            },

            vertexShader: /* unchanged */ `
              varying vec2 vUv;
              void main(){
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
              }
            `,
            fragmentShader: `
   uniform float  time;
uniform float  rgbShiftIntensity;
uniform float  scanLineIntensity;
uniform float  noiseIntensity;
uniform float  tearIntensity;
uniform float  highlightIntensity;
uniform float  opacity;          // final alpha
uniform sampler2D tDiffuse;

varying vec2 vUv;

/* ---------- helpers ---------- */
float random(vec2 p){
    vec2 k = vec2(23.14069263277926, 2.665144142690225);
    return fract(cos(dot(p, k)) * 12345.6789);
}

float scanLine(float y, float t){
    return sin(y * 800.0 + t * 10.0) * 0.1;
}

vec3 rgbShift(vec2 p, float amount, float t){
    float rOff = 0.05 * amount * random(vec2(t * 0.7, p.y));
    float gOff = 0.03 * amount * random(vec2(t * 0.8, p.y + 0.3));
    float bOff = 0.04 * amount * random(vec2(t * 0.9, p.y + 0.6));

    // clamp each channel UV to [0,1]
    vec2 rp = clamp(p + vec2(rOff, 0.0), 0.0, 1.0);
    vec2 gp = clamp(p + vec2(gOff, 0.0), 0.0, 1.0);
    vec2 bp = clamp(p + vec2(bOff, 0.0), 0.0, 1.0);

    float r = texture2D(tDiffuse, rp).r;
    float g = texture2D(tDiffuse, gp).g;
    float b = texture2D(tDiffuse, bp).b;
    return vec3(r, g, b);
}

void main(){
    vec2 uv = vUv;
    float t  = time * 2.0;

    // horizontal tear (clamped)
    if(random(vec2(t, uv.y)) > 0.99){
        float tearOff = random(vec2(t, uv.y)) * 0.2 * tearIntensity;
        uv.x = clamp(uv.x + tearOff, 0.0, 1.0);
    }

    // vertical wobble (clamped)
    uv.y = clamp(uv.y + scanLine(uv.y, t) * scanLineIntensity * 0.01, 0.0, 1.0);

    // base colour with RGB shift
    vec3 color = rgbShift(uv, rgbShiftIntensity, t);

    // sample original alpha to gate noise
    float origA = texture2D(tDiffuse, vUv).a;

    // digital noise only inside opaque parts
    float n = random(uv + mod(t, 1.0)) * noiseIntensity * origA;
    color += n - (noiseIntensity * 0.5 * origA);

    // neon highlight bloom
    float h = max(0.0, dot(color, vec3(1.0)) - 1.5);
    color += vec3(
        h * highlightIntensity * 0.5,
        h * highlightIntensity * 0.3,
        h * highlightIntensity * 0.7
    );

    // output glitch bleed everywhere, with constant alpha
    gl_FragColor = vec4(color, opacity);
}




            `,
            transparent: true,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        console.log("UIManager: Message glitch material created.");
    }

    // Method to create a 2D canvas texture for the message
    private createMessageTexture(message: string): { texture: THREE.CanvasTexture, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D } {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error("Could not get 2D context for message texture");
        }

        // Set font and measure text to determine canvas size
        const fontSize = 70; // Adjust font size as needed
        // Use the loaded font
        context.font = "bold " + fontSize + "px Thata-Regular, sans-serif";
        const metrics = context.measureText(message);
        const textWidth = metrics.width;
        const textHeight = fontSize * 1.2; // Estimate height with some padding

        // Set canvas dimensions (add some padding)
        const canvasWidth = textWidth + 100;
        const canvasHeight = textHeight + 100;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Redraw text on the resized canvas
        context.font = "bold " + fontSize + "px Thata-Regular, sans-serif";
        context.fillStyle = '#00f0ff'; // Neon blue cyberpunk text color
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(message, canvasWidth / 2, canvasHeight / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return { texture, canvas, context };
    }

    // Method to show 2D message text
    public async showMessage(message: string, duration: number = 2000, position?: THREE.Vector3): Promise<THREE.Sprite | null> {
        await this.playRandomGlitchSound();
        if (!this.gameEngine.sceneManager.currentScene) {
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

        console.log("showMessage: Creating message sprite", { message, duration, position, scene: this.gameEngine.sceneManager.currentScene });

        try {
            const { texture: messageTexture, canvas, context } = this.createMessageTexture(message);

            // Create a basic sprite material first
            const basicMaterial = new THREE.SpriteMaterial({
                map: messageTexture,
                transparent: true,
                depthTest: false
            });

            const messageSprite = new THREE.Sprite(basicMaterial);

            // If glitch material is available, assign it after creating the sprite
            if (this.messageGlitchMaterial) {
                // Clone the glitch material to avoid sharing uniforms
                const glitchMaterialClone = this.messageGlitchMaterial.clone();
                glitchMaterialClone.uniforms.tDiffuse.value = messageTexture;
                (messageSprite.material as any) = glitchMaterialClone;
                console.log("Applied glitch material to message sprite:", glitchMaterialClone);
            }

            // Set scale based on texture dimensions to maintain aspect ratio
            const aspect = messageTexture.image.width / messageTexture.image.height;
            const baseHeight = 4; // Base height for the sprite
            messageSprite.scale.set(baseHeight * aspect, baseHeight, 1);

            // Set position - default to a position if none provided
            if (position) {
                messageSprite.position.copy(position);
            } else {
                // Default position: slightly in front of the camera's assumed default position
                messageSprite.position.set(0, 0, 0.1); // Adjust Z based on camera setup
            }

            // Add to the current scene
           this.gameEngine.sceneManager.currentScene.threeScene.add(messageSprite);

            console.log("showMessage: Sprite created and added to scene", messageSprite);

            // Create message entry
            const messageEntry = {
                sprite: messageSprite,
                texture: messageTexture,
                canvas: canvas,
                context: context,
                timeout: setTimeout(() => {
                    this.startMessageFadeOut(messageSprite);
                }, duration) as any,
                fadeStartTime: performance.now(),
                isFading: true, // Start with fade-in
                isFadeIn: true  // Mark as fade-in phase
            };

            // Set initial fade-in values
            if ((messageSprite.material as any).uniforms) {
                const material = (messageSprite.material as any);
                material.uniforms.scanLineIntensity.value = 0;
                material.uniforms.rgbShiftIntensity.value = 0;
                material.uniforms.tearIntensity.value = 0;
                material.uniforms.noiseIntensity.value = 0;
                material.uniforms.highlightIntensity.value = 0;
                material.uniforms.opacity.value = 0;
                material.needsUpdate = true;
            }

            this.messages.push(messageEntry);

            return messageSprite;
        } catch (error) {
            console.error("Error creating message sprite:", error);
            return null;
        }
    }

    // Method to start the glitch fade-out effect for a specific message
    private async startMessageFadeOut(sprite: THREE.Sprite): Promise<void> {
        const message = this.messages.find(m => m.sprite === sprite);
        if (!message) return;

        if ((message.sprite.material as any).uniforms?.scanLineIntensity) {
            message.isFading = true;
            message.isFadeIn = false;
            message.fadeStartTime = performance.now();
            console.log("UIManager: Starting message fade-out.");
            await this.playRandomGlitchSound();
        } else {
            // If no glitch material, just hide it normally
            this.hideMessage(sprite);
        }
        // Clear the initial display timeout
        clearTimeout(message.timeout);
    }

    // Method to hide the 2D message text (all messages if no sprite specified)
    public hideMessage(sprite?: THREE.Sprite): void {
        const messagesToRemove = sprite
            ? this.messages.filter(m => m.sprite === sprite)
            : [...this.messages];

        for (const message of messagesToRemove) {
            if (message.sprite && this.gameEngine.sceneManager.currentScene) {
                this.gameEngine.sceneManager.currentScene.threeScene.remove(message.sprite);
                if (message.sprite.material) {
                    if (Array.isArray(message.sprite.material)) {
                        message.sprite.material.forEach(m => m.dispose());
                    } else {
                        message.sprite.material.dispose();
                    }
                }
            }
            if (message.texture) {
                message.texture.dispose();
            }
            clearTimeout(message.timeout);

            // Remove from messages array
            this.messages = this.messages.filter(m => m !== message);
        }
    }


    private populateSceneSelector(): void {
        if (!this.gameEngine.sceneManager || !this.debugOverlay) return;

        const sceneSelect = this.debugOverlay.querySelector<HTMLSelectElement>('#debug-scene-selector');
        if (!sceneSelect) return;

        // Clear existing options
        sceneSelect.innerHTML = '<option value="">-- Select Scene --</option>';

        const sceneNames = this.gameEngine.sceneManager.getSceneNames(); // Need to implement this in SceneManager
        sceneNames.forEach((name: string) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            sceneSelect.appendChild(option);
        });
        console.log("Debug overlay populated with scenes:", sceneNames);
    }

    private async goToSelectedScene(): Promise<void> {
        if (!this.gameEngine.sceneManager || !this.debugOverlay) return;
        const sceneSelect = this.debugOverlay.querySelector<HTMLSelectElement>('#debug-scene-selector');
        const selectedScene = sceneSelect?.value;

        if (selectedScene) {
            console.log("Debug Overlay: Requesting scene change to \"" + selectedScene + "\"");
            // Assuming changeScene handles transitions etc.
            await this.gameEngine.sceneManager.changeScene(selectedScene);
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
            console.log("Debug Overlay: Initial scene set to \"" + selectedScene + "\" in localStorage.");
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

        // Update message glitch shader time uniforms for all messages
        for (const message of this.messages) {
            if ((message.sprite.material as any).uniforms) {
                const material = (message.sprite.material as any);
                // Update time uniform
                if (material.uniforms.time) {
                    material.uniforms.time.value += deltaTime / 1000; // deltaTime is in ms, convert to seconds
                }

                // Handle fade animation
                if (message.isFading) {
                    const elapsed = performance.now() - message.fadeStartTime;
                    const progress = Math.min(elapsed / this.fadeOutDuration, 1.0);

                    if (message.isFadeIn) {
                        // Fade-in: increase intensities from 0 to normal
                        material.uniforms.scanLineIntensity.value = progress * this.shaderIntensities.scanLine;
                        material.uniforms.rgbShiftIntensity.value = progress * this.shaderIntensities.rgbShift;
                        material.uniforms.tearIntensity.value = progress * this.shaderIntensities.tear;
                        material.uniforms.noiseIntensity.value = progress * this.shaderIntensities.noise;
                        material.uniforms.highlightIntensity.value = progress * this.shaderIntensities.highlight;
                        material.uniforms.opacity.value = progress;

                        // When fade-in completes, mark as not fading anymore
                        if (progress >= 1.0) {
                            message.isFading = false;
                            message.isFadeIn = false;
                        }
                    } else {
                        // Fade-out: increase intensities beyond normal and decrease opacity
                        material.uniforms.scanLineIntensity.value = this.shaderIntensities.scanLine + progress * 1.1;
                        material.uniforms.rgbShiftIntensity.value = this.shaderIntensities.rgbShift + progress * 1.1;
                        material.uniforms.tearIntensity.value = this.shaderIntensities.tear + progress * 1.1;
                        material.uniforms.noiseIntensity.value = this.shaderIntensities.noise + progress * 1.1;
                        material.uniforms.highlightIntensity.value = this.shaderIntensities.highlight + progress * 1.1;
                        material.uniforms.opacity.value = 1.0 - progress;
                    }

                    material.uniforms.time.value += deltaTime / 1000; // Ensure time keeps updating

                    // Force uniforms update
                    material.needsUpdate = true;
                    material.transparent = true;

                    if (progress >= 2.0) {
                        // Fade-out complete, hide the message
                        this.hideMessage(message.sprite);
                    }
                }
            }
        }
    }

    private updatePerformanceMetrics(updateTime: number, objectCount: number): void {
        const updateTimeElement = this.debugOverlay?.querySelector<HTMLSpanElement>('#debug-update-time-value');
        if (updateTimeElement) {
            updateTimeElement.textContent = updateTime.toFixed(2) + " ms";
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
                listItem.textContent = key + ": " + performanceData[key].toFixed(2) + " ms";
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
    console.log("UIManager: Showing screen " + screenId + " (placeholder)");
    // Placeholder for other UI screens
}

public hideScreen(screenId: string): void {
    console.log("UIManager: Hiding screen " + screenId + " (placeholder)");
    // Placeholder for other UI screens
}

private toggleSound(): void {
    const soundToggle = this.debugOverlay?.querySelector<HTMLInputElement>('#debug-sound-toggle');
    if (soundToggle && this.gameEngine.soundManager) {
        this.gameEngine.soundManager.muteAll(soundToggle.checked);
        console.log("Sound " + (soundToggle.checked ? "muted" : "unmuted"));
    }
}

}
