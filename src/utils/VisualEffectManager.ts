import * as THREE from 'three';

export interface DustMotesEffect {
    particles: THREE.Points;
    geometry: THREE.BufferGeometry;
    velocities: Float32Array;
    timeAccumulator: number;
    update: (deltaTime: number) => void;
}

export interface RainEffect {
    particles: THREE.Points;
    geometry: THREE.BufferGeometry;
    velocities: Float32Array;
    update: (deltaTime: number) => void;
}
export interface CoffeeSteamEffect {
    update(deltaTime: number): void;
    setPosition(x: number, y: number, z: number): void;
}


export class VisualEffectManager {
    public static createRainEffect(scene: THREE.Scene): RainEffect {
        const particleCount = 1500;
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        const spawnAreaWidth = 20;
        const spawnAreaDepth = 15;
        const spawnHeight = 10;
        const baseFallSpeed = 0.10;
        const speedVariation = 0.20;
        const windSpeed = 0.02;

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spawnAreaWidth;
            positions[i * 3 + 1] = Math.random() * spawnHeight;
            positions[i * 3 + 2] = 0;

            velocities[i * 3] = windSpeed;
            velocities[i * 3 + 1] = -(baseFallSpeed + Math.random() * speedVariation);
            velocities[i * 3 + 2] = 0;
        }

        const rainGeometry = new THREE.BufferGeometry();
        rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const rainMaterial = new THREE.PointsMaterial({
            color: 0xbbbbbb,
            size: 2,
            transparent: true,
            opacity: 0.6,
            depthTest: false,
            blending: THREE.NormalBlending,
            clippingPlanes: []
        });

        const rainParticles = new THREE.Points(rainGeometry, rainMaterial);
        rainParticles.position.z = 0.01;
        rainParticles.renderOrder = 999;
        rainParticles.userData.isBackground = true;
        rainParticles.userData.isParticleSystem = true; // Mark as particle system
        scene.add(rainParticles);

        return {
            particles: rainParticles,
            geometry: rainGeometry,
            velocities: velocities,
            update: (deltaTime: number) => {
                VisualEffectManager.updateRain(rainParticles, rainGeometry, velocities, deltaTime);
            }
        };
    }

    private static updateRain(
        rainParticles: THREE.Points,
        rainGeometry: THREE.BufferGeometry,
        velocities: Float32Array,
        deltaTime: number
    ): void {
        const positions = rainGeometry.attributes.position.array as Float32Array;
        const fallLimit = -6;
        const resetHeight = 10;
        const spawnAreaWidth = 30;

        const effectiveDeltaTime = Math.min(deltaTime, 0.1);

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * effectiveDeltaTime * 60;
            positions[i + 1] += velocities[i + 1] * effectiveDeltaTime * 60;

            if (positions[i + 1] < fallLimit) {
                positions[i + 1] = resetHeight + Math.random() * 5;
                positions[i] = (Math.random() - 0.5) * spawnAreaWidth;
                positions[i + 2] = 0;
            }
        }
        rainGeometry.attributes.position.needsUpdate = true;
    }

    public static createDustMotesEffect(scene: THREE.Scene, camera: any): DustMotesEffect {
        const dustGeometry = new THREE.BufferGeometry();
        const dustMaterial = new THREE.PointsMaterial({
            color: 0xffffee,
            size: 0.05,
            transparent: true,
            opacity: 0.5,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });

        const particleCount = 150;
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);

        const spawnAreaWidth = camera.right - camera.left;
        const spawnAreaHeight = camera.top - camera.bottom;
        const baseSpeed = 0.01;
        const speedVariation = 0.02;

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spawnAreaWidth;
            positions[i * 3 + 1] = (Math.random() - 0.5) * spawnAreaHeight;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

            const angle = Math.random() * Math.PI * 2;
            const speed = baseSpeed + Math.random() * speedVariation;
            velocities[i * 3] = Math.cos(angle) * speed;
            velocities[i * 3 + 1] = Math.sin(angle) * speed;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * baseSpeed * 0.1;
        }

        dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const dustParticles = new THREE.Points(dustGeometry, dustMaterial);
        dustParticles.position.z = 0;
        dustParticles.renderOrder = 10;
        dustParticles.userData.isBackground = true;
        dustParticles.userData.isParticleSystem = true; // Mark as particle system
        scene.add(dustParticles);

        return {
            particles: dustParticles,
            geometry: dustGeometry,
            velocities: velocities,
            timeAccumulator: 0,
            update: (deltaTime: number) => {
                const effectiveDeltaTime = Math.min(deltaTime, 0.1);
                VisualEffectManager.updateDustMotes(dustParticles, dustGeometry, velocities, effectiveDeltaTime, camera);
            }
        };
    }

    private static updateDustMotes(
        dustParticles: THREE.Points,
        dustGeometry: THREE.BufferGeometry,
        velocities: Float32Array,
        deltaTime: number,
        camera: any
    ): void {
        const positions = dustGeometry.attributes.position.array as Float32Array;
        const bounds = {
            x: (camera.right - camera.left) / 2 + 1,
            y: (camera.top - camera.bottom) / 2 + 1,
            z: 2
        };

        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += velocities[i] * deltaTime * 60;
            positions[i + 1] += velocities[i + 1] * deltaTime * 60;
            positions[i + 2] += velocities[i + 2] * deltaTime * 60;

            if (Math.abs(positions[i]) > bounds.x) velocities[i] *= -1;
            if (Math.abs(positions[i + 1]) > bounds.y) velocities[i + 1] *= -1;
            if (Math.abs(positions[i + 2]) > bounds.z) velocities[i + 2] *= -1;

            if (Math.random() < 0.001) {
                const angle = Math.random() * Math.PI * 2;
                const speed = (0.01 + Math.random() * 0.02);
                velocities[i] = Math.cos(angle) * speed;
                velocities[i + 1] = Math.sin(angle) * speed;
            }
        }
        dustGeometry.attributes.position.needsUpdate = true;
    }

    public static createCoffeeSteamEffect(scene: THREE.Scene, origin: THREE.Vector3): CoffeeSteamEffect {
        const particleCount = 50; // Fewer particles for steam
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 4); // For fading (RGBA)

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const i4 = i * 4;

            // Position particles at the origin initially
            positions[i3] = origin.x + (Math.random() - 0.5) * 0.1; // Slight horizontal variation
            positions[i3 + 1] = origin.y + (Math.random() * 0.1); // Start slightly above origin
            positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.1; // Slight depth variation

            // Give particles a slight upward and random horizontal velocity
            velocities[i3] = (Math.random() - 0.5) * 0.01 - 0.006; // vx (slower, slight leftward blow)
            velocities[i3 + 1] = 0.02 + Math.random() * 0.005; // vy (even slower upward)
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.01; // vz

            // Initialize color (white) and alpha (opacity)
            colors[i4] = 1.0; // R
            colors[i4 + 1] = 1.0; // G
            colors[i4 + 2] = 1.0; // B
            colors[i4 + 3] = 0.1 + Math.random() * 0.2; // Initial random opacity (more transparent)
        }

        const steamGeometry = new THREE.BufferGeometry();
        steamGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        steamGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        steamGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 4)); // Store color (RGBA)
const steamMaterial = new THREE.PointsMaterial({
    size: 1.0, // Even bigger size
    transparent: true,
    opacity: 1.0, // Max opacity controlled by vertex colors
    vertexColors: true, // Use vertex colors for per-particle color/opacity
    blending: THREE.AdditiveBlending,
    depthWrite: false // Important for transparency
});
        const coffeeSteamParticles = new THREE.Points(steamGeometry, steamMaterial);
        coffeeSteamParticles.position.z = origin.z + 0.01; // Render slightly in front of the origin
        coffeeSteamParticles.renderOrder = 20; // Render in front of dust motes
        coffeeSteamParticles.userData.isParticleSystem = true; // Mark as particle system
        scene.add(coffeeSteamParticles);
        return {
            update: (deltaTime: number) => {
                VisualEffectManager.updateCoffeeSteam(coffeeSteamParticles, steamGeometry, velocities, deltaTime, origin);
            },
            setPosition: (x: number, y: number, z: number) => {
                origin.set(x, y, z);
                // Also update initial positions of particles if needed, or just let them drift from the new origin
            }
        };
    }

    private static updateCoffeeSteam(
        steamParticles: THREE.Points,
        steamGeometry: THREE.BufferGeometry,
        velocities: Float32Array,
        deltaTime: number,
        origin: THREE.Vector3
    ): void {
        const positions = steamGeometry.attributes.position.array as Float32Array;
        const colors = steamGeometry.attributes.color.array as Float32Array; // Get color attribute
        const count = positions.length / 3;
        const effectiveDeltaTime = Math.min(deltaTime, 0.1); // Cap delta time

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // Update position based on velocity and delta time
            positions[i3] += velocities[i3] * effectiveDeltaTime * 60;
            positions[i3 + 1] += velocities[i3 + 1] * effectiveDeltaTime * 60;
            positions[i3 + 2] += velocities[i3 + 2] * effectiveDeltaTime * 60;

            // Fade out particles over time (update alpha channel of color)
            colors[i * 4 + 3] -= effectiveDeltaTime * 0.03; // Even slower fade rate for smoother fade

            // If particle opacity is low or it has moved far from origin, reset it
            const distance = Math.sqrt(
                Math.pow(positions[i3] - origin.x, 2) +
                Math.pow(positions[i3 + 1] - origin.y, 2) +
                Math.pow(positions[i3 + 2] - origin.z, 2)
            );

            if (colors[i * 4 + 3] <= 0 || distance > 2.5) { // Reset if faded or too far (increased distance)
                positions[i3] = origin.x + (Math.random() - 0.5) * 0.1;
                positions[i3 + 1] = origin.y + (Math.random() * 0.1);
                positions[i3 + 2] = origin.z + (Math.random() - 0.5) * 0.1;

                velocities[i3] = (Math.random() - 0.5) * 0.01 - 0.006; // vx (slower, slight leftward blow)
                velocities[i3 + 1] = 0.02 + Math.random() * 0.005; // vy (even slower upward)
                velocities[i3 + 2] = (Math.random() - 0.5) * 0.01; // vz

                colors[i * 4 + 3] = 0.1 + Math.random() * 0.2; // Reset alpha (more transparent)
            }
        }
        // Update attributes
        (steamGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        (steamGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true; // Update color attribute
    }
}
