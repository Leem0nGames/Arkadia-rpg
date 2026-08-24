import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/gameStore';
import { useContentStore } from '../../store/contentStore';
import { 
  GameState, Dimension, BattleAction, SpellType, EquipmentSlot, CharacterClass, 
  isFriendly, Entity, TerrainType, Spell 
} from '../../types';
import { sfx } from '../../services/SoundSystem';
import { WorldGenerator } from '../../services/WorldGenerator';
import { getAncientSiteAt } from '../../data/ancientSites';
import { getThemeConfig } from '../../services/themeSystem';
import { MobileDPad } from './MobileDPad';
import { RestModal } from '../RestModal';
import { InventoryScreen } from '../InventoryScreen';
import { WorldMapScreen } from '../WorldMapScreen';
import { CombatDiceLogDrawer } from '../battle/CombatDiceLogDrawer';
import { DiceRoll3DOverlay } from '../battle/DiceRoll3DOverlay';
import { SpritesheetButton, SpritesheetButtonType } from './SpritesheetButton';

export const GlobalHUD: React.FC = () => {
  const store = useGameStore();
  const {
    gameState, playerPos, party, dimension, inventory = [],
    travelFatigue = 0, quests = [], logs = [], uiTheme,
    // Overworld
    isInventoryOpen, isMapOpen, toggleInventory, toggleMap,
    movePlayerOverworld, standingOnPortal, standingOnSettlement,
    usePortal, enterSettlement, searchedSites = [], investigateAncientSite,
    // Battle
    battleEntities = [], turnOrder = [], currentTurnIndex = 0, battleRound = 1,
    selectedAction, selectedSpell, hasMoved, hasActed, selectAction, selectSpell,
    handleTileInteraction, nextTurn, attemptRun,
    getAttackPrediction, activeDiceRoll, clearDiceRoll,
    selectedTile, confirmMovement,
    // Hunt
    huntSession, moveHuntPlayer, investigateClue, attackPreyInHunt, destroyCoverAtPos,
    useHuntAbility, placeTrap, toggleStealth, exitHuntMode,
    // System
    saveGame, loadGame, quitToMenu, startHuntMode, fogOfWarEnabled = true, toggleFogOfWar
  } = store;

  // Hunt Session Extracted Data
  const preys = huntSession?.preys || [];
  const clues = huntSession?.clues || [];
  const traps = huntSession?.trapsPlaced || [];
  const stealthActive = huntSession?.stealthActive || false;
  const huntPlayerPos = huntSession?.playerPos || { x: 0, y: 0, z: 0 };
  const returnPortal = huntSession?.returnPortal;

  // Local Modal States
  const [showSystemMenu, setShowSystemMenu] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [showDiceLog, setShowDiceLog] = useState(false);
  const [showGestureHelp, setShowGestureHelp] = useState(false);
  const [showTrapsPanel, setShowTrapsPanel] = useState(false);
  const [isRadialOpen, setIsRadialOpen] = useState(false);
  const [activeRadialSubMenu, setActiveRadialSubMenu] = useState<'main' | 'spells' | 'items'>('main');
  const [selectedPartId, setSelectedPartId] = useState<string | undefined>(undefined);
  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number>(0);

  // Notification Banner State
  const [notificationPinned, setNotificationPinned] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const themeConfig = getThemeConfig(uiTheme || 'dark_stone');
  const recentLog = logs.length > 0 ? logs[logs.length - 1] : null;

  // Auto-collapse notification timer
  useEffect(() => {
    if (recentLog) {
      const logId = recentLog.id || recentLog.timestamp || recentLog.message;
      if (logId !== lastNotificationId) {
        setLastNotificationId(logId);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          // Log banner collapses after 3 seconds
        }, 3000);
      }
    }
  }, [recentLog, lastNotificationId]);

  // Derived Hero Stats
  const player = party[0];
  const hpPercent = player ? Math.round((player.stats.hp / player.stats.maxHp) * 100) : 100;
  
  const rationSlot = inventory.find(s => s.item.id === 'ration' || s.item.effect?.type === 'reduce_fatigue');
  const rationCount = rationSlot ? rationSlot.quantity : 0;
  const goldSlot = inventory.find(s => s.item.id === 'gold' || s.item.name?.toLowerCase().includes('oro'));
  const gold = goldSlot ? goldSlot.quantity : 250;

  const activeQuest = quests?.find(q => !q.completed);

  // Overworld Current Cell Info
  const currentPlayerCell = useMemo(() => {
    if (gameState === GameState.OVERWORLD || gameState === GameState.TOWN_EXPLORATION) {
      return WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
    }
    return null;
  }, [playerPos, dimension, gameState]);

  const ancientSiteData = useMemo(() => {
    if (gameState !== GameState.OVERWORLD && gameState !== GameState.TOWN_EXPLORATION) return undefined;
    const explicit = getAncientSiteAt(playerPos.x, playerPos.y);
    if (explicit) return explicit;
    if (currentPlayerCell) {
      const isCave = currentPlayerCell.poiType === 'MYSTIC_CAVE' || currentPlayerCell.terrain === TerrainType.CAVE_FLOOR;
      const isRuins = currentPlayerCell.poiType === 'ANCIENT_RUINS' || currentPlayerCell.terrain === TerrainType.RUINS;
      const isSanctuary = currentPlayerCell.poiType === 'SANCTUARY';
      const isWatchtower = currentPlayerCell.poiType === 'WATCHTOWER';
      const isDungeon = currentPlayerCell.poiType === 'DUNGEON';
      if (isCave || isRuins || isSanctuary || isWatchtower || isDungeon) {
        return {
          id: `SITE_PROC_${playerPos.x}_${playerPos.y}`,
          name: currentPlayerCell.poiName || (isCave ? 'Cueva Misteriosa de Arcadia' : isRuins ? 'Ruinas Antiguas Olvidadas' : isSanctuary ? 'Santuario Arcano' : isWatchtower ? 'Atalaya de Observación' : 'Mazmorra Ancestral'),
          type: (isSanctuary ? 'SANCTUARY' : isWatchtower ? 'WATCHTOWER' : isDungeon ? 'DUNGEON' : isCave ? 'CAVE' : 'RUINS') as any,
          q: playerPos.x,
          r: playerPos.y,
          biomeName: currentPlayerCell.kingdomName || 'Arcadia',
          description: currentPlayerCell.poiDescription || 'Una formación ancestral cargada de misterios y energía primigenia.',
          clueLore: 'Examinas las profundidades y recolectas antiguos testimonios.',
          d20Difficulty: 10,
          rewardXp: 180,
          rewardGold: 120
        };
      }
    }
    return undefined;
  }, [playerPos.x, playerPos.y, currentPlayerCell, gameState]);

  const standingOnAncientSite = !!ancientSiteData;
  const isSiteSearched = ancientSiteData ? (searchedSites || []).includes(ancientSiteData.id) : false;

  // Battle Mode Derived States
  const activeEntityId = turnOrder[currentTurnIndex];
  const activeEntity = battleEntities.find(e => e.id === activeEntityId);
  const isPlayerTurn = activeEntity?.type === 'PLAYER';

  // Automatically toggle visibility of radial menu buttons when an action is triggered,
  // ensuring the interface clears itself while the player is performing movement or targeting tasks.
  useEffect(() => {
    if (selectedAction !== null) {
      setIsRadialOpen(false);
    } else if (gameState === GameState.BATTLE_TACTICAL) {
      // In battle, we completely suppress the 2D HUD's radial menu, using the 3D BG3RadialMenu instead.
      setIsRadialOpen(false);
    }
  }, [selectedAction, gameState]);

  // Available battle targets
  const validTargetsInBattle = useMemo(() => {
    if (gameState !== GameState.BATTLE_TACTICAL || !isPlayerTurn || !activeEntity || hasActed) return [];
    if (selectedAction !== BattleAction.ATTACK && selectedAction !== BattleAction.MAGIC) return [];

    let range = 1;
    if (selectedAction === BattleAction.ATTACK) {
      const mainHand = activeEntity.equipment?.[EquipmentSlot.MAIN_HAND];
      if (mainHand && (mainHand.name?.toLowerCase().includes('bow') || mainHand.name?.toLowerCase().includes('cross') || activeEntity.stats?.class === CharacterClass.RANGER)) {
        range = 6;
      } else {
        range = 1;
      }
    } else if (selectedAction === BattleAction.MAGIC) {
      range = selectedSpell?.range || 6;
    }

    const isSpellHealOrBuff = selectedSpell && (selectedSpell.type === SpellType.HEAL || selectedSpell.type === SpellType.BUFF);

    return battleEntities.filter(e => {
      if (e.stats.hp <= 0) return false;
      const isAlly = isFriendly(activeEntity, e);
      if (isSpellHealOrBuff) {
        if (!isAlly) return false;
      } else {
        if (isAlly) return false;
      }
      const dist = Math.max(Math.abs(activeEntity.position.x - e.position.x), Math.abs(activeEntity.position.y - e.position.y));
      return dist <= range;
    });
  }, [gameState, isPlayerTurn, activeEntity, hasActed, selectedAction, selectedSpell, battleEntities]);

  const activeBattleTarget: Entity | null = validTargetsInBattle.length > 0
    ? validTargetsInBattle[selectedTargetIndex % validTargetsInBattle.length] || validTargetsInBattle[0]
    : null;

  const attackPrediction = useMemo(() => {
    if (!activeBattleTarget || !getAttackPrediction) return null;
    return getAttackPrediction(activeBattleTarget);
  }, [activeBattleTarget, getAttackPrediction]);

  // Hunt Mode Derived States
  const activePreys = preys.filter(p => !p.isDefeated);
  const nearestPrey = activePreys.length > 0
    ? activePreys.reduce((closest, current) => {
        const distC = Math.hypot(current.x - huntPlayerPos.x, current.z - huntPlayerPos.z);
        const distCl = Math.hypot(closest.x - huntPlayerPos.x, closest.z - huntPlayerPos.z);
        return distC < distCl ? current : closest;
      }, activePreys[0])
    : null;

  const distToNearest = nearestPrey ? Math.round(Math.hypot(nearestPrey.x - huntPlayerPos.x, nearestPrey.z - huntPlayerPos.z)) : 999;
  const nearbyClue = clues.find(c => !c.isInvestigated && Math.hypot(c.x - huntPlayerPos.x, c.z - huntPlayerPos.z) <= 3.5);

  // Flanking status in Hunt
  const currentFlankStatus = useMemo(() => {
    if (!nearestPrey || gameState !== GameState.HUNT_MODE) return null;
    const dx = huntPlayerPos.x - nearestPrey.x;
    const dz = huntPlayerPos.z - nearestPrey.z;
    const angleRad = Math.atan2(dz, dx);
    let degrees = (angleRad * 180) / Math.PI;
    if (degrees < 0) degrees += 360;

    let facingDeg = (nearestPrey.facingAngle * 180) / Math.PI;
    if (facingDeg < 0) facingDeg += 360;

    let diff = Math.abs(degrees - facingDeg);
    if (diff > 180) diff = 360 - diff;

    if (diff >= 135) return { label: '🗡️ ESPALDA (+100% Crítico)', color: 'bg-red-950/90 border-red-500 text-red-200' };
    if (diff >= 45 && diff < 135) return { label: '⚔️ FLANQUEO (+40% Daño)', color: 'bg-amber-950/90 border-amber-500 text-amber-200' };
    return { label: '🛡️ FRENTE (Normal)', color: 'bg-slate-900/80 border-slate-700 text-slate-300' };
  }, [huntPlayerPos, nearestPrey, gameState]);

  // Available Spells for Radial
  const { spells: contentSpells, classSpells: contentClassSpells } = useContentStore();
  const availableSpells: Spell[] = useMemo(() => {
    const cls = activeEntity?.stats?.class || player?.stats?.class;
    if (!cls) return [];
    const spellIds = contentClassSpells[cls] || [];
    return spellIds
      .map(id => (contentSpells[id.toUpperCase()] || contentSpells[id]) as Spell)
      .filter(Boolean);
  }, [activeEntity?.stats?.class, player?.stats?.class, contentClassSpells, contentSpells]);

  // Mode-Specific Radial Dial Actions
  const radialActions = useMemo(() => {
    if (gameState === GameState.OVERWORLD || gameState === GameState.TOWN_EXPLORATION) {
      return [
        {
          id: 'ow_inv',
          label: 'Inventario',
          icon: '🎒',
          spritesheetType: 'INVENTORY' as SpritesheetButtonType,
          badge: `${inventory.length}`,
          color: 'border-amber-400 bg-amber-950/90 text-amber-200 shadow-amber-500/30',
          onClick: () => { sfx.playUiClick(); toggleInventory(); setIsRadialOpen(false); }
        },
        {
          id: 'ow_map',
          label: 'Mapamundi',
          icon: '🗺️',
          spritesheetType: 'MAP' as SpritesheetButtonType,
          color: 'border-sky-400 bg-sky-950/90 text-sky-200 shadow-sky-500/30',
          onClick: () => { sfx.playUiClick(); toggleMap(); setIsRadialOpen(false); }
        },
        {
          id: 'ow_camp',
          label: 'Campamento',
          icon: '⛺',
          spritesheetType: 'CAMP' as SpritesheetButtonType,
          badge: `${rationCount}`,
          color: 'border-emerald-400 bg-emerald-950/90 text-emerald-200 shadow-emerald-500/30',
          onClick: () => { sfx.playUiClick(); setShowRestModal(true); setIsRadialOpen(false); }
        },
        {
          id: 'ow_investigate',
          label: 'Investigar',
          icon: '🔍',
          spritesheetType: 'QUESTS' as SpritesheetButtonType,
          color: 'border-cyan-400 bg-cyan-950/90 text-cyan-200 shadow-cyan-500/30',
          onClick: () => {
            sfx.playUiClick();
            if (ancientSiteData && !isSiteSearched) {
              investigateAncientSite(ancientSiteData.id);
            } else if (standingOnSettlement) {
              enterSettlement();
            } else if (standingOnPortal) {
              usePortal();
            } else {
              store.addLog(`🔍 Inspeccionando terreno en (${playerPos.x}, ${playerPos.y}): ${currentPlayerCell?.kingdomName || 'Tierra Salvaje'}.`, 'info');
            }
            setIsRadialOpen(false);
          }
        },
        {
          id: 'ow_system',
          label: 'Ajustes',
          icon: '⚙️',
          spritesheetType: 'SETTINGS' as SpritesheetButtonType,
          color: 'border-purple-400 bg-purple-950/90 text-purple-200 shadow-purple-500/30',
          onClick: () => { sfx.playUiClick(); setShowSystemMenu(true); setIsRadialOpen(false); }
        }
      ];
    } else if (gameState === GameState.BATTLE_TACTICAL) {
      if (activeRadialSubMenu === 'spells') {
        return [
          {
            id: 'bt_back_main',
            label: '◄ Volver',
            icon: '↩️',
            spritesheetType: 'BACK' as SpritesheetButtonType,
            color: 'border-slate-400 bg-slate-900/90 text-slate-200',
            onClick: () => { sfx.playUiClick(); setActiveRadialSubMenu('main'); }
          },
          ...availableSpells.map(spell => ({
            id: `spell_${spell.id}`,
            label: spell.name,
            icon: spell.type === SpellType.DAMAGE ? '🔥' : spell.type === SpellType.HEAL ? '💚' : '✨',
            spritesheetType: 'MAGIC' as SpritesheetButtonType,
            color: 'border-purple-400 bg-purple-950/90 text-purple-200 shadow-purple-500/30',
            onClick: () => {
              sfx.playUiClick();
              selectSpell(spell.id);
              selectAction(BattleAction.MAGIC);
              setIsRadialOpen(false);
            }
          }))
        ];
      }

      return [
        {
          id: 'bt_move',
          label: 'Mover',
          icon: '🦶',
          spritesheetType: 'MOVE' as SpritesheetButtonType,
          disabled: hasMoved || !isPlayerTurn,
          color: hasMoved ? 'border-slate-700 bg-slate-900/50 text-slate-600' : 'border-sky-400 bg-sky-950/90 text-sky-200 shadow-sky-500/30',
          onClick: () => { sfx.playUiClick(); selectAction(BattleAction.MOVE); setIsRadialOpen(false); }
        },
        {
          id: 'bt_attack',
          label: 'Atacar',
          icon: '⚔️',
          spritesheetType: 'ATTACK' as SpritesheetButtonType,
          disabled: hasActed || !isPlayerTurn,
          color: hasActed ? 'border-slate-700 bg-slate-900/50 text-slate-600' : 'border-red-400 bg-red-950/90 text-red-200 shadow-red-500/30',
          onClick: () => { sfx.playUiClick(); selectAction(BattleAction.ATTACK); setIsRadialOpen(false); }
        },
        {
          id: 'bt_magic',
          label: 'Magia',
          icon: '✨',
          spritesheetType: 'MAGIC' as SpritesheetButtonType,
          disabled: hasActed || !isPlayerTurn || availableSpells.length === 0,
          color: hasActed || availableSpells.length === 0 ? 'border-slate-700 bg-slate-900/50 text-slate-600' : 'border-purple-400 bg-purple-950/90 text-purple-200 shadow-purple-500/30',
          onClick: () => { sfx.playUiClick(); setActiveRadialSubMenu('spells'); }
        },
        {
          id: 'bt_defend',
          label: 'Esperar',
          icon: '🛡️',
          spritesheetType: 'WAIT' as SpritesheetButtonType,
          disabled: hasActed || !isPlayerTurn,
          color: hasActed ? 'border-slate-700 bg-slate-900/50 text-slate-600' : 'border-amber-400 bg-amber-950/90 text-amber-200 shadow-amber-500/30',
          onClick: () => { sfx.playUiClick(); selectAction(BattleAction.WAIT); setIsRadialOpen(false); }
        },
        {
          id: 'bt_next',
          label: 'Pasar Turno',
          icon: '⏭️',
          spritesheetType: 'RUN' as SpritesheetButtonType,
          disabled: !isPlayerTurn,
          color: 'border-emerald-400 bg-emerald-950/90 text-emerald-200 shadow-emerald-500/30',
          onClick: () => { sfx.playUiClick(); nextTurn(); setIsRadialOpen(false); }
        },
        {
          id: 'bt_run',
          label: 'Huir',
          icon: '🏃',
          spritesheetType: 'RUN' as SpritesheetButtonType,
          color: 'border-rose-400 bg-rose-950/90 text-rose-200 shadow-rose-500/30',
          onClick: () => { sfx.playUiClick(); attemptRun(); setIsRadialOpen(false); }
        }
      ];
    } else if (gameState === GameState.HUNT_MODE) {
      const cls = player?.stats?.class;
      const isRanger = cls === CharacterClass.RANGER || cls === CharacterClass.ROGUE;
      const isMage = cls === CharacterClass.WIZARD || cls === CharacterClass.SORCERER;

      return [
        {
          id: 'hunt_attack',
          label: 'Atacar',
          icon: '⚔️',
          spritesheetType: 'ATTACK' as SpritesheetButtonType,
          color: 'border-red-400 bg-red-950/90 text-red-200 shadow-red-500/30',
          onClick: () => {
            sfx.playUiClick();
            if (nearestPrey) {
              attackPreyInHunt(nearestPrey.id, selectedPartId);
            } else {
              store.addLog('⚠️ No hay presas cercanas para atacar.', 'info');
            }
            setIsRadialOpen(false);
          }
        },
        {
          id: 'hunt_cover',
          label: 'Cobertura',
          icon: '💥',
          spritesheetType: 'ATTACK' as SpritesheetButtonType,
          color: 'border-orange-400 bg-orange-950/90 text-orange-200 shadow-orange-500/30',
          onClick: () => {
            sfx.playUiClick();
            if (nearestPrey) {
              const targetX = Math.round((nearestPrey.x + huntPlayerPos.x) / 2);
              const targetZ = Math.round((nearestPrey.z + huntPlayerPos.z) / 2);
              destroyCoverAtPos(targetX, targetZ);
            }
            setIsRadialOpen(false);
          }
        },
        {
          id: 'hunt_ability',
          label: isRanger ? 'Marca' : isMage ? 'Jaula Arcana' : 'Quebrantar',
          icon: '✨',
          spritesheetType: 'MAGIC' as SpritesheetButtonType,
          color: 'border-purple-400 bg-purple-950/90 text-purple-200 shadow-purple-500/30',
          onClick: () => {
            sfx.playUiClick();
            if (isRanger) useHuntAbility('MARK');
            else if (isMage) useHuntAbility('ARCANE_CAGE');
            else useHuntAbility('SHATTER');
            setIsRadialOpen(false);
          }
        },
        {
          id: 'hunt_trap',
          label: 'Trampas',
          icon: '⚙️',
          spritesheetType: 'SETTINGS' as SpritesheetButtonType,
          color: 'border-amber-400 bg-amber-950/90 text-amber-200 shadow-amber-500/30',
          onClick: () => { sfx.playUiClick(); setShowTrapsPanel(!showTrapsPanel); setIsRadialOpen(false); }
        },
        {
          id: 'hunt_stealth',
          label: stealthActive ? 'Visible' : 'Sigilo',
          icon: '🥷',
          spritesheetType: 'MOVE' as SpritesheetButtonType,
          color: stealthActive ? 'border-emerald-400 bg-emerald-950/90 text-emerald-200 shadow-emerald-500/30' : 'border-slate-400 bg-slate-900/90 text-slate-300',
          onClick: () => { sfx.playUiClick(); toggleStealth(); setIsRadialOpen(false); }
        },
        {
          id: 'hunt_exit',
          label: 'Salir 3D',
          icon: '🚪',
          spritesheetType: 'RUN' as SpritesheetButtonType,
          color: 'border-rose-400 bg-rose-950/90 text-rose-200 shadow-rose-500/30',
          onClick: () => { sfx.playUiClick(); exitHuntMode(); setIsRadialOpen(false); }
        }
      ];
    }
    return [];
  }, [
    gameState, inventory, rationCount, ancientSiteData, isSiteSearched, standingOnSettlement,
    standingOnPortal, playerPos, currentPlayerCell, activeRadialSubMenu, availableSpells,
    hasMoved, isPlayerTurn, hasActed, player, nearestPrey, selectedPartId, stealthActive,
    huntPlayerPos
  ]);

  return (
    <div id="global-hud-root" className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-2 sm:p-4 md:p-6 overflow-hidden">
      
      {/* 1. TOP FLOATING UNIFIED HEADER CONTAINER */}
      <header className="flex flex-col gap-1 w-full pointer-events-none">
        
        {/* Top Controls Row */}
        <div className="flex items-start justify-between gap-1.5 w-full">
          {/* HERO STATUS CAPSULE (Top-Left) */}
          <div className="pointer-events-auto bg-slate-950/85 border border-amber-500/35 rounded-2xl p-2 px-2.5 backdrop-blur-2xl shadow-2xl flex items-center gap-2 max-w-[180px] sm:max-w-xs shrink-0 transition-all duration-300">
            {/* Hero Portrait Icon */}
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-600/30 to-slate-900 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-inner">
              <span className="text-lg">🛡️</span>
              <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[8px] font-black font-mono px-1 rounded-full border border-black shadow-md">
                Nv{player?.stats.level || 1}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 w-full min-w-0">
              <div className="flex justify-between items-center gap-1 leading-none">
                <span className="font-serif font-bold text-[11px] sm:text-xs text-amber-300 truncate">
                  {player?.name || 'Stanmere'}
                </span>
                <span className="text-[8.5px] sm:text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-1 py-0.2 rounded-full shrink-0 shadow-sm">
                  💰{gold}
                </span>
              </div>

              {/* HP Bar */}
              <div className="relative w-full h-2 sm:h-2.5 bg-slate-900/90 rounded-full border border-red-500/30 overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[7px] sm:text-[7.5px] font-mono font-bold text-white drop-shadow">
                  {player?.stats.hp}/{player?.stats.maxHp} HP
                </span>
              </div>

              {/* Sub-status (Fatigue & Rations) */}
              {gameState !== GameState.BATTLE_TACTICAL && (
                <div className="flex items-center justify-between text-[8px] sm:text-[8.5px] font-mono">
                  <div className="flex items-center gap-0.5 text-slate-300">
                    <span>⚡:</span>
                    <span className={`font-bold ${travelFatigue > 50 ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
                      {travelFatigue}/100
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-200">
                    <span>🍞 <b>{rationCount}</b></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MODE CONTEXT PILL (Top-Center) */}
          <div className="pointer-events-auto flex flex-col items-center gap-1 min-w-0 shrink">
            {gameState === GameState.OVERWORLD && (
              <div className="bg-slate-950/85 border border-amber-500/35 rounded-2xl px-2.5 py-1 backdrop-blur-xl shadow-xl flex items-center gap-1.5 text-[10px] sm:text-xs font-mono text-amber-300 whitespace-nowrap">
                <span>{dimension === Dimension.UPSIDE_DOWN ? '🌀' : '🌍'}</span>
                <span className="font-bold whitespace-nowrap">{dimension === Dimension.UPSIDE_DOWN ? 'Dimensión Sombría' : 'Reinos de Arcadia'}</span>
              </div>
            )}

            {gameState === GameState.BATTLE_TACTICAL && (
              <div className="bg-slate-950/85 border border-amber-500/40 rounded-2xl px-2.5 py-1 backdrop-blur-xl shadow-xl flex items-center gap-1.5 text-[10px] sm:text-xs font-mono whitespace-nowrap">
                <span className="font-serif font-black text-amber-300">⚔️ R{battleRound}</span>
                <span className="text-slate-600">|</span>
                <span className={`font-bold px-1.5 py-0.5 rounded-full text-[8.5px] sm:text-[9px] border ${isPlayerTurn ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 animate-pulse' : 'bg-red-950/80 text-red-300 border-red-500/40'}`}>
                  {isPlayerTurn ? '🟢 Tu Turno' : '🔴 Enemigo'}
                </span>
              </div>
            )}

            {gameState === GameState.HUNT_MODE && (
              <div className="bg-slate-950/85 border border-amber-500/40 rounded-2xl px-2.5 py-1 backdrop-blur-xl shadow-xl flex items-center gap-1.5 text-[10px] sm:text-xs font-mono text-amber-300 whitespace-nowrap">
                <span>🎯</span>
                <span className="font-bold whitespace-nowrap">
                  {nearestPrey ? `${nearestPrey.name} (~${distToNearest}b)` : 'Sector Despejado'}
                </span>
              </div>
            )}

            {activeQuest && gameState !== GameState.BATTLE_TACTICAL && (
              <div className="bg-slate-950/80 border border-amber-500/20 rounded-xl px-2 py-0.5 text-[8.5px] text-amber-200/90 backdrop-blur-md max-w-[130px] sm:max-w-[160px] truncate shadow-lg">
                📜 {activeQuest.title}
              </div>
            )}
          </div>

          {/* QUICK CONTROL ICONS (Top-Right) */}
          <div className="pointer-events-auto flex items-center gap-1 shrink-0">
            {/* Dice Log Toggle */}
            <button
              onClick={() => { setShowDiceLog(!showDiceLog); sfx.playUiHover(); }}
              className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-2xl bg-slate-950/85 border border-amber-500/40 hover:border-amber-400 active:bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm shadow-xl active:scale-95 transition-all cursor-pointer touch-manipulation"
              title="Historial de Dados y Combate"
            >
              🎲
            </button>

            {/* Touch Gesture Help */}
            <button
              onClick={() => { setShowGestureHelp(!showGestureHelp); sfx.playUiHover(); }}
              className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-2xl bg-slate-950/85 border border-amber-500/40 hover:border-amber-400 active:bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm shadow-xl active:scale-95 transition-all cursor-pointer touch-manipulation"
              title="Ayuda de Gestos Táctiles"
            >
              📱
            </button>

            {/* System Settings & Menu */}
            <button
              onClick={() => { setShowSystemMenu(true); sfx.playUiHover(); }}
              className="w-10 h-10 min-h-[40px] min-w-[40px] rounded-2xl bg-slate-950/85 border border-amber-500/40 hover:border-amber-400 active:bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm shadow-xl active:scale-95 transition-all cursor-pointer touch-manipulation"
              title="Menú Principal"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* 2. NOTIFICATION BANNER LOG (Docked Under Header at Top) */}
        {recentLog && (
          <div className="self-center z-40 pointer-events-auto max-w-xs sm:max-w-md w-[85%] mt-0.5 px-2.5 py-1 bg-slate-950/90 backdrop-blur-xl border border-amber-500/40 rounded-xl shadow-2xl transition-all duration-300">
            <div 
              onClick={() => { setNotificationPinned(!notificationPinned); sfx.playUiHover(); }}
              className="cursor-pointer flex items-center justify-between gap-2 min-h-[28px]"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs">📜</span>
                <p className="text-[10.5px] sm:text-xs text-amber-200 font-medium truncate">
                  {recentLog.message}
                </p>
              </div>
              <span className="text-[8.5px] text-slate-400 font-mono shrink-0">
                {notificationPinned ? '📌' : '⏱️'}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* 3. BOTTOM CONTROLS CONTAINER (Strict Horizontal Layout: D-Pad Left, Radial Right) */}
      <footer className="w-full pointer-events-none flex flex-row items-end justify-between gap-2">
        
        {/* LEFT THUMB CONTROL ZONE: Movement Controller & Context Badges */}
        <div className="pointer-events-auto flex flex-col items-start gap-1.5">
          
          {/* FLOATING CONTEXT ACTION PILLS */}
          {standingOnPortal && (
            <button
              onClick={() => usePortal()}
              className="py-2 px-3.5 bg-purple-900/95 border border-purple-400 text-purple-200 font-serif font-bold text-xs rounded-full shadow-2xl backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] touch-manipulation"
            >
              <span>🌀</span> <span>Viajar a Dimensión Sombría</span>
            </button>
          )}

          {standingOnSettlement && (
            <button
              onClick={() => enterSettlement()}
              className="py-2 px-3.5 bg-amber-900/95 border border-amber-400 text-amber-200 font-serif font-bold text-xs rounded-full shadow-2xl backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] touch-manipulation"
            >
              <span>🏰</span> <span>Entrar al Asentamiento</span>
            </button>
          )}

          {standingOnAncientSite && ancientSiteData && (
            <button
              onClick={() => investigateAncientSite(ancientSiteData.id)}
              disabled={isSiteSearched}
              className={`py-2 px-3.5 border font-serif font-bold text-xs rounded-full shadow-2xl backdrop-blur-md transition-all flex items-center justify-center gap-2 min-h-[44px] touch-manipulation ${isSiteSearched ? 'bg-slate-900/80 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-cyan-950/95 border-cyan-400 text-cyan-200 active:scale-95 cursor-pointer'}`}
            >
              <span>🏺</span> <span>{isSiteSearched ? 'Ya Investigado' : 'Investigar Sitio'}</span>
            </button>
          )}

          {nearbyClue && (
            <button
              onClick={() => investigateClue(nearbyClue.id)}
              className="py-2 px-3.5 bg-emerald-950/95 border border-emerald-400 text-emerald-200 font-serif font-bold text-xs rounded-full shadow-2xl backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse min-h-[44px] touch-manipulation"
            >
              <span>🔎</span> <span>Investigar Pista de Rastreo</span>
            </button>
          )}

          {returnPortal && returnPortal.active && (
            <button
              onClick={() => exitHuntMode()}
              className="py-2 px-3.5 bg-gradient-to-r from-fuchsia-800 to-purple-800 text-white font-serif font-bold text-xs rounded-full shadow-2xl border border-fuchsia-300/40 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px] touch-manipulation"
            >
              <span>🌀</span> <span>Cruzar Portal de Regreso</span>
            </button>
          )}

          {/* D-PAD / TOUCH CONTROLLER FOR EXPLORATION & HUNT */}
          {(gameState === GameState.OVERWORLD || gameState === GameState.TOWN_EXPLORATION) && (
            <MobileDPad onMove={movePlayerOverworld} playerPos={playerPos} />
          )}

          {gameState === GameState.HUNT_MODE && (
            <div className="relative w-36 h-36 flex items-center justify-center select-none bg-slate-950/40 backdrop-blur-md rounded-3xl border border-amber-500/20 p-1">
              <div className="absolute w-8 h-8 rounded-full bg-slate-950/60 backdrop-blur-md border border-amber-500/30 flex items-center justify-center pointer-events-none shadow-inner">
                <span className="text-[10px] text-amber-400 font-mono font-bold">3D</span>
              </div>
              <button
                onClick={() => moveHuntPlayer(huntPlayerPos.x, huntPlayerPos.y, huntPlayerPos.z - 1)}
                className="absolute top-1 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/85 hover:bg-slate-900 active:bg-amber-500/50 border border-amber-500/40 backdrop-blur-xl text-amber-300 font-black flex items-center justify-center text-sm shadow-xl active:scale-90 transition-all cursor-pointer touch-manipulation"
                title="Avanzar (Norte)"
              >
                ▲
              </button>
              <button
                onClick={() => moveHuntPlayer(huntPlayerPos.x, huntPlayerPos.y, huntPlayerPos.z + 1)}
                className="absolute bottom-1 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/85 hover:bg-slate-900 active:bg-amber-500/50 border border-amber-500/40 backdrop-blur-xl text-amber-300 font-black flex items-center justify-center text-sm shadow-xl active:scale-90 transition-all cursor-pointer touch-manipulation"
                title="Retroceder (Sur)"
              >
                ▼
              </button>
              <button
                onClick={() => moveHuntPlayer(huntPlayerPos.x - 1, huntPlayerPos.y, huntPlayerPos.z)}
                className="absolute left-1 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/85 hover:bg-slate-900 active:bg-amber-500/50 border border-amber-500/40 backdrop-blur-xl text-amber-300 font-black flex items-center justify-center text-sm shadow-xl active:scale-90 transition-all cursor-pointer touch-manipulation"
                title="Izquierda (Oeste)"
              >
                ◄
              </button>
              <button
                onClick={() => moveHuntPlayer(huntPlayerPos.x + 1, huntPlayerPos.y, huntPlayerPos.z)}
                className="absolute right-1 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/85 hover:bg-slate-900 active:bg-amber-500/50 border border-amber-500/40 backdrop-blur-xl text-amber-300 font-black flex items-center justify-center text-sm shadow-xl active:scale-90 transition-all cursor-pointer touch-manipulation"
                title="Derecha (Este)"
              >
                ►
              </button>
            </div>
          )}

          {/* BATTLE TARGET CYCLER & PREDICTION CARD */}
          {gameState === GameState.BATTLE_TACTICAL && validTargetsInBattle.length > 0 && (
            <div className="flex flex-col items-start gap-1.5 max-w-[220px]">
              {/* Target Prediction Card */}
              {activeBattleTarget && (
                <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-2.5 backdrop-blur-xl shadow-2xl flex flex-col gap-1 w-full text-[10px] font-mono">
                  <div className="flex justify-between items-center text-amber-300 font-bold">
                    <span>🎯 {activeBattleTarget.name}</span>
                    <span>{activeBattleTarget.stats.hp}/{activeBattleTarget.stats.maxHp} HP</span>
                  </div>
                  {attackPrediction && (
                    <div className="flex justify-between text-slate-300 border-t border-amber-500/20 pt-1">
                      <span>Prob: <b className="text-emerald-400">{attackPrediction.hitChance}%</b></span>
                      <span>Daño: <b className="text-red-400">{attackPrediction.minDamage}-{attackPrediction.maxDamage}</b></span>
                    </div>
                  )}
                </div>
              )}

              {/* Target Cycler Thumb Controls */}
              <div className="flex items-center gap-1.5 bg-slate-950/90 border border-amber-500/40 p-1 rounded-2xl backdrop-blur-xl shadow-2xl">
                <button
                  onClick={() => { sfx.playUiHover(); setSelectedTargetIndex(prev => prev - 1); }}
                  className="px-3 py-2 bg-slate-900 border border-white/20 rounded-xl text-amber-300 font-bold text-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer touch-manipulation"
                >
                  ◄
                </button>
                <button
                  onClick={() => {
                    if (activeBattleTarget) {
                      sfx.playUiClick();
                      handleTileInteraction(activeBattleTarget.position.x, activeBattleTarget.position.y);
                    }
                  }}
                  className="px-4 py-2 bg-red-950 border border-red-500 text-red-200 font-serif font-black text-xs rounded-xl min-h-[44px] flex items-center justify-center gap-1 shadow-md active:scale-95 cursor-pointer touch-manipulation"
                >
                  <span>⚔️</span> Atacar
                </button>
                <button
                  onClick={() => { sfx.playUiHover(); setSelectedTargetIndex(prev => prev + 1); }}
                  className="px-3 py-2 bg-slate-900 border border-white/20 rounded-xl text-amber-300 font-bold text-xs min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer touch-manipulation"
                >
                  ►
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CENTER CONTEXT PILL (Hunt Monster Part Selection / Flank Status) */}
        {gameState === GameState.HUNT_MODE && nearestPrey && !nearestPrey.isDefeated && (
          <div className="pointer-events-auto mb-1 flex flex-col items-center gap-1.5 max-w-[200px] sm:max-w-xs self-center md:self-end">
            {currentFlankStatus && (
              <div className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border flex items-center justify-center gap-1 shadow-lg ${currentFlankStatus.color}`}>
                <span>{currentFlankStatus.label}</span>
              </div>
            )}
            {nearestPrey.parts && nearestPrey.parts.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center bg-slate-950/85 border border-slate-700/80 p-1.5 rounded-2xl backdrop-blur-md">
                {nearestPrey.parts.map(part => (
                  <button
                    key={part.id}
                    onClick={() => {
                      sfx.playUiClick();
                      setSelectedPartId(selectedPartId === part.id ? undefined : part.id);
                    }}
                    disabled={part.isBroken}
                    className={`px-2 py-1 rounded-xl text-[9px] font-mono font-bold transition-all min-h-[32px] ${
                      part.isBroken
                        ? 'bg-red-950/40 text-red-500 line-through border border-red-900/30'
                        : selectedPartId === part.id
                        ? 'bg-amber-500 text-slate-950 border border-amber-300 font-black shadow-md'
                        : 'bg-slate-900 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {part.name} {part.isBroken ? '💔' : `(${part.hp}HP)`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RIGHT THUMB ZONE: Retractable Thumb Radial Dial */}
        <div className="pointer-events-auto relative flex flex-col items-end gap-1.5">
          
          {/* TRAPS SELECTION SUBPANEL (Hunt Mode) */}
          {showTrapsPanel && gameState === GameState.HUNT_MODE && (
            <div className="mb-2 bg-slate-950/95 border border-amber-500/40 p-2.5 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col gap-1.5 text-xs text-slate-200 w-48 animate-in fade-in slide-in-from-right duration-200">
              <div className="font-serif font-bold text-amber-300 text-xs border-b border-amber-500/20 pb-1 flex justify-between items-center">
                <span>⚙️ Trampas Tácticas</span>
                <button onClick={() => setShowTrapsPanel(false)} className="text-slate-400 hover:text-white p-1">✕</button>
              </div>
              <button
                onClick={() => { placeTrap('FREEZE'); setShowTrapsPanel(false); }}
                className="px-2.5 py-2 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-xs font-bold text-cyan-200 hover:bg-cyan-900 flex items-center gap-1.5 min-h-[44px] cursor-pointer touch-manipulation"
              >
                <span>❄️</span> Trampa Congelante
              </button>
              <button
                onClick={() => { placeTrap('STUN'); setShowTrapsPanel(false); }}
                className="px-2.5 py-2 bg-purple-950/80 border border-purple-500/40 rounded-xl text-xs font-bold text-purple-200 hover:bg-purple-900 flex items-center gap-1.5 min-h-[44px] cursor-pointer touch-manipulation"
              >
                <span>⚡</span> Trampa Aturdidora
              </button>
              <button
                onClick={() => { placeTrap('EXPLOSIVE'); setShowTrapsPanel(false); }}
                className="px-2.5 py-2 bg-red-950/80 border border-red-500/40 rounded-xl text-xs font-bold text-red-200 hover:bg-red-900 flex items-center gap-1.5 min-h-[44px] cursor-pointer touch-manipulation"
              >
                <span>💥</span> Trampa Explosiva
              </button>
            </div>
          )}

          {/* RADIAL DIAL MENU POPUP (Ergonomic Translucent Floating Glass Nodes) */}
          <AnimatePresence>
            {isRadialOpen && (
              <div className="absolute bottom-0 right-0 pointer-events-none z-40">
                {/* Floating Radial Category Pill */}
                <div className="absolute -top-12 right-0 bg-slate-950/85 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-[8.5px] font-serif font-bold text-amber-300 shadow-xl backdrop-blur-md pointer-events-none whitespace-nowrap">
                  {gameState === GameState.OVERWORLD ? '🗺️ Exploración' : gameState === GameState.BATTLE_TACTICAL ? '⚔️ Acciones' : '⛏️ Cacería'}
                </div>

                {/* Floating Radial Node Buttons in Thumb Arc */}
                {radialActions.map((act, idx) => {
                  const total = radialActions.length;
                  const angleDeg = total > 1 ? 180 + (idx / (total - 1)) * 90 : 225;
                  const rad = (angleDeg * Math.PI) / 180;
                  const r = 96;
                  const rightPx = -Math.cos(rad) * r;
                  const bottomPx = -Math.sin(rad) * r;

                  const sType = (act as any).spritesheetType as SpritesheetButtonType | undefined;

                  return (
                    <motion.div
                      key={act.id}
                      initial={{ opacity: 0, scale: 0, x: 20, y: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                      exit={{ opacity: 0, scale: 0, x: 20, y: 20 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 22, delay: idx * 0.02 }}
                      style={{
                        position: 'absolute',
                        right: `${rightPx}px`,
                        bottom: `${bottomPx}px`
                      }}
                      className="pointer-events-auto z-40"
                    >
                      {sType ? (
                        <div className="relative group flex flex-col items-center">
                          <SpritesheetButton
                            id={act.id}
                            type={sType}
                            title={act.label}
                            disabled={(act as any).disabled}
                            badge={act.badge}
                            onClick={() => {
                              sfx.playUiClick();
                              act.onClick();
                            }}
                            size={48}
                          />
                          <span className="absolute -bottom-4 text-[7px] font-bold font-serif text-amber-300 bg-slate-950/80 px-1 py-0.2 rounded border border-amber-500/20 shadow truncate max-w-[54px] leading-tight select-none pointer-events-none whitespace-nowrap">
                            {act.label}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            sfx.playUiClick();
                            act.onClick();
                          }}
                          disabled={(act as any).disabled}
                          className={`w-12 h-12 min-h-[44px] min-w-[44px] rounded-full border-2 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all cursor-pointer touch-manipulation border-amber-500/50 hover:border-amber-300 hover:scale-110 ${
                            (act as any).disabled ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                          title={act.label}
                        >
                          <span className="text-base leading-none">{act.icon}</span>
                          <span className="text-[7px] font-bold font-serif text-amber-300 truncate max-w-[38px] leading-tight mt-0.5">
                            {act.label.split(' ')[0]}
                          </span>
                          {act.badge && (
                            <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[7px] font-mono font-black px-1 rounded-full border border-black shadow">
                              {act.badge}
                            </span>
                          )}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>

          {/* MAIN RADIAL DIAL TRIGGER BUTTON (For Overworld and Hunt Mode) */}
          {gameState !== GameState.BATTLE_TACTICAL && (
            <button
              onClick={() => {
                sfx.playUiClick();
                setIsRadialOpen(!isRadialOpen);
                setActiveRadialSubMenu('main');
              }}
              className={`w-14 h-14 min-h-[44px] min-w-[44px] rounded-full border-2 flex items-center justify-center text-xl shadow-2xl transition-all active:scale-90 cursor-pointer touch-manipulation ${
                isRadialOpen
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.8)] rotate-45'
                  : 'bg-slate-950/90 text-amber-300 border-amber-500/50 hover:border-amber-400 shadow-amber-500/20'
              }`}
              title="Menú Radial"
            >
              🎯
            </button>
          )}
        </div>
      </footer>

      {/* 4. INTEGRATED SYSTEM MODALS */}

      {/* SYSTEM MENU MODAL */}
      {showSystemMenu && (
        <div className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-3.5 bg-slate-950 border-b border-amber-500/30 flex items-center justify-between">
              <h3 className="font-serif font-bold text-amber-400 text-sm flex items-center gap-2">
                <span>⚙️</span> Menú de Arcadia Tactics
              </h3>
              <button 
                onClick={() => setShowSystemMenu(false)}
                className="text-slate-400 hover:text-white text-lg font-bold w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 min-h-[44px] min-w-[44px]"
              >
                ✕
              </button>
            </div>

            <div className="p-3 flex flex-col gap-1.5 text-slate-200">
              <div className="px-2 py-0.5 text-[9px] uppercase font-black tracking-widest text-amber-400/70 font-serif">
                Exploración y Modos
              </div>
              <button 
                onClick={() => { startHuntMode(); setShowSystemMenu(false); }} 
                className="px-3 py-2.5 text-left text-xs font-bold bg-amber-500/10 text-amber-200 border border-amber-500/30 hover:bg-amber-500/20 rounded-xl transition-all flex items-center gap-2 min-h-[44px] cursor-pointer"
              >
                <span>⛏️</span> <span>Modo Cacería (3D Voxel)</span>
              </button>

              <div className="px-2 py-0.5 text-[9px] uppercase font-black tracking-widest text-amber-400/70 font-serif border-t border-white/10 pt-2">
                Ajustes del Sistema
              </div>
              
              {toggleFogOfWar && (
                <button 
                  onClick={() => { toggleFogOfWar(); setShowSystemMenu(false); }} 
                  className="px-3 py-2.5 text-left text-xs font-bold hover:bg-amber-500/10 hover:text-amber-300 rounded-xl border border-white/10 transition-all flex items-center justify-between min-h-[44px] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span>{fogOfWarEnabled ? '🌫️' : '👁️'}</span> <span>Niebla de Guerra</span>
                  </div>
                  <span className={`text-[9.5px] px-2 py-0.5 rounded-md font-mono font-bold ${fogOfWarEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                    {fogOfWarEnabled ? 'ACTIVADA' : 'DESACTIVADA'}
                  </span>
                </button>
              )}

              <button 
                onClick={() => { saveGame(); setShowSystemMenu(false); }} 
                className="px-3 py-2.5 text-left text-xs font-bold hover:bg-white/10 rounded-xl border border-white/10 transition-all min-h-[44px] cursor-pointer flex items-center gap-2"
              >
                💾 <span>Guardar Partida</span>
              </button>
              <button 
                onClick={() => { loadGame(); setShowSystemMenu(false); }} 
                className="px-3 py-2.5 text-left text-xs font-bold hover:bg-white/10 rounded-xl border border-white/10 transition-all min-h-[44px] cursor-pointer flex items-center gap-2"
              >
                📂 <span>Cargar Partida</span>
              </button>
              <button 
                onClick={() => { quitToMenu(); setShowSystemMenu(false); }} 
                className="px-3 py-2.5 text-left text-xs font-bold text-red-400 hover:bg-red-500/10 rounded-xl border border-red-500/30 transition-all min-h-[44px] cursor-pointer flex items-center gap-2"
              >
                🚪 <span>Volver al Menú Principal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOUCH GESTURE HELP MODAL */}
      <AnimatePresence>
        {showGestureHelp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-sm w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-2xl text-slate-200 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5 font-serif font-bold text-amber-300">
                <span className="flex items-center gap-1">📱 Mandos Táctiles y Gestos</span>
                <button onClick={() => setShowGestureHelp(false)} className="text-slate-400 hover:text-white text-sm font-bold w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center min-h-[44px] min-w-[44px]">✕</button>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-1.5">
                  <span>👆</span> <b>Tocar Casilla:</b> Mueve o interactúa directamente con el escenario.
                </li>
                <li className="flex items-center gap-1.5">
                  <span>👈👉</span> <b>Deslizar Dedo:</b> Rotación y panning táctico de cámara.
                </li>
                <li className="flex items-center gap-1.5">
                  <span>🕹️</span> <b>Cruceta (Izquierda):</b> Desplazamiento paso a paso por casillas.
                </li>
                <li className="flex items-center gap-1.5">
                  <span>🎯</span> <b>Dial Radial (Derecha):</b> Menú de acciones tácticas adaptativo.
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DICE LOG DRAWER */}
      {showDiceLog && (
        <CombatDiceLogDrawer logs={logs} onClose={() => setShowDiceLog(false)} themeConfig={themeConfig} />
      )}

      {/* 3D DICE ROLL OVERLAY */}
      {activeDiceRoll && (
        <DiceRoll3DOverlay rollData={activeDiceRoll} onClose={() => clearDiceRoll()} />
      )}

      {/* INVENTORY MODAL */}
      {isInventoryOpen && <InventoryScreen />}

      {/* WORLD MAP MODAL */}
      {isMapOpen && <WorldMapScreen />}

      {/* REST MODAL */}
      {showRestModal && <RestModal onClose={() => setShowRestModal(false)} />}

      {/* FLOATING CONFIRM MOVEMENT BUTTON */}
      <AnimatePresence>
        {gameState === GameState.BATTLE_TACTICAL && selectedAction === BattleAction.MOVE && selectedTile && (
          <div className="pointer-events-auto fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1">
            <motion.button
              initial={{ scale: 0, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 15 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                sfx.playUiClick();
                confirmMovement();
              }}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-serif font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(16,185,129,0.5)] border-2 border-emerald-300 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all min-h-[44px] min-w-[150px] touch-manipulation font-bold"
            >
              <span>🏃</span> Aceptar Movimiento <span>({selectedTile.x}, {selectedTile.z})</span>
            </motion.button>
            <div className="text-[8px] sm:text-[9px] font-mono text-emerald-300 bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/20 shadow animate-pulse">
              Toca para confirmar el desplazamiento
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
