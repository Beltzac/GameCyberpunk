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
        color: 0xbbbbbb, // Slightly brighter
        size: 2,      // Slightly larger
        transparent: true,
        opacity: 0.6,   // Even more opaque
        depthTest: false,
        blending: THREE.NormalBlending,
        clippingPlanes: []
    });
    private animationState: 'idle' | 'handMovingDown' | 'phoneMovingUp' | 'phoneIdle' = 'idle';
    private timeAccumulator = 0;
    private buttonTimeAccumulator = 0;
    private buttonOffsets: number[] = [];
    private rainVelocities: Float32Array | null = null;
    private animationStartTime = 0;
    private animationDuration = 1; // seconds
    private buttonAnimationSpeed = 3; // Even slower floating speed

    // <<< ADDED: Properties for posts >>>
    private postTextures: THREE.Texture[] = [];
    private postSprites: THREE.Mesh[] = []; // Changed type to Mesh
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
    private phoneBackgroundPlane: THREE.Mesh | null = null; // Reference to the gray background
    private postClippingPlanes: THREE.Plane[] = []; // Planes for masking posts


    constructor(gameEngine: GameEngine, assetLoader: AssetLoader, sceneManager: SceneManager) { // Removed camera parameter
        super(gameEngine); // Removed camera from super call
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
        const particleCount = 2500; // Further increase particle count
        const positions = new Float32Array(particleCount * 3);
        this.rainVelocities = new Float32Array(particleCount * 3); // Initialize velocities array

        const spawnAreaWidth = 20; // Reduced width
        const spawnAreaDepth = 15; // Reduced depth
        const spawnHeight = 10; // Reduced initial height
        const baseFallSpeed = 0.10; // Increase fall speed slightly
        const speedVariation = 0.20; // Increase variation slightly
        const windSpeed = 0.02; // Keep wind speed the same for now

        for (let i = 0; i < particleCount; i++) {
            // Initial position
            positions[i * 3] = (Math.random() - 0.5) * spawnAreaWidth; // x
            positions[i * 3 + 1] = Math.random() * spawnHeight; // y (start higher)
            positions[i * 3 + 2] = 0; // z - Force to 0 plane

            // Initial velocity
            this.rainVelocities[i * 3] = windSpeed; // x velocity (wind)
            this.rainVelocities[i * 3 + 1] = -(baseFallSpeed + Math.random() * speedVariation); // y velocity (falling speed variation)
            this.rainVelocities[i * 3 + 2] = 0; // z velocity - Keep at 0
        }

        this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.rainParticles = new THREE.Points(this.rainGeometry, this.rainMaterial);
        this.rainParticles.position.z = 0.01; // Reset Z position slightly in front
        // Removed explicit layer setting
        this.rainParticles.renderOrder = 999; // Render rain on top
        this.rainParticles.userData.isBackground = true; // Mark rain as non-interactive
        // Removed debug log
        this.threeScene.add(this.rainParticles);
    }

    update(deltaTime: number): void {
        if (this.rainParticles && this.rainVelocities) {
            const positions = this.rainGeometry.attributes.position.array as Float32Array;
            const velocities = this.rainVelocities;
            const fallLimit = -6; // Adjusted lower limit
            const resetHeight = 10; // Adjusted reset height
            const spawnAreaWidth = 15; // Match reduced setup width

            const effectiveDeltaTime = Math.min(deltaTime, 0.1); // Clamp deltaTime to avoid large jumps

            for (let i = 0; i < positions.length; i += 3) {
                // Update position based on velocity and deltaTime
                positions[i] += velocities[i] * effectiveDeltaTime * 60; // Scale velocity by deltaTime (assuming base velocity is for 60fps)
                positions[i + 1] += velocities[i + 1] * effectiveDeltaTime * 60; // Scale velocity by deltaTime
                // positions[i + 2] = 0; // Ensure z stays 0 if velocity was non-zero

                // Reset particle if it falls below the limit
                if (positions[i + 1] < fallLimit) {
                    positions[i + 1] = resetHeight + Math.random() * 5; // Reset y to top with some variation
                    positions[i] = (Math.random() - 0.5) * spawnAreaWidth; // Reset x to a new random horizontal position
                    // Ensure z remains 0 on reset
                    positions[i + 2] = 0;
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
                    // Make phone, background, and posts visible
                    if (this.phoneSprite?.material) {
                        (this.phoneSprite.material as THREE.SpriteMaterial).opacity = 1;
                    }
                    if (this.phoneBackgroundPlane) {
                        this.phoneBackgroundPlane.visible = true;
                    }
                    if (this.postContainer) {
                        this.postContainer.visible = true;
                    }
                }
            } else if (this.animationState === 'phoneMovingUp' && this.phoneSprite) {
                // Animate phone up with easing
                const elapsed = this.timeAccumulator - this.animationStartTime;
                const progress = Math.min(elapsed / this.animationDuration, 1);
                const currentY = -5 + Easing.easeOutQuad(progress) * 5;
                this.phoneSprite.position.y = currentY;

                // <<< MODIFIED: Update background AND post container positions >>>
                if (this.phoneBackgroundPlane) {
                    this.phoneBackgroundPlane.position.y = currentY;
                }
                if (this.postContainer) {
                    this.postContainer.position.y = currentY; // Keep container Y synced
                }

                // <<< ADDED: Manually update clipping plane constants >>>
                if (this.postClippingPlanes.length === 4 && this.phoneBackgroundPlane) {
                    const halfHeight = (this.phoneBackgroundPlane.geometry as THREE.PlaneGeometry).parameters.height / 2;
                    // Corrected constant calculations:
                    this.postClippingPlanes[0].constant = currentY + halfHeight; // Top edge
                    this.postClippingPlanes[1].constant = -currentY + halfHeight; // Bottom edge
                    // Left/Right constants (indices 2 and 3) remain unchanged if X position is static
                }
                // <<< END ADDED >>>
                // <<< END ADDED >>>

                if (progress >= 1) {
                    // --- Step 1: Set Final Animated Positions ---
                    if (this.phoneSprite) {
                        this.phoneSprite.position.y = 0;
                    }
                    if (this.phoneBackgroundPlane) {
                        this.phoneBackgroundPlane.position.y = 0;
                    }
                    if (this.postContainer) {
                        this.postContainer.position.y = 0; // Final animated position
                    }
                    // Set final clipping plane constants for Y=0
                    if (this.postClippingPlanes.length === 4 && this.phoneBackgroundPlane) {
                        const halfHeight = (this.phoneBackgroundPlane.geometry as THREE.PlaneGeometry).parameters.height / 2;
                        this.postClippingPlanes[0].constant = halfHeight; // Top: 0 + halfHeight
                        this.postClippingPlanes[1].constant = halfHeight; // Bottom: -0 + halfHeight
                    }

                    // --- Step 2: Change Animation State ---
                    this.animationState = 'phoneIdle';
                    this.currentPostIndex = 0;
                    this.targetPostIndex = 0;
                    this.isScrollingPosts = false;

                    // --- Step 3: Post-Animation Adjustment for Centering ---
                    // Now, adjust the container's final Y position so the first post is centered
                    if (this.postContainer && this.postSprites.length > 0) {
                        const firstPost = this.postSprites[0];
                        // The container is at Y=0. The first post is at firstPost.position.y within it.
                        // To center the first post at the container's origin (Y=0), shift the container up.
                        this.postContainer.position.y = -firstPost.position.y;
                    }
                    // If no posts, Y remains 0 (already set in Step 1)
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


                // <<< MODIFIED: Create a background plane for the phone screen area >>>
                // Calculate the visual size of the screen area based on post scaling
                const screenWidth = phoneScaleX * 0.53; // Match postScaleX calculation base (paddingFactor = 0.5)
                const screenHeight = phoneScaleY * 0.56; // Adjust height slightly if needed, or derive from aspect ratio/padding
                const phoneBgGeometry = new THREE.PlaneGeometry(screenWidth, screenHeight); // Use calculated size
                const phoneBgMaterial = new THREE.MeshBasicMaterial({ color: 0xcccfd9 });
                this.phoneBackgroundPlane = new THREE.Mesh(phoneBgGeometry, phoneBgMaterial); // Store reference
                // this.phoneBackgroundPlane.scale.set(1, 1, 1); // Geometry defines size now
                // Set initial position to match the phone's starting position
                this.phoneBackgroundPlane.position.set(this.phoneSprite.position.x, this.phoneSprite.position.y, 0.18);
                this.phoneBackgroundPlane.visible = false; // Start invisible
                this.threeScene.add(this.phoneBackgroundPlane);
                // <<< ADDED: Define Clipping Planes based on background plane geometry >>>
                const halfWidth = screenWidth / 2;
                const halfHeight = screenHeight / 2;
                // Define initial clipping planes based on initial Y position (-5)
                const initialY = this.phoneSprite?.position.y ?? -5; // Get initial Y or default
                this.postClippingPlanes = [
                    new THREE.Plane(new THREE.Vector3(0, -1, 0), initialY + halfHeight), // Top edge initial constant
                    new THREE.Plane(new THREE.Vector3(0, 1, 0), -initialY + halfHeight),  // Bottom edge initial constant
                    new THREE.Plane(new THREE.Vector3(-1, 0, 0), halfWidth), // Right edge constant
                    new THREE.Plane(new THREE.Vector3(1, 0, 0), halfWidth)   // Left edge constant
                ];
                // <<< END ADDED >>>
                // <<< MODIFIED: Create post container and stack posts vertically >>>
                this.postContainer = new THREE.Group();
                // Set initial WORLD position to match the phone's starting position BEFORE adding to scene
                if (this.phoneSprite) {
                    this.postContainer.position.set(this.phoneSprite.position.x, this.phoneSprite.position.y, 0.19);
                } else {
                    this.postContainer.position.set(0, -5, 0.19); // Fallback
                }
                this.postContainer.visible = false; // Start invisible
                this.threeScene.add(this.postContainer); // Add container directly to the scene

                this.postSprites = []; // Clear previous sprites if any
                let accumulatedHeight = 0;
                const postSpacing = 1.0; // Vertical space between posts

                for (let i = 0; i < this.postTextures.length; i++) {
                    const texture = this.postTextures[i]; // Get texture first

                    // Calculate scale based on phone scale, maintaining aspect ratio
                    const paddingFactor = 0.5; // Post width occupies 50% of the phone's inner space width
                    const postScaleX = phoneScaleX * paddingFactor;
                    const aspectRatio = texture.image ? (texture.image.naturalHeight / texture.image.naturalWidth) : 1;
                    const postScaleY = postScaleX * aspectRatio;

                    // Create PlaneGeometry matching the calculated scale
                    const postGeometry = new THREE.PlaneGeometry(postScaleX, postScaleY);

                    // Create MeshBasicMaterial
                    const postMaterial = new THREE.MeshBasicMaterial({
                        map: texture,
                        // transparent: true, // Temporarily disable for testing clipping
                        opacity: 1,
                        depthTest: true,
                        depthWrite: false, // <<< ADD: Prevent writing to depth buffer >>>

                        // Clipping plane configuration
                        clippingPlanes: this.postClippingPlanes,
                        clipIntersection: true, // Render pixels *inside* the intersection of ALL planes
                        side: THREE.DoubleSide // Render both sides in case of rotation issues (optional but safer)
                    });

                    // Create Mesh instead of Sprite
                    const postMesh = new THREE.Mesh(postGeometry, postMaterial);

                    // Redundant declarations removed below - these were calculated earlier for the geometry
                    // const paddingFactor = 0.5;
                    // const postScaleX = phoneScaleX * paddingFactor;
                    // const texture = this.postTextures[i];
                    // const aspectRatio = texture.image ? (texture.image.naturalHeight / texture.image.naturalWidth) : 1;

                    // postMesh.scale.set(1, 1, 1); // Scale is now handled by geometry size

                    // Position posts vertically stacked within the container
                    // Center of the first post (i=0) should be near y=0 in the container
                    const postPositionY = -(i * (postScaleY + postSpacing));
                    postMesh.position.set(0, postPositionY, 0); // Position within the container
                    postMesh.name = `Post${i + 1}`;
                    // postSprite.visible = true; // All posts are technically visible within the container

                    this.postContainer.add(postMesh); // Add mesh to the container
                    // We still need to store references, maybe change type of postSprites or cast later
                    this.postSprites.push(postMesh); // Store mesh reference (cast no longer needed)

                    // Store height for scroll calculation (use scaleY as height proxy)
                    accumulatedHeight += postScaleY + postSpacing;
                }
                this.currentPostIndex = 0; // Start at the first post
                this.targetPostIndex = 0;
                // this.postContainer.position.y = 0; // REMOVED - Initial local position is (0,0,0.01). Centering happens after animation.
                // <<< END MODIFIED >>>
            }
        } else if (clickedObject.name.startsWith("ThoughtButton")) {
            const buttonIndex = parseInt(clickedObject.name.replace("ThoughtButton", "")) - 1;
            console.log(`Thought button ${buttonIndex + 1} clicked`);
            // Add thought-specific logic here later

            this.sceneManager.changeScene('cena1_trabalho', 'glitch');
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
