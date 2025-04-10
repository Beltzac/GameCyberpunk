import * as THREE from 'three';
import { Easing } from '../utils/Easing';
import { SoundManager } from '../core/SoundManager';

export class WalkingCharacter {
    private sprite: THREE.Sprite;
    private walkTextures: THREE.Texture[];
    private backTextures: THREE.Texture[];
    private walkCycle: number = 0;
    private walkTimer: number = 0;
    private lookTimer: number = 0;
    private isLooking: boolean = false;
    private direction: number = 1;
    private isFlipped: boolean = false;
    private speed: number;
    private leftBound: number;
    private rightBound: number;
    private baseY: number;
    private soundManager: SoundManager;
    private lastStepSound: number = 0;
    private gender: 'male' | 'female';

    constructor(
        walkTextures: THREE.Texture[],
        backTextures: THREE.Texture[],
        startX: number,
        startY: number,
        speed: number = 0.10,
        leftBound: number = -5,
        rightBound: number = 5,
        soundManager: SoundManager,
        gender: 'male' | 'female' = 'male'
    ) {
        this.walkTextures = walkTextures;
        this.backTextures = backTextures;
        this.speed = speed;
        this.leftBound = leftBound;
        this.rightBound = rightBound;
        this.baseY = startY;
        this.soundManager = soundManager;
        this.gender = gender;

        // Load sounds
        soundManager.loadSound('step1', 'assets/sounds/step_1.wav');
        soundManager.loadSound('step2', 'assets/sounds/step_2.wav');
        soundManager.loadSound('male_hurt', 'assets/cena_3_galeria/sounds/male_hurt.mp3');
        soundManager.loadSound('female_hurt', 'assets/cena_3_galeria/sounds/female_hurt.wav');

        const material = new THREE.SpriteMaterial({
            map: walkTextures[0],
            transparent: true,
            side: THREE.DoubleSide
        });
        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(3, 3, 1);
        this.sprite.position.set(startX, startY, 3);

        // Random initial direction
        this.direction = Math.random() < 0.5 ? 1 : -1;
        this.isFlipped = this.direction < 0;
        this.updateTextureFlip();
    }

    public getSprite(): THREE.Sprite {
        return this.sprite;
    }

    public playHurtSound(): void {
        const sound = this.gender === 'male' ? 'male_hurt' : 'female_hurt';
        this.soundManager.playSound(sound, 0.8);
    }

    public update(deltaTime: number): void {
        if (!this.isLooking) {
            this.walkTimer += deltaTime;
            if (this.walkTimer > 0.4) {
                this.walkTimer = 0;
                this.walkCycle = (this.walkCycle + 1) % this.walkTextures.length;
                this.updateTexture(this.walkCycle);
                this.sprite.position.x += this.speed * this.direction;

                // Play step sound
                const stepSound = this.lastStepSound === 1 ? 'step2' : 'step1';
                this.soundManager.playSound(stepSound, 0.3);
                this.lastStepSound = this.lastStepSound === 1 ? 2 : 1;

                // Add bobbing motion using easing
                const bobPhase = this.walkCycle / this.walkTextures.length;
                this.sprite.position.y = this.baseY - 0.1 + Easing.easeInOutSine(bobPhase) * 0.2;
                // Add subtle scale variation
                const scaleVar = 0.9 + Easing.easeInOutSine(bobPhase) * 0.1;
                this.sprite.scale.set(3 * scaleVar, 3 * scaleVar, 1);

                // Check bounds
                if (this.sprite.position.x > this.rightBound) {
                    this.direction = -1;
                    this.isFlipped = true;
                    this.updateTextureFlip();
                } else if (this.sprite.position.x < this.leftBound) {
                    this.direction = 1;
                    this.isFlipped = false;
                    this.updateTextureFlip();
                }

                // Random look
                if (Math.random() < 0.005 &&
                    this.sprite.position.x > this.leftBound + 1 &&
                    this.sprite.position.x < this.rightBound - 1) {
                    this.isLooking = true;
                    this.lookTimer = 0;
                    const backIndex = Math.floor(Math.random() * this.backTextures.length);
                    this.updateTexture(this.walkTextures.length + backIndex);
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

    private updateTexture(index: number = this.walkCycle): void {
        const material = this.sprite.material as THREE.SpriteMaterial;
        if (index < this.walkTextures.length) {
            material.map = this.walkTextures[index];
        } else {
            material.map = this.backTextures[index - this.walkTextures.length];
        }
        this.updateTextureFlip();
        material.needsUpdate = true;
    }

    private updateTextureFlip(): void {
        const material = this.sprite.material as THREE.SpriteMaterial;
        if (material.map) {
            material.map.repeat.x = this.isFlipped ? -1 : 1;
            material.map.offset.x = this.isFlipped ? 1 : 0;
            material.map.needsUpdate = true;
        }
    }
}