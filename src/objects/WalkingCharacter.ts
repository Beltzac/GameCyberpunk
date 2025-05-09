import * as THREE from 'three';
import { Easing } from '../utils/Easing';
import { GameEngine } from '../core/GameEngine';

export abstract class WalkingCharacter {
    protected gameEngine: GameEngine;
    protected sprite: THREE.Sprite;
    protected walkTextures: THREE.Texture[] = [];
    protected backTextures: THREE.Texture[] = [];
    protected walkCycle: number = 0;
    protected walkTimer: number = 0;
    protected lookTimer: number = 0;
    protected isLooking: boolean = false;
    protected direction: number = 1;
    protected isFlipped: boolean = false;
    protected speed: number;
    protected leftBound: number;
    protected rightBound: number;
    protected baseY: number;
    protected lastStepSound: number = 0;
    protected gender: 'male' | 'female';

    constructor(
        gameEngine: GameEngine,
        startX: number,
        startY: number,
        speed: number,
        leftBound: number,
        rightBound: number,
        gender: 'male' | 'female'
    ) {
        this.speed = speed;
        this.leftBound = leftBound;
        this.rightBound = rightBound;
        this.baseY = startY;
        this.gender = gender;
        this.gameEngine = gameEngine;

        // Load sounds
        this.gameEngine.soundManager.loadSound('step1', 'assets/sounds/step_1.mp3');
        this.gameEngine.soundManager.loadSound('step2', 'assets/sounds/step_2.mp3');
        this.gameEngine.soundManager.loadSound('male_hurt', 'assets/cena_3_galeria/sounds/male_hurt.mp3');
        this.gameEngine.soundManager.loadSound('female_hurt', 'assets/cena_3_galeria/sounds/female_hurt.mp3');
        this.gameEngine.soundManager.loadSound('surprise1', 'assets/cena_3_galeria/sounds/surprise_1.mp3');
        this.gameEngine.soundManager.loadSound('surprise2', 'assets/cena_3_galeria/sounds/surprise_2.mp3');
        this.gameEngine.soundManager.loadSound('surprise3', 'assets/cena_3_galeria/sounds/surprise_3.mp3');
        this.gameEngine.soundManager.loadSound('surprise4', 'assets/cena_3_galeria/sounds/surprise_4.mp3');
        this.gameEngine.soundManager.loadSound('surprise5', 'assets/cena_3_galeria/sounds/surprise_5.mp3');

        const material = new THREE.SpriteMaterial({
            map: this.walkTextures[0] || new THREE.Texture(),
            transparent: true,
            side: THREE.DoubleSide
        });
        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(3, 3, 1);
        this.sprite.position.set(startX, startY, 3);

        this.direction = Math.random() < 0.5 ? 1 : -1;
        this.isFlipped = this.direction < 0;
        this.updateTextureFlip();
    }

    protected abstract loadTextures(): Promise<void>;

    public getSprite(): THREE.Sprite {
        return this.sprite;
    }

    public playHurtSound(): void {
        const sound = this.gender === 'male' ? 'male_hurt' : 'female_hurt';
        this.gameEngine.soundManager.playSound(sound, 0.8);
    }

    public update(deltaTime: number): void {
        if (!this.isLooking) {
            this.walkTimer += deltaTime;
            if (this.walkTimer > 0.5) {
                this.walkTimer = 0;
                this.walkCycle = (this.walkCycle + 1) % this.walkTextures.length;
                this.updateTexture(this.walkCycle);
                this.sprite.position.x += this.speed * this.direction;

                const stepSound = this.lastStepSound === 1 ? 'step2' : 'step1';
                this.gameEngine.soundManager.playSound(stepSound, 0.3);
                this.lastStepSound = this.lastStepSound === 1 ? 2 : 1;

                const bobPhase = this.walkCycle / this.walkTextures.length;
                this.sprite.position.y = this.baseY - 0.1 + Easing.easeInOutSine(bobPhase) * 0.2;
                const scaleVar = 0.9 + Easing.easeInOutSine(bobPhase) * 0.1;
                this.sprite.scale.set(3 * scaleVar, 3 * scaleVar, 1);

                if (this.sprite.position.x > this.rightBound) {
                    this.direction = -1;
                    this.isFlipped = true;
                    this.updateTextureFlip();
                } else if (this.sprite.position.x < this.leftBound) {
                    this.direction = 1;
                    this.isFlipped = false;
                    this.updateTextureFlip();
                }

                if (Math.random() < 0.05 &&
                    this.sprite.position.x > this.leftBound + 1 &&
                    this.sprite.position.x < this.rightBound - 1) {
                    this.isLooking = true;
                    this.lookTimer = 0;
                    const backIndex = Math.floor(Math.random() * this.backTextures.length);
                    this.updateTexture(this.walkTextures.length + backIndex);

                    const surpriseSound = `surprise${Math.floor(Math.random() * 5) + 1}`;
                    this.gameEngine.soundManager.playSound(surpriseSound, 0.5);
                }
            }
        } else {
            this.lookTimer += deltaTime;
            if (this.lookTimer > 4.0) {
                this.isLooking = false;
                this.updateTexture(0);
            }
        }
    }

    protected updateTexture(index: number = this.walkCycle): void {
        const material = this.sprite.material as THREE.SpriteMaterial;
        const newTexture = index < this.walkTextures.length
            ? this.walkTextures[index]
            : this.backTextures[index - this.walkTextures.length];

        if (material.map !== newTexture) {
            material.map = newTexture;
            this.updateTextureFlip();
            material.needsUpdate = true;
        }
    }

    protected updateTextureFlip(): void {
        const material = this.sprite.material as THREE.SpriteMaterial;
        if (material.map) {
            material.map.repeat.x = this.isFlipped ? -1 : 1;
            material.map.offset.x = this.isFlipped ? 1 : 0;
            material.map.needsUpdate = true;
        }
    }
}

export class BobCharacter extends WalkingCharacter {
    constructor(
        startX: number,
        startY: number,
        speed: number,
        leftBound: number,
        rightBound: number,
        gameEngine: GameEngine,
    ) {
        super(gameEngine, startX, startY, speed, leftBound, rightBound, 'male');
    }

    protected async loadTextures(): Promise<void> {
        this.walkTextures = [
            await this.gameEngine.assetLoader.loadTexture('assets/cena_3_galeria/bob_walk_1.png'),
            await this.gameEngine.assetLoader.loadTexture('assets/cena_3_galeria/bob_walk_2.png'),
            await this.gameEngine.assetLoader.loadTexture('assets/cena_3_galeria/bob_walk_3.png'),
            await this.gameEngine.assetLoader.loadTexture('assets/cena_3_galeria/bob_walk_4.png')
        ];
        this.backTextures = [
            await this.gameEngine.assetLoader.loadTexture('assets/cena_3_galeria/bob_back_1.png'),
            await this.gameEngine.assetLoader.loadTexture('assets/cena_3_galeria/bob_back_2.png')
        ];
    }

    public static async create(
gameEngine: GameEngine,
        startX: number = 0,
        startY: number = 0,
        speed: number = 0.10,
        leftBound: number = -5,
        rightBound: number = 5
    ): Promise<BobCharacter> {
        const character = new BobCharacter(startX, startY, speed, leftBound, rightBound, gameEngine);
        await character.loadTextures();
        return character;
    }
}

export class MartaCharacter extends WalkingCharacter {
    constructor(
        startX: number,
        startY: number,
        speed: number,
        leftBound: number,
        rightBound: number,
        gameEngine: GameEngine,
    ) {
        super(gameEngine, startX, startY, speed, leftBound, rightBound, 'female');
    }

    protected async loadTextures(): Promise<void> {
        this.walkTextures = [
            await this.gameEngine.assetLoader.loadTexture('assets/cena_3_galeria/marta_walk_1.png'),
            await this.gameEngine.assetLoader.loadTexture('assets/cena_3_galeria/marta_walk_2.png')
        ];
        this.backTextures = [
            await this.gameEngine.assetLoader.loadTexture('assets/cena_3_galeria/marta_back_1.png')
        ];
    }

    public static async create(
        gameEngine: GameEngine,
        startX: number = 0,
        startY: number = 0,
        speed: number = 0.10,
        leftBound: number = -5,
        rightBound: number = 5
    ): Promise<MartaCharacter> {
        const character = new MartaCharacter(startX, startY, speed, leftBound, rightBound, gameEngine);
        await character.loadTextures();
        return character;
    }
}
