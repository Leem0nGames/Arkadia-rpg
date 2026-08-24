import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/gameStore';
import { MobileDPad } from '../ui/MobileDPad';
import { sfx } from '../../services/SoundSystem';
import { RestModal } from '../RestModal';
import { InventoryScreen } from '../InventoryScreen';
import { WorldMapScreen } from '../WorldMapScreen';
import { Dimension, WeatherType, TerrainType } from '../../types';
import { getAncientSiteAt } from '../../data/ancientSites';
import { WorldGenerator } from '../../services/WorldGenerator';

interface OverworldHUDProps {
  onOpenSystemMenu: () => void;
}

export const OverworldHUD: React.FC<OverworldHUDProps> = ({ onOpenSystemMenu }) => {
  const {
    playerPos, party, dimension, movePlayerOverworld,
    travelHours = 8, travelMinutes = 0, travelDays = 1, travelFatigue = 0,
    inventory = [], consumeItem,
    isInventoryOpen, isMapOpen, toggleInventory, toggleMap,
    standingOnPortal, standingOnSettlement, usePortal, enterSettlement,
    searchedSites, investigateAncientSite, quests, startDragonDungeonBattle
  } = useGameStore();

  const [isRadialOpen, setIsRadialOpen] = useState(false);
  const [showRestModal, setShowRestModal] = useState(false);
  const [showGestureHelp, setShowGestureHelp] = useState(false);
  const [activeSubDial, setActiveSubDial] = useState<'main' | 'quests'>('main');

  const player = party[0];
  const hpPercent = player ? Math.round((player.stats.hp / player.stats.maxHp) * 100) : 100;
  
  const rationSlot = inventory.find(s => s.item.id === 'ration' || s.item.effect?.type === 'reduce_fatigue');
  const rationCount = rationSlot ? rationSlot.quantity : 0;
  const goldSlot = inventory.find(s => s.item.id === 'gold' || s.item.name?.toLowerCase().includes('oro'));
  const gold = goldSlot ? goldSlot.quantity : 250;

  // Current Cell POI Data
  const isTown = false;
  const currentPlayerCell = React.useMemo(() => {
    return WorldGenerator.getTile(playerPos.x, playerPos.y, dimension);
  }, [playerPos, dimension]);

  const standingOnDragonLair = currentPlayerCell?.poiType === 'DRAGON_LAIR';
  const ancientSiteData = React.useMemo(() => {
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
  }, [playerPos.x, playerPos.y, currentPlayerCell]);

  const standingOnAncientSite = !!ancientSiteData;
  const isSiteSearched = ancientSiteData ? (searchedSites || []).includes(ancientSiteData.id) : false;

  const activeQuest = quests?.find(q => !q.completed);

  // Radial Dial Items definition
  const radialItems = [
    {
      id: 'ow_inventory',
      label: 'Inventario',
      icon: '🎒',
      badge: `${inventory.length}`,
      color: 'border-amber-400 bg-amber-950/80 text-amber-200 shadow-amber-500/30',
      onClick: () => {
        sfx.playUiClick();
        toggleInventory();
        setIsRadialOpen(false);
      }
    },
    {
      id: 'ow_map',
      label: 'Mapamundi',
      icon: '🗺️',
      color: 'border-sky-400 bg-sky-950/80 text-sky-200 shadow-sky-500/30',
      onClick: () => {
        sfx.playUiClick();
        toggleMap();
        setIsRadialOpen(false);
      }
    },
    {
      id: 'ow_rest',
      label: 'Campamento',
      icon: '⛺',
      badge: `${rationCount}`,
      color: 'border-emerald-400 bg-emerald-950/80 text-emerald-200 shadow-emerald-500/30',
      onClick: () => {
        sfx.playUiClick();
        setShowRestModal(true);
        setIsRadialOpen(false);
      }
    },
    {
      id: 'ow_investigate',
      label: 'Investigar',
      icon: '🔍',
      color: 'border-cyan-400 bg-cyan-950/80 text-cyan-200 shadow-cyan-500/30',
      onClick: () => {
        sfx.playUiClick();
        if (ancientSiteData && !isSiteSearched) {
          investigateAncientSite(ancientSiteData.id);
        } else if (standingOnSettlement) {
          enterSettlement();
        } else if (standingOnPortal) {
          usePortal();
        } else {
          useGameStore.getState().addLog(`🔍 Inspeccionando terreno en (${playerPos.x}, ${playerPos.y}): ${currentPlayerCell?.kingdomName || 'Tierra Salvaje'}.`, 'info');
        }
        setIsRadialOpen(false);
      }
    },
    {
      id: 'ow_system',
      label: 'Ajustes',
      icon: '⚙️',
      color: 'border-purple-400 bg-purple-950/80 text-purple-200 shadow-purple-500/30',
      onClick: () => {
        sfx.playUiClick();
        onOpenSystemMenu();
        setIsRadialOpen(false);
      }
    }
  ];

  // Radial geometry calculation (Arc on bottom-right)
  const radius = 105;
  const parentSize = 144;
  const startAngle = 180; // 9 o'clock
  const endAngle = 270;   // 12 o'clock
  const totalCount = radialItems.length;

  return (
    <div id="overworld-hud-root" className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-2.5 sm:p-4">
      
      {/* 1. TOP FLOATING HERO & OVERWORLD STATUS HEADER */}
      <div className="flex items-start justify-between gap-2 w-full">
        {/* Hero Character Capsule */}
        <div className="pointer-events-auto bg-slate-950/80 border border-amber-500/35 rounded-2xl p-2 px-3 backdrop-blur-xl shadow-2xl flex items-center gap-2.5 max-w-xs sm:max-w-sm">
          {/* Avatar Portrait */}
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600/30 to-slate-900 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-xl">🛡️</span>
            <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-black font-mono px-1 rounded-full border border-black">
              Nv{player?.stats.level || 1}
            </span>
          </div>

          <div className="flex flex-col gap-1 w-full min-w-0">
            <div className="flex justify-between items-center gap-1 leading-none">
              <span className="font-serif font-bold text-xs text-amber-300 truncate">
                {player?.name || 'Héroe de Arcadia'}
              </span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded-full shrink-0">
                💰 {gold}
              </span>
            </div>

            {/* HP Bar */}
            <div className="relative w-full h-2.5 bg-slate-900/90 rounded-full border border-red-500/30 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[7.5px] font-mono font-bold text-white drop-shadow">
                {player?.stats.hp}/{player?.stats.maxHp} HP
              </span>
            </div>

            {/* Fatigue Gauge & Resources */}
            <div className="flex items-center justify-between text-[8.5px] font-mono">
              <div className="flex items-center gap-1 text-slate-300">
                <span>⚡ Fatiga:</span>
                <span className={`font-bold ${travelFatigue > 50 ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
                  {travelFatigue}/100
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-200">
                <span>🍞 Raciones: <b>{rationCount}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Right Quick Status Badges */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Dimension Indicator Capsule */}
          <div className={`px-2 py-1 rounded-xl border backdrop-blur-md shadow-lg flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider font-mono ${dimension === Dimension.UPSIDE_DOWN ? 'bg-purple-950/85 border-purple-400 text-purple-200 animate-pulse' : 'bg-slate-950/80 border-amber-500/30 text-amber-300'}`}>
            <span>{dimension === Dimension.UPSIDE_DOWN ? '🌀' : '🌍'}</span>
            <span className="hidden sm:inline">{dimension === Dimension.UPSIDE_DOWN ? 'Sombrío' : 'Material'}</span>
          </div>

          {/* Active Quest Capsule */}
          {activeQuest && (
            <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl px-2 py-1 text-[9px] text-amber-200 backdrop-blur-md max-w-[130px] truncate shadow-lg">
              📜 {activeQuest.title}
            </div>
          )}

          {/* Quick Gesture Guide Toggle Button */}
          <button
            onClick={() => { setShowGestureHelp(!showGestureHelp); sfx.playUiHover(); }}
            className="w-8 h-8 rounded-xl bg-slate-950/80 border border-amber-500/40 hover:border-amber-400 text-amber-300 flex items-center justify-center text-xs shadow-xl active:scale-95 transition-all min-h-[44px] min-w-[44px]"
            title="Ayuda de Gestos Táctiles"
          >
            📱
          </button>
        </div>
      </div>

      {/* Touch Gesture Help Banner Modal */}
      <AnimatePresence>
        {showGestureHelp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="pointer-events-auto fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div className="max-w-sm w-full bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-2xl text-slate-200 text-xs flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-1.5 font-serif font-bold text-amber-300">
                <span className="flex items-center gap-1">📱 Mandos Táctiles y Gestos</span>
                <button onClick={() => setShowGestureHelp(false)} className="text-slate-400 hover:text-white text-sm font-bold w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center min-h-[44px] min-w-[44px]">✕</button>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-1.5">
                  <span>👆</span> <b>Tocar Casilla:</b> Camina directamente a ese destino.
                </li>
                <li className="flex items-center gap-1.5">
                  <span>👈👉</span> <b>Deslizar Dedo:</b> Desplaza la cámara sobre el mapa.
                </li>
                <li className="flex items-center gap-1.5">
                  <span>🕹️</span> <b>Cruceta (Izquierda):</b> Desplazamiento axial por casillas hex.
                </li>
                <li className="flex items-center gap-1.5">
                  <span>🎯</span> <b>Dial Radial (Derecha):</b> Menú rápido para pulgar (Inventario, Mapa, Reposo).
                </li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. BOTTOM THUMB CONTROL ZONES (DPAD & CONTEXTUAL CHIPS ON LEFT & RADIAL DIAL ON RIGHT) */}
      <div className="flex items-end justify-between w-full pointer-events-none">
        
        {/* LEFT THUMB ZONE: Hex D-Pad Controller + Contextual Action Chips */}
        <div className="pointer-events-auto flex flex-col gap-1.5 max-w-[200px]">
          
          {/* CONTEXTUAL ACTION BADGES (Shifted to Left Thumb Zone above D-Pad) */}
          {standingOnPortal && (
            <button
              onClick={() => usePortal()}
              className="w-full min-h-[44px] py-2 px-3 bg-purple-900/90 border border-purple-400 text-purple-200 font-serif font-bold text-xs rounded-xl shadow-xl backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🌀</span> <span>Viajar a Dimensión Sombría</span>
            </button>
          )}

          {standingOnSettlement && (
            <button
              onClick={() => enterSettlement()}
              className="w-full min-h-[44px] py-2 px-3 bg-amber-900/90 border border-amber-400 text-amber-200 font-serif font-bold text-xs rounded-xl shadow-xl backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🏰</span> <span>Entrar al Asentamiento</span>
            </button>
          )}

          {standingOnAncientSite && ancientSiteData && (
            <button
              onClick={() => investigateAncientSite(ancientSiteData.id)}
              disabled={isSiteSearched}
              className={`w-full min-h-[44px] py-2 px-3 border font-serif font-bold text-xs rounded-xl shadow-xl backdrop-blur-md transition-all flex items-center justify-center gap-1.5 ${isSiteSearched ? 'bg-slate-900/80 border-slate-700 text-slate-500 cursor-not-allowed' : 'bg-cyan-950/90 border-cyan-400 text-cyan-200 active:scale-95 cursor-pointer'}`}
            >
              <span>🏺</span> <span>{isSiteSearched ? 'Ya Investigado' : 'Investigar Sitio'}</span>
            </button>
          )}

          {standingOnDragonLair && (
            <button
              onClick={() => startDragonDungeonBattle()}
              className="w-full min-h-[44px] py-2 px-3 bg-red-950/95 border border-red-500 text-red-200 font-serif font-bold text-xs rounded-xl shadow-xl backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🐉</span> <span>Desafiar al Dragón</span>
            </button>
          )}

          <MobileDPad onMove={movePlayerOverworld} playerPos={playerPos} />
        </div>

        {/* RIGHT THUMB ZONE: Retractable Overworld Radial Dial */}
        <div className="pointer-events-auto relative flex flex-col items-end">
          <div style={{ width: parentSize, height: parentSize }} className="relative flex items-end justify-end mr-1 mb-1">
            
            {/* Rays connecting center hub to floating radial node buttons */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
              <AnimatePresence>
                {isRadialOpen && radialItems.map((item, index) => {
                  const angleStep = totalCount > 1 ? (endAngle - startAngle) / (totalCount - 1) : 0;
                  const itemAngle = startAngle + index * angleStep;
                  const rad = (itemAngle * Math.PI) / 180;
                  const x = Math.cos(rad) * radius + parentSize - 26;
                  const y = Math.sin(rad) * radius + parentSize - 26;

                  return (
                    <motion.line
                      key={item.id}
                      initial={{ x2: parentSize - 26, y2: parentSize - 26, opacity: 0 }}
                      animate={{ x2: x, y2: y, opacity: 0.35 }}
                      exit={{ x2: parentSize - 26, y2: parentSize - 26, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                      x1={parentSize - 26}
                      y1={parentSize - 26}
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                    />
                  );
                })}
              </AnimatePresence>
            </svg>

            {/* Radial Nodes */}
            <AnimatePresence mode="popLayout">
              {isRadialOpen && radialItems.map((item, index) => {
                const angleStep = totalCount > 1 ? (endAngle - startAngle) / (totalCount - 1) : 0;
                const itemAngle = startAngle + index * angleStep;
                const rad = (itemAngle * Math.PI) / 180;
                const x = Math.cos(rad) * radius;
                const y = Math.sin(rad) * radius;

                return (
                  <motion.button
                    key={item.id}
                    onClick={item.onClick}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    animate={{ x, y, scale: 1, opacity: 1 }}
                    exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22, delay: index * 0.02 }}
                    style={{
                      position: 'absolute',
                      right: 26 - 24,
                      bottom: 26 - 24
                    }}
                    className={`w-12 h-12 rounded-full border-2 backdrop-blur-xl flex flex-col items-center justify-center shadow-xl active:scale-90 transition-all cursor-pointer min-h-[48px] min-w-[48px] ${item.color}`}
                    title={item.label}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    <span className="text-[7.5px] font-extrabold uppercase mt-0.5 truncate max-w-[40px] text-center">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[8px] font-black px-1 rounded-full border border-black font-mono">
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {/* Central Thumb Trigger Hub */}
            <button
              onClick={() => {
                sfx.playUiClick();
                setIsRadialOpen(!isRadialOpen);
              }}
              className={`absolute right-0 bottom-0 w-14 h-14 rounded-full border-2 border-amber-400/90 bg-slate-950/85 backdrop-blur-2xl flex flex-col items-center justify-center shadow-2xl z-30 transition-all active:scale-90 cursor-pointer min-h-[56px] min-w-[56px] ${isRadialOpen ? 'ring-2 ring-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.6)]' : 'shadow-black/90'}`}
              title="Dial Radial de Exploración"
            >
              {isRadialOpen ? (
                <div className="flex flex-col items-center justify-center leading-none">
                  <span className="text-sm font-black text-amber-400">✕</span>
                  <span className="text-[6.5px] text-amber-400/80 uppercase tracking-widest font-black mt-0.5">Cerrar</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center leading-none">
                  <span className="text-xl select-none leading-none animate-pulse">🧭</span>
                  <span className="text-[7px] text-amber-400 font-black uppercase tracking-wider scale-90 mt-0.5">Menú</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modals triggered from Overworld HUD */}
      {showRestModal && (
        <RestModal onClose={() => setShowRestModal(false)} />
      )}

      {isInventoryOpen && (
        <InventoryScreen />
      )}

      {isMapOpen && (
        <WorldMapScreen />
      )}
    </div>
  );
};
