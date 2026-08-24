import * as THREE from 'three';

/**
 * Custom Toon/Cel Shading Engine for Arcadia Tactics
 * Provides discrete stepped lighting ramps, warm ambient shadow tints,
 * cozy anime/storybook rim lighting (Fresnel), and active entity pulsing outline shaders.
 */

// Cache for generated gradient map textures to avoid redundant GPU allocations
const gradientMapCache = new Map<string, THREE.DataTexture>();

export type CelShadingStyle = 'cozy' | 'classic' | 'vibrant' | 'pastel';

/**
 * Generates a discrete 1D gradient ramp DataTexture for Three.js MeshToonMaterial.
 */
export function getToonGradientMap(
  steps: 3 | 4 | 5 = 3,
  style: CelShadingStyle = 'cozy'
): THREE.DataTexture {
  const cacheKey = `${steps}_${style}`;
  if (gradientMapCache.has(cacheKey)) {
    return gradientMapCache.get(cacheKey)!;
  }

  const width = steps;
  const height = 1;
  const data = new Uint8Array(width * 4);

  let toneValues: number[];
  if (steps === 3) {
    // 3-Tone Cel Ramp (Shadow, Midtone, Highlight)
    if (style === 'cozy') {
      toneValues = [95, 185, 255]; // Soft warm shadow floor, gentle midtone, bright highlight
    } else if (style === 'vibrant') {
      toneValues = [70, 160, 255];
    } else {
      toneValues = [60, 150, 255];
    }
  } else if (steps === 4) {
    // 4-Tone Storybook Ramp
    toneValues = [80, 135, 195, 255];
  } else {
    // 5-Tone Subtle Anime Ramp
    toneValues = [65, 110, 160, 210, 255];
  }

  for (let i = 0; i < width; i++) {
    const tone = toneValues[i] ?? 255;
    const stride = i * 4;
    
    // Add warm golden/honey tint to midtones and highlights in cozy mode
    if (style === 'cozy') {
      data[stride] = Math.min(255, tone + 8);     // R (slightly warmer)
      data[stride + 1] = Math.min(255, tone + 4); // G
      data[stride + 2] = tone;                    // B
    } else {
      data[stride] = tone;
      data[stride + 1] = tone;
      data[stride + 2] = tone;
    }
    data[stride + 3] = 255; // Alpha
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  gradientMapCache.set(cacheKey, texture);
  return texture;
}

/**
 * Injects custom Cozy Cel / Rim Lighting (Fresnel) into standard or toon materials.
 */
export function injectCozyCelShader(
  material: THREE.Material,
  options: {
    rimColor?: string | number;
    rimIntensity?: number;
    rimPower?: number;
    isShadowRealm?: boolean;
    isActiveTurn?: boolean;
  } = {}
) {
  const {
    rimColor = options.isShadowRealm ? '#c084fc' : options.isActiveTurn ? '#fbbf24' : '#fffbeb',
    rimIntensity = options.isShadowRealm ? 0.35 : options.isActiveTurn ? 0.55 : 0.28,
    rimPower = options.isActiveTurn ? 2.4 : 3.2
  } = options;

  const threeRimColor = new THREE.Color(rimColor);

  material.onBeforeCompile = (shader) => {
    // Uniforms
    shader.uniforms.uCozyRimColor = { value: threeRimColor };
    shader.uniforms.uCozyRimIntensity = { value: rimIntensity };
    shader.uniforms.uCozyRimPower = { value: rimPower };

    // Vertex Shader: Pass transformed normal and view position to fragment
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      varying vec3 vCozyViewPosition;
      varying vec3 vCozyNormal;
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vCozyViewPosition = -mvPosition.xyz;
      vCozyNormal = normalize(normalMatrix * normal);
      `
    );

    // Fragment Shader: Compute Rim / Fresnel glow
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform vec3 uCozyRimColor;
      uniform float uCozyRimIntensity;
      uniform float uCozyRimPower;
      varying vec3 vCozyViewPosition;
      varying vec3 vCozyNormal;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      
      // Cozy Anime Rim / Fresnel calculation
      vec3 cozyViewDir = normalize(vCozyViewPosition);
      float cozyNdotV = max(dot(vCozyNormal, cozyViewDir), 0.0);
      float cozyRim = pow(1.0 - cozyNdotV, uCozyRimPower) * uCozyRimIntensity;
      
      // Add soft warm rim light to final color
      gl_FragColor.rgb += uCozyRimColor * cozyRim;
      `
    );
  };

  material.needsUpdate = true;
  return material;
}

/**
 * Custom GLSL Shader Material for Active Entity Pulsing Emission Outline.
 * Performs multi-directional alpha-boundary radial kernel sampling on the sprite texture,
 * generating a glowing, breathing emission silhouette outline around current turn characters.
 */
export class PulsingOutlineShaderMaterial extends THREE.ShaderMaterial {
  constructor(parameters?: {
    map?: THREE.Texture | null;
    outlineColor?: THREE.Color | string | number;
    outlineThickness?: number;
    baseIntensity?: number;
    pulseIntensity?: number;
    pulseSpeed?: number;
  }) {
    const {
      map = null,
      outlineColor = '#fbbf24',
      outlineThickness = 0.032,
      baseIntensity = 0.8,
      pulseIntensity = 0.85,
      pulseSpeed = 3.6,
    } = parameters || {};

    const color = new THREE.Color(outlineColor);

    super({
      uniforms: {
        map: { value: map },
        uMapOffset: { value: map ? map.offset : new THREE.Vector2(0, 0) },
        uMapRepeat: { value: map ? map.repeat : new THREE.Vector2(1, 1) },
        uOutlineColor: { value: color },
        uOutlineThickness: { value: outlineThickness },
        uTime: { value: 0 },
        uBaseIntensity: { value: baseIntensity },
        uPulseIntensity: { value: pulseIntensity },
        uPulseSpeed: { value: pulseSpeed },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec2 uMapOffset;
        uniform vec2 uMapRepeat;
        uniform vec3 uOutlineColor;
        uniform float uOutlineThickness;
        uniform float uTime;
        uniform float uBaseIntensity;
        uniform float uPulseIntensity;
        uniform float uPulseSpeed;
        varying vec2 vUv;

        // Precalculated normalized unit circle directions for 12 samples (cos(2pi*i/12), sin(2pi*i/12))
        // Bypasses expensive runtime trig in the mobile fragment stage
        const vec2 SAMPLES[12] = vec2[12](
          vec2(1.0, 0.0),
          vec2(0.866025, 0.5),
          vec2(0.5, 0.866025),
          vec2(0.0, 1.0),
          vec2(-0.5, 0.866025),
          vec2(-0.866025, 0.5),
          vec2(-1.0, 0.0),
          vec2(-0.866025, -0.5),
          vec2(-0.5, -0.866025),
          vec2(0.0, -1.0),
          vec2(0.5, -0.866025),
          vec2(0.866025, -0.5)
        );

        void main() {
          vec2 transformedUv = vUv * uMapRepeat + uMapOffset;
          vec4 centerTex = texture2D(map, transformedUv);

          // Fast 12-sample radial kernel using precalculated direction vectors
          float maxNeighborAlpha = 0.0;
          for (int i = 0; i < 12; i++) {
            vec2 offset = SAMPLES[i] * uOutlineThickness;
            vec2 sampleUv = (vUv + offset) * uMapRepeat + uMapOffset;
            float sampleAlpha = texture2D(map, sampleUv).a;
            maxNeighborAlpha = max(maxNeighborAlpha, sampleAlpha);
          }

          // Outline mask: active where center alpha is low but adjacent neighbor alpha is high
          float outlineMask = 0.0;
          if (centerTex.a < 0.45 && maxNeighborAlpha > 0.2) {
            outlineMask = smoothstep(0.15, 0.7, maxNeighborAlpha);
          }

          // Subtle inner perimeter glow for extra pop
          if (centerTex.a >= 0.45 && maxNeighborAlpha > 0.5) {
            outlineMask = max(outlineMask, 0.25);
          }

          if (outlineMask < 0.05) {
            discard;
          }

          // Smooth rhythmic pulsing calculation
          float pulse = sin(uTime * uPulseSpeed) * 0.5 + 0.5; // 0.0 -> 1.0
          float intensity = uBaseIntensity + (pulse * uPulseIntensity);

          // Subtle color warmth shift on peak pulse
          vec3 warmPulseColor = mix(uOutlineColor, vec3(1.0, 0.95, 0.7), pulse * 0.45);
          vec3 finalColor = warmPulseColor * intensity;

          gl_FragColor = vec4(finalColor, outlineMask * min(1.0, 0.75 + pulse * 0.25));
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
  }

  set time(val: number) {
    this.uniforms.uTime.value = val;
  }

  get time(): number {
    return this.uniforms.uTime.value;
  }

  set map(tex: THREE.Texture | null) {
    this.uniforms.map.value = tex;
  }

  set outlineColor(col: THREE.Color | string | number) {
    this.uniforms.uOutlineColor.value = new THREE.Color(col);
  }

  get uMapOffset(): THREE.Vector2 {
    return this.uniforms.uMapOffset.value;
  }

  set uMapOffset(val: THREE.Vector2) {
    this.uniforms.uMapOffset.value.copy(val);
  }

  get uMapRepeat(): THREE.Vector2 {
    return this.uniforms.uMapRepeat.value;
  }

  set uMapRepeat(val: THREE.Vector2) {
    this.uniforms.uMapRepeat.value.copy(val);
  }
}

/**
 * Shared singleton default gradient map for cozy cel rendering across the app
 */
export const DEFAULT_COZY_GRADIENT_MAP = getToonGradientMap(3, 'cozy');
export const STORYBOOK_GRADIENT_MAP = getToonGradientMap(4, 'cozy');
export const VIBRANT_GRADIENT_MAP = getToonGradientMap(3, 'vibrant');

