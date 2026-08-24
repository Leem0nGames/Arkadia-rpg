
import React, { useEffect, useMemo, Suspense, useState } from 'react';
import { GameState, PositionComponent, BattleAction, Dimension, TerrainType, BattleHazardType, EquipmentSlot, CharacterClass, SpellType, isFriendly } from './types';
import { OverworldMap } from './components/OverworldMap';
import { BattleScene } from './components/BattleScene';
import { CharacterCreation } from './components/CharacterCreation';
import { UIOverlay } from './components/UIOverlay';
import { BattleResultModal } from './components/BattleResultModal';
import { LevelUpModal } from './components/LevelUpModal';
import { SettingsModal } from './components/SettingsModal';
import { Hunt3DScene } from './components/Hunt3DScene';
import { HuntUIOverlay } from './components/HuntUIOverlay';
import { useGameStore } from './store/gameStore';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { MapLoadingScreen } from './components/MapLoadingScreen';
import { BATTLE_MAP_SIZE } from './constants';
import { getHazardMovementMultiplier } from './services/dndRules';
import { preloadCoreGameAssets } from './services/textureLoader';

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const store = useGameStore();
  const { 
    gameState, playerPos, battleEntities, turnOrder, currentTurnIndex,
    battleTerrain, battleWeather, battleRewards, selectedAction, hasMoved, hasActed, dimension, townMapData,
    mapDimensions, battleMap, battleHazards
  } = store;

  // Routing Check
  useEffect(() => {
      if (window.location.pathname === '/admin') {
          setIsAdmin(true);
      }
  }, []);

  // Initialize World & Preload Core Textures
  useEffect(() => {
      if (!isAdmin) {
          store.initializeWorld();
          preloadCoreGameAssets().catch((err) => console.warn('Preload notice:', err));
      }
  }, [isAdmin]);

  // --- Calculation Helpers ---
  const activeEntityId = turnOrder[currentTurnIndex];
  const activeEntity = battleEntities.find(e => e.id === activeEntityId);
  const isPlayerTurn = activeEntity?.type === 'PLAYER';

  const selectedSpell = store.selectedSpell;
  const hoveredActionPreview = useGameStore(state => state.hoveredActionPreview);

  const activeAction = selectedAction || hoveredActionPreview;

  // 1. Valid Movement Range Tiles (Blue Matrix Overlay)
  const validMoves = useMemo(() => {
      if (gameState !== GameState.BATTLE_TACTICAL || (hasMoved && !selectedAction)) return [];
      if (activeAction !== BattleAction.MOVE) return [];
      if (!activeEntity || activeEntity.type !== 'PLAYER') return [];

      const moves: PositionComponent[] = [];
      const speedInTiles = Math.floor((activeEntity.stats.speed || 30) / 5);
      
      // BFS for Valid Moves (respecting obstacles & environmental hazards)
      const queue: {x: number, y: number, dist: number}[] = [{ x: activeEntity.position.x, y: activeEntity.position.y, dist: 0 }];
      const visited = new Set<string>();
      visited.add(`${activeEntity.position.x},${activeEntity.position.y}`);
      
      const obstacleMap = new Set<string>();
      battleMap.forEach(cell => {
          if (cell.isObstacle) obstacleMap.add(`${cell.x},${cell.z}`);
      });

      const hazardMap = new Map<string, BattleHazardType>();
      (battleHazards || []).forEach(h => {
          hazardMap.set(`${h.x},${h.z}`, h.type);
      });
      
      while(queue.length > 0) {
          const curr = queue.shift()!;
          if (curr.dist < speedInTiles) {
               const neighbors = [
                   {x: curr.x+1, y: curr.y}, {x: curr.x-1, y: curr.y},
                   {x: curr.x, y: curr.y+1}, {x: curr.x, y: curr.y-1}
               ];
               
               for(const n of neighbors) {
                   if (n.x >= 0 && n.x < BATTLE_MAP_SIZE && n.y >= 0 && n.y < BATTLE_MAP_SIZE) {
                       const key = `${n.x},${n.y}`;
                       const isObstacle = obstacleMap.has(key);
                       const isOccupied = battleEntities.some(e => e.position.x === n.x && e.position.y === n.y && e.id !== activeEntity.id && e.stats.hp > 0);
                       const hazardType = hazardMap.get(key);
                       const stepCost = getHazardMovementMultiplier(hazardType);
                       const nextDist = curr.dist + stepCost;
                       
                       if (!visited.has(key) && !isObstacle && !isOccupied && nextDist <= speedInTiles) {
                           visited.add(key);
                           queue.push({ x: n.x, y: n.y, dist: nextDist });
                           moves.push({ x: n.x, y: n.y });
                       }
                   }
               }
          }
      }
      return moves;
  }, [gameState, activeAction, hasMoved, battleEntities, activeEntity?.id, activeEntity?.position.x, activeEntity?.position.y, activeEntity?.stats.speed, battleMap, battleHazards]);

  // 2. Attack / Spell Perimeter Range Tiles (Red Hazard Overlay)
  const attackRangeTiles = useMemo(() => {
      if (gameState !== GameState.BATTLE_TACTICAL || (hasActed && !selectedAction)) return [];
      if (activeAction !== BattleAction.ATTACK && activeAction !== BattleAction.MAGIC) return [];
      if (!activeEntity || activeEntity.type !== 'PLAYER') return [];

      let range = 1;
      if (activeAction === BattleAction.ATTACK) {
          const mainHand = activeEntity.equipment?.[EquipmentSlot.MAIN_HAND];
          if (mainHand && (mainHand.name?.toLowerCase().includes('bow') || mainHand.name?.toLowerCase().includes('cross') || activeEntity.stats.class === CharacterClass.RANGER)) {
              range = 6;
          } else {
              range = 1;
          }
      } else if (activeAction === BattleAction.MAGIC) {
          range = selectedSpell?.range || 6;
      }

      const tiles: PositionComponent[] = [];
      const px = activeEntity.position.x;
      const py = activeEntity.position.y;

      const obstacleMap = new Set<string>();
      battleMap.forEach(cell => {
          if (cell.isObstacle) obstacleMap.add(`${cell.x},${cell.z}`);
      });

      const hasLos = useGameStore.getState().hasLineOfSight;

      for (let x = Math.max(0, px - range); x <= Math.min(BATTLE_MAP_SIZE - 1, px + range); x++) {
          for (let z = Math.max(0, py - range); z <= Math.min(BATTLE_MAP_SIZE - 1, py + range); z++) {
              if (x === px && z === py) continue;
              const dist = Math.max(Math.abs(px - x), Math.abs(py - z));
              if (dist <= range && !obstacleMap.has(`${x},${z}`)) {
                  if (range > 1 && !hasLos({ x: px, y: py }, { x, y: z })) continue;
                  tiles.push({ x, y: z });
              }
          }
      }
      return tiles;
  }, [gameState, activeAction, hasActed, battleEntities, activeEntity?.id, activeEntity?.position.x, activeEntity?.position.y, activeEntity?.equipment, activeEntity?.stats.class, selectedSpell?.id, selectedSpell?.range, battleMap]);

  // 3. Valid Targets inside Attack Range
  const validTargets = useMemo(() => {
      if (gameState !== GameState.BATTLE_TACTICAL || (hasActed && !selectedAction)) return [];
      if (activeAction !== BattleAction.ATTACK && activeAction !== BattleAction.MAGIC) return [];
      if (!activeEntity || activeEntity.type !== 'PLAYER') return [];

      let range = 1;
      if (activeAction === BattleAction.ATTACK) {
          const mainHand = activeEntity.equipment?.[EquipmentSlot.MAIN_HAND];
          if (mainHand && (mainHand.name?.toLowerCase().includes('bow') || mainHand.name?.toLowerCase().includes('cross') || activeEntity.stats.class === CharacterClass.RANGER)) {
              range = 6;
          } else {
              range = 1;
          }
      } else if (activeAction === BattleAction.MAGIC) {
          range = selectedSpell?.range || 6;
      }

      const isSpellHealOrBuff = selectedSpell && (selectedSpell.type === SpellType.HEAL || selectedSpell.type === SpellType.BUFF);
      const hasLos = useGameStore.getState().hasLineOfSight;

      return battleEntities
        .filter(e => e.stats.hp > 0)
        .filter(e => {
            const isAlly = isFriendly(activeEntity, e);
            if (isSpellHealOrBuff) return isAlly;
            return !isAlly;
        })
        .filter(e => {
            const dist = Math.max(Math.abs(activeEntity.position.x - e.position.x), Math.abs(activeEntity.position.y - e.position.y));
            if (dist > range) return false;
            return hasLos(activeEntity.position, e.position);
        })
        .map(e => ({ x: e.position.x, y: e.position.y }));

  }, [gameState, activeAction, hasActed, battleEntities, activeEntity?.id, activeEntity?.position.x, activeEntity?.position.y, activeEntity?.equipment, activeEntity?.stats.class, selectedSpell?.id, selectedSpell?.range, selectedSpell?.type]);

  if (isAdmin) {
      return <AdminDashboard />;
  }

  // Robust fallback for dimensions to prevent crash if store is hydrating
  const safeDimensions = mapDimensions || { width: 20, height: 15 };

  return (
    <div className="w-screen h-screen bg-[#242528] text-slate-200 overflow-hidden font-sans relative">
      
      {/* Dynamic Map Loading & Pre-rendering Screen */}
      {gameState === GameState.LOADING_MAP && (
          <MapLoadingScreen />
      )}

      {gameState === GameState.CHARACTER_CREATION && (
          <CharacterCreation onComplete={store.createCharacter} onOpenAdmin={() => setIsAdmin(true)} />
      )}

      {(gameState === GameState.OVERWORLD || gameState === GameState.TOWN_EXPLORATION) && (
          <>
            <OverworldMap 
                mapData={townMapData || []} 
                playerPos={playerPos} 
                onMove={store.movePlayerOverworld}
                dimension={dimension}
                width={safeDimensions.width}
                height={safeDimensions.height}
            />
            <UIOverlay />
          </>
      )}

      {(gameState === GameState.BATTLE_TACTICAL || gameState === GameState.BATTLE_VICTORY || gameState === GameState.BATTLE_DEFEAT) && (
          <>
            <Suspense fallback={<div className="flex items-center justify-center h-full w-full text-amber-400 font-serif animate-pulse">Loading Battle...</div>}>
                <BattleScene 
                    entities={battleEntities} 
                    terrainType={battleTerrain}
                    weather={battleWeather}
                    currentTurnEntityId={turnOrder[currentTurnIndex]}
                    onTileClick={store.handleTileInteraction}
                    validMoves={validMoves}
                    validTargets={validTargets}
                    attackRangeTiles={attackRangeTiles}
                />
                <UIOverlay />
            </Suspense>

            {(gameState === GameState.BATTLE_VICTORY || gameState === GameState.BATTLE_DEFEAT) && (
                <BattleResultModal 
                    type={gameState === GameState.BATTLE_VICTORY ? 'victory' : 'defeat'}
                    rewards={gameState === GameState.BATTLE_VICTORY ? battleRewards : undefined}
                    onContinue={store.continueAfterVictory}
                    onRestart={store.restartBattle}
                    onQuit={store.quitToMenu}
                />
            )}
          </>
      )}

      {/* Modo Cacería (Minecraft 3D Schematic Explorer) */}
      {gameState === GameState.HUNT_MODE && (
          <Suspense fallback={<div className="flex items-center justify-center h-full w-full text-amber-400 font-serif animate-pulse">Cargando Escenario 3D Minecraft...</div>}>
              <Hunt3DScene />
              <HuntUIOverlay />
          </Suspense>
      )}

      {/* 5E Post-Battle Level Up & Attribute Point Assignment Flow */}
      <LevelUpModal />

      {/* Game Settings & Theme Customization Modal */}
      <SettingsModal />
    </div>
  );
};

export default App;
