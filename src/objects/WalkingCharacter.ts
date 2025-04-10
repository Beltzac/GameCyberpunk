import * as THREE from 'three';

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

    constructor(
        walkTextures: THREE.Texture[],
        backTextures: THREE.Texture[],
        startX: number,
        startY: number,
        speed: number = 0.05,
        leftBound: number = -5,
        rightBound: number = 5
    ) {
        this.walkTextures = walkTextures;
        this.backTextures = backTextures;
        this.speed = speed;
        this.leftBound = leftBound;
        this.rightBound = rightBound;

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

    public update(deltaTime: number): void {
        if (!this.isLooking) {
            this.walkTimer += deltaTime;
            if (this.walkTimer > 0.2) {
                this.walkTimer = 0;
                this.walkCycle = (this.walkCycle + 1) % this.walkTextures.length;
                this.updateTexture(this.walkCycle);
                this.sprite.position.x += this.speed * this.direction;

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
            if (this.lookTimer > 2.0) {
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