import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import { getChibiProportions } from '../../services/chibiScaling';
import { DEFAULT_COZY_GRADIENT_MAP } from '../../services/toonShader';
import { STANDARD_3D_SCALES } from '../Base3DRenderer';
import { useGameStore } from '../../store/gameStore';
import { BattleAction } from '../../types';
import { ModularBillboard } from '../three/ModularBillboard';

const getConditionBadge = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('poison') || c.includes('veneno')) return { icon: '🧪', label: 'Poisoned', bg: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40' };
    if (c.includes('stun') || c.includes('aturd')) return { icon: '💫', label: 'Stunned', bg: 'bg-amber-950/90 text-amber-300 border-amber-500/40' };
    if (c.includes('haste') || c.includes('prisa') || c.includes('veloz')) return { icon: '⚡', label: 'Hasted', bg: 'bg-yellow-950/90 text-yellow-300 border-yellow-500/40' };
    if (c.includes('burn') || c.includes('ardien') || c.includes('fuego')) return { icon: '🔥', label: 'Burning', bg: 'bg-orange-950/90 text-orange-300 border-orange-500/40' };
    if (c.includes('frost') || c.includes('congel') || c.includes('hielo')) return { icon: '❄️', label: 'Frozen', bg: 'bg-cyan-950/90 text-cyan-300 border-cyan-500/40' };
    if (c.includes('shield') || c.includes('escud')) return { icon: '🛡️', label: 'Shielded', bg: 'bg-sky-950/90 text-sky-300 border-sky-500/40' };
    if (c.includes('bless') || c.includes('bendi') || c.includes('curac')) return { icon: '✨', label: 'Blessed', bg: 'bg-yellow-950/90 text-yellow-200 border-yellow-400/40' };
    if (c.includes('curse') || c.includes('mald') || c.includes('sombra')) return { icon: '🔮', label: 'Cursed', bg: 'bg-purple-950/90 text-purple-300 border-purple-500/40' };
    return { icon: '🔸', label: condition, bg: 'bg-slate-900/90 text-slate-200 border-slate-700' };
};

export const BillboardUnit = React.memo(({ 
  position, 
  color, 
  spriteUrl, 
  spriteConfig,
  isCurrentTurn, 
  hp, 
  maxHp, 
  name, 
  level, 
  conditions = [], 
  onUnitClick,
  isTargetable = false
}: any) => {
  const safeMaxHp = maxHp || 1; 
  const hpPercent = Math.max(0, Math.min(1, hp / safeMaxHp));
  const groupRef = useRef<THREE.Group>(null);
  const shadowMeshRef = useRef<THREE.Mesh>(null);
  const auraRingRef = useRef<THREE.Mesh>(null);
  const targetRingRef = useRef<THREE.Mesh>(null);
  const beaconMeshRef = useRef<THREE.Mesh>(null);
  const prevHpRef = useRef(hp);
  const [isFlashing, setIsFlashing] = useState(false);

  // Smooth position interpolation refs
  const currentPosRef = useRef(new THREE.Vector3(position[0], position[1], position[2]));
  const targetPosRef = useRef(new THREE.Vector3(position[0], position[1], position[2]));
  const prevPositionRef = useRef(position);
  const [isWalking, setIsWalking] = useState(false);

  useEffect(() => {
    targetPosRef.current.set(position[0], position[1], position[2]);
    const dx = position[0] - prevPositionRef.current[0];
    const dz = position[2] - prevPositionRef.current[2];
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      setIsWalking(true);
      const timer = setTimeout(() => setIsWalking(false), 800);
      prevPositionRef.current = position;
      return () => clearTimeout(timer);
    }
    prevPositionRef.current = position;
  }, [position]);

  // Determine active action modes from gameStore
  const selectedAction = useGameStore(state => state.selectedAction);
  const battleEntities = useGameStore(state => state.battleEntities || []);

  const isCasting = useMemo(() => {
    if (!isCurrentTurn) return false;
    return selectedAction === BattleAction.MAGIC;
  }, [isCurrentTurn, selectedAction]);

  const isAttacking = useMemo(() => {
    if (!isCurrentTurn) return false;
    return selectedAction === BattleAction.ATTACK;
  }, [isCurrentTurn, selectedAction]);

  const isVictory = useMemo(() => {
    const enemies = battleEntities.filter(e => e.type === 'ENEMY');
    return enemies.length > 0 && enemies.every(e => e.stats.hp <= 0);
  }, [battleEntities]);

  // Standardized Chibi Proportions for ground shadow & HUD positioning
  const chibiProps = useMemo(() => {
    return getChibiProportions({ name, maxHp: safeMaxHp });
  }, [name, safeMaxHp]);

  const charHeight = chibiProps.height;
  const floorOffset = STANDARD_3D_SCALES.FLOOR_Y_OFFSET;

  // Unique deterministic phase offset per unit so units don't breathe in robotic sync
  const phaseOffset = useMemo(() => {
    return ((position[0] * 17 + position[2] * 31) % 100) / 100 * Math.PI * 2;
  }, [position]);

  // Trigger hit flash when HP decreases
  useEffect(() => {
    if (prevHpRef.current > hp) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 300);
      prevHpRef.current = hp;
      return () => clearTimeout(timer);
    }
    prevHpRef.current = hp;
  }, [hp]);
  
  // Update entity movement gliding and secondary aura/beacon visuals
  useFrame(({ clock }, delta) => {
    const time = clock.getElapsedTime();

    // 1. Smooth 3D World Position Interpolation (Walking Glide)
    if (groupRef.current) {
      currentPosRef.current.lerp(targetPosRef.current, Math.min(1.0, delta * 9.0));
      groupRef.current.position.x = currentPosRef.current.x;
      groupRef.current.position.y = currentPosRef.current.y;
      groupRef.current.position.z = currentPosRef.current.z;
    }

    // 2. Active Turn Ground Aura Dynamic Breathing Pulse
    if (isCurrentTurn && auraRingRef.current && hp > 0) {
      const auraPulse = Math.sin(time * 3.8) * 0.08 + 1.0;
      auraRingRef.current.scale.set(auraPulse, auraPulse, 1.0);
    }

    // 3. Targetable Enemy Ground Target Marker Pulse & Rotation
    if (isTargetable && targetRingRef.current && hp > 0) {
      const targetPulse = Math.sin(time * 5.0) * 0.12 + 1.0;
      targetRingRef.current.scale.set(targetPulse, targetPulse, 1.0);
      targetRingRef.current.rotation.z = time * 1.5;
    }

    // 4. Active Turn Overhead Beacon Rotation & Floating
    if (isCurrentTurn && beaconMeshRef.current && hp > 0) {
      beaconMeshRef.current.rotation.y = time * 2.5;
      beaconMeshRef.current.rotation.z = Math.sin(time * 3.0) * 0.15;
      beaconMeshRef.current.position.y = Math.sin(time * 4.0) * 0.05;
    }

    // 5. Shadow subtle pulse
    if (shadowMeshRef.current && hp > 0) {
      const breath = Math.sin(time * 2.0 + phaseOffset);
      const s = isWalking ? 0.85 : 1.0 + breath * 0.03;
      shadowMeshRef.current.scale.set(chibiProps.shadowScale * 2.2 * s, chibiProps.shadowScale * 1.8 * s, 1.0);
    }
  });

  const handleClick = (e: any) => {
      e?.stopPropagation?.();
      onUnitClick(position[0], position[2]); 
  };

  return (
    <group ref={groupRef} position={position}>
        {/* Interaction Hitbox Cylinder */}
        <mesh 
            position={[0, charHeight * 0.5, 0]} 
            onClick={handleClick} 
            onPointerDown={handleClick} 
            visible={false}
        >
            <cylinderGeometry args={[0.55, 0.55, charHeight * 1.1, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* Targetable Enemy Dynamic Ground Reticle */}
        {isTargetable && hp > 0 && (
             <mesh ref={targetRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, floorOffset + 0.015, 0]}>
                <ringGeometry args={[chibiProps.auraRadius * 0.8, chibiProps.auraRadius * 1.25, 32]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.9} toneMapped={false} side={THREE.DoubleSide} />
             </mesh>
        )}

        {/* Active Turn Pulsing Base Aura */}
        {isCurrentTurn && hp > 0 && (
             <group>
               <mesh ref={auraRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, floorOffset + 0.01, 0]}>
                  <ringGeometry args={[chibiProps.auraRadius * 0.72, chibiProps.auraRadius * 1.05, 32]} />
                  <meshBasicMaterial color={color || '#f59e0b'} transparent opacity={0.9} toneMapped={false} side={THREE.DoubleSide} />
               </mesh>
               <mesh position={[0, charHeight / 2, 0]}>
                  <cylinderGeometry args={[chibiProps.auraRadius * 0.95, chibiProps.auraRadius * 0.95, charHeight, 16, 1, true]} />
                  <meshBasicMaterial color={color || '#f59e0b'} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
               </mesh>
             </group>
        )}
        
        {/* Hit Flash Ring on Damage */}
        {isFlashing && (
             <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorOffset + 0.02, 0]}>
                <circleGeometry args={[chibiProps.auraRadius * 1.1, 32]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.6} side={THREE.DoubleSide} />
             </mesh>
        )}

        {/* Unit Shadow */}
        <mesh ref={shadowMeshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, floorOffset, 0]}>
            <circleGeometry args={[chibiProps.shadowScale, 16]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.55} depthWrite={false} />
        </mesh>

        {/* Unified Ground-Anchored 3D Unit Sprite */}
        <ModularBillboard 
            url={spriteUrl} 
            isFlashing={isFlashing} 
            isCurrentTurn={isCurrentTurn}
            turnColor={color || '#fbbf24'}
            hp={hp}
            isWalking={isWalking}
            isCasting={isCasting}
            isAttacking={isAttacking}
            isVictory={isVictory}
            phaseOffset={phaseOffset}
            animateIdleBreathing={true}
            config={spriteConfig}
            onClick={handleClick}
            onPointerDown={handleClick}
        />

        {/* Active Turn Overhead Beacon Gem */}
        {isCurrentTurn && hp > 0 && (
          <Billboard follow={true} lockX={true} lockY={false} lockZ={true} position={[0, charHeight + 0.38, 0]}>
            <mesh ref={beaconMeshRef}>
              <octahedronGeometry args={[0.14, 0]} />
              <meshToonMaterial 
                gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                color={color || '#f59e0b'} 
                emissive={color || '#f59e0b'}
                emissiveIntensity={1.4}
                toneMapped={false}
              />
            </mesh>
          </Billboard>
        )}
        
        {/* Persistent 3D Health Bar & Unit Status Overhead */}
        <Html 
            position={[0, charHeight + (isTargetable ? 0.75 : isCurrentTurn ? 0.65 : 0.3), 0]} 
            center 
            zIndexRange={isTargetable ? [120, 80] : isCurrentTurn ? [100, 50] : [70, 0]}
        >
            <div className={`pointer-events-auto select-none flex flex-col items-center gap-0.5 min-w-[70px] transition-all duration-200 ${isTargetable ? 'scale-110 z-30' : isCurrentTurn ? 'scale-105 z-20' : 'scale-90 opacity-80'}`}>
                {/* Interactive Mobile Quick Target Badge */}
                {isTargetable && (
                    <button
                        type="button"
                        onClick={handleClick}
                        className="px-2 py-0.5 mb-0.5 rounded-full bg-red-600/90 hover:bg-red-500 active:scale-95 text-white font-black text-[10px] border border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.7)] flex items-center gap-1 animate-pulse tracking-wide cursor-pointer"
                    >
                        <span>🎯</span>
                        <span>ATACAR</span>
                    </button>
                )}

                {/* Status Conditions */}
                {conditions && conditions.length > 0 && (isCurrentTurn || isTargetable) && (
                    <div className="flex items-center gap-1 mb-0.5">
                        {conditions.map((cond: string, idx: number) => {
                            const badge = getConditionBadge(cond);
                            return (
                                <span 
                                    key={idx} 
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-medium border flex items-center gap-0.5 shadow-md ${badge.bg}`}
                                    title={badge.label}
                                >
                                    <span>{badge.icon}</span>
                                    <span>{badge.label}</span>
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Name Tag: Show badge on Active Turn, Targetable, or when selected */}
                {name && (isCurrentTurn || isTargetable) && (
                    <div 
                        onClick={handleClick}
                        className={`font-semibold text-[9px] px-2 py-0.5 rounded-full border whitespace-nowrap shadow-sm flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-colors ${
                            isTargetable 
                                ? 'bg-red-950/90 border-red-400 text-red-100 ring-1 ring-red-500/50' 
                                : 'bg-slate-950/85 border-amber-400/60 text-amber-200'
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isTargetable ? '#ef4444' : color || '#38bdf8' }} />
                        <span>{name}</span>
                        {level && <span className="text-amber-300/80 text-[8px]">Nv.{level}</span>}
                    </div>
                )}

                {/* Micro Health Bar: Always subtle, highlighted on active/target */}
                {(isCurrentTurn || isTargetable || hpPercent < 1.0) && (
                    <div className="flex flex-col items-center gap-0.5">
                        <div className={`h-1 rounded-full bg-slate-950/90 border border-slate-700/60 overflow-hidden shadow transition-all ${isCurrentTurn || isTargetable ? 'w-12 h-1.5' : 'w-9'}`}>
                            <div
                                className="h-full transition-all duration-300 rounded-full"
                                style={{
                                    width: `${Math.max(5, hpPercent * 100)}%`,
                                    backgroundColor: hpPercent > 0.5 ? '#22c55e' : hpPercent > 0.25 ? '#f59e0b' : '#ef4444'
                                }}
                            />
                        </div>
                        {(isCurrentTurn || isTargetable) && (
                            <div className="text-[7px] font-mono text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none">
                                {hp}/{safeMaxHp}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Html>
    </group>
  );
});
