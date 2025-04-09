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
    private plantaPackPivot: THREE.Group | null = null; // Pivot for centered rotation
    // Removed mixer, using manual rotation now
    private isRotating: boolean = false; // Flag for any motion (Y rotation or X tilt)
    // Y Rotation (Spin)
    private currentRotationVelocityY: number = 0;
    private readonly dampingFactor: number = 0.95; // Controls how quickly Y rotation slows down
    private readonly rotationImpulse: number = Math.PI * 3; // Speed boost on click for Y
    // X Rotation (Tilt)
    private currentRotationVelocityX: number = 0;
    private readonly targetRotationX: number = 0; // Target upright position
    private readonly tiltImpulse: number = 4; // Initial tilt speed boost
    private readonly tiltSpringFactor: number = 0.3; // Increased for faster spring effect
    private readonly tiltDampingFactor: number = 0.95; // How quickly tilt oscillation stops

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

            // Center the model
            const box = new THREE.Box3().setFromObject(this.plantaPack);
            const center = new THREE.Vector3();
            box.getCenter(center);
            // Don't move the model itself, we'll use a pivot

            // Create a pivot point at the calculated center
            this.plantaPackPivot = new THREE.Group();
            // Position the pivot where the object should be centered in the scene
            this.plantaPackPivot.position.set(0, 0, 2.5);
            // Add the original model to the pivot
            this.plantaPackPivot.add(this.plantaPack);
            // Offset the model within the pivot so its calculated center aligns with the pivot's origin
            this.plantaPack.position.copy(center).negate();

            // Apply scale and name to the pivot
            this.plantaPackPivot.scale.set(6, 6, 6); // Larger scale
            this.plantaPackPivot.name = 'plantaPackPivot'; // Set name for identification
            this.threeScene.add(this.plantaPackPivot); // Add the pivot to the scene

            // Apply hologram shader to all materials within the original model
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
      #ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform float glitchIntensity;
uniform vec3 glowColor;
uniform sampler2D map;

varying vec2 vUv;
varying vec3 vNormal;

// A simple pseudo-random function
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    // Copy vUv into a local uv to apply glitch offsets safely
    vec2 uv = vUv;

    // Base hologram effect:
    float scanLine = sin(uv.y * 1000.0 + time * 3.0) * 0.05 + 0.95;
    float edge = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    edge = pow(edge, 2.0);

    // Start with a simple glow
    vec3 color = glowColor * scanLine * (0.6 + edge * 0.4);

    // Glitch effect block
    if (glitchIntensity > 0.0) {
        float glitchTime = mod(time * 0.5 + glitchIntensity * 5.0, 2.0);
        float displacement = glitchIntensity * (rand(vec2(glitchTime)) - 0.5) * 0.1;
        float colorShift  = glitchIntensity * (rand(vec2(glitchTime + 0.1)) - 0.5) * 0.05;

        // Random x‐offset glitch in UV
        if (rand(vec2(floor(glitchTime * 10.0))) > 0.85) {
            uv.x += displacement;
        }

        // Channel offset glitch
        if (rand(vec2(floor(glitchTime * 15.0))) > 0.9) {
            float r = texture2D(map, uv + vec2(colorShift, 0.0)).r;
            float g = texture2D(map, uv - vec2(colorShift, 0.0)).g;
            color.r = r;
            color.g = g;
        }

        // Noise fade
        float noise = rand(uv + mod(time, 1.0)) * 0.2 * glitchIntensity;
        color.rgb = mix(color.rgb, color.rgb - noise, glitchIntensity);
    }

    // Subtle flicker
    float flicker = 0.95 + (rand(vec2(time * 0.1, 0.0)) - 0.5) * 0.05;

    // Boost color intensity
    color = mix(color, color * 1.5, 0.3);

    // Randomly trigger a bigger glitch more often
    float glitchProb = rand(vec2(time * 0.3, 1.0));
    if (glitchProb > 0.95) {   // was 0.97
        // UV distortion
        vec2 uvOffset = vec2(
            (rand(vec2(time))       - 0.5) * 0.1,
            (rand(vec2(time + 1.0)) - 0.5) * 0.05
        );

        // Bigger channel offsets
        float rChannel = rand(vec2(time * 2.0, 1.0)) * 0.04; // was 0.02
        float gChannel = rand(vec2(time * 2.0, 2.0)) * 0.04; // was 0.02
        float bChannel = rand(vec2(time * 2.0, 3.0)) * 0.04; // new

        // Combine everything
        vec2 distortedUV = uv + uvOffset;
        color.r = texture2D(map, distortedUV + vec2(rChannel, 0.0)).r;
        color.g = texture2D(map, distortedUV + vec2(gChannel, 0.0)).g;
        color.b = texture2D(map, distortedUV + vec2(bChannel, 0.0)).b;

        // Add a scan‐line disruption
        if (mod(uv.y * 100.0 + time * 10.0, 1.0) > 0.7) {
            color *= 0.8;
        }
    }

    // Final output with slight transparency
    gl_FragColor = vec4(color * flicker, 0.85);
}

                        `,
                        transparent: true,
                        side: THREE.DoubleSide
                    });
                    child.material = material;
                }
            });

            // Position, scale, name, and adding to scene are now handled by the pivot group above

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

    private isObjectInHierarchy(obj: THREE.Object3D, parent: THREE.Object3D): boolean {
        let current = obj;
        while (current.parent) {
            if (current.parent === parent) {
                return true;
            }
            current = current.parent;
        }
        return false;
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

        // Update shader time
        if (this.plantaPack) {
            // Update shader time uniform
            this.plantaPack.traverse((child) => {
                if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                    child.material.uniforms.time.value = performance.now() * 0.001;
                }
            });
        }

        // Update physics-based rotation and tilt
        if (this.plantaPackPivot && (this.isRotating || Math.abs(this.currentRotationVelocityX) > 0.01 || Math.abs(this.currentRotationVelocityY) > 0.01)) {
            // --- Y Rotation (Spin) ---
            this.plantaPackPivot.rotation.y += this.currentRotationVelocityY * deltaTime;
            this.currentRotationVelocityY *= this.dampingFactor; // Apply damping

            // --- X Rotation (Tilt) ---
            // Calculate spring force towards target X rotation
            const springForceX = (this.targetRotationX - this.plantaPackPivot.rotation.x) * this.tiltSpringFactor;
            // Apply spring force to velocity
            this.currentRotationVelocityX += springForceX;
            // Apply damping to velocity
            this.currentRotationVelocityX *= this.tiltDampingFactor;
            // Apply rotation based on velocity
            this.plantaPackPivot.rotation.x += this.currentRotationVelocityX * deltaTime;

            // --- Check for stopping ---
            if (Math.abs(this.currentRotationVelocityY) < 0.01 && Math.abs(this.currentRotationVelocityX) < 0.01) {
                this.currentRotationVelocityY = 0;
                this.currentRotationVelocityX = 0;
                // Snap to final target rotation to avoid tiny drifts
                this.plantaPackPivot.rotation.x = this.targetRotationX;
                this.isRotating = false; // Stop updates if both motions cease
            } else {
                this.isRotating = true; // Ensure updates continue if either motion is active
            }
        }
    }

    render(renderer: THREE.WebGLRenderer): void {
        // Custom rendering if needed
    }

    public async handleClick(intersects: THREE.Intersection[]): Promise<void> {
        if (!intersects.length) return;

        const clickedObject = intersects[0].object;

        // Handle model click (check if object is in plantaPack hierarchy)
        // Handle model click (check if object is in plantaPackPivot hierarchy)
        if (this.plantaPackPivot && this.isObjectInHierarchy(clickedObject, this.plantaPackPivot) && !this.isRotating) {
            this.isRotating = true; // Signal that motion is starting/active
            // Apply impulses with random direction
            const randomYDirection = Math.random() < 0.5 ? -1 : 1;
            const randomXDirection = Math.random() < 0.5 ? -1 : 1;
            this.currentRotationVelocityY += this.rotationImpulse * randomYDirection;
            this.currentRotationVelocityX += this.tiltImpulse * randomXDirection;
        }

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