import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store/gameStore';
import { 
  BattleAction, 
  SpellType, 
  EquipmentSlot, 
  CharacterClass, 
  isFriendly, 
  Entity 
} from '../../types';
import { sfx } from '../../services/SoundSystem';
import { BG3RadialMenu } from '../BG3RadialMenu';
import { CombatDiceLogDrawer } from './CombatDiceLogDrawer';
import { getThemeConfig } from '../../services/themeSystem';

interface TacticalBattleHUDProps {
  onOpenSystemMenu: () => void;
}

export const TacticalBattleHUD: React.FC<TacticalBattleHUDProps> = ({ onOpenSystemMenu }) => {
  const {
    battleEntities, turnOrder, currentTurnIndex, battleRound,
    selectedAction, selectedSpell, hasMoved, hasActed, selectAction, selectSpell,
    handleTileInteraction, nextTurn, attemptRun, uiTheme, logs,
    cameraAzimuthOffset, setCameraGestureState, getAttackPrediction
  } = useGameStore();

  const [showCombatDiceLog, setShowCombatDiceLog] = useState(false);
  const [selectedTargetIndex, setSelectedTargetIndex] = useState<number>(0);
  const themeConfig = getThemeConfig(uiTheme);

  const activeEntityId = turnOrder[currentTurnIndex];
  const activeEntity = battleEntities.find(e => e.id === activeEntityId);
  const isPlayerTurn = activeEntity?.type === 'PLAYER';

  // Available targets in range for target cycling on mobile thumbs
  const validTargetsInMode = useMemo(() => {
    if (!isPlayerTurn || !activeEntity || hasActed) return [];
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
  }, [isPlayerTurn, activeEntity, hasActed, selectedAction, selectedSpell, battleEntities]);

  const activeTarget: Entity | null = validTargetsInMode.length > 0
    ? validTargetsInMode[selectedTargetIndex % validTargetsInMode.length] || validTargetsInMode[0]
    : null;

  // Combat Attack Forecast prediction
  const attackPrediction = useMemo(() => {
    if (!activeTarget) return null;
    return getAttackPrediction ? getAttackPrediction(activeTarget) : null;
  }, [activeTarget, getAttackPrediction]);

  // Handle Cycling targets
  const handleCycleTarget = (delta: number) => {
    if (validTargetsInMode.length === 0) return;
    sfx.playUiHover();
    setSelectedTargetIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return validTargetsInMode.length - 1;
      return next % validTargetsInMode.length;
    });
  };

  // Confirm attack/spell target action
  const handleConfirmTargetAction = () => {
    if (!activeTarget) return;
    sfx.playUiClick();
    handleTileInteraction(activeTarget.position.x, activeTarget.position.y);
  };

  // Rotate 3D Camera via thumb controls
  const handleRotateCamera = (direction: 'left' | 'right') => {
    sfx.playUiClick();
    const currentOffset = cameraAzimuthOffset || 0;
    const step = Math.PI / 4; // 45 degrees
    const nextOffset = direction === 'left' ? currentOffset - step : currentOffset + step;
    setCameraGestureState({ cameraAzimuthOffset: nextOffset });
  };

  return (
    <div id="tactical-battle-hud-root" className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-2.5 sm:p-4">
      
      {/* 1. TOP INITIATIVE HEADER & COMBAT ROUND CAPSULE */}
      <div className="flex flex-col gap-2 w-full">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-2 w-full">
          
          {/* Turn Round & Status Badge */}
          <div className="pointer-events-auto bg-slate-950/85 border border-amber-500/40 rounded-2xl px-3 py-1.5 backdrop-blur-xl shadow-2xl flex items-center gap-2.5">
            <span className="text-xs font-serif font-black text-amber-300">
              ⚔️ Ronda {battleRound}
            </span>
            <span className="text-slate-600">|</span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${isPlayerTurn ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 animate-pulse' : 'bg-red-950/80 text-red-300 border-red-500/40'}`}>
              {isPlayerTurn ? '🟢 Tu Turno' : '🔴 Turno Enemigo'}
            </span>
          </div>

          {/* Action Economy Tokens Pill */}
          {activeEntity && isPlayerTurn && (
            <div className="pointer-events-auto hidden sm:flex items-center gap-2 bg-slate-950/80 border border-amber-500/30 rounded-2xl px-3 py-1.5 backdrop-blur-md shadow-xl text-[10px] font-mono">
              <div className={`flex items-center gap-1 ${hasMoved ? 'text-slate-500 line-through' : 'text-sky-300 font-bold'}`}>
                <span>🦶 Mov:</span>
                <span>{hasMoved ? '0' : Math.floor((activeEntity.stats.speed || 30) / 5)} casillas</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className={`flex items-center gap-1 ${hasActed ? 'text-slate-500 line-through' : 'text-amber-300 font-bold'}`}>
                <span>⭐ Acción</span>
              </div>
            </div>
          )}

          {/* Right Controls: Dice Log & System Menu */}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => { setShowCombatDiceLog(!showCombatDiceLog); sfx.playUiHover(); }}
              className="w-11 h-11 rounded-2xl bg-slate-950/85 border border-amber-500/40 hover:border-amber-400 text-amber-300 flex items-center justify-center text-lg shadow-2xl active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              title="Historial de Dados D20"
            >
              🎲
            </button>
            <button
              onClick={() => { onOpenSystemMenu(); sfx.playUiHover(); }}
              className="w-11 h-11 rounded-2xl bg-slate-950/85 border border-amber-500/40 hover:border-amber-400 text-amber-300 flex items-center justify-center text-lg shadow-2xl active:scale-95 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
              title="Menú de Sistema"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Turn Order Portraits Strip */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto py-1 px-2 bg-slate-950/60 border border-white/10 rounded-2xl backdrop-blur-md max-w-full no-scrollbar">
          {turnOrder.map((id, index) => {
            const entity = battleEntities.find(e => e.id === id);
            if (!entity || entity.stats.hp <= 0) return null;
            const isActive = index === currentTurnIndex;
            const isPlayer = entity.type === 'PLAYER';

            return (
              <div
                key={`${id}_${index}`}
                className={`relative flex items-center gap-1.5 px-2 py-1 rounded-xl border transition-all shrink-0 ${
                  isActive 
                    ? isPlayer 
                      ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)] scale-105 z-10' 
                      : 'bg-red-500/25 border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)] scale-105 z-10'
                    : 'bg-slate-900/60 border-white/10 opacity-70'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold border ${isPlayer ? 'bg-amber-950 border-amber-400 text-amber-300' : 'bg-red-950 border-red-400 text-red-300'}`}>
                  {isPlayer ? '🛡️' : '💀'}
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-[9.5px] font-bold text-slate-200 truncate max-w-[70px]">
                    {entity.name}
                  </span>
                  <span className="text-[8px] font-mono text-slate-400">
                    {entity.stats.hp}/{entity.stats.maxHp} HP
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. BOTTOM THUMB CONTROLS: TARGET SELECTOR & FORECAST (LEFT) & BG3 RADIAL DIAL (RIGHT) */}
      <div className="flex items-end justify-between w-full pointer-events-none">
        
        {/* LEFT THUMB ZONE: Target Selector, Forecast Card & Camera Rotation Controls */}
        <div className="pointer-events-auto flex flex-col gap-1.5 max-w-[210px] sm:max-w-xs">
          
          {/* COMBAT ATTACK FORECAST CARD (Shifted to Left Thumb Zone) */}
          <AnimatePresence>
            {isPlayerTurn && activeTarget && attackPrediction && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-2 backdrop-blur-2xl shadow-2xl flex flex-col gap-1 z-30"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-1">
                  <span className="font-serif font-bold text-[11px] text-amber-300 truncate">
                    🎯 {activeTarget.name}
                  </span>
                  <span className="text-[8.5px] font-mono bg-red-950/80 text-red-300 border border-red-500/30 px-1 py-0.5 rounded font-bold">
                    CA: {activeTarget.stats.ac || 12}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                  <div className="bg-slate-900/80 p-1 rounded text-center">
                    <span className="text-slate-400 block text-[7.5px]">Acierto</span>
                    <span className="text-emerald-400 font-extrabold">{attackPrediction.hitChance}%</span>
                  </div>
                  <div className="bg-slate-900/80 p-1 rounded text-center">
                    <span className="text-slate-400 block text-[7.5px]">Daño</span>
                    <span className="text-amber-300 font-extrabold">{attackPrediction.estimatedDamage || '1d8'}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Target Cycler Buttons */}
          {isPlayerTurn && (selectedAction === BattleAction.ATTACK || selectedAction === BattleAction.MAGIC) && (
            <div className="bg-slate-950/85 border border-amber-500/40 rounded-2xl p-1.5 backdrop-blur-xl shadow-2xl flex flex-col gap-1.5">
              <div className="text-[8px] uppercase font-bold tracking-wider text-amber-400 text-center font-serif">
                {validTargetsInMode.length > 0 ? `Objetivos en Alcance (${validTargetsInMode.length})` : 'Sin Objetivos en Alcance'}
              </div>

              {validTargetsInMode.length > 0 ? (
                <>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => handleCycleTarget(-1)}
                      className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-black flex items-center justify-center active:scale-90 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
                      title="Objetivo Anterior"
                    >
                      ◀
                    </button>
                    <span className="text-xs font-bold text-slate-200 truncate font-serif text-center px-1">
                      {activeTarget?.name || 'Selecciona'}
                    </span>
                    <button
                      onClick={() => handleCycleTarget(1)}
                      className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-black flex items-center justify-center active:scale-90 transition-all cursor-pointer min-h-[44px] min-w-[44px]"
                      title="Siguiente Objetivo"
                    >
                      ▶
                    </button>
                  </div>

                  {activeTarget && (
                    <button
                      onClick={handleConfirmTargetAction}
                      className="w-full min-h-[44px] py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-serif font-black text-xs rounded-xl shadow-xl border border-amber-300/50 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>🎯</span>
                      <span>Atacar a {activeTarget.name}</span>
                    </button>
                  )}
                </>
              ) : (
                <p className="text-[9.5px] text-slate-400 text-center px-2 py-1">
                  Acércate al enemigo o selecciona otra acción en el dial.
                </p>
              )}
            </div>
          )}

          {/* 3D Camera Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-amber-500/30 rounded-2xl p-1.5 backdrop-blur-md shadow-xl">
            <button
              onClick={() => handleRotateCamera('left')}
              className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-mono text-[10px] font-bold rounded-xl border border-white/10 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer min-h-[44px]"
              title="Girar Cámara Izquierda"
            >
              <span>↺</span> <span>-45°</span>
            </button>
            <button
              onClick={() => handleRotateCamera('right')}
              className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-mono text-[10px] font-bold rounded-xl border border-white/10 flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer min-h-[44px]"
              title="Girar Cámara Derecha"
            >
              <span>+45°</span> <span>↻</span>
            </button>
          </div>
        </div>

        {/* RIGHT THUMB ZONE: BG3 Retractable Radial Action Dial */}
        <div className="pointer-events-auto">
          {activeEntity && (
            <BG3RadialMenu
              activeEntity={activeEntity}
              hasMoved={hasMoved}
              hasActed={hasActed}
              activeActionMode={selectedAction}
              onAction={(action) => selectAction(action)}
              onWait={() => nextTurn()}
              onRun={() => attemptRun()}
              themeConfig={themeConfig}
            />
          )}
        </div>
      </div>

      {/* Combat Dice Log Drawer Modal */}
      {showCombatDiceLog && (
        <CombatDiceLogDrawer logs={logs} themeConfig={themeConfig} onClose={() => setShowCombatDiceLog(false)} />
      )}
    </div>
  );
};
