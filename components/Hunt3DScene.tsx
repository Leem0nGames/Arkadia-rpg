import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html, Sky, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { HuntPrey, HuntAttackEvent } from '../types';
import { ASSETS } from '../constants';
import { textureManager, getTextureDiagnostics, printTextureDiagnosticsConsole } from '../services/TextureManager';
import { Base3DRenderer, BaseVoxelRenderer, STANDARD_3D_SCALES, CHIBI_SCALES, getChibiProportions } from './Base3DRenderer';
import { calculateChibiSquashAndStretch } from '../services/chibiScaling';
import { DEFAULT_COZY_GRADIENT_MAP, injectCozyCelShader } from '../services/toonShader';
import { ModularBillboard } from './three/ModularBillboard';

const _targetLookAt = new THREE.Vector3();

/**
 * Diagnostic log function to track texture loading status and verify asset path mapping.
 */
export const runHunt3DTextureDiagnostics = () => {
  printTextureDiagnosticsConsole();
  return getTextureDiagnostics();
};

/**
 * Dynamic Cinematic Camera for 3D Hunt Mode.
 * Smoothly follows player, and zooms in close to target prey on attack initiation.
 */
const HuntCinematicCamera = () => {
  const { huntSession } = useGameStore();
  const { camera, controls } = useThree();

  useFrame((_state, delta) => {
    if (!controls || !huntSession || !huntSession.playerPos) return;
    const orbit = controls as any;
    if (!orbit.target || typeof orbit.target.lerp !== 'function') return;

    const { playerPos, lastAttackEvent } = huntSession;

    // Check if an attack occurred recently (within 2.2 seconds)
    const isRecentAttack = lastAttackEvent && Date.now() - lastAttackEvent.timestamp < 2200;

    let targetX = playerPos.x ?? 0;
    let targetY = (playerPos.y ?? 0) + 1.0;
    let targetZ = playerPos.z ?? 0;

    let targetFov = 50;
    let lerpSpeed = 4.0;

    if (isRecentAttack && lastAttackEvent?.targetPos) {
      // Focus camera 80% on target prey position for close-up emphasis
      targetX = THREE.MathUtils.lerp(playerPos.x, lastAttackEvent.targetPos.x, 0.8);
      targetY = THREE.MathUtils.lerp(playerPos.y, lastAttackEvent.targetPos.y, 0.8) + 1.2;
      targetZ = THREE.MathUtils.lerp(playerPos.z, lastAttackEvent.targetPos.z, 0.8);

      // Dramatic action zoom-in FOV
      targetFov = 28;
      lerpSpeed = 7.5;
    }

    _targetLookAt.set(targetX, targetY, targetZ);
    orbit.target.lerp(_targetLookAt, Math.min(1.0, delta * lerpSpeed));

    // Smooth FOV zoom
    if ('fov' in camera) {
      const pCam = camera as THREE.PerspectiveCamera;
      pCam.fov = THREE.MathUtils.lerp(pCam.fov, targetFov, Math.min(1.0, delta * 5.0));
      pCam.updateProjectionMatrix();
    }

    if (typeof orbit.update === 'function') {
      orbit.update();
    }
  });

  return null;
};

/**
 * 3D Direction & Sector Orientation Indicator (Backstab, Flank, Guard Cones)
 */
const OrientationRing3D = ({
  facingAngle,
  playerPos,
  targetPos,
  radius = 1.3
}: {
  facingAngle: number;
  playerPos?: { x: number; y: number; z: number };
  targetPos: { x: number; y: number; z: number };
  radius?: number;
}) => {
  let currentSector: 'BACKSTAB' | 'FLANK' | 'FRONT' = 'FRONT';
  if (playerPos) {
    const angleToPlayer = Math.atan2(playerPos.z - targetPos.z, playerPos.x - targetPos.x);
    let diff = Math.abs(facingAngle - angleToPlayer);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const deg = diff * (180 / Math.PI);
    if (deg >= 120) currentSector = 'BACKSTAB';
    else if (deg >= 60) currentSector = 'FLANK';
  }

  const floorY = CHIBI_SCALES.FLOOR_Y_OFFSET + 0.02;

  return (
    <group position={[0, floorY, 0]} rotation={[0, -facingAngle, 0]}>
      {/* Front Cone (Guard - 120 deg) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.7, radius, 32, 1, -Math.PI / 3, (2 * Math.PI) / 3]} />
        <meshBasicMaterial color="#10b981" transparent opacity={currentSector === 'FRONT' ? 0.85 : 0.35} depthWrite={false} />
      </mesh>

      {/* Side Flank Cones (60 deg each side) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.7, radius, 32, 1, Math.PI / 3, Math.PI / 3]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={currentSector === 'FLANK' ? 0.9 : 0.35} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.7, radius, 32, 1, -Math.PI + Math.PI / 3, Math.PI / 3]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={currentSector === 'FLANK' ? 0.9 : 0.35} depthWrite={false} />
      </mesh>

      {/* Rear Cone (Backstab Zone - 120 deg) - Glowing Crimson */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.7, radius * 1.15, 32, 1, Math.PI - Math.PI / 3, (2 * Math.PI) / 3]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={currentSector === 'BACKSTAB' ? 0.95 : 0.45} depthWrite={false} />
      </mesh>

      {/* 3D Arrow pointer facing forward */}
      <mesh position={[radius * 0.85, 0.03, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.22, 0.45, 12]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* Sector Badge in 3D removed to avoid clutter; sector is already highlighted in ground rings and top HUD */}
    </group>
  );
};

/**
 * Standardized 3D Hunt Player Avatar Controller
 */
const HuntPlayer3D = ({
  position
}: {
  position: { x: number; y: number; z: number; facingAngle?: number };
}) => {
  const { party } = useGameStore();
  const leader = party[0];
  const leaderSpriteUrl = leader?.visual?.spriteUrl || ASSETS.UNITS.PLAYER_RANGER;
  const leaderColor = leader?.visual?.color || '#38bdf8';
  const spriteConfig = leader?.visual?.spriteConfig;

  const chibiProps = getChibiProportions({ name: leader?.name || 'Huntsman', type: 'PLAYER' });
  const floorOffset = CHIBI_SCALES.FLOOR_Y_OFFSET;
  const playerFacing = position.facingAngle ?? 0;

  return (
    <group position={[position.x, position.y + 0.5, position.z]}>
      {/* Ground Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorOffset, 0]}>
        <circleGeometry args={[chibiProps.shadowScale, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.45} depthWrite={false} />
      </mesh>

      {/* Target Interaction Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorOffset + 0.01, 0]}>
        <ringGeometry args={[chibiProps.auraRadius * 0.75, chibiProps.auraRadius, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Player Facing Arrow Indicator */}
      <group position={[0, floorOffset + 0.02, 0]} rotation={[0, -playerFacing, 0]}>
        <mesh position={[1.1, 0.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.2, 0.4, 12]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Reusable, Auto-Slicing Modular Billboard */}
      <ModularBillboard
        url={leaderSpriteUrl}
        turnColor={leaderColor}
        isCurrentTurn={false}
        hp={100}
        config={spriteConfig}
      />
    </group>
  );
};

/**
 * Standardized 3D Roaming Prey / Monster with Attack Zoom Effect & Floating Overhead HUD
 */
const HuntPrey3D = ({
  prey,
  playerPos,
  lastAttackEvent,
  onAttack
}: {
  prey: HuntPrey;
  playerPos?: { x: number; y: number; z: number };
  lastAttackEvent?: HuntAttackEvent;
  onAttack: (id: string) => void;
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const chibiProps = getChibiProportions({ name: prey.name, maxHp: prey.maxHp, type: 'ENEMY' });
  const preyHeight = chibiProps.height;
  const floorOffset = CHIBI_SCALES.FLOOR_Y_OFFSET;

  const isRecentAttack =
    lastAttackEvent &&
    lastAttackEvent.preyId === prey.id &&
    Date.now() - lastAttackEvent.timestamp < 2200;

  useFrame((state) => {
    if (groupRef.current && !prey.isDefeated) {
      const anim = calculateChibiSquashAndStretch({
        time: state.clock.elapsedTime,
        phaseOffset: prey.x * 2.0,
        isFlashing: isRecentAttack
      });
      groupRef.current.position.y = prey.y + 0.5 + anim.bobY * 1.5;
      if (meshRef.current) {
        meshRef.current.scale.set(anim.scaleX, anim.scaleY, anim.scaleX);
      }
    }
  });

  if (prey.isDefeated) {
    return (
      <group position={[prey.x, prey.y + 0.5 + floorOffset, prey.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.0, 1.0]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.5} />
        </mesh>
        <Html position={[0, 0.6, 0]} center zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none bg-slate-900/90 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap shadow-lg flex items-center gap-1">
            <span>💀</span> Derrotado
          </div>
        </Html>
      </group>
    );
  }

  const healthRatio = Math.max(0, Math.min(1, prey.maxHp > 0 ? prey.hp / prey.maxHp : 1));
  const preyColor = (prey.color && prey.color.startsWith('#')) ? prey.color : '#ef4444';
  const facingAngle = prey.facingAngle ?? Math.atan2(11 - prey.z, 11 - prey.x);

  return (
    <group
      ref={groupRef}
      position={[prey.x, prey.y + 0.5, prey.z]}
      onClick={(e) => {
        e.stopPropagation();
        onAttack(prey.id);
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Ground Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorOffset, 0]}>
        <circleGeometry args={[chibiProps.shadowScale, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.4} depthWrite={false} />
      </mesh>

      {/* Target Interaction Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorOffset + 0.01, 0]}>
        <ringGeometry args={[chibiProps.auraRadius * 0.8, isRecentAttack ? chibiProps.auraRadius * 1.4 : chibiProps.auraRadius * 1.15, 32]} />
        <meshBasicMaterial color={isRecentAttack ? '#f59e0b' : preyColor} transparent opacity={0.8} />
      </mesh>

      {/* 3D Orientation & Flanking Sector Indicator */}
      <OrientationRing3D
        facingAngle={facingAngle}
        playerPos={playerPos}
        targetPos={{ x: prey.x, y: prey.y, z: prey.z }}
        radius={chibiProps.auraRadius * 1.2}
      />

      {/* Beast Voxel Frame - Chunky Chibi Geometry with Toon/Cel Shading */}
      <mesh ref={meshRef} position={[0, preyHeight / 2, 0]}>
        <boxGeometry args={[chibiProps.width * 0.75, preyHeight * 0.75, chibiProps.width * 0.75]} />
        <meshToonMaterial
          gradientMap={DEFAULT_COZY_GRADIENT_MAP}
          color={isRecentAttack ? '#ef4444' : hovered ? '#f59e0b' : preyColor}
          emissive={isRecentAttack ? '#dc2626' : preyColor}
          emissiveIntensity={isRecentAttack ? 0.9 : hovered ? 0.6 : 0.3}
          wireframe={hovered || isRecentAttack}
          onUpdate={(mat) => injectCozyCelShader(mat, { rimColor: preyColor, rimIntensity: 0.4 })}
        />
      </mesh>

      {/* Floating 3D Dice Roll & Impact Animation Overlay */}
      {isRecentAttack && lastAttackEvent ? (
        <Html position={[0, preyHeight + 0.6, 0]} center zIndexRange={[100, 0]}>
          <div className="pointer-events-none select-none flex flex-col items-center gap-1 animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
            {lastAttackEvent.flankType && (
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border shadow-md flex items-center gap-1 ${
                lastAttackEvent.flankType === 'BACKSTAB'
                  ? 'bg-red-950 border-red-400 text-red-200 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                  : lastAttackEvent.flankType === 'FLANK'
                  ? 'bg-amber-950 border-amber-400 text-amber-200'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}>
                <span>{lastAttackEvent.flankType === 'BACKSTAB' ? '🗡️ ATAQUE POR LA ESPALDA' : lastAttackEvent.flankType === 'FLANK' ? '⚔️ FLANQUEO TÁCTICO' : '🛡️ ATAQUE FRONTAL'}</span>
              </div>
            )}
            <div className="bg-slate-950/95 border border-amber-500/60 px-3 py-1 rounded-lg text-xs font-bold text-amber-300 shadow-xl flex items-center gap-1.5 whitespace-nowrap">
              <span>🎲</span>
              <span>D20: [{lastAttackEvent.d20Roll}] + {lastAttackEvent.modifier} = {lastAttackEvent.totalRoll}</span>
            </div>
            <div className={`font-serif font-black tracking-wider text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] ${lastAttackEvent.isCrit ? 'text-amber-300 text-2xl scale-110' : 'text-red-400'}`}>
              💥 -{lastAttackEvent.damage} DMG!
            </div>
          </div>
        </Html>
      ) : (
        /* Standardized Health Bar & Name Overhead HUD */
        <Html position={[0, preyHeight + 0.35, 0]} center zIndexRange={[90, 0]}>
          <div className="pointer-events-none select-none flex flex-col items-center gap-1 min-w-[140px]">
            <div className="text-white font-bold text-xs bg-black/75 px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap shadow-md flex items-center gap-1">
              <span>{prey.icon || '👾'}</span>
              <span>{prey.name || 'Presa'}</span>
              <span className="text-amber-300 text-[10px]">Nv.{prey.level || 1}</span>
            </div>

            {/* HP Bar */}
            <div className="w-24 h-2 bg-slate-950/90 rounded-full border border-slate-700/80 overflow-hidden shadow-inner">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.max(5, healthRatio * 100)}%`,
                  backgroundColor: healthRatio > 0.5 ? '#22c55e' : healthRatio > 0.25 ? '#eab308' : '#ef4444'
                }}
              />
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

/**
 * Standardized 3D Glowing Arcane Portal that appears when the Dragon is defeated
 */
const HuntReturnPortal3D = ({
  position,
  onEnter
}: {
  position: { x: number; y: number; z: number };
  onEnter: () => void;
}) => {
  const portalRef = useRef<THREE.Group>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (ringRef1.current) {
      ringRef1.current.rotation.z += delta * 1.6;
    }
    if (ringRef2.current) {
      ringRef2.current.rotation.z -= delta * 2.2;
    }
    if (portalRef.current) {
      portalRef.current.position.y = position.y + 1.2 + Math.sin(state.clock.elapsedTime * 2.5) * 0.25;
    }
  });

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Ground Magical Aura */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[2.8, 32]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating Rotating Portal Rings */}
      <group
        ref={portalRef}
        onClick={(e) => {
          e.stopPropagation();
          onEnter();
        }}
      >
        <mesh ref={ringRef1}>
          <torusGeometry args={[1.8, 0.15, 16, 32]} />
          <meshStandardMaterial color="#c084fc" emissive="#9333ea" emissiveIntensity={1.5} />
        </mesh>
        <mesh ref={ringRef2} rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[1.3, 0.1, 16, 32]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={1.8} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.75, 16, 16]} />
          <meshBasicMaterial color="#f0abfc" transparent opacity={0.85} />
        </mesh>

        <Html position={[0, 2.4, 0]} center zIndexRange={[120, 0]}>
          <button
            onClick={onEnter}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl border-2 border-purple-300 shadow-[0_0_25px_rgba(168,85,247,0.9)] animate-bounce cursor-pointer flex items-center gap-2 whitespace-nowrap active:scale-95 transition-transform pointer-events-auto"
          >
            <span className="text-base">🌀</span>
            <span>Entrar al Portal de Regreso</span>
          </button>
        </Html>
      </group>
    </group>
  );
};

export const Hunt3DScene: React.FC = () => {
  const { currentSchematic, huntSession, moveHuntPlayer, attackPreyInHunt, startHuntMode, exitHuntMode } = useGameStore();
  const initStartedRef = useRef(false);

  useEffect(() => {
    if (!currentSchematic || !huntSession) {
      if (!initStartedRef.current) {
        initStartedRef.current = true;
        startHuntMode();
      }
    } else {
      runHunt3DTextureDiagnostics();
    }
  }, [currentSchematic, huntSession, startHuntMode]);

  if (!currentSchematic || !huntSession || !huntSession.playerPos) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#242528] text-amber-300 font-serif">
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl animate-bounce">⛏️</div>
          <p className="text-sm tracking-wider">Cargando escenario 3D de cacería...</p>
        </div>
      </div>
    );
  }

  const { width, height, length, blocks } = currentSchematic;
  const playerPos = huntSession.playerPos;

  // Active Preys & Proximity distance
  const activePreys = huntSession.preys.filter(p => !p.isDefeated);
  const nearestPrey = activePreys.sort((a, b) => {
    const distA = Math.hypot(a.x - playerPos.x, a.z - playerPos.z);
    const distB = Math.hypot(b.x - playerPos.x, b.z - playerPos.z);
    return distA - distB;
  })[0];

  const distToNearest = nearestPrey
    ? Math.round(Math.hypot(nearestPrey.x - playerPos.x, nearestPrey.z - playerPos.z))
    : 999;

  return (
    <Base3DRenderer
      camera={{ position: [playerPos.x + 10, playerPos.y + 15, playerPos.z + 18], fov: 50 }}
      orbitControlsProps={{
        target: [playerPos.x, playerPos.y + 1, playerPos.z],
        maxPolarAngle: Math.PI / 2.1,
        minDistance: 5,
        maxDistance: 60
      }}
      lighting={{
        ambientIntensity: 0.6,
        directionalIntensity: 1.2,
        directionalPosition: [20, 35, 20]
      }}
      onReset={() => startHuntMode()}
    >
      {/* Action Zoom-In Cinematic Camera Controller */}
      <HuntCinematicCamera />

      <pointLight position={[width / 2, height + 5, length / 2]} intensity={0.8} color="#fef08a" />
      <Sky sunPosition={[100, 40, 100]} />
      <Sparkles count={80} scale={[width, height * 1.5, length]} size={3} speed={0.4} color="#38bdf8" />

      {/* Centralized Minecraft-Style 3D Voxel Map Engine */}
      <BaseVoxelRenderer
        blocks={blocks}
        dimensions={{ width, height, length }}
        focusPos={playerPos}
        onGroundClick={(targetPos) => moveHuntPlayer(targetPos.x, targetPos.y, targetPos.z)}
      >
        {/* Player Avatar */}
        <HuntPlayer3D position={playerPos} />

        {/* Pulsating Proximity Ground Ring */}
        {distToNearest <= 10 && (
          <group position={[playerPos.x, playerPos.y + 0.05, playerPos.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.9, 1.5, 32]} />
              <meshBasicMaterial
                color={distToNearest <= 3 ? '#ef4444' : distToNearest <= 6 ? '#f97316' : '#f59e0b'}
                transparent
                opacity={distToNearest <= 3 ? 0.85 : distToNearest <= 6 ? 0.6 : 0.4}
              />
            </mesh>
          </group>
        )}

        {/* Clues on ground */}
        {huntSession.clues?.map((clue) => !clue.isInvestigated && (
          <group key={clue.id} position={[clue.x, clue.y + 0.1, clue.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.3, 0.7, 16]} />
              <meshBasicMaterial color="#10b981" transparent opacity={0.7} />
            </mesh>
            <Html position={[0, 0.5, 0]} center zIndexRange={[80, 0]}>
              <div className="pointer-events-none bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
                <span>🔎</span> <span>Pista</span>
              </div>
            </Html>
          </group>
        ))}

        {/* Traps on ground */}
        {huntSession.trapsPlaced?.map((trap) => trap.active && (
          <group key={trap.id} position={[trap.x, trap.y + 0.1, trap.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.5, 1.2, 16]} />
              <meshBasicMaterial color={trap.type === 'FREEZE' ? '#06b6d4' : trap.type === 'STUN' ? '#a855f7' : '#ef4444'} transparent opacity={0.8} />
            </mesh>
            <Html position={[0, 0.5, 0]} center zIndexRange={[85, 0]}>
              <div className="pointer-events-none bg-slate-950/90 border border-amber-400 text-amber-200 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
                <span>{trap.type === 'FREEZE' ? '❄️' : trap.type === 'STUN' ? '⚡' : '💥'}</span> <span>Trampa</span>
              </div>
            </Html>
          </group>
        ))}

        {/* Roaming Preys with Attack Zoom & HTML Floating Overlays */}
        {huntSession.preys.map((prey) => (
          <HuntPrey3D
            key={prey.id}
            prey={prey}
            playerPos={huntSession.playerPos}
            lastAttackEvent={huntSession.lastAttackEvent}
            onAttack={attackPreyInHunt}
          />
        ))}

        {/* Active Arcane Return Portal after Dragon Defeat */}
        {huntSession.returnPortal?.active && (
          <HuntReturnPortal3D
            position={huntSession.returnPortal}
            onEnter={exitHuntMode}
          />
        )}
      </BaseVoxelRenderer>
    </Base3DRenderer>
  );
};
