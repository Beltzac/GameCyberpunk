
import * as THREE from 'three';
import { Scene } from '../core/Scene';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneManager } from '../core/SceneManager';
import { GameEngine } from '../core/GameEngine';
import { Easing } from '../utils/Easing';
import { HologramHelper } from '../utils/HologramHelper';
import { BobCharacter, MartaCharacter, WalkingCharacter } from '../objects/WalkingCharacter';

export class Cena3GaleriaScene extends Scene {
    private assetLoader: AssetLoader;
    private sceneManager: SceneManager;
    private backgroundSprite: THREE.Sprite | null = null;
    private characterSprites: THREE.Sprite[] = [];
    private bobCharacter: WalkingCharacter | null = null;
    private martaCharacter: WalkingCharacter | null = null;
    private decisionButtons: THREE.Sprite[] = [];
    private buttonTextures: THREE.Texture[] = [];
    private currentSelection: number = -1;
    private plantaPack: THREE.Object3D | null = null;
    private mesaPack: THREE.Object3D | null = null;
    private vitrolaPack: THREE.Object3D | null = null;
    private currentRotationVelocityYPlanta: number = 0;
    private currentRotationVelocityXPlanta: number = 0;
    private currentRotationVelocityYMesa: number = 0;
    private currentRotationVelocityXMesa: number = 0;
    private currentRotationVelocityYVitrola: number = 0;
    private currentRotationVelocityXVitrola: number = 0;
    private readonly dampingFactor: number = 0.95;
    private readonly rotationImpulse: number = Math.PI * 3;
    private readonly targetRotationX: number = 0;
    private readonly tiltImpulse: number = 4;
    private readonly tiltSpringFactor: number = 0.3;
    private readonly tiltDampingFactor: number = 0.95;

    constructor(gameEngine: GameEngine, assetLoader: AssetLoader, sceneManager: SceneManager) {
        super(gameEngine);
        this.assetLoader = assetLoader;
        this.sceneManager = sceneManager;
        console.log("Cena3GaleriaScene created");
    }

    async init(): Promise<void> {
        console.log("Cena3GaleriaScene initializing...");

        try {
            // Load 3D models
            this.plantaPack = await this.assetLoader.loadModel('cena_3_galeria/planta-cc.glb');
            this.plantaPack.position.set(0, -1.5, 1);
            this.plantaPack.scale.set(3, 3, 3);
            if (this.plantaPack) {
                HologramHelper.applyHologramShader(this.plantaPack);
            }
            this.threeScene.add(this.plantaPack);

            this.mesaPack = await this.assetLoader.loadModel('cena_3_galeria/mesa-cc.glb');
            if (this.mesaPack) {
                HologramHelper.applyHologramShader(this.mesaPack);
                this.mesaPack.position.set(-5, -1.5, 1);
                this.mesaPack.scale.set(1, 1, 1);
                this.threeScene.add(this.mesaPack);
            }

            this.vitrolaPack = await this.assetLoader.loadModel('cena_3_galeria/vitrola-cc.glb');
            if (this.vitrolaPack) {
                HologramHelper.applyHologramShader(this.vitrolaPack);
                this.vitrolaPack.position.set(5, -1.5, 1);
                this.vitrolaPack.scale.set(3, 3, 3);
                this.threeScene.add(this.vitrolaPack);
            }

            // Add lights
            const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
            this.threeScene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(0, 5, 2);
            this.threeScene.add(directionalLight);

            // Load background
            const backgroundTexture = await this.assetLoader.loadTexture('assets/cena_3_galeria/background.png');
            this.backgroundSprite = this.createBackground(backgroundTexture);

            // Load character textures
            //const kairosTexture = await this.assetLoader.loadTexture('assets/cena_3_galeria/kairos.png');
            //const otherCharTexture = await this.assetLoader.loadTexture('assets/cena_3_galeria/other_character.png');

            // Create character sprites
            //const kairosSprite = this.createCharacterSprite(kairosTexture, -3, 0);
            //const otherCharSprite = this.createCharacterSprite(otherCharTexture, 3, 0);
            //this.characterSprites.push(kairosSprite, otherCharSprite);

            this.bobCharacter = await BobCharacter.create(-2, -2, 0.10, -5, 5, this.gameEngine.soundManager, this.assetLoader);
            this.threeScene.add(this.bobCharacter.getSprite());

            this.martaCharacter = await MartaCharacter.create(2, -2, 0.10, -5, 5, this.gameEngine.soundManager, this.assetLoader);
            this.threeScene.add(this.martaCharacter.getSprite());

            // Load decision button textures
            this.buttonTextures = [
                await this.assetLoader.loadTexture('assets/cena_3_galeria/select_kairos.png'),
                await this.assetLoader.loadTexture('assets/cena_3_galeria/select_other.png')
            ];

            // Create decision buttons
            for (let i = 0; i < this.buttonTextures.length; i++) {
                const button = this.createDecisionButton(this.buttonTextures[i], i);
                this.decisionButtons.push(button);
                button.visible = false;
            }

            // Load sounds
            await this.gameEngine.soundManager.loadSound(
                'gallery_ambient_2',
                'cena_3_galeria/sounds/gallery_ambient_2.wav',
                true
            );

            // Load hurt sounds
            await this.gameEngine.soundManager.loadSound(
                'male_hurt',
                'assets/cena_3_galeria/sounds/male_hurt.mp3'
            );
            await this.gameEngine.soundManager.loadSound(
                'female_hurt',
                'assets/cena_3_galeria/sounds/female_hurt.wav'
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
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
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
        await this.gameEngine.soundManager.playBackground('gallery_ambient_2', 0.3);
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
        // Animate character sprites
        this.characterSprites.forEach((sprite, index) => {
            const offset = index * Math.PI * 0.5;
            const bob = Math.sin(Date.now() * 0.001 + offset) * 0.05;
            sprite.position.y += bob;
        });

        // Update characters
        if (this.bobCharacter) {
            this.bobCharacter.update(deltaTime);
        }
        if (this.martaCharacter) {
            this.martaCharacter.update(deltaTime);
        }

        // Update decision buttons
        this.decisionButtons.forEach((button, index) => {
            const material = button.material as THREE.SpriteMaterial;
            material.opacity = this.currentSelection === index ? 1 : 0.7;
            material.needsUpdate = true;
        });

        // Update shaders
        HologramHelper.updateShaderTime(this.plantaPack);
        HologramHelper.updateShaderTime(this.mesaPack);
        HologramHelper.updateShaderTime(this.vitrolaPack);

        // Physics updates for all models
        this.updateModelPhysics(this.plantaPack, deltaTime, this.currentRotationVelocityXPlanta, this.currentRotationVelocityYPlanta);
        this.updateModelPhysics(this.mesaPack, deltaTime, this.currentRotationVelocityXMesa, this.currentRotationVelocityYMesa);
        this.updateModelPhysics(this.vitrolaPack, deltaTime, this.currentRotationVelocityXVitrola, this.currentRotationVelocityYVitrola);
    }

    private updateModelPhysics(
        model: THREE.Object3D | null,
        deltaTime: number,
        velocityX: number,
        velocityY: number
    ): void {
        if (model && (Math.abs(velocityX) > 0.01 || Math.abs(velocityY) > 0.01)) {
            model.rotation.y += velocityY * deltaTime;
            velocityY *= this.dampingFactor;

            const springForceX = (this.targetRotationX - model.rotation.x) * this.tiltSpringFactor;
            velocityX += springForceX;
            velocityX *= this.tiltDampingFactor;
            model.rotation.x += velocityX * deltaTime;

            if (Math.abs(velocityY) < 0.01 && Math.abs(velocityX) < 0.01) {
                velocityY = 0;
                velocityX = 0;
                model.rotation.x = this.targetRotationX;
            }
        }
    }

    render(renderer: THREE.WebGLRenderer): void {
        // Custom rendering if needed
    }

    async handleClick(intersects: THREE.Intersection[]): Promise<void> {
        if (!intersects || intersects.length === 0) return;

        const clickedObject = intersects[0].object;

        // Handle model clicks
        if (this.plantaPack && this.isObjectInHierarchy(clickedObject, this.plantaPack as THREE.Object3D)) {
            this.applyRotationImpulse(this.currentRotationVelocityXPlanta, this.currentRotationVelocityYPlanta);
        } else if (this.mesaPack && this.isObjectInHierarchy(clickedObject, this.mesaPack as THREE.Object3D)) {
            this.applyRotationImpulse(this.currentRotationVelocityXMesa, this.currentRotationVelocityYMesa);
        } else if (this.vitrolaPack && this.isObjectInHierarchy(clickedObject, this.vitrolaPack as THREE.Object3D)) {
            this.applyRotationImpulse(this.currentRotationVelocityXVitrola, this.currentRotationVelocityYVitrola);
        } else if (this.bobCharacter && clickedObject === this.bobCharacter.getSprite()) {
            this.bobCharacter.playHurtSound();
        } else if (this.martaCharacter && clickedObject === this.martaCharacter.getSprite()) {
            this.martaCharacter.playHurtSound();
        }

        // Handle button clicks
        if (clickedObject.name === "DecisionButton0") {
            this.currentSelection = 0;
            await this.transitionToNextScene('kairos');
        } else if (clickedObject.name === "DecisionButton1") {
            this.currentSelection = 1;
            await this.transitionToNextScene('other_character');
        }
    }

    private applyRotationImpulse(velocityX: number, velocityY: number): void {
        const randomY = Math.random() < 0.5 ? -1 : 1;
        const randomX = Math.random() < 0.5 ? -1 : 1;
        velocityY += this.rotationImpulse * randomY;
        velocityX += this.tiltImpulse * randomX;
    }

    private async transitionToNextScene(character: string): Promise<void> {
        console.log(`Selected character: ${character}`);
        this.decisionButtons.forEach(button => {
            button.visible = false;
        });

        if (this.sceneManager) {
            await this.sceneManager.changeScene(
                character === 'kairos' ? 'cena_kairos' : 'cena_other',
                'fade',
                1000
            );
        }
    }
}
