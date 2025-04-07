// src/scenes/Cena2RuaScene.ts
import * as THREE from 'three';
import { Scene } from '../core/Scene';
import { AssetLoader } from '../utils/AssetLoader';
import { SceneManager } from '../core/SceneManager';
import { Easing } from '../utils/Easing';
import { GameEngine } from '../core/GameEngine'; // Import GameEngine

export class Cena2RuaScene extends Scene {
    private assetLoader: AssetLoader;
    private sceneManager: SceneManager;
    // No need to store gameEngine here, it's in the base class

    private backgroundSprite: THREE.Sprite | null = null;
    private handSprite: THREE.Sprite | null = null;
    private handTexture: THREE.Texture | null = null;
    private phoneSprite: THREE.Sprite | null = null;
    private phoneTexture: THREE.Texture | null = null;
    private thoughtButtonTextures: THREE.Texture[] = [];
    private thoughtButtons: THREE.Sprite[] = [];
    private rainParticles: THREE.Points | null = null;
    private rainGeometry = new THREE.BufferGeometry();
    private rainMaterial = new THREE.PointsMaterial({
        color: 0xaaaaaa,
        size: 0.1,
        transparent: true,
        opacity: 0.8
    });
    private animationState: 'idle' | 'handMovingDown' | 'phoneMovingUp' | 'phoneIdle' = 'idle';
    private timeAccumulator = 0;
    private buttonTimeAccumulator = 0;
    private buttonOffsets: number[] = [];
    private animationStartTime = 0;
    private animationDuration = 1; // seconds
private buttonAnimationSpeed = 3; // Even slower floating speed

// <<< ADDED: Properties for posts >>>
private postTextures: THREE.Texture[] = [];
private postSprites: THREE.Sprite[] = [];
private currentPostIndex: number = 0;
// <<< END ADDED >>>
    // <<< ADDED: Properties for post scrolling >>>
    private postContainer: THREE.Group | null = null;
    private isScrollingPosts: boolean = false;
    private scrollStartY: number = 0;
    private scrollTargetY: number = 0;
    private scrollStartTime: number = 0;
    private scrollDuration: number = 0.5; // seconds
    private targetPostIndex: number = 0;
    // <<< END ADDED >>>


    constructor(gameEngine: GameEngine, assetLoader: AssetLoader, sceneManager: SceneManager) {
        super(gameEngine); // Pass gameEngine to base constructor
        this.assetLoader = assetLoader;
        this.sceneManager = sceneManager;
        console.log("Cena2RuaScene created");
    }

    async init(): Promise<void> {
        console.log("Cena2RuaScene initializing...");

        try {
            this.buttonOffsets = this.thoughtButtons.map(() => Math.random() * Math.PI * 2);
            // Load all required assets
            const backgroundTexture = await this.assetLoader.loadTexture('assets/cena_2_rua/background.png');
            this.handTexture = await this.assetLoader.loadTexture('assets/cena_2_rua/mao.png');
            this.phoneTexture = await this.assetLoader.loadTexture('assets/cena_2_rua/celular2.png');

            // Load thought button textures
            this.thoughtButtonTextures = [
                await this.assetLoader.loadTexture('assets/cena_2_rua/thought1.png'),
                await this.assetLoader.loadTexture('assets/cena_2_rua/thought2.png'),
                await this.assetLoader.loadTexture('assets/cena_2_rua/thought3.png')
           ];

           // <<< ADDED: Load post textures >>>
           this.postTextures = [
               await this.assetLoader.loadTexture('assets/cena_2_rua/posts/post_1.png'),
               await this.assetLoader.loadTexture('assets/cena_2_rua/posts/post_2.png'),
               await this.assetLoader.loadTexture('assets/cena_2_rua/posts/post_3.png')
           ];
           // <<< END ADDED >>>


            // Create background sprite (full screen, non-interactive)
            const backgroundMaterial = new THREE.SpriteMaterial({ map: backgroundTexture });
            this.backgroundSprite = new THREE.Sprite(backgroundMaterial);
            // Scale background to camera view
            const camera = this.gameEngine.camera;
            const scaleX = (camera.right - camera.left);
            const scaleY = (camera.top - camera.bottom);
            this.backgroundSprite.scale.set(scaleX, scaleY, 1);
            this.backgroundSprite.userData.isBackground = true; // Mark as background
            this.threeScene.add(this.backgroundSprite);

            // Create hand sprite (interactive object)
            const handMaterial = new THREE.SpriteMaterial({
                map: this.handTexture,
                transparent: true
            });
            this.handSprite = new THREE.Sprite(handMaterial);
            this.handSprite.scale.set(7.25, 5, 1);
            this.handSprite.position.set(3, -2, 0.1); // Positioned at bottom
            this.handSprite.name = "Hand";
            this.threeScene.add(this.handSprite);

            // Setup rain particles
            this.setupRain();

            // Create thought buttons
            for (let i = 0; i < this.thoughtButtonTextures.length; i++) {
                const material = new THREE.SpriteMaterial({
                    map: this.thoughtButtonTextures[i],
                    transparent: true
                });
                const button = new THREE.Sprite(material);
                button.scale.set(2, 2, 1);
                button.position.set(-5, 4 - (i * 1.5), 0.1); // Left side, vertically stacked
                button.name = `ThoughtButton${i + 1}`;
                this.thoughtButtons.push(button);
                this.threeScene.add(button);
            }

            // Add ambient light with cyberpunk colors
            const ambientLight = new THREE.AmbientLight(0x404040);
            this.threeScene.add(ambientLight);

            // Add colored lights for cyberpunk effect
            const cyanLight = new THREE.PointLight(0x00ffff, 0.5);
            cyanLight.position.set(-5, 2, 3);
            this.threeScene.add(cyanLight);

            const magentaLight = new THREE.PointLight(0xff00ff, 0.5);
            magentaLight.position.set(5, 2, 3);
            this.threeScene.add(magentaLight);

            console.log("Cena2RuaScene initialized.");
        } catch (error) {
            console.error("Failed to initialize Cena2RuaScene:", error);
            throw error;
        }
    }

    private setupRain(): void {
        const particleCount = 1000;
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 20; // x
            positions[i * 3 + 1] = Math.random() * 10; // y
            positions[i * 3 + 2] = (Math.random() - 0.5) * 20; // z
        }

        this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.rainParticles = new THREE.Points(this.rainGeometry, this.rainMaterial);
        this.rainParticles.userData.isBackground = true; // Mark rain as non-interactive
        this.threeScene.add(this.rainParticles);
    }

    update(deltaTime: number): void {
        // Animate rain
        if (this.rainParticles) {
            const positions = this.rainGeometry.attributes.position.array as Float32Array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 0.1; // Move rain down
                if (positions[i + 1] < -5) {
                    positions[i + 1] = 10; // Reset to top
                }
            }
            this.rainGeometry.attributes.position.needsUpdate = true;
        }

        // Animate hand bobbing
        if (this.handSprite) {
            this.timeAccumulator += deltaTime;
            this.buttonTimeAccumulator += deltaTime * this.buttonAnimationSpeed;

            // Handle animation states
            if (this.animationState === 'handMovingDown') {
                // Animate hand down with easing
                const elapsed = this.timeAccumulator - this.animationStartTime;
                const progress = Math.min(elapsed / this.animationDuration, 1);
                this.handSprite.position.y = -2 - Easing.easeInQuad(progress) * 5;
                if (progress >= 1) {
                    this.handSprite.position.y = -7;
                    this.animationState = 'phoneMovingUp';
                    this.animationStartTime = this.timeAccumulator;
                    // Make phone visible
                    if (this.phoneSprite?.material) {
                        (this.phoneSprite.material as THREE.SpriteMaterial).opacity = 1;
                    }
                }
            } else if (this.animationState === 'phoneMovingUp' && this.phoneSprite) {
                // Animate phone up with easing
                const elapsed = this.timeAccumulator - this.animationStartTime;
                const progress = Math.min(elapsed / this.animationDuration, 1);
                this.phoneSprite.position.y = -5 + Easing.easeOutQuad(progress) * 5;
                if (progress >= 1) {
                    this.phoneSprite.position.y = 0;
                   this.animationState = 'phoneIdle';
                   // <<< MODIFIED: Set initial post container position >>>
                   if (this.postContainer) {
                       // Position container so the first post (index 0) is centered
                       const firstPost = this.postSprites[0];
                       if (firstPost) {
                           this.postContainer.position.y = -firstPost.position.y; // Move container up by the first post's offset
                       } else {
                           this.postContainer.position.y = 0;
                       }
                       this.currentPostIndex = 0;
                       this.targetPostIndex = 0;
                       this.isScrollingPosts = false;
                   }
                   // <<< END MODIFIED >>>
               }
            } else if (this.animationState === 'idle') {
                // Normal hand bobbing animation
                const bobProgress = Easing.easeInOutSine(Math.sin(this.timeAccumulator * 5) * 0.5 + 0.5);
                this.handSprite.position.y = -1.5 + bobProgress * 0.2 - 0.1;
            }

            // Animate thought buttons with random floating
            for (let i = 0; i < this.thoughtButtons.length; i++) {
                this.buttonOffsets[i] = this.buttonOffsets[i] || Math.random() * Math.PI * 2;
                const button = this.thoughtButtons[i];
                const offset = this.buttonOffsets[i];
                button.position.x = -7 + Math.sin(this.timeAccumulator * 2 + offset) * 0.2;
                button.position.y = (3 - (i * 1.5)) + Math.cos(this.timeAccumulator * 3 + offset) * 0.1;
           }

           // <<< ADDED: Handle post scrolling animation >>>
           if (this.isScrollingPosts && this.postContainer) {
               const elapsed = this.timeAccumulator - this.scrollStartTime;
               const progress = Math.min(elapsed / this.scrollDuration, 1);
               const easedProgress = Easing.easeInOutQuad(progress); // Use easing

               this.postContainer.position.y = this.scrollStartY + (this.scrollTargetY - this.scrollStartY) * easedProgress;

               if (progress >= 1) {
                   this.postContainer.position.y = this.scrollTargetY; // Ensure final position
                   this.isScrollingPosts = false;
                   this.currentPostIndex = this.targetPostIndex; // Update index after scroll completes
                   console.log(`Scrolled to post ${this.currentPostIndex + 1}`);
               }
           }
           // <<< END ADDED >>>
        }
    }

    render(renderer: THREE.WebGLRenderer): void {
        // Custom rendering if needed
    }

    public handleClick(intersects: THREE.Intersection[]): void {
        if (!intersects.length) return;

        const clickedObject = intersects[0].object;
        if (clickedObject.name === "Hand" && this.handSprite && this.animationState === 'idle') {
            console.log("Hand clicked - starting hand animation");
            this.animationState = 'handMovingDown';
            this.animationStartTime = this.timeAccumulator;

            // Create phone sprite at bottom (hidden initially)
            if (this.phoneTexture) {
                const phoneMaterial = new THREE.SpriteMaterial({
                    map: this.phoneTexture,
                    transparent: true,
                    opacity: 0
                });
                this.phoneSprite = new THREE.Sprite(phoneMaterial);
               const phoneScaleX = 6.5;
               const phoneScaleY = 9;
               this.phoneSprite.scale.set(phoneScaleX, phoneScaleY, 1);
                this.phoneSprite.position.set(0, -5, 0.2); // Phone slightly in front of hand
               this.threeScene.add(this.phoneSprite);

               // <<< MODIFIED: Create post container and stack posts vertically >>>
               this.postContainer = new THREE.Group();
               // this.phoneSprite.add(this.postContainer); // Add container to phone - REMOVED
               this.threeScene.add(this.postContainer); // Add container directly to the scene
               this.postContainer.position.set(0, 0, 0.19); // Position container behind the phone (phone is at 0.2)

               this.postSprites = []; // Clear previous sprites if any
               let accumulatedHeight = 0;
               const postSpacing = 1.0; // Vertical space between posts

               for (let i = 0; i < this.postTextures.length; i++) {
                   const postMaterial = new THREE.SpriteMaterial({
                       map: this.postTextures[i],
                       transparent: true,
                       opacity: 1,
                       // depthTest: false // Ensure posts render on top - REMOVED to respect Z-order
                   });
                   const postSprite = new THREE.Sprite(postMaterial);

                   // Calculate scale based on phone scale, maintaining aspect ratio
                   const paddingFactor = 0.5; // Post width occupies 80% of the phone's inner space width
                   const postScaleX = phoneScaleX * paddingFactor;

                   // Get texture aspect ratio
                   const texture = this.postTextures[i];
                   const aspectRatio = texture.image ? (texture.image.naturalHeight / texture.image.naturalWidth) : 1; // Default to 1 if image not loaded

                   const postScaleY = postScaleX * aspectRatio; // Calculate Y scale based on X and aspect ratio
                   postSprite.scale.set(postScaleX, postScaleY, 1);

                   // Position posts vertically stacked within the container
                   // Center of the first post (i=0) should be near y=0 in the container
                   const postPositionY = -(i * (postScaleY + postSpacing));
                   postSprite.position.set(0, postPositionY, 0); // Position within the container
                   postSprite.name = `Post${i + 1}`;
                   // postSprite.visible = true; // All posts are technically visible within the container

                   this.postContainer.add(postSprite); // Add post to the container
                   this.postSprites.push(postSprite);

                   // Store height for scroll calculation (use scaleY as height proxy)
                   accumulatedHeight += postScaleY + postSpacing;
               }
               this.currentPostIndex = 0; // Start at the first post
               this.targetPostIndex = 0;
               this.postContainer.position.y = 0; // Initial position shows the first post centered
               // <<< END MODIFIED >>>
           }
        } else if (clickedObject.name.startsWith("ThoughtButton")) {
            const buttonIndex = parseInt(clickedObject.name.replace("ThoughtButton", "")) - 1;
            console.log(`Thought button ${buttonIndex + 1} clicked`);
            // Add thought-specific logic here later

            this.sceneManager.changeScene('cena1_trabalho');
       }
       // <<< MODIFIED: Handle clicks on the phone OR the post to INITIATE SCROLL >>>
       else if ((clickedObject === this.phoneSprite || clickedObject.name.startsWith("Post")) && this.animationState === 'phoneIdle' && !this.isScrollingPosts) {
           console.log("Phone or Post clicked - starting scroll");

           if (this.postSprites.length > 1 && this.postContainer) {
               this.targetPostIndex = (this.currentPostIndex + 1) % this.postSprites.length;

               // Calculate target Y based on the height of posts scrolled past
               const targetPost = this.postSprites[this.targetPostIndex];
               // We want the center of the target post to align with the center of the container (y=0)
               // The post's position.y is its center relative to the container.
               // So, we need to move the container *up* by the target post's position.y amount.
               this.scrollTargetY = -targetPost.position.y;

               this.scrollStartY = this.postContainer.position.y;
               this.scrollStartTime = this.timeAccumulator;
               this.isScrollingPosts = true;

               // Update current index immediately or after scroll? Let's do after scroll in update.
               // this.currentPostIndex = this.targetPostIndex;
           }
       }
       // <<< END MODIFIED >>>
   }

}
