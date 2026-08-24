import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/gameStore';
import { CharacterClass } from '../../types';
import { sfx } from '../../services/SoundSystem';

export const HuntHUD: React.FC = () => {
  const {
    currentSchematic,
    huntSession,
    exitHuntMode,
    addLog,
    party,
    moveHuntPlayer,
    attackPreyInHunt,
    destroyCoverAtPos,
    investigateClue,
    placeTrap,
    toggleStealth,
    useHuntAbility,
    harvestPrey,
    completeHuntSession,
    claimHuntRewards,
    startHuntMode
  } = useGameStore();

  const [isRadarExpanded, setIsRadarExpanded] = useState(true);
  const [isRadialOpen, setIsRadialOpen] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | undefined>(undefined);
  const [showTrapsPanel, setShowTrapsPanel] = useState(false);

  const player = party[0];
  const playerClass = player?.stats?.class;

  const isRanger = [CharacterClass.RANGER, CharacterClass.ROGUE].includes(playerClass);
  const isMage = [CharacterClass.WIZARD, CharacterClass.SORCERER, CharacterClass.WARLOCK, CharacterClass.CLERIC, CharacterClass.DRUID, CharacterClass.BARD].includes(playerClass);

  if (!currentSchematic || !huntSession) return null;

  const {
    playerPos,
    preys,
    preysDefeatedCount,
    totalPreysCount,
    returnPortal,
    clues = [],
    trapsPlaced = [],
    stealthActive = false,
    insightLevel = 10,
    harvestedMaterials = []
  } = huntSession;

  // Active Preys & Nearest Prey
  const activePreys = preys.filter(p => !p.isDefeated);
  const nearestPrey = activePreys.sort((a, b) => {
    const distA = Math.hypot(a.x - playerPos.x, a.z - playerPos.z);
    const distB = Math.hypot(b.x - playerPos.x, b.z - playerPos.z);
    return distA - distB;
  })[0];

  const distToNearest = nearestPrey
    ? Math.round(Math.hypot(nearestPrey.x - playerPos.x, nearestPrey.z - playerPos.z))
    : 0;

  // Live Flanking & Backstab Angle Status relative to nearest prey
  const currentFlankStatus = useMemo(() => {
    if (!nearestPrey || nearestPrey.isDefeated) return null;
    const preyFacing = nearestPrey.facingAngle ?? Math.atan2(11 - nearestPrey.z, 11 - nearestPrey.x);
    const angleToPlayer = Math.atan2(playerPos.z - nearestPrey.z, playerPos.x - nearestPrey.x);
    let diff = Math.abs(preyFacing - angleToPlayer);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    const deg = diff * (180 / Math.PI);

    if (deg >= 120) return { type: 'BACKSTAB', label: '🗡️ ESPALDA DEBIL (+100% CRÍTICO)', color: 'bg-red-950 border-red-400 text-red-200 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]' };
    if (deg >= 60) return { type: 'FLANK', label: '⚔️ FLANQUEO TÁCTICO (+40% DAÑO)', color: 'bg-amber-950 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.5)]' };
    return { type: 'FRONT', label: '🛡️ GUARDIÁN FRONTAL (DEFENSA ALTA)', color: 'bg-slate-900 border-slate-700 text-slate-300' };
  }, [nearestPrey, playerPos]);

  // Nearby Clue Check
  const nearbyClue = clues.find(c => !c.isInvestigated && Math.hypot(c.x - playerPos.x, c.z - playerPos.z) <= 3);

  // Proximity Alert System Calculations
  const ALERT_RADIUS_MAX = 10;
  const isCreatureInRadius = Boolean(nearestPrey && !nearestPrey.isDefeated && distToNearest <= ALERT_RADIUS_MAX);

  type AlertSeverity = 'EXTREME' | 'HIGH' | 'MODERATE' | 'NONE';
  let alertSeverity: AlertSeverity = 'NONE';
  if (isCreatureInRadius) {
    if (distToNearest <= 3) alertSeverity = 'EXTREME';
    else if (distToNearest <= 6) alertSeverity = 'HIGH';
    else alertSeverity = 'MODERATE';
  }

  const alertConfig = alertSeverity !== 'NONE' ? {
    EXTREME: {
      borderColor: 'border-red-600/90',
      shadow: 'inset 0 0 60px rgba(220, 38, 38, 0.75), 0 0 35px rgba(239, 68, 68, 0.6)',
      pulseDuration: 0.6,
      bgColor: 'bg-red-950/90 border-red-500/80 text-red-100 shadow-red-600/50',
      badge: '⚠️ ASALTO INMINENTE',
      icon: '🚨',
      subtext: `¡${nearestPrey?.name} a solo ${distToNearest} blq!`
    },
    HIGH: {
      borderColor: 'border-orange-500/80',
      shadow: 'inset 0 0 45px rgba(249, 115, 22, 0.55), 0 0 25px rgba(249, 115, 22, 0.45)',
      pulseDuration: 1.0,
      bgColor: 'bg-orange-950/90 border-orange-500/70 text-orange-100 shadow-orange-500/40',
      badge: '⚡ PROXIMIDAD ALTA',
      icon: '⚠️',
      subtext: `${nearestPrey?.name} en perímetro (~${distToNearest} blq)`
    },
    MODERATE: {
      borderColor: 'border-amber-400/60',
      shadow: 'inset 0 0 30px rgba(245, 158, 11, 0.4)',
      pulseDuration: 1.5,
      bgColor: 'bg-amber-950/85 border-amber-500/60 text-amber-100 shadow-amber-500/30',
      badge: '👁️ AMENAZA CERCANA',
      icon: '📡',
      subtext: `${nearestPrey?.name} detectado (~${distToNearest} blq)`
    }
  }[alertSeverity] : null;

  // Movement
  const handleMove = (dx: number, dz: number) => {
    sfx.playUiClick();
    moveHuntPlayer(playerPos.x + dx, playerPos.y, playerPos.z + dz);
  };

  // Radial Items Definition
  const radialItems = [
    {
      id: 'hunt_attack',
      label: 'Atacar',
      icon: '⚔️',
      color: 'border-red-400 bg-red-950/90 text-red-200 shadow-red-500/30',
      onClick: () => {
        sfx.playUiClick();
        if (nearestPrey) {
          if (distToNearest <= 15) {
            attackPreyInHunt(nearestPrey.id, selectedPartId);
          } else {
            addLog(`⚠️ Estás muy lejos de ${nearestPrey.name} (~${distToNearest} blq). Acércate para atacar.`, 'info');
          }
        }
        setIsRadialOpen(false);
      }
    },
    {
      id: 'hunt_cover',
      label: 'Cobertura',
      icon: '💥',
      color: 'border-orange-400 bg-orange-950/90 text-orange-200 shadow-orange-500/30',
      onClick: () => {
        sfx.playUiClick();
        if (nearestPrey) {
          const targetX = Math.round((nearestPrey.x + playerPos.x) / 2);
          const targetZ = Math.round((nearestPrey.z + playerPos.z) / 2);
          destroyCoverAtPos(targetX, targetZ);
        }
        setIsRadialOpen(false);
      }
    },
    {
      id: 'hunt_ability',
      label: isRanger ? 'Marca' : isMage ? 'Sello' : 'Rompe-Escama',
      icon: '✨',
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
      color: 'border-amber-400 bg-amber-950/90 text-amber-200 shadow-amber-500/30',
      onClick: () => {
        sfx.playUiClick();
        setShowTrapsPanel(!showTrapsPanel);
        setIsRadialOpen(false);
      }
    },
    {
      id: 'hunt_stealth',
      label: stealthActive ? 'Visible' : 'Sigilo',
      icon: '🥷',
      color: stealthActive ? 'border-emerald-400 bg-emerald-950/90 text-emerald-200 shadow-emerald-500/30' : 'border-slate-400 bg-slate-900/90 text-slate-300',
      onClick: () => {
        toggleStealth();
        setIsRadialOpen(false);
      }
    }
  ];

  const radius = 100;
  const parentSize = 140;
  const startAngle = 180;
  const endAngle = 270;
  const totalCount = radialItems.length;

  return (
    <div id="hunt-hud-root" className="fixed inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-2.5 sm:p-4">
      
      {/* 0. PROXIMITY SCREEN PULSE VIGNETTE OVERLAY */}
      <AnimatePresence>
        {isCreatureInRadius && alertConfig && (
          <motion.div
            key="proximity-vignette"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.35, 0.85, 0.35] }}
            exit={{ opacity: 0 }}
            transition={{ duration: alertConfig.pulseDuration, repeat: Infinity, ease: "easeInOut" }}
            className={`fixed inset-0 pointer-events-none z-10 border-[10px] sm:border-[20px] transition-colors duration-300 ${alertConfig.borderColor}`}
            style={{
              boxShadow: alertConfig.shadow
            }}
          />
        )}
      </AnimatePresence>

      {/* 1. TOP HEADER BAR: Schematic Info & Hunt Status */}
      <div className="flex items-start justify-between gap-2 w-full max-w-5xl mx-auto z-20">
        
        {/* Schematic & Insight Capsule */}
        <div className="pointer-events-auto bg-slate-950/85 border border-amber-500/35 rounded-2xl p-2 px-3 shadow-2xl backdrop-blur-xl flex flex-col gap-1 max-w-xs sm:max-w-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-base shrink-0">
              🏹
            </div>
            <div className="flex flex-col min-w-0">
              <h2 className="text-amber-300 font-serif font-bold text-xs truncate">
                {currentSchematic.title}
              </h2>
              <p className="text-[8.5px] text-slate-400 font-mono">
                {currentSchematic.width}x{currentSchematic.length} · {currentSchematic.totalBlocks.toLocaleString()} Voxel
              </p>
            </div>
          </div>

          {/* Biome Switcher & Insight Progress Bar */}
          <div className="flex flex-col gap-1 pt-1 border-t border-amber-500/20">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                onClick={() => startHuntMode('Bosque Voxel Denso')}
                className="px-1.5 py-0.5 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 text-[8px] font-mono font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                🌲 Bosque
              </button>
              <button
                onClick={() => startHuntMode('Cañón de Obsidiana')}
                className="px-1.5 py-0.5 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 text-[8px] font-mono font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                🌋 Cañón
              </button>
              <button
                onClick={() => startHuntMode('Ruinas de Cristal Antiguo')}
                className="px-1.5 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-200 text-[8px] font-mono font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer"
              >
                💎 Cristal
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 rounded-full h-2 border border-amber-500/30 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${insightLevel}%` }}
                />
              </div>
              <span className="text-[8.5px] font-mono text-amber-300 font-bold">
                Rastreo: {insightLevel}%
              </span>
              <button
                onClick={toggleStealth}
                className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold transition-all ${stealthActive ? 'bg-emerald-950 border border-emerald-400 text-emerald-300 animate-pulse' : 'bg-slate-900 border border-slate-700 text-slate-400'}`}
              >
                {stealthActive ? '🥷 Sigilo' : '👣 Detectable'}
              </button>
            </div>
          </div>
        </div>

        {/* TOP CENTER PROXIMITY ALERT BANNER */}
        <AnimatePresence>
          {isCreatureInRadius && alertConfig && (
            <motion.div
              key="proximity-alert-banner"
              initial={{ opacity: 0, y: -15, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.9 }}
              onClick={() => {
                sfx.playUiClick();
                if (nearestPrey && distToNearest <= 15) {
                  attackPreyInHunt(nearestPrey.id, selectedPartId);
                }
              }}
              className={`pointer-events-auto border rounded-2xl p-2 px-3 backdrop-blur-2xl shadow-2xl flex flex-col items-center gap-1 max-w-[170px] sm:max-w-xs cursor-pointer active:scale-95 transition-all ${alertConfig.bgColor}`}
            >
              <div className="flex items-center gap-1.5 w-full justify-between">
                <span className="flex items-center gap-1 text-[9.5px] font-black font-mono tracking-wider animate-pulse truncate">
                  <span>{alertConfig.icon}</span>
                  <span className="truncate">{alertConfig.badge}</span>
                </span>
                <span className="text-[9px] font-mono font-bold bg-black/50 px-1.5 py-0.5 rounded-full border border-white/20 shrink-0">
                  {distToNearest}b
                </span>
              </div>

              {/* Intensity Bar */}
              <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden border border-white/10">
                <motion.div
                  className={`h-full transition-all duration-300 ${
                    alertSeverity === 'EXTREME'
                      ? 'bg-gradient-to-r from-red-500 to-rose-400 animate-pulse'
                      : alertSeverity === 'HIGH'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-400'
                      : 'bg-gradient-to-r from-amber-400 to-yellow-300'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(15, ((ALERT_RADIUS_MAX - distToNearest + 1) / ALERT_RADIUS_MAX) * 100))}%` }}
                />
              </div>

              <p className="text-[8px] font-mono text-center opacity-90 truncate w-full">
                {alertConfig.subtext}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Right Mini Radar & Exit Capsule */}
        <div className="pointer-events-auto flex flex-col items-end gap-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setIsRadarExpanded(!isRadarExpanded); sfx.playUiHover(); }}
              className="bg-slate-950/85 border border-amber-500/40 rounded-xl px-2.5 py-1 text-[9.5px] font-bold text-amber-300 backdrop-blur-md shadow-xl flex items-center gap-1.5 active:scale-95 transition-all min-h-[44px] cursor-pointer"
            >
              <span>📡 Radar</span>
              <span className="font-mono text-slate-300">({preysDefeatedCount}/{totalPreysCount})</span>
              <span>{isRadarExpanded ? '▲' : '▼'}</span>
            </button>
            <button
              onClick={() => { sfx.playPortal(); completeHuntSession(); }}
              className="bg-amber-950/85 hover:bg-amber-900 border border-amber-400/60 rounded-xl px-2 py-1 text-[9.5px] font-bold text-amber-200 backdrop-blur-md shadow-xl flex items-center gap-1 active:scale-95 transition-all min-h-[44px] cursor-pointer"
              title="Finalizar Cacería y Reclamar Botín"
            >
              <span>🌀 Salir</span>
            </button>
          </div>

          <AnimatePresence>
            {isRadarExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl"
              >
                <div
                  className="relative bg-slate-950/90 rounded-xl border border-white/10 overflow-hidden"
                  style={{ width: '110px', height: '110px' }}
                >
                  {/* Player Dot */}
                  <div
                    className="absolute w-3 h-3 bg-sky-400 rounded-full border border-white shadow-sm -translate-x-1/2 -translate-y-1/2 z-10 animate-pulse"
                    style={{
                      left: `${(playerPos.x / currentSchematic.width) * 100}%`,
                      top: `${(playerPos.z / currentSchematic.length) * 100}%`
                    }}
                    title="Jugador"
                  />
                  {/* Preys Dots */}
                  {preys.map(prey => (
                    <div
                      key={prey.id}
                      className={`absolute w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 ${prey.isDefeated ? 'bg-slate-600 opacity-30' : prey.alertLevel === 'ENRAGED' ? 'bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping' : 'bg-amber-400'}`}
                      style={{
                        left: `${(prey.x / currentSchematic.width) * 100}%`,
                        top: `${(prey.z / currentSchematic.length) * 100}%`
                      }}
                      title={prey.name}
                    />
                  ))}
                  {/* Clues Dots */}
                  {clues.map(clue => !clue.isInvestigated && (
                    <div
                      key={clue.id}
                      className="absolute w-2 h-2 bg-emerald-400 rounded-full border border-white shadow-sm -translate-x-1/2 -translate-y-1/2 animate-bounce"
                      style={{
                        left: `${(clue.x / currentSchematic.width) * 100}%`,
                        top: `${(clue.z / currentSchematic.length) * 100}%`
                      }}
                      title="Pista"
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. BOTTOM THUMB CONTROL ZONES */}
      <div className="flex items-end justify-between w-full pointer-events-none gap-2">
        
        {/* LEFT THUMB ZONE: Virtual 3D D-Pad & Context Action Pills */}
        <div className="pointer-events-auto flex flex-col items-start gap-1.5">
          
          {/* NEARBY CLUE INVESTIGATION BADGE */}
          {nearbyClue && (
            <button
              onClick={() => investigateClue(nearbyClue.id)}
              className="py-1.5 px-3 bg-emerald-950/90 border border-emerald-400 text-emerald-200 font-serif font-bold text-[10px] rounded-full shadow-xl backdrop-blur-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse min-h-[44px]"
            >
              <span>🔎</span> <span>Investigar Pista de Rastreo</span>
            </button>
          )}

          {returnPortal && returnPortal.active && (
            <button
              onClick={() => { sfx.playUiClick(); exitHuntMode(); }}
              className="py-1.5 px-3 bg-gradient-to-r from-fuchsia-800 to-purple-800 hover:from-fuchsia-700 hover:to-purple-700 text-white font-serif font-bold text-[10px] rounded-full shadow-xl border border-fuchsia-300/40 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <span>🌀</span> <span>Cruzar Portal de Regreso</span>
            </button>
          )}

          {/* D-Pad Controller */}
          <div className="relative w-32 h-32 flex items-center justify-center select-none">
            <div className="absolute w-7 h-7 rounded-full bg-slate-950/60 backdrop-blur-md border border-amber-500/30 flex items-center justify-center pointer-events-none shadow-inner">
              <span className="text-[9px] text-amber-400 font-mono font-bold">3D</span>
            </div>

            <button
              onClick={() => handleMove(0, -1)}
              className="absolute top-0 w-10 h-10 rounded-2xl bg-slate-950/85 hover:bg-slate-900 active:bg-amber-500/50 border border-amber-500/40 backdrop-blur-xl text-amber-300 font-black flex items-center justify-center text-sm shadow-xl active:scale-90 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              title="Avanzar (Norte)"
            >
              ▲
            </button>

            <button
              onClick={() => handleMove(0, 1)}
              className="absolute bottom-0 w-10 h-10 rounded-2xl bg-slate-950/85 hover:bg-slate-900 active:bg-amber-500/50 border border-amber-500/40 backdrop-blur-xl text-amber-300 font-black flex items-center justify-center text-sm shadow-xl active:scale-90 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              title="Retroceder (Sur)"
            >
              ▼
            </button>

            <button
              onClick={() => handleMove(-1, 0)}
              className="absolute left-0 w-10 h-10 rounded-2xl bg-slate-950/85 hover:bg-slate-900 active:bg-amber-500/50 border border-amber-500/40 backdrop-blur-xl text-amber-300 font-black flex items-center justify-center text-sm shadow-xl active:scale-90 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              title="Izquierda (Oeste)"
            >
              ◄
            </button>

            <button
              onClick={() => handleMove(1, 0)}
              className="absolute right-0 w-10 h-10 rounded-2xl bg-slate-950/85 hover:bg-slate-900 active:bg-amber-500/50 border border-amber-500/40 backdrop-blur-xl text-amber-300 font-black flex items-center justify-center text-sm shadow-xl active:scale-90 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              title="Derecha (Este)"
            >
              ►
            </button>
          </div>
        </div>

        {/* BOTTOM CENTER: Compact Target Info Pill & Flanking Sector Status */}
        {nearestPrey && !nearestPrey.isDefeated && (
          <div className="pointer-events-auto mb-1 flex flex-col items-center gap-1 max-w-[180px] sm:max-w-xs">
            {/* Flanking / Positioning Badge */}
            {currentFlankStatus && (
              <div className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold tracking-wider uppercase border flex items-center justify-center gap-1 shadow-lg ${currentFlankStatus.color}`}>
                <span>{currentFlankStatus.label}</span>
              </div>
            )}

            {/* Targetable Parts Pill Bar */}
            {nearestPrey.parts && nearestPrey.parts.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center bg-slate-950/80 border border-slate-700/80 p-1 rounded-xl backdrop-blur-md">
                {nearestPrey.parts.map(part => (
                  <button
                    key={part.id}
                    onClick={() => {
                      sfx.playUiClick();
                      setSelectedPartId(selectedPartId === part.id ? undefined : part.id);
                    }}
                    disabled={part.isBroken}
                    className={`px-1.5 py-0.5 rounded-lg text-[8px] font-mono font-bold transition-all ${
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

        {/* RIGHT THUMB ZONE: Traps Subpanel & Retractable Radial Dial */}
        <div className="pointer-events-auto relative flex flex-col items-end gap-1">
          
          {/* TRAPS PLACEMENT POPUP PANEL */}
          <AnimatePresence>
            {showTrapsPanel && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-2.5 backdrop-blur-2xl shadow-2xl flex flex-col gap-1.5 w-44 mb-2 z-40"
              >
                <div className="flex justify-between items-center border-b border-amber-500/20 pb-1">
                  <span className="text-[10px] font-serif font-bold text-amber-300">⚙️ Colocar Trampa</span>
                  <button onClick={() => setShowTrapsPanel(false)} className="text-slate-400 text-xs">✕</button>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => { placeTrap('FREEZE'); setShowTrapsPanel(false); }}
                    className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/40 text-cyan-200 p-1.5 rounded-lg text-[9.5px] font-bold text-left cursor-pointer min-h-[44px]"
                  >
                    ❄️ Crio-Lazo (Congela)
                  </button>
                  <button
                    onClick={() => { placeTrap('STUN'); setShowTrapsPanel(false); }}
                    className="bg-purple-950/80 hover:bg-purple-900 border border-purple-400/40 text-purple-200 p-1.5 rounded-lg text-[9.5px] font-bold text-left cursor-pointer min-h-[44px]"
                  >
                    ⚡ Red Parálisis (Inmoviliza)
                  </button>
                  <button
                    onClick={() => { placeTrap('EXPLOSIVE'); setShowTrapsPanel(false); }}
                    className="bg-red-950/80 hover:bg-red-900 border border-red-400/40 text-red-200 p-1.5 rounded-lg text-[9.5px] font-bold text-left cursor-pointer min-h-[44px]"
                  >
                    💥 Trampa Explosiva (Daño)
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ width: parentSize, height: parentSize }} className="relative flex items-end justify-end mr-1 mb-1">
            
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
                  </motion.button>
                );
              })}
            </AnimatePresence>

            <button
              onClick={() => {
                sfx.playUiClick();
                setIsRadialOpen(!isRadialOpen);
              }}
              className={`absolute right-0 bottom-0 w-14 h-14 rounded-full border-2 border-amber-400/90 bg-slate-950/85 backdrop-blur-2xl flex flex-col items-center justify-center shadow-2xl z-30 transition-all active:scale-90 cursor-pointer min-h-[56px] min-w-[56px] ${isRadialOpen ? 'ring-2 ring-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.6)]' : 'shadow-black/90'}`}
              title="Dial Radial de Cacería"
            >
              {isRadialOpen ? (
                <div className="flex flex-col items-center justify-center leading-none">
                  <span className="text-sm font-black text-amber-400">✕</span>
                  <span className="text-[6.5px] text-amber-400/80 uppercase tracking-widest font-black mt-0.5">Cerrar</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center leading-none">
                  <span className="text-xl select-none leading-none animate-pulse">🏹</span>
                  <span className="text-[7px] text-amber-400 font-black uppercase tracking-wider scale-90 mt-0.5">Acción</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. HUNT COMPLETE / VICTORY SUMMARY MODAL */}
      <AnimatePresence>
        {huntSession.isCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-5 max-w-md w-full shadow-2xl flex flex-col gap-4 text-slate-100"
            >
              {/* Header */}
              <div className="flex flex-col items-center text-center gap-1">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-3xl shadow-lg animate-bounce">
                  🏆
                </div>
                <h2 className="text-xl font-serif font-black text-amber-300 tracking-wide uppercase mt-1">
                  Cacería Completada
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {currentSchematic.title} · Sector Voxel Despejado
                </p>
              </div>

              {/* Stats & Rewards Grid */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/80 rounded-2xl p-3 border border-amber-500/20 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Presas Cazadas</span>
                  <span className="text-lg font-black text-amber-300">{preysDefeatedCount} / {totalPreysCount}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Nivel Rastreo</span>
                  <span className="text-lg font-black text-emerald-400">{insightLevel}%</span>
                </div>
                <div className="flex flex-col items-center pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">XP Ganada</span>
                  <span className="text-base font-black text-purple-300">+{preys.filter(p => p.isDefeated).reduce((sum, p) => sum + p.rewardXp, 0) + Math.floor(insightLevel * 15)} XP</span>
                </div>
                <div className="flex flex-col items-center pt-2 border-t border-slate-800">
                  <span className="text-[10px] text-slate-400 font-mono uppercase">Oro Cosechado</span>
                  <span className="text-base font-black text-amber-400">+{preys.filter(p => p.isDefeated).reduce((sum, p) => sum + p.rewardGold, 0)} 🪙</span>
                </div>
              </div>

              {/* Harvested Materials & Trophies */}
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                <span className="text-[10px] font-serif font-bold text-amber-300 uppercase tracking-wider">
                  🎒 Botín Cosechado e Inventario:
                </span>
                {huntSession.trophiesCollected && huntSession.trophiesCollected.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {huntSession.trophiesCollected.map((trophy, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-amber-950/70 border border-amber-400/50 text-amber-200 text-[10px] font-bold flex items-center gap-1">
                        🏆 {trophy}
                      </span>
                    ))}
                  </div>
                )}
                {harvestedMaterials && harvestedMaterials.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {harvestedMaterials.map((mat, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-400/50 text-emerald-200 text-[10px] font-bold flex items-center gap-1">
                        💎 {mat.name} (x{mat.count})
                      </span>
                    ))}
                  </div>
                )}
                {(!huntSession.trophiesCollected || huntSession.trophiesCollected.length === 0) && (!harvestedMaterials || harvestedMaterials.length === 0) && (
                  <span className="text-[10px] text-slate-500 italic">No cosechaste materiales adicionales.</span>
                )}
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  sfx.playVictory();
                  claimHuntRewards();
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-serif font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                <span>✨</span>
                <span>RECLAMAR BOTÍN Y REGRESAR AL MUNDO</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

