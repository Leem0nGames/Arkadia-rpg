
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, QuadraticBezierLine, Trail, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { SpellEffectData } from '../../types';
import { ASSETS } from '../../constants';
import { ProceduralParticleBurst, LightningBoltVFX } from './ProceduralVFXEngine';
import { getSafeTexture } from '../../services/textureLoader';

export const SpriteSheetVFX = ({
    spriteSheetUrl,
    columns = 9,
    rows = 9,
    duration = 1000,
    opacity = 1.0,
    color = '#ffffff',
    size = [2.5, 2.5] as [number, number]
}: {
    spriteSheetUrl: string;
    columns?: number;
    rows?: number;
    duration: number;
    opacity?: number;
    color?: string;
    size?: [number, number];
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const startTimeRef = useRef<number | null>(null);
    const totalFrames = columns * rows;

    const texture = useMemo(() => {
        const raw = getSafeTexture(spriteSheetUrl, '#ffffff');
        if (!raw) return null;
        const tex = raw.clone();
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(1 / columns, 1 / rows);
        tex.needsUpdate = true;
        return tex;
    }, [spriteSheetUrl, columns, rows]);

    useFrame((state) => {
        if (meshRef.current && texture) {
            if (startTimeRef.current === null) {
                startTimeRef.current = state.clock.elapsedTime;
            }
            const elapsed = state.clock.elapsedTime - startTimeRef.current;
            const timePerFrame = (duration / 1000) / totalFrames;
            const currentFrame = Math.min(totalFrames - 1, Math.floor(elapsed / timePerFrame));
            
            const col = currentFrame % columns;
            const row = Math.floor(currentFrame / columns);

            texture.offset.x = col / columns;
            texture.offset.y = (rows - 1 - row) / rows;
        }
    });

    if (!texture) return null;

    return (
        <Billboard follow={true}>
            <mesh ref={meshRef}>
                <planeGeometry args={size} />
                <meshBasicMaterial 
                    map={texture} 
                    transparent 
                    opacity={opacity} 
                    color={color} 
                    depthWrite={false} 
                    blending={THREE.AdditiveBlending} 
                />
            </mesh>
        </Billboard>
    );
};

const AnimatedSprite = ({ frames, duration, opacity = 1, color = 'white' }: { frames: string[], duration: number, opacity?: number, color?: string }) => {
    const textures = useMemo(() => frames.map(f => getSafeTexture(f, '#eab308')), [frames]);
    const meshRef = useRef<THREE.Mesh>(null);
    const startTimeRef = useRef<number | null>(null);

    useFrame((state) => {
        if (meshRef.current && Array.isArray(textures) && textures.length > 0) {
             if (startTimeRef.current === null) {
                 startTimeRef.current = state.clock.elapsedTime;
             }
             const elapsed = state.clock.elapsedTime - startTimeRef.current;
             const timePerFrame = (duration / 1000) / frames.length;
             const idx = Math.min(frames.length - 1, Math.floor(elapsed / timePerFrame));
             if (textures[idx]) {
                 (meshRef.current.material as THREE.MeshBasicMaterial).map = textures[idx];
                 (meshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
             }
        }
    });

    return (
        <Billboard follow={true}>
            <mesh ref={meshRef}>
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial 
                    map={textures[0]} 
                    transparent 
                    opacity={opacity} 
                    color={color} 
                    depthWrite={false} 
                    blending={THREE.AdditiveBlending} 
                />
            </mesh>
        </Billboard>
    );
};

const HaloEffect = ({ url, color }: { url: string, color: string }) => {
    const texture = useMemo(() => getSafeTexture(url, color || '#eab308'), [url, color]);
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.z -= 0.05; 
            const scale = 1.5 + Math.sin(state.clock.elapsedTime * 5) * 0.2;
            meshRef.current.scale.set(scale, scale, 1);
        }
    });

    return (
        <Billboard follow={true}>
            <mesh ref={meshRef}>
                <planeGeometry args={[2, 2]} />
                <meshBasicMaterial map={texture} transparent opacity={0.8} color={color} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
        </Billboard>
    );
};

const ProjectileSprite = ({ url }: { url: string }) => {
    const projectileTexture = useMemo(() => getSafeTexture(url, '#f59e0b'), [url]);

    return (
        <group rotation={[0, 0, Math.PI / 2]}>
            <Billboard follow={true}>
                <mesh>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial map={projectileTexture} transparent />
                </mesh>
            </Billboard>
        </group>
    );
};

export const SpellEffectsRenderer = React.memo(({ activeSpellEffect }: { activeSpellEffect: SpellEffectData | null }) => {
    const meshRef = useRef<THREE.Group>(null);
    const progressRef = useRef(0);

    useFrame((state, delta) => {
        if (!activeSpellEffect || !meshRef.current) {
            progressRef.current = 0;
            return;
        }

        const speed = 1.0 / (activeSpellEffect.duration / 1000); 
        progressRef.current = Math.min(1, progressRef.current + delta * speed);

        const start = new THREE.Vector3(...activeSpellEffect.startPos);
        const end = new THREE.Vector3(...activeSpellEffect.endPos);

        if (activeSpellEffect.type === 'PROJECTILE') {
            meshRef.current.position.lerpVectors(start, end, progressRef.current);
            meshRef.current.position.y += Math.sin(progressRef.current * Math.PI) * 2;
            meshRef.current.lookAt(end);
        } else if (activeSpellEffect.type === 'BURST') {
            meshRef.current.position.copy(end);
        }
    });

    if (!activeSpellEffect) return null;
    const animationFrames = activeSpellEffect.animationKey && ASSETS.ANIMATIONS[activeSpellEffect.animationKey] 
        ? ASSETS.ANIMATIONS[activeSpellEffect.animationKey] 
        : null;
    const spriteSheetUrl = activeSpellEffect.spriteSheetUrl || 
        (activeSpellEffect.animationKey && ASSETS.SPELL_FX[activeSpellEffect.animationKey as keyof typeof ASSETS.SPELL_FX]) || 
        null;
    const projectileUrl = activeSpellEffect.projectileSprite || null;

    return (
        <group>
            {activeSpellEffect.type === 'PROJECTILE' && (
                <group ref={meshRef} position={activeSpellEffect.startPos}>
                     {projectileUrl ? (
                         <ProjectileSprite url={projectileUrl} />
                     ) : (
                        <mesh>
                            <sphereGeometry args={[0.3, 16, 16]} />
                            <meshStandardMaterial color={activeSpellEffect.color} emissive={activeSpellEffect.color} emissiveIntensity={2} />
                        </mesh>
                     )}
                    
                    <Trail width={0.4} length={4} color={new THREE.Color(activeSpellEffect.color)} attenuation={(t) => t * t}>
                        <mesh visible={false}><sphereGeometry args={[0.1]} /><meshBasicMaterial /></mesh>
                    </Trail>
                    <pointLight color={activeSpellEffect.color} intensity={2} distance={5} />
                    {activeSpellEffect.textureUrl && (
                         <HaloEffect url={activeSpellEffect.textureUrl} color={activeSpellEffect.color} />
                    )}
                </group>
            )}

            {activeSpellEffect.type === 'BEAM' && (
                <group>
                    <LightningBoltVFX startPos={activeSpellEffect.startPos} endPos={activeSpellEffect.endPos} color={activeSpellEffect.color} />
                    <QuadraticBezierLine
                        start={activeSpellEffect.startPos}
                        end={activeSpellEffect.endPos}
                        mid={[
                            (activeSpellEffect.startPos[0] + activeSpellEffect.endPos[0]) / 2,
                            4, 
                            (activeSpellEffect.startPos[2] + activeSpellEffect.endPos[2]) / 2
                        ]}
                        color={activeSpellEffect.color}
                        lineWidth={3}
                        dashed={false}
                    />
                </group>
            )}

            {/* Sprite Sheet or Procedural Particle Burst on Hit/Explosion/Burst */}
            {(activeSpellEffect.type === 'BURST' || progressRef.current > 0.7) && (
                <group position={activeSpellEffect.endPos}>
                    <ProceduralParticleBurst 
                        position={[0, 0.5, 0]} 
                        color={activeSpellEffect.color}
                        type={
                            activeSpellEffect.color?.includes('ef4444') || activeSpellEffect.color?.includes('f97316') ? 'FIRE' :
                            activeSpellEffect.color?.includes('38bdf8') || activeSpellEffect.color?.includes('06b6d4') ? 'FROST' :
                            activeSpellEffect.color?.includes('22c55e') || activeSpellEffect.color?.includes('10b981') ? 'POISON' :
                            activeSpellEffect.color?.includes('fbbf24') || activeSpellEffect.color?.includes('f59e0b') ? 'HOLY' :
                            activeSpellEffect.color?.includes('a855f7') || activeSpellEffect.color?.includes('c084fc') ? 'ARCANE' : 'GENERIC'
                        }
                    />
                    {spriteSheetUrl ? (
                        <group position={[0, 0.5, 0]}>
                            <SpriteSheetVFX 
                                spriteSheetUrl={spriteSheetUrl} 
                                duration={activeSpellEffect.duration || 1000} 
                                color={activeSpellEffect.color} 
                            />
                        </group>
                    ) : animationFrames ? (
                        <group position={[0, 0.5, 0]}>
                            <AnimatedSprite frames={animationFrames} duration={activeSpellEffect.duration} color={activeSpellEffect.color} />
                        </group>
                    ) : null}
                </group>
            )}
        </group>
    );
});

