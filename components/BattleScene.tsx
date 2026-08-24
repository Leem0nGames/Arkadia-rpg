import React, { Suspense } from 'react';
import { Html, SpotLight } from '@react-three/drei';
import { Entity, Dimension, WeatherType, GameState } from '../types';
import { useGameStore } from '../store/gameStore';
import { WeatherOverlay } from './OverworldMap';
import { BATTLE_MAP_SIZE } from '../constants';
import { Base3DRenderer } from './Base3DRenderer';
import { BG3RadialMenu } from './BG3RadialMenu';
import { getThemeConfig } from '../services/themeSystem';

// Modular Components
import { FogController } from './battle/FogController';
import { CinematicCamera } from './battle/CinematicCamera';
import { VoidParticles } from './battle/VoidParticles';
import { TerrainLayer } from './battle/TerrainLayer';
import { TransitionLayer } from './battle/TransitionLayer';
import { DecorationLayer } from './battle/DecorationLayer';
import { InteractionLayer } from './battle/InteractionLayer';
import { HazardParticles } from './battle/HazardParticles';
import { BillboardUnit } from './battle/BillboardUnit';
import { SpellEffectsRenderer } from './battle/SpellEffectsRenderer';
import { LootDropVisual } from './battle/LootDropVisual';
import { ProceduralVFXEngine } from './battle/ProceduralVFXEngine';
import { CozyAmbientParticles } from './battle/CozyAmbientParticles';
import { DepthOfFieldShaderPass } from './battle/DepthOfFieldShaderPass';
import { ActiveTurnBeacon } from './battle/ActiveTurnBeacon';
import { TacticalCameraGestureController } from './battle/TacticalCameraGestureController';
import { MobileGestureHUD } from './battle/MobileGestureHUD';
import { FogOfWarLayer } from './battle/FogOfWarLayer';
import { useBattleJuice } from '../hooks/useBattleJuice';

export const BattleScene: React.FC<any> = React.memo(({ entities, weather, currentTurnEntityId, onTileClick, validMoves, validTargets, attackRangeTiles }) => {
    const battleMap = useGameStore(s => s.battleMap);
    const battleHazards = useGameStore(s => s.battleHazards);
    const voxelStructures = useGameStore(s => s.voxelStructures);
    const damagePopups = useGameStore(s => s.damagePopups);
    const handleTileHover = useGameStore(s => s.handleTileHover);
    const dimension = useGameStore(s => s.dimension);
    const hasActed = useGameStore(s => s.hasActed);
    const hasMoved = useGameStore(s => s.hasMoved);
    const activeSpellEffect = useGameStore(s => s.activeSpellEffect);
    const lootDrops = useGameStore(s => s.lootDrops);
    const selectedTile = useGameStore(s => s.selectedTile);
    const selectedAction = useGameStore(s => s.selectedAction);
    const selectAction = useGameStore(s => s.selectAction);
    const nextTurn = useGameStore(s => s.nextTurn);
    const attemptRun = useGameStore(s => s.attemptRun);
    const uiTheme = useGameStore(s => s.uiTheme);
    const gameState = useGameStore(s => s.gameState);
    const fogOfWarEnabled = useGameStore(s => s.fogOfWarEnabled ?? true);

    const [visibleKeys, setVisibleKeys] = React.useState<Set<string> | null>(null);

    const handleVisibleTilesChange = React.useCallback((keys: Set<string>) => {
        setVisibleKeys(keys);
    }, []);

    const isShadowRealm = dimension === Dimension.UPSIDE_DOWN;
    const isMoveMode = selectedAction === 'MOVE';
    const activeEntity = entities.find((e: Entity) => e.id === currentTurnEntityId);
    const center = BATTLE_MAP_SIZE / 2;

    const activeCell = activeEntity ? battleMap.find(c => c.x === activeEntity.position.x && c.z === activeEntity.position.y) : null;
    let activeSurfaceY = activeCell ? (activeCell.offsetY || 0) + activeCell.height : 0.5;
    
    // Smoothly sink entities standing on fluid/water/lava tiles for visual realism
    if (activeCell && (
        (activeCell.textureUrl || '').toLowerCase().includes('water') ||
        (activeCell.textureUrl || '').toLowerCase().includes('sea') ||
        (activeCell.textureUrl || '').toLowerCase().includes('lake') ||
        (activeCell.textureUrl || '').toLowerCase().includes('ocean') ||
        (activeCell.textureUrl || '').toLowerCase().includes('lava') ||
        String(activeCell.terrain || '').toLowerCase().includes('swamp') ||
        String(activeCell.terrain || '').toLowerCase().includes('water') ||
        String(activeCell.terrain || '').toLowerCase().includes('lava')
    )) {
        activeSurfaceY -= 0.35;
    }

    // --- SCREEN-SPACE DAMAGE FEEDBACK AND JUICE ENGINE (EXTRACTED TO HOOK) ---
    const { flashClass, setFlashClass, shake, setShake, canvasRef } = useBattleJuice();

    return (
        <div className={`w-full h-full bg-[#242528] relative overflow-hidden ${shake ? 'animate-screen-shake' : ''}`} onAnimationEnd={() => setShake(false)}>
            {flashClass && (
                <div 
                    key={flashClass} 
                    className={`fixed inset-0 pointer-events-none z-50 ${flashClass}`} 
                    onAnimationEnd={() => setFlashClass(null)}
                />
            )}
            <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
            <WeatherOverlay type={weather} />
            <MobileGestureHUD />
            
            {/* Tilt-Shift Miniature & Cozy Diorama Vignette Overlays */}
            <div className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_120px_rgba(15,23,42,0.65)]" />
            <div className="absolute top-0 left-0 right-0 h-28 z-10 pointer-events-none bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-transparent backdrop-blur-[1.5px]" />
            <div className="absolute bottom-0 left-0 right-0 h-28 z-10 pointer-events-none bg-gradient-to-t from-slate-950/70 via-slate-950/25 to-transparent backdrop-blur-[1.5px]" />

            <Base3DRenderer
                camera={{ position: [center, 12, center + 18], fov: 28, near: 0.1, far: 1000 }}
                orbitControlsProps={{
                    enablePan: true,
                    enableZoom: true,
                    maxDistance: 80,
                    minDistance: 3,
                    target: [center, 1.0, center],
                    minAzimuthAngle: -Math.PI / 3,
                    maxAzimuthAngle: Math.PI / 3,
                    maxPolarAngle: Math.PI / 2.1,
                    minPolarAngle: 0.1
                }}
                lighting={{
                    isShadowRealm,
                    ambientIntensity: isShadowRealm ? 0.25 : 0.6,
                    directionalIntensity: isShadowRealm ? 0.6 : 1.4,
                    directionalPosition: [12, 22, 8],
                    skyLightColor: isShadowRealm ? '#a855f7' : '#fff7ed',
                    groundLightColor: isShadowRealm ? '#1e1b4b' : '#334155'
                }}
            >
                <FogController isShadowRealm={isShadowRealm} />
                <CinematicCamera />
                <TacticalCameraGestureController />

                {activeEntity && (
                    <>
                        <SpotLight 
                            position={[activeEntity.position.x, 14, activeEntity.position.y]} 
                            target-position={[activeEntity.position.x, 0, activeEntity.position.y]} 
                            intensity={isShadowRealm ? 3.5 : 2.2} 
                            angle={0.85} 
                            penumbra={0.95} 
                            castShadow 
                            color={isShadowRealm ? "#c084fc" : "#ffedd5"} 
                            distance={35} 
                            attenuation={12} 
                            anglePower={4} 
                        />
                        <ActiveTurnBeacon activeEntity={activeEntity} surfaceY={activeSurfaceY} />
                    </>
                )}

                <CozyAmbientParticles isShadowRealm={isShadowRealm} />

                <TerrainLayer mapData={battleMap} voxelStructures={voxelStructures} isShadowRealm={isShadowRealm} isMoveMode={isMoveMode} />
                <TransitionLayer mapData={battleMap} />

                <Suspense fallback={null}>
                     <DecorationLayer mapData={battleMap} isMoveMode={isMoveMode} />
                </Suspense>

                <FogOfWarLayer 
                    mapData={battleMap} 
                    entities={entities} 
                    fogOfWarEnabled={fogOfWarEnabled} 
                    onVisibleTilesChange={handleVisibleTilesChange} 
                />

                <Suspense fallback={null}>
                     <HazardParticles hazards={battleHazards} mapData={battleMap} hoveredCoord={selectedTile} />
                </Suspense>

                <InteractionLayer mapData={battleMap} validMoves={validMoves} validTargets={validTargets} attackRangeTiles={attackRangeTiles} onTileClick={onTileClick} onTileHover={handleTileHover} />

                <Suspense fallback={null}>
                     <SpellEffectsRenderer activeSpellEffect={activeSpellEffect} />
                </Suspense>

                <Suspense fallback={null}>
                     <ProceduralVFXEngine entities={entities} mapData={battleMap} />
                </Suspense>

                {lootDrops && lootDrops.map(drop => {
                    const cell = battleMap.find(c => c.x === drop.position.x && c.z === drop.position.y);
                    let surfaceY = cell ? (cell.offsetY || 0) + cell.height : 0.5;
                    if (cell && (
                        (cell.textureUrl || '').toLowerCase().includes('water') ||
                        (cell.textureUrl || '').toLowerCase().includes('sea') ||
                        (cell.textureUrl || '').toLowerCase().includes('lake') ||
                        (cell.textureUrl || '').toLowerCase().includes('ocean') ||
                        (cell.textureUrl || '').toLowerCase().includes('lava') ||
                        String(cell.terrain || '').toLowerCase().includes('swamp') ||
                        String(cell.terrain || '').toLowerCase().includes('water') ||
                        String(cell.terrain || '').toLowerCase().includes('lava')
                    )) {
                        surfaceY -= 0.35;
                    }
                    return (
                        <LootDropVisual key={drop.id} drop={drop} surfaceY={surfaceY} onDropClick={onTileClick} />
                    );
                })}

                {entities.map((ent: any) => {
                    const isPlayerUnit = ent.type === 'PLAYER' || ent.isPlayerControlled;
                    const entKey = `${ent.position.x}_${ent.position.y}`;
                    const isHiddenByFog = fogOfWarEnabled && visibleKeys !== null && !isPlayerUnit && !visibleKeys.has(entKey);

                    // Unseen enemy units inside Fog of War are hidden dynamically until revealed by player movement
                    if (isHiddenByFog) {
                        return null;
                    }

                    const isTurn = ent.id === currentTurnEntityId;
                    const isActivePlayer = isTurn && isPlayerUnit;
                    const cell = battleMap.find(c => c.x === ent.position.x && c.z === ent.position.y);
                    let surfaceY = cell ? (cell.offsetY || 0) + cell.height : 0.5;
                    if (cell && (
                        (cell.textureUrl || '').toLowerCase().includes('water') ||
                        (cell.textureUrl || '').toLowerCase().includes('sea') ||
                        (cell.textureUrl || '').toLowerCase().includes('lake') ||
                        (cell.textureUrl || '').toLowerCase().includes('ocean') ||
                        (cell.textureUrl || '').toLowerCase().includes('lava') ||
                        String(cell.terrain || '').toLowerCase().includes('swamp') ||
                        String(cell.terrain || '').toLowerCase().includes('water') ||
                        String(cell.terrain || '').toLowerCase().includes('lava')
                    )) {
                        surfaceY -= 0.35;
                    }
                    const isTargetable = (validTargets || []).some((t: any) => t.x === ent.position.x && t.y === ent.position.y);
                    return (
                        <BillboardUnit 
                            key={ent.id} 
                            position={[ent.position.x, surfaceY, ent.position.y]} 
                            color={ent.visual.color} 
                            spriteUrl={ent.visual.spriteUrl} 
                            spriteConfig={ent.visual.spriteConfig}
                            isCurrentTurn={isTurn} 
                            isActivePlayer={isActivePlayer}
                            hp={ent.stats.hp} 
                            maxHp={ent.stats.maxHp}
                            name={ent.name || ent.type}
                            level={ent.level || ent.stats?.level || 1}
                            conditions={ent.stats?.conditions || []}
                            onUnitClick={onTileClick}
                            isTargetable={isTargetable}
                            hasActed={hasActed}
                            hasMoved={hasMoved}
                        />
                    );
                })}

                {damagePopups.map((p: any) => {
                    const isHeal = String(p.amount).includes('+') && !String(p.amount).includes('G');
                    const isGold = String(p.amount).includes('G');
                    const isMiss = String(p.amount).includes('MISS');
                    const icon = p.icon || (p.isCrit ? '💥' : isHeal ? '✨' : isGold ? '🪙' : isMiss ? '🛡️' : '🩸');
                    const textColor = p.isCrit ? 'text-amber-300 text-3xl font-extrabold scale-110' : isHeal ? 'text-emerald-400 text-2xl font-bold' : isGold ? 'text-yellow-300 text-2xl font-bold' : isMiss ? 'text-slate-300 text-xl font-bold' : 'text-red-400 text-2xl font-bold';

                    return (
                        <Html key={p.id} position={[p.position[0], p.position[1] + 2.2, p.position[2]]} center zIndexRange={[100, 0]}>
                            <div className="pointer-events-none select-none flex items-center gap-1 animate-float-up-fade">
                                <span className="text-2xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">{icon}</span>
                                <span className={`font-serif tracking-wider ${textColor}`} style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 0 2px black' }}>
                                    {p.amount}
                                </span>
                            </div>
                        </Html>
                    );
                })}

                {(isShadowRealm || weather === WeatherType.ASH) && <VoidParticles color={isShadowRealm ? "#d8b4fe" : "#57534e"} floatUp={isShadowRealm} />}
                
                {/* 3D Depth-of-Field Miniature & Cozy Tilt-Shift Shader Pass */}
                <DepthOfFieldShaderPass />
            </Base3DRenderer>
        </div>
    );
});
