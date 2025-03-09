import * as THREE from 'three';

export const createAnimatedNebula = () => {
    const nebulaGeometry = new THREE.PlaneGeometry(100, 100);
    const animatedNebulaMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            color1: { value: new THREE.Color(0x2c003e) }, // Dark purple
            color2: { value: new THREE.Color(0x72007a) }, // Lighter purple
            opacity: { value: 0.35 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main(){
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec2 resolution;
            uniform vec3 color1;
            uniform vec3 color2;
            uniform float opacity;
            varying vec2 vUv;

            // A simple pseudo-noise function using sin
            float pattern(vec2 uv) {
              vec2 i = floor(uv);
              vec2 f = fract(uv);
              // Four corners
              float a = sin(dot(i, vec2(12.9898, 78.233)));
              float b = sin(dot(i + vec2(1.0, 0.0), vec2(12.9898, 78.233)));
              float c = sin(dot(i + vec2(0.0, 1.0), vec2(12.9898, 78.233)));
              float d = sin(dot(i + vec2(1.0, 1.0), vec2(12.9898, 78.233)));
              vec2 smooth = f * f * (3.0 - 2.0 * f);
              float mixAB = mix(a, b, smooth.x);
              float mixCD = mix(c, d, smooth.x);
              return mix(mixAB, mixCD, smooth.y);
            }

            void main(){
              // Animate UV coordinates
              vec2 uv = vUv;
              uv.y += time * 0.02;
              uv.x += sin(time * 0.1) * 0.1;
              
              float n = pattern(uv * 3.0);
              n = smoothstep(0.3, 0.7, n);
              
              vec3 color = mix(color1, color2, n);
              gl_FragColor = vec4(color, opacity * n);
            }
        `,
        transparent: true,
        depthWrite: false
    });

    const nebulaMesh = new THREE.Mesh(nebulaGeometry, animatedNebulaMaterial);
    nebulaMesh.position.set(0, 0, -60);
    return { nebulaMesh, material: animatedNebulaMaterial };
};