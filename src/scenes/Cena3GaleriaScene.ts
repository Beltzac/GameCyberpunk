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
    private bobSprites: THREE.Sprite[] = [];
    private bobTextures: THREE.Texture[] = [];
    private bobWalkCycle: number = 0;
    private bobWalkTimer: number = 0;
    private bobLookTimer: number = 0;
    private isBobLooking: boolean = false;
    private bobDirection: number = 1; // 1 for right, -1 for left
    private isFlipped: boolean = false; // Track flip state separately
    private readonly bobSpeed: number = 0.05;
    private readonly screenLeftBound: number = -5;
    private readonly screenRightBound: number = 5;
    private decisionButtons: THREE.Sprite[] = [];
    private buttonTextures: THREE.Texture[] = [];
    private currentSelection: number = -1;
    private plantaPack: THREE.Object3D | null = null; // Reference to the actual model inside the pivot
    private mesaPack: THREE.Object3D | null = null; // Reference for the table model
    private vitrolaPack: THREE.Object3D | null = null; // Reference for the vitrola model
    // Removed mixer, using manual rotation now
    // Physics state for plantaPack
    private currentRotationVelocityYPlanta: number = 0;
    private currentRotationVelocityXPlanta: number = 0;

    // Physics state for mesaPack
    private currentRotationVelocityYMesa: number = 0;
    private currentRotationVelocityXMesa: number = 0;

    // Physics state for vitrolaPack
    private currentRotationVelocityYVitrola: number = 0;
    private currentRotationVelocityXVitrola: number = 0;

    // Shared physics constants (can remain shared)

    // Shared physics constants (can remain shared)
    private readonly dampingFactor: number = 0.95; // Controls how quickly Y rotation slows down
    private readonly rotationImpulse: number = Math.PI * 3; // Speed boost on click for Y
    private readonly targetRotationX: number = 0; // Target upright position for all models
    private readonly tiltImpulse: number = 4; // Initial tilt speed boost
    private readonly tiltSpringFactor: number = 0.3; // Increased for faster spring effect
    private readonly tiltDampingFactor: number = 0.95; // How quickly tilt oscillation stops

    // Note: Removed shared isRotating, currentRotationVelocityX/Y variables

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
            this.plantaPack = await this.assetLoader.loadModel('cena_3_galeria/planta-cc.glb');
            this.plantaPack.position.set(0, -1.5, 1); // Position center, slightly lower
            this.plantaPack.scale.set(3, 3, 3); // Apply desired scale to the pivot
            // Apply shader using the helper class
            if (this.plantaPack) { // Ensure plantaPack is loaded before applying shader
                HologramHelper.applyHologramShader(this.plantaPack); // Use helper class
            }
            this.threeScene.add(this.plantaPack); // Add the pivot to the scene

            // Load Mesa model
            this.mesaPack = await this.assetLoader.loadModel('cena_3_galeria/mesa-cc.glb');
            if (this.mesaPack) {
                HologramHelper.applyHologramShader(this.mesaPack); // Use helper class
                this.mesaPack.position.set(-5, -1.5, 1); // Position left, slightly lower
                this.mesaPack.scale.set(1, 1, 1);
                this.threeScene.add(this.mesaPack);
            }

            // Load Vitrola model
            this.vitrolaPack = await this.assetLoader.loadModel('cena_3_galeria/vitrola-cc.glb');
            if (this.vitrolaPack) {
                HologramHelper.applyHologramShader(this.vitrolaPack); // Use helper class
                this.vitrolaPack.position.set(5, -1.5, 1); // Position right, slightly lower
                this.vitrolaPack.scale.set(3, 3, 3);
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

            // Load Bob textures
            this.bobTextures = [
                await this.assetLoader.loadTexture('assets/cena_3_galeria/bob_walk_1.png'),
                await this.assetLoader.loadTexture('assets/cena_3_galeria/bob_walk_2.png'),
                await this.assetLoader.loadTexture('assets/cena_3_galeria/bob_walk_3.png'),
                await this.assetLoader.loadTexture('assets/cena_3_galeria/bob_walk_4.png'),
                await this.assetLoader.loadTexture('assets/cena_3_galeria/bob_back_1.png'),
                await this.assetLoader.loadTexture('assets/cena_3_galeria/bob_back_2.png')
            ];

            // Create Bob sprite at random position
            const startX = this.screenLeftBound + Math.random() *
                         (this.screenRightBound - this.screenLeftBound);
            this.bobDirection = Math.random() < 0.5 ? 1 : -1;

            const bobSprite = this.createCharacterSprite(this.bobTextures[0], startX, -2.3);
            bobSprite.scale.x = Math.abs(bobSprite.scale.x) * this.bobDirection;
            this.bobSprites.push(bobSprite);

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
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide // Ensure material works when flipped
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(3, 3, 1);
        sprite.position.set(x, y, 0.1);
        this.threeScene.add(sprite);
        console.log(`Created sprite at (${x},${y}) with initial scale:`, sprite.scale);
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

        // Animate Bob
        if (this.bobSprites.length > 0) {
            const bobSprite = this.bobSprites[0];

            if (!this.isBobLooking) {
                // Walking animation
                this.bobWalkTimer += deltaTime;
                if (this.bobWalkTimer > 0.2) {
                    this.bobWalkTimer = 0;
                    this.bobWalkCycle = (this.bobWalkCycle + 1) % 4;
                    const material = bobSprite.material as THREE.SpriteMaterial;
                    material.map = this.bobTextures[this.bobWalkCycle];
                    if (this.isFlipped) {
                        material.map.repeat.x = -1;
                        material.map.offset.x = 1;
                    } else {
                        material.map.repeat.x = 1;
                        material.map.offset.x = 0;
                    }
                    material.map.needsUpdate = true;
                    material.needsUpdate = true;
                    bobSprite.position.x += this.bobSpeed * this.bobDirection;

                    // Check screen bounds
                    if (bobSprite.position.x > this.screenRightBound) {
                        this.bobDirection = -1;
                        this.isFlipped = true;
                        bobSprite.scale.x = -Math.abs(bobSprite.scale.x);
                        const material = bobSprite.material as THREE.SpriteMaterial;
                        material.map = this.bobTextures[this.bobWalkCycle];
                        material.map.repeat.x = -1;
                        material.map.offset.x = 1;
                        material.map.needsUpdate = true;
                        material.needsUpdate = true;
                        console.log(`Flipped left at x=${bobSprite.position.x.toFixed(2)}, new scale:`, bobSprite.scale);
                    } else if (bobSprite.position.x < this.screenLeftBound) {
                        this.bobDirection = 1;
                        this.isFlipped = false;
                        bobSprite.scale.x = Math.abs(bobSprite.scale.x);
                        const material = bobSprite.material as THREE.SpriteMaterial;
                        material.map = this.bobTextures[this.bobWalkCycle];
                        material.map.repeat.x = 1;
                        material.map.offset.x = 0;
                        material.map.needsUpdate = true;
                        material.needsUpdate = true;
                        console.log(`Flipped right at x=${bobSprite.position.x.toFixed(2)}, new scale:`, bobSprite.scale);
                    }

                    // Check if should stop to look
                    if (Math.random() < 0.005 &&
                        bobSprite.position.x > this.screenLeftBound + 1 &&
                        bobSprite.position.x < this.screenRightBound - 1) {
                        this.isBobLooking = true;
                        this.bobLookTimer = 0;
                        (bobSprite.material as THREE.SpriteMaterial).map = this.bobTextures[4 + Math.floor(Math.random() * 2)];
                    }
                }
            } else {
                // Looking at art
                this.bobLookTimer += deltaTime;
                if (this.bobLookTimer > 2.0) {
                    this.isBobLooking = false;
                    (bobSprite.material as THREE.SpriteMaterial).map = this.bobTextures[0];
                }
            }
        }

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

        // --- Update physics for plantaPack ---
        if (this.plantaPack && (Math.abs(this.currentRotationVelocityXPlanta) > 0.01 || Math.abs(this.currentRotationVelocityYPlanta) > 0.01)) {
            // Y Rotation
            this.plantaPack.rotation.y += this.currentRotationVelocityYPlanta * deltaTime;
            this.currentRotationVelocityYPlanta *= this.dampingFactor;
            // X Rotation
            const springForceXPlanta = (this.targetRotationX - this.plantaPack.rotation.x) * this.tiltSpringFactor;
            this.currentRotationVelocityXPlanta += springForceXPlanta;
            this.currentRotationVelocityXPlanta *= this.tiltDampingFactor;
            this.plantaPack.rotation.x += this.currentRotationVelocityXPlanta * deltaTime;
            // Check stopping
            if (Math.abs(this.currentRotationVelocityYPlanta) < 0.01 && Math.abs(this.currentRotationVelocityXPlanta) < 0.01) {
                this.currentRotationVelocityYPlanta = 0;
                this.currentRotationVelocityXPlanta = 0;
                this.plantaPack.rotation.x = this.targetRotationX; // Snap
            }
        }

        // --- Update physics for mesaPack ---
        if (this.mesaPack && (Math.abs(this.currentRotationVelocityXMesa) > 0.01 || Math.abs(this.currentRotationVelocityYMesa) > 0.01)) {
            // Y Rotation
            this.mesaPack.rotation.y += this.currentRotationVelocityYMesa * deltaTime;
            this.currentRotationVelocityYMesa *= this.dampingFactor;
            // X Rotation
            const springForceXMesa = (this.targetRotationX - this.mesaPack.rotation.x) * this.tiltSpringFactor;
            this.currentRotationVelocityXMesa += springForceXMesa;
            this.currentRotationVelocityXMesa *= this.tiltDampingFactor;
            this.mesaPack.rotation.x += this.currentRotationVelocityXMesa * deltaTime;
            // Check stopping
            if (Math.abs(this.currentRotationVelocityYMesa) < 0.01 && Math.abs(this.currentRotationVelocityXMesa) < 0.01) {
                this.currentRotationVelocityYMesa = 0;
                this.currentRotationVelocityXMesa = 0;
                this.mesaPack.rotation.x = this.targetRotationX; // Snap
            }
        }

        // --- Update physics for vitrolaPack ---
        if (this.vitrolaPack && (Math.abs(this.currentRotationVelocityXVitrola) > 0.01 || Math.abs(this.currentRotationVelocityYVitrola) > 0.01)) {
            // Y Rotation
            this.vitrolaPack.rotation.y += this.currentRotationVelocityYVitrola * deltaTime;
            this.currentRotationVelocityYVitrola *= this.dampingFactor;
            // X Rotation
            const springForceXVitrola = (this.targetRotationX - this.vitrolaPack.rotation.x) * this.tiltSpringFactor;
            this.currentRotationVelocityXVitrola += springForceXVitrola;
            this.currentRotationVelocityXVitrola *= this.tiltDampingFactor;
            this.vitrolaPack.rotation.x += this.currentRotationVelocityXVitrola * deltaTime;
            // Check stopping
            if (Math.abs(this.currentRotationVelocityYVitrola) < 0.01 && Math.abs(this.currentRotationVelocityXVitrola) < 0.01) {
                this.currentRotationVelocityYVitrola = 0;
                this.currentRotationVelocityXVitrola = 0;
                this.vitrolaPack.rotation.x = this.targetRotationX; // Snap
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
        // Handle plantaPack click
        if (this.plantaPack && this.isObjectInHierarchy(clickedObject, this.plantaPack)) {
            const randomYDirection = Math.random() < 0.5 ? -1 : 1;
            const randomXDirection = Math.random() < 0.5 ? -1 : 1;
            this.currentRotationVelocityYPlanta += this.rotationImpulse * randomYDirection;
            this.currentRotationVelocityXPlanta += this.tiltImpulse * randomXDirection;
        }
        // Handle mesa click
        // Handle mesaPack click
        else if (this.mesaPack && this.isObjectInHierarchy(clickedObject, this.mesaPack)) {
             const randomYDirection = Math.random() < 0.5 ? -1 : 1;
             const randomXDirection = Math.random() < 0.5 ? -1 : 1;
             this.currentRotationVelocityYMesa += this.rotationImpulse * randomYDirection;
             this.currentRotationVelocityXMesa += this.tiltImpulse * randomXDirection;
             // No need to apply initial rotation here, the update loop handles it
        }
        // Handle vitrola click
        // Handle vitrolaPack click
        else if (this.vitrolaPack && this.isObjectInHierarchy(clickedObject, this.vitrolaPack)) {
             const randomYDirection = Math.random() < 0.5 ? -1 : 1;
             const randomXDirection = Math.random() < 0.5 ? -1 : 1;
             this.currentRotationVelocityYVitrola += this.rotationImpulse * randomYDirection;
             this.currentRotationVelocityXVitrola += this.tiltImpulse * randomXDirection;
             // No need to apply initial rotation here, the update loop handles it
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