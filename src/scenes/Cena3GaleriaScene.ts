// src/scenes/Cena3GaleriaScene.ts
import * as THREE from 'three';
import { Scene } from '../core/Scene';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneManager } from '../core/SceneManager';
import { GameEngine } from '../core/GameEngine';
import { Easing } from '../utils/Easing';
import { HologramHelper } from '../utils/HologramHelper'; // Import the new helper

export class Cena3GaleriaScene extends Scene {
    private assetLoader: AssetLoader;
    private sceneManager: SceneManager;
    private backgroundSprite: THREE.Sprite | null = null;
    private characterSprites: THREE.Sprite[] = [];
    private decisionButtons: THREE.Sprite[] = [];
    private buttonTextures: THREE.Texture[] = [];
    private currentSelection: number = -1;
    private plantaPack: THREE.Object3D | null = null; // Reference to the actual model inside the pivot
    private mesaPack: THREE.Object3D | null = null; // Reference for the table model
    private vitrolaPack: THREE.Object3D | null = null; // Reference for the vitrola model
    // Removed mixer, using manual rotation now
    // Physics state for plantaPack
    private isRotatingPlanta: boolean = false;
    private currentRotationVelocityYPlanta: number = 0;
    private currentRotationVelocityXPlanta: number = 0;

    // Physics state for mesaPack
    private isRotatingMesa: boolean = false;
    private currentRotationVelocityYMesa: number = 0;
    private currentRotationVelocityXMesa: number = 0;

    // Physics state for vitrolaPack
    private isRotatingVitrola: boolean = false;
    private currentRotationVelocityYVitrola: number = 0;
    private currentRotationVelocityXVitrola: number = 0;

    // Shared physics constants (can remain shared)

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
            // Load 3D model (AssetLoader now returns the pivot group)
            this.plantaPack = await this.assetLoader.loadModel('cena_3_galeria/planta_pack.glb');
            this.plantaPack.position.set(0, -1.5, 2.5); // Position center, slightly lower
            this.plantaPack.scale.set(4, 4, 4); // Apply desired scale to the pivot
            // Apply shader using the helper class
            if (this.plantaPack) { // Ensure plantaPack is loaded before applying shader
                HologramHelper.applyHologramShader(this.plantaPack); // Use helper class
            }
            this.threeScene.add(this.plantaPack); // Add the pivot to the scene

            // Load Mesa model
            this.mesaPack = await this.assetLoader.loadModel('cena_3_galeria/mesa_pack.glb');
            if (this.mesaPack) {
                HologramHelper.applyHologramShader(this.mesaPack); // Use helper class
                this.mesaPack.position.set(-4, -1.5, 2.5); // Position left, slightly lower
                this.mesaPack.scale.set(4, 4, 4);
                this.threeScene.add(this.mesaPack);
            }

            // Load Vitrola model
            this.vitrolaPack = await this.assetLoader.loadModel('cena_3_galeria/vitrola_pack.glb');
            if (this.vitrolaPack) {
                HologramHelper.applyHologramShader(this.vitrolaPack); // Use helper class
                this.vitrolaPack.position.set(4, -1.5, 2.5); // Position right, slightly lower
                this.vitrolaPack.scale.set(4, 4, 4);
                this.threeScene.add(this.vitrolaPack);
            }

            // Shader is now applied via the helper function below
            // Function moved outside init method

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

    // applyHologramShader method removed, logic moved to HologramHelper

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

        // Update shader time using the helper
        HologramHelper.updateShaderTime(this.plantaPack);
        HologramHelper.updateShaderTime(this.mesaPack);
        HologramHelper.updateShaderTime(this.vitrolaPack);

        // Update physics-based rotation and tilt
        if (this.plantaPack && (this.isRotating || Math.abs(this.currentRotationVelocityX) > 0.01 || Math.abs(this.currentRotationVelocityY) > 0.01)) {
            // --- Y Rotation (Spin) ---
            this.plantaPack.rotation.y += this.currentRotationVelocityY * deltaTime;
            this.currentRotationVelocityY *= this.dampingFactor; // Apply damping

            // --- X Rotation (Tilt) ---
            // Calculate spring force towards target X rotation
            const springForceX = (this.targetRotationX - this.plantaPack.rotation.x) * this.tiltSpringFactor;
            // Apply spring force to velocity
            this.currentRotationVelocityX += springForceX;
            // Apply damping to velocity
            this.currentRotationVelocityX *= this.tiltDampingFactor;
            // Apply rotation based on velocity
            this.plantaPack.rotation.x += this.currentRotationVelocityX * deltaTime;

            // --- Check for stopping ---
            if (Math.abs(this.currentRotationVelocityY) < 0.01 && Math.abs(this.currentRotationVelocityX) < 0.01) {
                this.currentRotationVelocityY = 0;
                this.currentRotationVelocityX = 0;
                // Snap to final target rotation to avoid tiny drifts
                this.plantaPack.rotation.x = this.targetRotationX;
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
        // Handle model click (check if object is in plantaPack hierarchy)
        if (this.plantaPack && this.isObjectInHierarchy(clickedObject, this.plantaPack) && !this.isRotating) {
            this.isRotating = true; // Signal that motion is starting/active
            // Apply impulses with random direction
            const randomYDirection = Math.random() < 0.5 ? -1 : 1;
            const randomXDirection = Math.random() < 0.5 ? -1 : 1;
            this.currentRotationVelocityY += this.rotationImpulse * randomYDirection;
            this.currentRotationVelocityX += this.tiltImpulse * randomXDirection;
        }
        // Handle mesa click
        else if (this.mesaPack && this.isObjectInHierarchy(clickedObject, this.mesaPack) && !this.isRotating) {
             this.isRotating = true;
             const randomYDirection = Math.random() < 0.5 ? -1 : 1;
             const randomXDirection = Math.random() < 0.5 ? -1 : 1;
             // Apply impulses directly to the mesaPack
             // Note: We might need separate velocity variables if we want independent physics later
             this.currentRotationVelocityY += this.rotationImpulse * randomYDirection;
             this.currentRotationVelocityX += this.tiltImpulse * randomXDirection;
             // Apply initial rotation to mesaPack (or manage its physics separately)
             if (this.mesaPack) { // Check if mesaPack exists
                this.mesaPack.rotation.y += this.currentRotationVelocityY * 0.016; // Apply small initial step
                this.mesaPack.rotation.x += this.currentRotationVelocityX * 0.016;
             }
        }
        // Handle vitrola click
        else if (this.vitrolaPack && this.isObjectInHierarchy(clickedObject, this.vitrolaPack) && !this.isRotating) {
             this.isRotating = true;
             const randomYDirection = Math.random() < 0.5 ? -1 : 1;
             const randomXDirection = Math.random() < 0.5 ? -1 : 1;
             // Apply impulses directly to the vitrolaPack
             this.currentRotationVelocityY += this.rotationImpulse * randomYDirection;
             this.currentRotationVelocityX += this.tiltImpulse * randomXDirection;
             // Apply initial rotation to vitrolaPack (or manage its physics separately)
              if (this.vitrolaPack) { // Check if vitrolaPack exists
                this.vitrolaPack.rotation.y += this.currentRotationVelocityY * 0.016; // Apply small initial step
                this.vitrolaPack.rotation.x += this.currentRotationVelocityX * 0.016;
              }
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