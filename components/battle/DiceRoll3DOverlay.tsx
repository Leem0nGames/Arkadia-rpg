import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Billboard, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { DiceRollOverlayData } from '../../types';
import { sfx } from '../../services/SoundSystem';
import { DEFAULT_COZY_GRADIENT_MAP, injectCozyCelShader } from '../../services/toonShader';

interface DiceRoll3DOverlayProps {
  rollData: DiceRollOverlayData;
  onClose: () => void;
}

/**
 * High-Performance Mobile 3D D20 Die (60 FPS Optimized)
 * 
 * - Eliminates 20 R3F <Html> transformed facet labels to drastically save GPU/CPU cycles.
 * - Tumbling physics with floor bounce sound triggers.
 * - Smoothly aligns front face when settled to reveal the landed d20 value.
 */
const D20PhysicsDie: React.FC<{
  rollNumber: number;
  isSettled: boolean;
  isCrit: boolean;
  isCritFail: boolean;
  isHit: boolean;
  onBounce: () => void;
}> = ({ rollNumber, isSettled, isCrit, isCritFail, isHit, onBounce }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const shockwaveRef = useRef<THREE.Mesh>(null);
  const lastBounceProgressRef = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  // Random tumbling spin velocity
  const spinVel = useMemo(() => ({
    x: (Math.random() * 18 + 14) * (Math.random() > 0.5 ? 1 : -1),
    y: (Math.random() * 20 + 16) * (Math.random() > 0.5 ? 1 : -1),
    z: (Math.random() * 16 + 12) * (Math.random() > 0.5 ? 1 : -1),
  }), [rollNumber]);

  // Edges geometry for glowing facet wireframes
  const edgesGeometry = useMemo(() => {
    const ico = new THREE.IcosahedronGeometry(1.35, 0);
    return new THREE.EdgesGeometry(ico);
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime();
    }

    if (!isSettled) {
      const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
      const settleProgress = Math.min(1.0, elapsed / 0.9); // 0.9 seconds total tumble duration

      // Physical tumbling trajectory
      const damping = Math.max(0.05, 1.0 - settleProgress);
      
      groupRef.current.rotation.x += spinVel.x * delta * damping;
      groupRef.current.rotation.y += spinVel.y * delta * damping;
      groupRef.current.rotation.z += spinVel.z * delta * damping;

      // Parabolic arches bouncing on virtual floor
      const bouncePhase = Math.sin(settleProgress * Math.PI * 3.5);
      const floorBounceHeight = Math.max(0, bouncePhase) * (1.0 - settleProgress) * 1.5;
      
      groupRef.current.position.y = -0.2 + floorBounceHeight;
      groupRef.current.position.x = (settleProgress - 0.5) * -1.0 * (1 - settleProgress);

      // Floor contact bounce trigger
      if (bouncePhase <= 0.05 && (settleProgress - lastBounceProgressRef.current) > 0.18) {
        lastBounceProgressRef.current = settleProgress;
        onBounce();
        if (shockwaveRef.current) {
          shockwaveRef.current.scale.set(0.3, 0.3, 0.3);
          const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
          if (mat) mat.opacity = 0.7;
        }
      }
    } else {
      // Smoothly align front face to camera when settled
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.2, delta * 10);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 10);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 10);
      groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, delta * 10);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0.15, delta * 10);

      const scalePulse = isCrit ? 1.15 : isHit ? 1.06 : 1.0;
      groupRef.current.scale.lerp(new THREE.Vector3(scalePulse, scalePulse, scalePulse), delta * 10);
    }

    if (shockwaveRef.current) {
      shockwaveRef.current.scale.addScalar(delta * 4.5);
      const mat = shockwaveRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = Math.max(0, mat.opacity - delta * 3.0);
      }
    }
  });

  const bodyColor = isCrit
    ? '#f59e0b'
    : isCritFail
    ? '#dc2626'
    : isHit
    ? '#0284c7'
    : '#334155';

  const emissiveColor = isCrit
    ? '#fbbf24'
    : isCritFail
    ? '#ef4444'
    : isHit
    ? '#38bdf8'
    : '#1e293b';

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Tumbling D20 Die */}
      <group ref={groupRef}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[1.35, 0]} />
          <meshToonMaterial
            gradientMap={DEFAULT_COZY_GRADIENT_MAP}
            color={bodyColor}
            emissive={emissiveColor}
            emissiveIntensity={isSettled ? (isCrit ? 1.8 : isHit ? 1.0 : 0.5) : 0.6}
            onUpdate={(mat) => injectCozyCelShader(mat, {
              rimColor: isCrit ? '#fef08a' : isCritFail ? '#fca5a5' : '#7dd3fc',
              rimIntensity: isCrit ? 1.0 : 0.6,
              rimPower: 2.0
            })}
          />
        </mesh>

        {/* Facet Edge Wireframe Lines */}
        <lineSegments geometry={edgesGeometry}>
          <lineBasicMaterial
            color={isCrit ? '#fef08a' : '#fbbf24'}
            linewidth={2}
            transparent
            opacity={0.85}
          />
        </lineSegments>

        {/* Central Landed Result Medallion (Appears ONLY when die has settled) */}
        {isSettled && (
          <Billboard follow position={[0, 0, 1.4]}>
            <Html center transform distanceFactor={3.2} zIndexRange={[100, 0]}>
              <div className="select-none pointer-events-none flex flex-col items-center justify-center">
                <div className={`w-18 h-18 sm:w-22 sm:h-22 rounded-full flex items-center justify-center font-serif font-black text-4xl sm:text-5xl shadow-2xl border-4 backdrop-blur-md transition-all duration-300 animate-in zoom-in-50 ${
                  isCrit
                    ? 'bg-amber-500/95 text-amber-950 border-amber-200 shadow-[0_0_40px_rgba(251,191,36,0.9)] scale-110'
                    : isCritFail
                    ? 'bg-red-950/95 text-red-100 border-red-400 shadow-[0_0_40px_rgba(239,68,68,0.9)]'
                    : isHit
                    ? 'bg-emerald-900/95 text-emerald-100 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.8)]'
                    : 'bg-slate-900/95 text-slate-100 border-slate-500 shadow-[0_0_20px_rgba(100,116,139,0.6)]'
                }`}>
                  {rollNumber}
                </div>
              </div>
            </Html>
          </Billboard>
        )}
      </group>

      {/* Impact Ring */}
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]}>
        <ringGeometry args={[0.3, 0.7, 24]} />
        <meshBasicMaterial
          color={isCrit ? '#fbbf24' : isCritFail ? '#ef4444' : isHit ? '#10b981' : '#38bdf8'}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Lightweight Floor Shadow */}
      <ContactShadows
        position={[0, -1.2, 0]}
        opacity={0.5}
        scale={6}
        blur={2}
        far={3}
      />
    </group>
  );
};

export const DiceRoll3DOverlay: React.FC<DiceRoll3DOverlayProps> = ({ rollData, onClose }) => {
  const [displayedNumber, setDisplayedNumber] = useState<number>(() => Math.floor(Math.random() * 20) + 1);
  const [isSettled, setIsSettled] = useState(false);
  const resolvedRef = useRef(false);

  const {
    rollerName,
    targetName,
    actionType,
    d20Roll,
    modifier,
    total,
    targetAc,
    targetDc,
    isCrit = d20Roll === 20,
    isCritFail = d20Roll === 1,
    isHit = d20Roll === 20 || (d20Roll !== 1 && total >= (targetAc || targetDc || 10)),
    damagePreview,
  } = rollData;

  useEffect(() => {
    // Play initial dice roll audio
    try {
      if (sfx && typeof (sfx as any).playDiceRoll === 'function') {
        (sfx as any).playDiceRoll();
      }
    } catch (e) {
      // Ignore audio failure
    }

    setIsSettled(false);
    resolvedRef.current = false;

    // Settle after 900ms tumble duration
    const timer = setTimeout(() => {
      setDisplayedNumber(d20Roll);
      setIsSettled(true);

      try {
        if (sfx) {
          if (isCrit && typeof (sfx as any).playCrit === 'function') {
            (sfx as any).playCrit('melee');
          } else if (isCritFail && typeof (sfx as any).playCritFail === 'function') {
            (sfx as any).playCritFail();
          } else if (isHit && typeof (sfx as any).playHit === 'function') {
            (sfx as any).playHit();
          }
        }
      } catch (err) {
        // Ignore
      }

      if (!resolvedRef.current) {
        resolvedRef.current = true;
        rollData.onResolved?.();
      }
    }, 900);

    // Auto-dismiss timer (1.8s total so player has a punchy review, or can click earlier to close)
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 1800);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoCloseTimer);
      if (!resolvedRef.current) {
        resolvedRef.current = true;
        rollData.onResolved?.();
      }
    };
  }, [rollData]);

  const handleBounceSound = () => {
    try {
      if (sfx && typeof (sfx as any).playHit === 'function') {
        (sfx as any).playHit();
      }
    } catch (err) {
      // Ignore
    }
  };

  let badgeTitle = 'RESULTADO';
  let badgeIcon = '🎲';
  let badgeBorder = 'border-slate-600 bg-slate-900/95 text-slate-100';

  if (isCrit) {
    badgeTitle = '¡CRÍTICO NATURAL 20!';
    badgeIcon = '💥';
    badgeBorder = 'border-amber-400 bg-amber-950/95 text-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.7)]';
  } else if (isCritFail) {
    badgeTitle = '¡PIFIA CRÍTICA 1!';
    badgeIcon = '💀';
    badgeBorder = 'border-red-500 bg-red-950/95 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.7)]';
  } else if (isHit) {
    badgeTitle = actionType === 'SAVE' ? '¡SALVACIÓN EXITOSA!' : '¡IMPACTO EXITOSO!';
    badgeIcon = '⚔️';
    badgeBorder = 'border-emerald-400 bg-emerald-950/95 text-emerald-200 shadow-[0_0_25px_rgba(52,211,153,0.6)]';
  } else {
    badgeTitle = actionType === 'SAVE' ? 'FALLO EN SALVACIÓN' : 'TIRO FALLIDO (MISS)';
    badgeIcon = '🛡️';
    badgeBorder = 'border-slate-600 bg-slate-950/95 text-slate-300';
  }

  const targetDefense = targetAc !== undefined ? `CA ${targetAc}` : targetDc !== undefined ? `CD ${targetDc}` : undefined;

  return (
    <div
      id="dice-roll-3d-overlay"
      className="fixed inset-0 z-50 pointer-events-auto flex flex-col justify-between items-center p-4 select-none cursor-pointer overflow-hidden bg-slate-950/65 transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      {/* 3D D20 CANVAS SIMULATION LAYER */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 40 }}
          className="w-full h-full"
          gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 5, 4]} intensity={2.0} />
          <pointLight
            position={[0, -0.5, 2.0]}
            intensity={isSettled ? (isCrit ? 3.0 : 1.5) : 0.8}
            color={isCrit ? '#fbbf24' : isCritFail ? '#ef4444' : isHit ? '#38bdf8' : '#94a3b8'}
          />

          <D20PhysicsDie
            rollNumber={displayedNumber}
            isSettled={isSettled}
            isCrit={isCrit}
            isCritFail={isCritFail}
            isHit={isHit}
            onBounce={handleBounceSound}
          />
        </Canvas>
      </div>

      {/* Minimal Top Header Badge */}
      <div 
        className="mt-3 z-20 bg-slate-900/90 border border-slate-700/80 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg text-xs font-serif text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-amber-400 font-bold">{rollerName}</span>
        {targetName && (
          <>
            <span className="text-slate-500 text-[10px]">➔</span>
            <span className="text-slate-300">{targetName}</span>
          </>
        )}
      </div>

      {/* MINIMALIST RESULT MODAL (Appears ONLY after die has settled) */}
      <div className="mb-6 z-20 w-full max-w-sm flex flex-col items-center">
        {isSettled ? (
          <div 
            className={`w-full border-2 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-2.5 animate-in slide-in-from-bottom-6 zoom-in-95 duration-300 ${badgeBorder}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Outcome Title */}
            <div className="flex items-center gap-2 text-sm sm:text-base font-serif font-extrabold uppercase tracking-wider">
              <span>{badgeIcon}</span>
              <span>{badgeTitle}</span>
            </div>

            {/* Formula Breakdown */}
            <div className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-2.5 flex items-center justify-center gap-2 font-mono text-xs text-slate-200">
              <span className="text-amber-300 font-bold">d20 ({d20Roll})</span>
              <span className="text-slate-400">{modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`}</span>
              <span className="text-slate-500">=</span>
              <span className={`text-base font-extrabold ${isCrit ? 'text-amber-300' : isCritFail ? 'text-red-400' : isHit ? 'text-emerald-400' : 'text-slate-300'}`}>
                {total}
              </span>
              {targetDefense && (
                <span className="text-slate-400 text-[11px] font-sans ml-1">
                  (vs {targetDefense})
                </span>
              )}
            </div>

            {/* Damage Preview */}
            {damagePreview && isHit && (
              <div className="text-xs text-amber-300/90 font-sans font-semibold">
                {damagePreview}
              </div>
            )}

            {/* Continue Action Button */}
            <button
              type="button"
              onClick={onClose}
              className="mt-1 w-full py-1.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-sans uppercase tracking-wider rounded-xl shadow transition-all active:scale-95 cursor-pointer"
            >
              Continuar (Toca para cerrar)
            </button>
          </div>
        ) : (
          /* Tumbling Status Pill */
          <div className="flex items-center gap-2 text-xs font-mono text-amber-300/90 bg-slate-950/80 px-4 py-1.5 rounded-full border border-amber-500/30 animate-pulse">
            <span>🎲</span>
            <span>Tirando dado D20...</span>
          </div>
        )}
      </div>
    </div>
  );
};
