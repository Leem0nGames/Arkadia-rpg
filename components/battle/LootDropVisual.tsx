
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { LootDrop, ItemRarity } from '../../types';
import { RARITY_COLORS } from '../../constants';
import { CHIBI_SCALES } from '../../services/chibiScaling';
import { DEFAULT_COZY_GRADIENT_MAP, injectCozyCelShader } from '../../services/toonShader';
import { gpuManager } from '../../services/GPUPerformanceManager';

// Shared static geometries for loot chest to avoid memory churn on chest spawns
const CHEST_WIDTH = 0.82;
const CHEST_DEPTH = 0.82;
const BASE_HEIGHT = 0.46;

const SHARED_COLLIDER_CYLINDER = new THREE.CylinderGeometry(0.9, 0.9, 1.2, 8);
const SHARED_SHADOW_CIRCLE = new THREE.CircleGeometry(CHIBI_SCALES.SHADOW_SCALE * 0.9, 12);
const SHARED_CHEST_BASE_BOX = new THREE.BoxGeometry(CHEST_WIDTH, BASE_HEIGHT, CHEST_DEPTH);
const SHARED_CHEST_LID_BOX = new THREE.BoxGeometry(CHEST_WIDTH + 0.04, 0.24, CHEST_DEPTH + 0.04);
const SHARED_CHEST_LATCH_BOX = new THREE.BoxGeometry(0.15, 0.16, 0.07);

export const LootDropVisual = React.memo(({ 
    drop, 
    surfaceY = 0.5,
    onDropClick 
}: { 
    drop: LootDrop; 
    surfaceY?: number; 
    onDropClick?: (x: number, z: number) => void;
}) => {
    const meshRef = useRef<THREE.Group>(null);
    const lidRef = useRef<THREE.Group>(null);
    const glowColor = RARITY_COLORS[drop.rarity] || '#fbbf24';
    const isEnder = drop.rarity === ItemRarity.LEGENDARY || drop.rarity === ItemRarity.VERY_RARE;

    const handleClick = (e?: any) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (onDropClick) onDropClick(drop.position.x, drop.position.y);
    };

    useFrame((state) => {
        if (meshRef.current) {
            // Plump chibi floating oscillation & squash
            const t = state.clock.elapsedTime;
            const floatHop = Math.sin(t * 2.6) * 0.08;
            meshRef.current.position.y = surfaceY + 0.12 + floatHop;
            meshRef.current.rotation.y = Math.sin(t * 0.6) * 0.15;
            
            // Subtle breathing squash on hover
            const s = 1.0 + Math.sin(t * 2.6) * 0.03;
            meshRef.current.scale.set(1.08 / s, 0.95 * s, 1.08 / s);
        }
        if (lidRef.current) {
            // Bouncy lid breathing angle
            lidRef.current.rotation.x = -0.2 + Math.sin(state.clock.elapsedTime * 3.2) * 0.12;
        }
    });

    const sparkleCount = gpuManager.getClampedParticleCount(12);

    return (
        <group ref={meshRef} position={[drop.position.x, surfaceY, drop.position.y]}>
            {/* Enlarged Touch Proxy Collider for Mobile */}
            <mesh 
                geometry={SHARED_COLLIDER_CYLINDER}
                position={[0, BASE_HEIGHT / 2 + 0.2, 0]} 
                onClick={handleClick} 
                onPointerDown={handleClick}
                visible={false}
            >
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Chibi Drop Shadow */}
            <mesh geometry={SHARED_SHADOW_CIRCLE} rotation={[-Math.PI / 2, 0, 0]} position={[0, CHIBI_SCALES.FLOOR_Y_OFFSET, 0]}>
                <meshBasicMaterial color="#0f172a" transparent opacity={0.5} depthWrite={false} />
            </mesh>

            {/* 3D Voxel Chest Base - Chunky Chibi Geometry with Toon/Cel Shading */}
            <mesh geometry={SHARED_CHEST_BASE_BOX} position={[0, BASE_HEIGHT / 2, 0]} castShadow receiveShadow onClick={handleClick}>
                <meshToonMaterial 
                    gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                    color={isEnder ? "#064e3b" : "#854d0e"} 
                    emissive={isEnder ? "#047857" : "#78350f"}
                    emissiveIntensity={isEnder ? 0.4 : 0.15}
                    onUpdate={(mat) => injectCozyCelShader(mat, { rimColor: glowColor, rimIntensity: 0.35 })}
                />
            </mesh>

            {/* 3D Voxel Chest Lid Pivot */}
            <group ref={lidRef} position={[0, BASE_HEIGHT, -CHEST_DEPTH / 2]}>
                <mesh geometry={SHARED_CHEST_LID_BOX} position={[0, 0.12, CHEST_DEPTH / 2]} castShadow receiveShadow onClick={handleClick}>
                    <meshToonMaterial 
                        gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                        color={isEnder ? "#022c22" : "#a16207"} 
                        emissive={isEnder ? "#059669" : "#92400e"}
                        emissiveIntensity={isEnder ? 0.3 : 0.15}
                        onUpdate={(mat) => injectCozyCelShader(mat, { rimColor: glowColor, rimIntensity: 0.35 })}
                    />
                </mesh>
                {/* Latch Lock */}
                <mesh geometry={SHARED_CHEST_LATCH_BOX} position={[0, 0.06, CHEST_DEPTH]} castShadow>
                    <meshToonMaterial 
                        gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                        color={isEnder ? "#34d399" : "#fbbf24"} 
                        emissive={isEnder ? "#10b981" : "#d97706"}
                        emissiveIntensity={0.3}
                    />
                </mesh>
            </group>

            {/* Rarity Aura & Particle Sparkles */}
            <pointLight color={glowColor} intensity={1.5} distance={3.0} decay={2} />
            <Sparkles 
                count={sparkleCount} 
                scale={1.4} 
                size={3} 
                speed={0.6} 
                opacity={0.8} 
                color={glowColor} 
                position={[0, 0.4, 0]} 
            />
            
            {/* Holographic Interactive Item Badge */}
            <Html center position={[0, 1.1, 0]}>
                <button 
                    type="button"
                    onClick={handleClick}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full border shadow-md backdrop-blur-xs pointer-events-auto cursor-pointer text-[10px] font-bold tracking-wide active:scale-95 transition-transform"
                    style={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        borderColor: glowColor,
                        color: glowColor,
                        boxShadow: `0 0 10px ${glowColor}66`
                    }}
                >
                    <span>{isEnder ? '🔮' : '📦'}</span>
                    <span className="uppercase">{drop.rarity}</span>
                </button>
            </Html>
        </group>
    );
});

