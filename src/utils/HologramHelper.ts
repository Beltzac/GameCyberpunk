// src/utils/HologramHelper.ts
import * as THREE from 'three';

export class HologramHelper {

    // Static method to apply the hologram shader to a given 3D object
    public static applyHologramShader(model: THREE.Object3D): void {
        model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const material = new THREE.ShaderMaterial({
                    uniforms: {
                        time: { value: 0 },
                        glowColor: { value: new THREE.Color(0.2, 1.0, 1.0) } // Cyan glow
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
                        // uniform float glitchIntensity; // Add this uniform later for dynamic control
                        uniform vec3 glowColor;
                        // uniform sampler2D map; // Add this uniform later if using textures

                        varying vec2 vUv;
                        varying vec3 vNormal;

                        // A simple pseudo-random function
                        float rand(vec2 co) {
                            return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
                        }

                        void main() {
                            vec2 uv = vUv; // Use local uv

                            // Base hologram effect
                            float scanLine = sin(uv.y * 1000.0 + time * 3.0) * 0.05 + 0.95;
                            float edge = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
                            edge = pow(edge, 2.0);
                            vec3 color = glowColor * scanLine * (0.6 + edge * 0.4);

                            // Subtle flicker
                            float flicker = 0.95 + (rand(vec2(time * 0.1, 0.0)) - 0.5) * 0.05;

                            // Boost color intensity
                            color = mix(color, color * 1.5, 0.3);

                            // Simplified glitch effect (can be expanded later)
                            float glitchProb = rand(vec2(time * 0.3, 1.0));
                            if (glitchProb > 0.95) {
                                if (mod(uv.y * 100.0 + time * 10.0, 1.0) > 0.7) {
                                    color *= 0.8; // Scan-line disruption
                                }
                            }

                            gl_FragColor = vec4(color * flicker, 0.85); // Final output
                        }
                    `,
                    transparent: true,
                    side: THREE.DoubleSide // Render both sides
                });
                child.material = material;
            }
        });
    }

    // Static method to update the time uniform for all hologram shaders in an object
    public static updateShaderTime(model: THREE.Object3D | null): void {
        if (!model) return;
        const currentTime = performance.now() * 0.001;
        model.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                if (child.material.uniforms.time) {
                    child.material.uniforms.time.value = currentTime;
                }
            }
        });
    }
}