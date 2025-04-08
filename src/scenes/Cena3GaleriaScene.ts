// src/scenes/Cena3GaleriaScene.ts
import * as THREE from 'three';
import { Scene } from '../core/Scene';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneManager } from '../core/SceneManager';
import { GameEngine } from '../core/GameEngine';
import { Easing } from '../utils/Easing';

export class Cena3GaleriaScene extends Scene {
    private assetLoader: AssetLoader;
    private sceneManager: SceneManager;
    private backgroundSprite: THREE.Sprite | null = null;
    private characterSprites: THREE.Sprite[] = [];
    private decisionButtons: THREE.Sprite[] = [];
    private buttonTextures: THREE.Texture[] = [];
    private currentSelection: number = -1;
    private plantaPack: THREE.Object3D | null = null;

    constructor(gameEngine: GameEngine, assetLoader: AssetLoader, sceneManager: SceneManager) {
        super(gameEngine);
        this.assetLoader = assetLoader;
        this.sceneManager = sceneManager;
        console.log("Cena3GaleriaScene created");
    }

    async init(): Promise<void> {
        console.log("Cena3GaleriaScene initializing...");

        try {
            // Load 3D model
            this.plantaPack = await this.assetLoader.loadModel('cena_3_galeria/planta_pack.glb');

            // Apply hologram shader to all materials
            this.plantaPack.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    const material = new THREE.ShaderMaterial({
                        uniforms: {
                            time: { value: 0 },
                            glowColor: { value: new THREE.Color(0.2, 1.0, 1.0) }
                        },
                        vertexShader: `
                            varying vec2 vUv;
                            varying vec3 vNormal;
                            void main() {
                                vUv = uv;
                                vNormal = normalize(normalMatrix * normal);
                                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                            }
                        `,
                        fragmentShader: `
                            uniform float time;
                            uniform vec3 glowColor;
                            varying vec2 vUv;
                            varying vec3 vNormal;

                            // Simple gradient noise for WebGL compatibility
                            float rand(vec2 co) {
                                return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
                            }

                            void main() {
                                // Scan lines with simpler noise
                                float scanNoise = rand(vUv * 50.0 + time * 0.1) * 0.1;
                                float scanLine = sin(vUv.y * 1000.0 + time * 3.0) * 0.05 + 0.95;
                                scanLine = mix(scanLine, 1.0, scanNoise);

                                // Edge glow
                                float edge = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
                                edge = pow(edge, 2.0);

                                // Combine effects
                                vec3 color = glowColor * scanLine * (0.6 + edge * 0.4);

                                // Subtler flicker using simpler noise
                                float flicker = 0.95 + (rand(vec2(time * 0.1, 0.0)) - 0.5) * 0.05;

                                gl_FragColor = vec4(color * flicker, 0.7);
                            }
                        `,
                        transparent: true,
                        side: THREE.DoubleSide
                    });
                    child.material = material;
                }
            });

            this.plantaPack.position.set(-2, -3, 5); // Front position (z=1)
            this.plantaPack.scale.set(6, 6, 6); // Larger scale
            this.plantaPack.name = 'plantaPack'; // Set name for identification
            this.threeScene.add(this.plantaPack);

            // Add lights
            const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
            this.threeScene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(0, 5, 2);
            this.threeScene.add(directionalLight);

            // Load background
            const backgroundTexture = await this.assetLoader.loadTexture('assets/cena_3_galeria/background.png');
            this.backgroundSprite = this.createBackground(backgroundTexture);

            // Load character textures (Kairos and others)
            const kairosTexture = await this.assetLoader.loadTexture('assets/cena_3_galeria/kairos.png');
            const otherCharTexture = await this.assetLoader.loadTexture('assets/cena_3_galeria/other_character.png');

            // Create character sprites
            const kairosSprite = this.createCharacterSprite(kairosTexture, -3, 0);
            const otherCharSprite = this.createCharacterSprite(otherCharTexture, 3, 0);
            this.characterSprites.push(kairosSprite, otherCharSprite);

            // Load decision button textures
            this.buttonTextures = [
                await this.assetLoader.loadTexture('assets/cena_3_galeria/select_kairos.png'),
                await this.assetLoader.loadTexture('assets/cena_3_galeria/select_other.png')
            ];

            // Create decision buttons
            for (let i = 0; i < this.buttonTextures.length; i++) {
                const button = this.createDecisionButton(this.buttonTextures[i], i);
                this.decisionButtons.push(button);
                button.visible = false; // Start hidden
            }

            // Load sounds
            await this.gameEngine.soundManager.loadSound(
                'gallery_ambient',
                'cena_3_galeria/sounds/ambient.mp3',
                true
            );

            console.log("Cena3GaleriaScene initialized.");
        } catch (error) {
            console.error("Failed to initialize Cena3GaleriaScene:", error);
            throw error;
        }
    }

    private createCharacterSprite(texture: THREE.Texture, x: number, y: number): THREE.Sprite {
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(3, 3, 1);
        sprite.position.set(x, y, 0.1);
        this.threeScene.add(sprite);
        return sprite;
    }

    private createDecisionButton(texture: THREE.Texture, index: number): THREE.Sprite {
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.7
        });
        const button = new THREE.Sprite(material);
        button.scale.set(2, 1, 1);
        button.position.set(index === 0 ? -3 : 3, -3, 0.2);
        button.name = `DecisionButton${index}`;
        this.threeScene.add(button);
        return button;
    }

    async onEnter(): Promise<void> {
        await this.gameEngine.soundManager.playBackground('gallery_ambient', 0.8);

        // Fade in decision buttons after delay
        setTimeout(() => {
            this.decisionButtons.forEach(button => {
                button.visible = true;
            });
        }, 2000);
    }

    async onExit(): Promise<void> {
        this.gameEngine.soundManager.stopAllBackground();
    }

    update(deltaTime: number): void {
        // Animate character sprites slightly
        this.characterSprites.forEach((sprite, index) => {
            const offset = index * Math.PI * 0.5;
            const bob = Math.sin(Date.now() * 0.001 + offset) * 0.05;
            sprite.position.y += bob;
        });

        // Highlight selected button
        this.decisionButtons.forEach((button, index) => {
            const material = button.material as THREE.SpriteMaterial;
            material.opacity = this.currentSelection === index ? 1 : 0.7;
            material.needsUpdate = true;
        });
        // Rotate the model and update shader time
        if (this.plantaPack) {
            this.plantaPack.rotation.y += deltaTime * 0.5; // Rotate 0.5 radians per second

            // Update shader time uniform
            this.plantaPack.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                    child.material.uniforms.time.value = performance.now() * 0.001;
                }
            });
        }
    }

    render(renderer: THREE.WebGLRenderer): void {
        // Custom rendering if needed
    }

    public async handleClick(intersects: THREE.Intersection[]): Promise<void> {
        if (!intersects.length) return;

        const clickedObject = intersects[0].object;

        // Handle character selection
        if (clickedObject.name === "DecisionButton0") {
            this.currentSelection = 0;
            await this.transitionToNextScene('kairos');
        }
        else if (clickedObject.name === "DecisionButton1") {
            this.currentSelection = 1;
            await this.transitionToNextScene('other_character');
        }
    }

    private async transitionToNextScene(character: string): Promise<void> {
        console.log(`Selected character: ${character}`);
        // Fade out current scene
        this.decisionButtons.forEach(button => {
            button.visible = false;
        });

        // Transition after delay

        if (this.sceneManager) {
            await this.sceneManager.changeScene(
                character === 'kairos' ? 'cena_kairos' : 'cena_other',
                'fade',
                1000
            );
        }
    }
}