import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, RenderPass, ShaderPass } from 'three-stdlib';
import { useGameStore } from '../../store/gameStore';
import { Entity, BattleCell } from '../../types';

import { gpuManager } from '../../services/GPUPerformanceManager';

interface DepthOfFieldShaderPassProps {
  enabled?: boolean;
  focusWidth?: number; // Distance in UV space kept 100% in focus
  maxBlur?: number;    // Maximum bokeh blur radius
  bokehPower?: number; // Highlight bokeh pop exponent
}

const DepthOfFieldShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uFocusCenter: { value: new THREE.Vector2(0.5, 0.5) },
    uFocusWidth: { value: 0.16 },
    uMaxBlur: { value: 0.022 },
    uBokehPower: { value: 3.0 },
    uBlurIntensity: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform vec2 uFocusCenter;
    uniform float uFocusWidth;
    uniform float uMaxBlur;
    uniform float uBokehPower;
    uniform float uBlurIntensity;
    varying vec2 vUv;

    const int SAMPLES = 16;
    const float GOLDEN_ANGLE = 2.39996323;

    void main() {
      // Calculate normalized distance from active character's screen coordinate
      vec2 diff = vUv - uFocusCenter;
      diff.x *= (uResolution.x / uResolution.y); // aspect correction

      float radialDist = length(diff);
      // Tilt-shift vertical falloff typical of diorama tilt photography
      float verticalDist = abs(vUv.y - uFocusCenter.y) * 1.5;
      float distFactor = max(radialDist * 0.9, verticalDist);

      // Smooth step from sharp focal zone to creamy blurred foreground & background
      float blurFactor = smoothstep(uFocusWidth, uFocusWidth + 0.42, distFactor) * uBlurIntensity;

      if (blurFactor <= 0.003) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      vec4 accumColor = vec4(0.0);
      float totalWeight = 0.0;
      float currentMaxRadius = blurFactor * uMaxBlur;

      // Golden-ratio disc bokeh sampling with subtle chromatic aberration
      for (int i = 0; i < SAMPLES; i++) {
        float fi = float(i);
        float r = sqrt((fi + 0.5) / float(SAMPLES));
        float theta = fi * GOLDEN_ANGLE;

        vec2 offset = vec2(cos(theta), sin(theta)) * r * currentMaxRadius;
        offset.x /= (uResolution.x / uResolution.y);

        // Subtle chromatic fringe on outer bokeh rings for optical richness
        vec2 uvCenter = vUv + offset;
        vec2 rOffset = offset * 1.03;
        vec2 bOffset = offset * 0.97;

        float rCh = texture2D(tDiffuse, clamp(vUv + rOffset, 0.0, 1.0)).r;
        float gCh = texture2D(tDiffuse, clamp(uvCenter, 0.0, 1.0)).g;
        float bCh = texture2D(tDiffuse, clamp(vUv + bOffset, 0.0, 1.0)).b;
        vec3 col = vec3(rCh, gCh, bCh);

        // Boost highlights in out-of-focus areas for cozy miniature bokeh sparkles
        float luma = dot(col, vec3(0.299, 0.587, 0.114));
        float weight = 1.0 + pow(clamp(luma, 0.0, 1.0), uBokehPower) * 2.8;

        accumColor += vec4(col * weight, weight);
        totalWeight += weight;
      }

      vec4 blurred = accumColor / max(totalWeight, 0.001);
      vec4 sharp = texture2D(tDiffuse, vUv);

      gl_FragColor = mix(sharp, blurred, blurFactor);
    }
  `,
};

export const DepthOfFieldShaderPass: React.FC<DepthOfFieldShaderPassProps> = ({
  enabled = true,
  focusWidth = 0.16,
  maxBlur = 0.024,
  bokehPower = 3.2,
}) => {
  const { gl, scene, camera, size } = useThree();
  const {
    battleEntities,
    turnOrder,
    currentTurnIndex,
    battleMap,
    isActionAnimating,
    activeDiceRoll,
    dofEnabled = true,
    dofFocusWidth,
    dofMaxBlur,
    dofBokehPower
  } = useGameStore() as any;

  const perfProfile = gpuManager.getProfile();
  const isDofActive = enabled && dofEnabled && perfProfile.enablePostProcessing;
  const activeId = turnOrder[currentTurnIndex];
  const activeEntity = battleEntities.find((e: Entity) => e.id === activeId);

  // Reusable vector for projecting world position to screen UV
  const screenVec = useMemo(() => new THREE.Vector3(), []);
  const targetFocusUV = useRef(new THREE.Vector2(0.5, 0.5));
  const currentFocusUV = useRef(new THREE.Vector2(0.5, 0.5));

  // Initialize Composer and ShaderPass lazily when DoF is active
  const composer = useMemo(() => {
    if (!isDofActive) return null;
    const comp = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    const dofPass = new ShaderPass(DepthOfFieldShader);
    dofPass.renderToScreen = true;

    comp.addPass(renderPass);
    comp.addPass(dofPass);
    return comp;
  }, [gl, scene, camera, isDofActive]);

  useEffect(() => {
    if (!composer) return;
    composer.setSize(size.width, size.height);
    const dofPass = composer.passes[1] as ShaderPass;
    if (dofPass && dofPass.uniforms) {
      dofPass.uniforms.uResolution.value.set(size.width, size.height);
    }
  }, [composer, size]);

  useEffect(() => {
    return () => {
      if (composer) {
        composer.passes.forEach((pass) => {
          if ('dispose' in pass && typeof (pass as any).dispose === 'function') {
            (pass as any).dispose();
          }
        });
      }
    };
  }, [composer]);

  const prevTurnRef = useRef<number | null>(null);
  const rackFocusTweenRef = useRef<number>(1.0);

  useFrame((_, delta) => {
    if (!isDofActive || !composer) {
      gl.render(scene, camera);
      return;
    }

    const dofPass = composer.passes[1] as ShaderPass;
    if (!dofPass || !dofPass.uniforms) return;

    // Detect turn switch to trigger cinematic rack-focus effect
    if (prevTurnRef.current !== currentTurnIndex) {
      prevTurnRef.current = currentTurnIndex;
      rackFocusTweenRef.current = 0.0;
    }

    if (rackFocusTweenRef.current < 1.0) {
      rackFocusTweenRef.current = Math.min(1.0, rackFocusTweenRef.current + delta * 1.5);
    }

    // Track active character's 3D coordinates
    if (activeEntity) {
      const cell = battleMap.find((c: BattleCell) => c.x === activeEntity.position.x && c.z === activeEntity.position.y);
      const surfaceY = cell ? (cell.offsetY || 0) + cell.height : 0.5;

      // If active dice roll or target animation is ongoing, shift focus slightly towards target
      let worldX = activeEntity.position.x;
      let worldY = surfaceY + 0.9;
      let worldZ = activeEntity.position.y;

      if (activeDiceRoll) {
        const targetEnt = battleEntities.find((e: Entity) => e.name === activeDiceRoll.targetName);
        if (targetEnt) {
          const tCell = battleMap.find((c: BattleCell) => c.x === targetEnt.position.x && c.z === targetEnt.position.y);
          const tSurfaceY = tCell ? (tCell.offsetY || 0) + tCell.height : 0.5;
          worldX = THREE.MathUtils.lerp(worldX, targetEnt.position.x, 0.7);
          worldY = THREE.MathUtils.lerp(worldY, tSurfaceY + 0.9, 0.7);
          worldZ = THREE.MathUtils.lerp(worldZ, targetEnt.position.y, 0.7);
        }
      }

      screenVec.set(worldX, worldY, worldZ);
      screenVec.project(camera);

      // Convert from NDC [-1, 1] to UV [0, 1]
      const uvX = THREE.MathUtils.clamp((screenVec.x + 1.0) / 2.0, 0.05, 0.95);
      const uvY = THREE.MathUtils.clamp((screenVec.y + 1.0) / 2.0, 0.05, 0.95);
      targetFocusUV.current.set(uvX, uvY);
    } else {
      targetFocusUV.current.set(0.5, 0.5);
    }

    // Smoothly interpolate focus UV with natural damping for fluid transition
    currentFocusUV.current.lerp(targetFocusUV.current, Math.min(1.0, delta * 6.5));

    // Dynamic focal expansion during camera motion for natural rack-focus
    const rackBonus = (1.0 - rackFocusTweenRef.current) * 0.08;
    const baseFocusWidth = dofFocusWidth ?? focusWidth;
    const dynamicFocusWidth = baseFocusWidth + rackBonus;

    dofPass.uniforms.uFocusCenter.value.copy(currentFocusUV.current);
    dofPass.uniforms.uFocusWidth.value = dynamicFocusWidth;
    dofPass.uniforms.uMaxBlur.value = dofMaxBlur ?? maxBlur;
    dofPass.uniforms.uBokehPower.value = dofBokehPower ?? bokehPower;
    dofPass.uniforms.uBlurIntensity.value = 1.0;

    // Render through Composer (Priority 1 after default render loop)
    composer.render(delta);
  }, 1);

  return null;
};
