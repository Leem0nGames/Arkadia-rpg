import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { ASSETS } from '../../constants';
import { getSafeTexture, textureManager } from '../../services/textureLoader';
import { DEFAULT_COZY_GRADIENT_MAP, PulsingOutlineShaderMaterial } from '../../services/toonShader';

export interface SpriteSheetMapping {
    row: number;
    col: number;
}

export interface ModularBillboardConfig {
    rows: number;
    cols: number;
    charWidth?: number;
    charHeight?: number;
    scaleX?: number;
    scaleY?: number;
    yOffset?: number;
    xOffset?: number;
    zOffset?: number;
    
    // State mappings (0-indexed)
    idle: SpriteSheetMapping;
    walk: SpriteSheetMapping;
    attack: SpriteSheetMapping;
    cast: SpriteSheetMapping;
    hurt: SpriteSheetMapping;
    victory: SpriteSheetMapping;
}

// Global default configuration for standard single-sprites (1x1 sheets)
export const DEFAULT_SINGLE_SPRITE_CONFIG: ModularBillboardConfig = {
    rows: 1,
    cols: 1,
    charWidth: 1.25,
    charHeight: 1.25,
    scaleX: 1,
    scaleY: 1,
    yOffset: 0,
    xOffset: 0,
    zOffset: 0,
    idle: { row: 0, col: 0 },
    walk: { row: 0, col: 0 },
    attack: { row: 0, col: 0 },
    cast: { row: 0, col: 0 },
    hurt: { row: 0, col: 0 },
    victory: { row: 0, col: 0 },
};

// Default configuration for Priest/Cleric sheet (4x4, 552x860, 138x215 per frame)
export const DEFAULT_PRIEST_CONFIG: ModularBillboardConfig = {
    rows: 4,
    cols: 4,
    charWidth: 1.2,
    charHeight: 1.6,
    scaleX: 1,
    scaleY: 1,
    yOffset: 0,
    xOffset: 0,
    zOffset: 0,
    idle: { row: 0, col: 0 },
    walk: { row: 0, col: 1 },
    attack: { row: 1, col: 0 },
    cast: { row: 2, col: 0 },
    hurt: { row: 2, col: 3 },
    victory: { row: 2, col: 2 },
};

// Default configuration for Fighter/Knight sheet (2x3 or 4x4)
export const DEFAULT_FIGHTER_CONFIG: ModularBillboardConfig = {
    rows: 4,
    cols: 4,
    charWidth: 1.2,
    charHeight: 1.5,
    scaleX: 1,
    scaleY: 1,
    yOffset: 0,
    xOffset: 0,
    zOffset: 0,
    idle: { row: 0, col: 0 },
    walk: { row: 0, col: 1 },
    attack: { row: 1, col: 0 },
    cast: { row: 1, col: 0 },
    hurt: { row: 2, col: 1 },
    victory: { row: 2, col: 0 },
};

export interface ModularBillboardProps {
    url: string;
    isFlashing?: boolean;
    isCurrentTurn?: boolean;
    turnColor?: string;
    hp?: number;
    isWalking?: boolean;
    isCasting?: boolean;
    isAttacking?: boolean;
    isVictory?: boolean;
    phaseOffset?: number;
    animateIdleBreathing?: boolean;
    asBillboard?: boolean;
    lockX?: boolean;
    lockY?: boolean;
    lockZ?: boolean;
    config?: Partial<ModularBillboardConfig>;
    onClick?: (e: any) => void;
    onPointerDown?: (e: any) => void;
    onPointerEnter?: (e: any) => void;
    onPointerLeave?: (e: any) => void;
}

const DEAD_SCALE = new THREE.Vector3(0.7, 0.4, 0.7);

export const ModularBillboard: React.FC<ModularBillboardProps> = ({
    url,
    isFlashing = false,
    isCurrentTurn = false,
    turnColor = '#fbbf24',
    hp = 100,
    isWalking = false,
    isCasting = false,
    isAttacking = false,
    isVictory = false,
    phaseOffset = 0,
    animateIdleBreathing = true,
    asBillboard = true,
    lockX = true,
    lockY = false,
    lockZ = true,
    config = {},
    onClick,
    onPointerDown,
    onPointerEnter,
    onPointerLeave
}) => {
    const safeUrl = (url && url.length > 5) ? url : ASSETS.UNITS.PLAYER;
    const [texVersion, setTexVersion] = useState(0);

    // Watch texture loader notifications
    useEffect(() => {
        const unsubscribe = textureManager.subscribe(() => {
            setTexVersion(v => v + 1);
        });
        return unsubscribe;
    }, []);

    // Resolve base configurations based on file names or custom properties
    const baseConfig = useMemo(() => {
        const lowerUrl = safeUrl.toLowerCase();
        if (lowerUrl.includes('priest')) {
            return { ...DEFAULT_PRIEST_CONFIG };
        } else if (lowerUrl.includes('fighter')) {
            const isBattle = lowerUrl.includes('fighter_battle.png') || isAttacking || isCasting || isFlashing || hp <= 0 || isCurrentTurn;
            return {
                ...DEFAULT_FIGHTER_CONFIG,
                rows: isBattle ? 3 : 4,
                cols: isBattle ? 2 : 4,
            };
        }
        return { ...DEFAULT_SINGLE_SPRITE_CONFIG };
    }, [safeUrl, isAttacking, isCasting, isFlashing, hp, isCurrentTurn]);

    // Merge baseline configurations with user-customized adjustments
    const finalConfig = useMemo((): ModularBillboardConfig => {
        const rows = Math.max(1, config.rows !== undefined && config.rows !== null ? config.rows : baseConfig.rows);
        const cols = Math.max(1, config.cols !== undefined && config.cols !== null ? config.cols : baseConfig.cols);
        const charWidth = config.charWidth !== undefined && config.charWidth !== null ? config.charWidth : baseConfig.charWidth;
        const charHeight = config.charHeight !== undefined && config.charHeight !== null ? config.charHeight : baseConfig.charHeight;
        const scaleX = config.scaleX !== undefined && config.scaleX !== null ? config.scaleX : baseConfig.scaleX;
        const scaleY = config.scaleY !== undefined && config.scaleY !== null ? config.scaleY : baseConfig.scaleY;
        const yOffset = config.yOffset !== undefined && config.yOffset !== null ? config.yOffset : baseConfig.yOffset;
        const xOffset = config.xOffset !== undefined && config.xOffset !== null ? config.xOffset : baseConfig.xOffset;
        const zOffset = config.zOffset !== undefined && config.zOffset !== null ? config.zOffset : baseConfig.zOffset;

        return {
            rows,
            cols,
            charWidth,
            charHeight,
            scaleX,
            scaleY,
            yOffset,
            xOffset,
            zOffset,
            idle: { ...baseConfig.idle, ...(config.idle || {}) },
            walk: { ...baseConfig.walk, ...(config.walk || {}) },
            attack: { ...baseConfig.attack, ...(config.attack || {}) },
            cast: { ...baseConfig.cast, ...(config.cast || {}) },
            hurt: { ...baseConfig.hurt, ...(config.hurt || {}) },
            victory: { ...baseConfig.victory, ...(config.victory || {}) },
        };
    }, [baseConfig, config]);

    // Choose the active texture file (supports dynamic sub-sheets e.g. Priest walking vs Priest attacking)
    const activeUrl = useMemo(() => {
        const lowerUrl = safeUrl.toLowerCase();
        if (lowerUrl.includes('priest')) {
            const isCombatState = isAttacking || isCasting || isFlashing || hp <= 0 || isCurrentTurn;
            return isCombatState 
                ? '/assets/players/priest/spritesheetpriestattacks.png'
                : '/assets/players/priest/priest_chibi.png';
        } else if (lowerUrl.includes('fighter')) {
            const isCombatState = isAttacking || isCasting || isFlashing || hp <= 0 || isCurrentTurn;
            return isCombatState
                ? '/assets/fighter/fighter_battle.png'
                : '/assets/fighter/fighter_walk.png';
        }
        return safeUrl;
    }, [safeUrl, isAttacking, isCasting, isFlashing, hp, isCurrentTurn]);

    // Create and wrap the texture map
    const texture = useMemo(() => {
        const tex = getSafeTexture(activeUrl, 'transparent').clone();
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        
        const cols = finalConfig.cols || 1;
        const rows = finalConfig.rows || 1;
        tex.repeat.set(1 / cols, 1 / rows);
        tex.needsUpdate = true;
        return tex;
    }, [activeUrl, texVersion, finalConfig.cols, finalConfig.rows]);

    // Refs for material updates
    const silhouetteMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    const shadowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    const primaryMaterialRef = useRef<THREE.MeshToonMaterial>(null);

    // Create the outline custom toon shader
    const outlineMaterial = useMemo(() => {
        return new PulsingOutlineShaderMaterial({
            map: texture,
            outlineColor: turnColor,
            outlineThickness: 0.036,
            baseIntensity: 0.85,
            pulseIntensity: 0.95,
            pulseSpeed: 3.8
        });
    }, [texture, turnColor]);

    useEffect(() => {
        if (outlineMaterial) {
            outlineMaterial.map = texture;
            outlineMaterial.outlineColor = turnColor;
            outlineMaterial.uMapOffset = texture.offset;
            outlineMaterial.uMapRepeat = texture.repeat;
            outlineMaterial.needsUpdate = true;
        }
    }, [texture, turnColor, outlineMaterial]);

    // Select and apply the correct static frame offset depending on state
    useEffect(() => {
        if (!texture) return;

        const totalRows = finalConfig.rows || 1;
        const totalCols = finalConfig.cols || 1;
        texture.repeat.set(1 / totalCols, 1 / totalRows);

        let mapping = finalConfig.idle;

        if (hp <= 0) {
            mapping = finalConfig.hurt;
        } else if (isFlashing) {
            mapping = finalConfig.hurt;
        } else if (isVictory) {
            mapping = finalConfig.victory;
        } else if (isWalking) {
            mapping = finalConfig.walk;
        } else if (isCasting) {
            mapping = finalConfig.cast;
        } else if (isAttacking) {
            mapping = finalConfig.attack;
        } else if (isCurrentTurn) {
            const isBattleSheet = activeUrl.includes('fighter_battle.png');
            if (isBattleSheet) {
                mapping = { row: 0, col: 1 };
            } else {
                mapping = finalConfig.idle;
            }
        }

        const targetCol = Math.min(totalCols - 1, Math.max(0, mapping.col));
        const targetRow = Math.min(totalRows - 1, Math.max(0, mapping.row));
        
        texture.offset.set(targetCol / totalCols, (totalRows - 1 - targetRow) / totalRows);
        texture.needsUpdate = true;

        if (outlineMaterial) {
            outlineMaterial.uMapOffset = texture.offset.clone();
            outlineMaterial.uMapRepeat = texture.repeat.clone();
            outlineMaterial.needsUpdate = true;
        }

        if (silhouetteMaterialRef.current) silhouetteMaterialRef.current.needsUpdate = true;
        if (shadowMaterialRef.current) shadowMaterialRef.current.needsUpdate = true;
        if (primaryMaterialRef.current) primaryMaterialRef.current.needsUpdate = true;
    }, [texture, finalConfig, hp, isFlashing, isVictory, isWalking, isCasting, isAttacking, isCurrentTurn, outlineMaterial, activeUrl]);

    // Dimensions
    const charWidth = (finalConfig.charWidth || 0.8) * (finalConfig.scaleX || 1.0);
    const charHeight = (finalConfig.charHeight || 0.8) * (finalConfig.scaleY || 1.0);
    const yOffset = finalConfig.yOffset || 0.0;
    const xOffset = finalConfig.xOffset || 0.0;
    const zOffset = finalConfig.zOffset || 0.0;

    // Ground anchor group (origin at y = 0, feet level)
    const groundAnchorRef = useRef<THREE.Group>(null);

    // Frame-by-frame animation & ground-anchored breathing
    useFrame(({ clock }, delta) => {
        const time = clock.getElapsedTime();

        if (isCurrentTurn && outlineMaterial) {
            outlineMaterial.time = time;
        }

        // Animate walk cycle frames when moving
        if (isWalking && texture) {
            const totalRows = finalConfig.rows || 1;
            const totalCols = finalConfig.cols || 1;
            const walkCol = Math.floor(time * 8.0) % totalCols;
            const targetRow = Math.min(totalRows - 1, Math.max(0, finalConfig.walk.row));
            
            texture.offset.set(walkCol / totalCols, (totalRows - 1 - targetRow) / totalRows);
            texture.needsUpdate = true;
            if (outlineMaterial) {
                outlineMaterial.uMapOffset.copy(texture.offset);
            }
        }

        // Ground-anchored squash, stretch & breathing
        if (groundAnchorRef.current) {
            const isDead = hp <= 0;

            if (isDead) {
                // KO / Collapse
                groundAnchorRef.current.position.y = THREE.MathUtils.lerp(
                    groundAnchorRef.current.position.y, 
                    -charHeight * 0.35, 
                    delta * 4.0
                );
                groundAnchorRef.current.rotation.z = THREE.MathUtils.lerp(
                    groundAnchorRef.current.rotation.z, 
                    Math.PI / 2.2, 
                    delta * 5.0
                );
                groundAnchorRef.current.scale.lerp(DEAD_SCALE, delta * 4.0);
            } else if (isFlashing) {
                // Impact recoil squash - feet locked to ground
                groundAnchorRef.current.position.y = 0;
                groundAnchorRef.current.rotation.z = 0;
                groundAnchorRef.current.scale.set(1.15, 0.85, 1.0);
            } else if (isWalking) {
                // Step hop during walking
                const hop = Math.abs(Math.sin(time * 10.0 + phaseOffset)) * 0.12;
                groundAnchorRef.current.position.y = hop;
                groundAnchorRef.current.rotation.z = 0;
                groundAnchorRef.current.scale.set(
                    1.0 - (hop - 0.06) * 0.08,
                    1.0 + (hop - 0.06) * 0.14,
                    1.0
                );
            } else if (isAttacking) {
                // Attack sweep lunge
                const lunge = Math.sin(time * 8.0) * 0.06;
                groundAnchorRef.current.position.y = Math.max(0, lunge);
                groundAnchorRef.current.rotation.z = 0;
                groundAnchorRef.current.scale.set(1.0 + lunge * 0.5, 1.0 + lunge * 0.8, 1.0);
            } else if (isVictory) {
                // Joyful victory hop
                const hop = Math.abs(Math.sin(time * 6.0 + phaseOffset)) * 0.15;
                groundAnchorRef.current.position.y = hop;
                groundAnchorRef.current.rotation.z = 0;
                groundAnchorRef.current.scale.set(
                    1.0 - Math.sin(time * 6.0 + phaseOffset) * 0.05,
                    1.0 + Math.sin(time * 6.0 + phaseOffset) * 0.08,
                    1.0
                );
            } else if (isCurrentTurn) {
                // Active turn alert breathing (feet strictly locked to y = 0)
                const breath = Math.sin(time * 3.2 + phaseOffset);
                groundAnchorRef.current.position.y = 0;
                groundAnchorRef.current.rotation.z = 0;
                groundAnchorRef.current.scale.set(
                    1.0 - breath * 0.022,
                    1.0 + breath * 0.042,
                    1.0
                );
            } else if (animateIdleBreathing) {
                // Standard peaceful cozy idle breathing (feet strictly locked to y = 0)
                const breath = Math.sin(time * 2.0 + phaseOffset);
                groundAnchorRef.current.position.y = 0;
                groundAnchorRef.current.rotation.z = 0;
                groundAnchorRef.current.scale.set(
                    1.0 - breath * 0.016,
                    1.0 + breath * 0.032,
                    1.0
                );
            } else {
                groundAnchorRef.current.position.y = 0;
                groundAnchorRef.current.rotation.z = 0;
                groundAnchorRef.current.scale.set(1.0, 1.0, 1.0);
            }
        }
    });

    const spriteContent = (
        <group 
            position={[xOffset, yOffset, zOffset]}
            onClick={onClick}
            onPointerDown={onPointerDown}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            {/* Ground-anchored group at y = 0 (Feet level) */}
            <group ref={groundAnchorRef}>
                {/* Float container centered at charHeight / 2 so mesh bottom rests precisely at y = 0 */}
                <group position={[0, charHeight / 2, 0]}>
                    
                    {/* 1. X-Ray Occlusion Silhouette (Visible through obstacles) */}
                    <mesh position={[0, 0, -0.015]} scale={[1.08, 1.08, 1]}>
                        <planeGeometry args={[charWidth, charHeight]} />
                        <meshBasicMaterial 
                            ref={silhouetteMaterialRef}
                            map={texture} 
                            transparent 
                            opacity={0.6} 
                            depthTest={false} 
                            depthWrite={false} 
                            color={isCurrentTurn ? turnColor : '#38bdf8'} 
                            side={THREE.DoubleSide} 
                        />
                    </mesh>

                    {/* 2. Active Pulsing Contour Outline Shader */}
                    {isCurrentTurn && (
                        <mesh position={[0, 0, -0.005]} scale={[1.09, 1.09, 1]}>
                            <planeGeometry args={[charWidth, charHeight]} />
                            <primitive object={outlineMaterial} attach="material" side={THREE.DoubleSide} transparent depthWrite={false} />
                        </mesh>
                    )}

                    {/* 3. Drop Shadow Rim Backdrop (Crisp contrast against any floor tile) */}
                    <mesh position={[0, 0, -0.01]} scale={[1.06, 1.06, 1]}>
                        <planeGeometry args={[charWidth, charHeight]} />
                        <meshBasicMaterial 
                            ref={shadowMaterialRef}
                            map={texture} 
                            transparent 
                            alphaTest={0.1} 
                            color="#0f172a" 
                            side={THREE.DoubleSide} 
                        />
                    </mesh>

                    {/* 4. Primary High-Definition Character Sprite */}
                    <mesh position={[0, 0, 0]}>
                        <planeGeometry args={[charWidth, charHeight]} />
                        <meshToonMaterial 
                            ref={primaryMaterialRef}
                            map={texture} 
                            gradientMap={DEFAULT_COZY_GRADIENT_MAP}
                            transparent 
                            alphaTest={0.1} 
                            color={isFlashing ? '#ff4444' : 'white'} 
                            emissive={isFlashing ? '#ff0000' : isCurrentTurn ? turnColor : '#000000'}
                            emissiveIntensity={isFlashing ? 1.5 : isCurrentTurn ? 0.22 : 0}
                            side={THREE.DoubleSide} 
                        />
                    </mesh>
                </group>
            </group>
        </group>
    );

    if (!asBillboard) {
        return spriteContent;
    }

    return (
        <Billboard follow={true} lockX={lockX} lockY={lockY} lockZ={lockZ}>
            {spriteContent}
        </Billboard>
    );
};

