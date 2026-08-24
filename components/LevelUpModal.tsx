import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Ability } from '../types';
import { getModifier, calculateAC } from '../services/dndRules';
import { sfx } from '../services/SoundSystem';

const ABILITY_INFO: Record<Ability, { name: string; icon: string; desc: string; keyClass: string }> = {
  [Ability.STR]: { name: 'Fuerza', icon: '⚔️', desc: 'Ataque cuerpo a cuerpo y modificador de daño', keyClass: 'Guerrero, Bárbaro, Paladín' },
  [Ability.DEX]: { name: 'Destreza', icon: '🏹', desc: 'Clase de Armadura (AC), iniciativa y ataque a distancia', keyClass: 'Pícaro, Explorador, Bardo' },
  [Ability.CON]: { name: 'Constitución', icon: '❤️', desc: 'Puntos de golpe por nivel y resistencia', keyClass: 'Todas las Clases' },
  [Ability.INT]: { name: 'Inteligencia', icon: '📜', desc: 'Poder de conjuración para Magos', keyClass: 'Mago' },
  [Ability.WIS]: { name: 'Sabiduría', icon: '👁️', desc: 'Poder sagrado para Clérigos y Druidas', keyClass: 'Clérigo, Druida' },
  [Ability.CHA]: { name: 'Carisma', icon: '✨', desc: 'Poder innato para Paladín, Hechicero y Bardo', keyClass: 'Paladín, Hechicero, Bardo' }
};

export const LevelUpModal: React.FC = () => {
  const { 
    pendingLevelUps, 
    currentLevelUpIndex, 
    allocateStatPoint, 
    rollHitDieForLevelUp, 
    setHpChoiceForLevelUp, 
    setCurrentLevelUpIndex, 
    confirmLevelUp,
    party
  } = useGameStore();

  const [isRolling, setIsRolling] = useState(false);

  if (!pendingLevelUps || pendingLevelUps.length === 0) {
    return null;
  }

  const currentLevelUp = pendingLevelUps[currentLevelUpIndex] || pendingLevelUps[0];
  const totalLeveled = pendingLevelUps.length;

  // Find underlying party member for equipment and calculations
  const partyMember = party.find(m => m.id === currentLevelUp.entityId);

  // Derived effective attributes preview
  const previewAttributes = {
    STR: currentLevelUp.previousAttributes.STR + (currentLevelUp.allocatedStats.STR || 0),
    DEX: currentLevelUp.previousAttributes.DEX + (currentLevelUp.allocatedStats.DEX || 0),
    CON: currentLevelUp.previousAttributes.CON + (currentLevelUp.allocatedStats.CON || 0),
    INT: currentLevelUp.previousAttributes.INT + (currentLevelUp.allocatedStats.INT || 0),
    WIS: currentLevelUp.previousAttributes.WIS + (currentLevelUp.allocatedStats.WIS || 0),
    CHA: currentLevelUp.previousAttributes.CHA + (currentLevelUp.allocatedStats.CHA || 0),
  };

  // HP calculations preview
  const prevConMod = getModifier(currentLevelUp.previousAttributes.CON);
  const newConMod = getModifier(previewAttributes.CON);
  const conModDelta = newConMod - prevConMod;

  const currentHpGain = currentLevelUp.hpChoice === 'rolled' && currentLevelUp.rolledHpGain !== undefined
    ? currentLevelUp.rolledHpGain + (conModDelta > 0 ? conModDelta : 0)
    : Math.max(1, Math.floor(currentLevelUp.hitDie / 2) + 1 + newConMod);

  const previewMaxHp = currentLevelUp.previousMaxHp + currentHpGain;

  // AC calculations preview
  const previewAc = partyMember ? calculateAC(
    previewAttributes.DEX,
    partyMember.equipment.body?.equipmentStats?.ac || 10,
    !!partyMember.equipment.off_hand?.equipmentStats?.ac
  ) : 10 + getModifier(previewAttributes.DEX);

  // Stamina preview
  const previewMaxStamina = 10 + newConMod + Math.floor(currentLevelUp.newLevel / 2);

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    sfx.playDiceRoll();
    setTimeout(() => {
      rollHitDieForLevelUp(currentLevelUp.entityId);
      setIsRolling(false);
    }, 450);
  };

  const handleConfirm = () => {
    confirmLevelUp(currentLevelUp.entityId);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xl animate-in fade-in duration-200 pointer-events-auto select-none">
      <div className="relative w-full max-w-2xl bg-slate-950/85 border border-white/15 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[90dvh] backdrop-blur-2xl">
        
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 p-3.5 sm:p-4 border-b border-white/10 text-center shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-inner">
            <span>✨</span> Progresión D&D 5E <span>✨</span>
          </div>
          
          <h2 className="text-xl sm:text-2xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-wider">
            ¡SUBIDA DE NIVEL!
          </h2>

          {/* Multi-Character Navigation Tabs */}
          {totalLeveled > 1 && (
            <div className="flex justify-center gap-2 mt-2 flex-wrap">
              {pendingLevelUps.map((p, idx) => {
                const isActive = idx === currentLevelUpIndex;
                return (
                  <button
                    key={p.entityId}
                    onClick={() => setCurrentLevelUpIndex(idx)}
                    className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-95 ${
                      isActive 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] font-black' 
                        : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-slate-200'
                    }`}
                  >
                    <span>{p.entityName}</span>
                    <span className="text-[10px] opacity-80">(Nv. {p.newLevel})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Main Content */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          
          {/* Character Identity & Transition */}
          <div className="flex flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-amber-400/50 p-1 flex items-center justify-center shadow-lg relative overflow-hidden shrink-0">
                {currentLevelUp.className === 'CLERIC' || (currentLevelUp.spriteUrl && currentLevelUp.spriteUrl.toLowerCase().includes('priest')) ? (
                  <img src="/assets/players/priest/priest_roster.png" alt={currentLevelUp.entityName} className="w-full h-full object-contain pixelated" />
                ) : currentLevelUp.spriteUrl ? (
                  <img src={currentLevelUp.spriteUrl} alt={currentLevelUp.entityName} className="w-full h-full object-contain pixelated" />
                ) : (
                  <span className="text-xl">👤</span>
                )}
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5">
                  {currentLevelUp.entityName}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-white/10 font-normal">
                    {currentLevelUp.race || ''} {currentLevelUp.className}
                  </span>
                </h3>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Competencia: <span className="text-emerald-400 font-bold">+{currentLevelUp.proficiencyBonus}</span> • Dado de Golpe: <span className="text-amber-300 font-bold">d{currentLevelUp.hitDie}</span>
                </div>
              </div>
            </div>

            {/* Level Badge Transition */}
            <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-amber-500/30 shadow-inner shrink-0">
              <div className="text-center">
                <span className="text-[8px] text-slate-500 uppercase font-bold block">Antes</span>
                <span className="text-xs font-bold text-slate-400">Nv. {currentLevelUp.previousLevel}</span>
              </div>
              <span className="text-amber-400 font-bold text-sm animate-pulse">➔</span>
              <div className="text-center">
                <span className="text-[8px] text-amber-400 uppercase font-bold block">Nuevo</span>
                <span className="text-sm font-black text-amber-300">Nv. {currentLevelUp.newLevel}</span>
              </div>
            </div>
          </div>

          {/* 1. Hit Points & Vitality Roll / Average */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <div className="flex justify-between items-center flex-wrap gap-1">
              <div>
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>🩸</span> Puntos de Golpe (Dado d{currentLevelUp.hitDie})
                </h4>
                <p className="text-[10px] text-slate-400">
                  Elige la media 5E o tira el dado de golpe de tu clase.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400">Vida Máx: </span>
                <span className="text-xs font-black text-emerald-400">{previewMaxHp} HP</span>
                <span className="text-[10px] text-emerald-500 font-bold ml-1">(+{currentHpGain})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Option A: Fixed 5E Average */}
              <button
                type="button"
                onClick={() => setHpChoiceForLevelUp(currentLevelUp.entityId, 'average')}
                className={`min-h-[48px] p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                  currentLevelUp.hpChoice === 'average'
                    ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-950/60 border-white/5 opacity-80'
                }`}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs font-bold text-amber-300">Media D&D 5E</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${currentLevelUp.hpChoice === 'average' ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                    +{Math.max(1, Math.floor(currentLevelUp.hitDie / 2) + 1 + newConMod)} HP
                  </span>
                </div>
                <div className="text-[9px] text-slate-400">
                  Fijo seguro: {Math.floor(currentLevelUp.hitDie / 2) + 1} + Mod CON ({newConMod >= 0 ? `+${newConMod}` : newConMod})
                </div>
              </button>

              {/* Option B: Roll Hit Die */}
              <div
                className={`min-h-[48px] p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  currentLevelUp.hpChoice === 'rolled'
                    ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-950/60 border-white/5 opacity-80'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-amber-300">Tirar Dado (d{currentLevelUp.hitDie})</span>
                  {currentLevelUp.rolledHpGain !== undefined ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-amber-400 text-slate-950">
                      +{currentLevelUp.rolledHpGain + (conModDelta > 0 ? conModDelta : 0)} HP
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 uppercase font-bold">Sin tirar</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleRollDice}
                  disabled={isRolling}
                  className="min-h-[44px] w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 shadow transition-transform active:scale-95 disabled:opacity-50"
                >
                  <span className={isRolling ? 'animate-spin' : ''}>🎲</span>
                  {currentLevelUp.rolledHpGain !== undefined ? 'Relanzar Dado' : 'Tirar 1d' + currentLevelUp.hitDie}
                </button>
              </div>
            </div>
          </div>

          {/* 2. 5E Ability Score Improvement (ASI) Points Allocation */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2.5">
            <div className="flex justify-between items-center flex-wrap gap-1">
              <div>
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>⚡</span> Mejora de Atributos (ASI)
                </h4>
                <p className="text-[10px] text-slate-400">
                  Asigna puntos de atributo (Puntuación máx: 20).
                </p>
              </div>

              <div className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[11px] font-bold flex items-center gap-1 shadow">
                <span>Puntos:</span>
                <span className="text-xs font-black text-amber-200">{currentLevelUp.availableStatPoints}</span>
              </div>
            </div>

            {/* 6 Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {(Object.keys(ABILITY_INFO) as Ability[]).map(ability => {
                const info = ABILITY_INFO[ability];
                const baseVal = currentLevelUp.previousAttributes[ability];
                const allocated = currentLevelUp.allocatedStats[ability] || 0;
                const currentVal = baseVal + allocated;
                const prevMod = getModifier(baseVal);
                const currentMod = getModifier(currentVal);
                const isModUp = currentMod > prevMod;

                const canAdd = currentLevelUp.availableStatPoints > 0 && currentVal < 20;
                const canSub = allocated > 0;

                return (
                  <div 
                    key={ability}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                      allocated > 0 
                        ? 'bg-slate-900/80 border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.15)]' 
                        : 'bg-slate-950/60 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-sm shadow-inner shrink-0">
                        {info.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-slate-100">{ability}</span>
                          <span className="text-[10px] text-slate-400 truncate">({info.name})</span>
                        </div>
                        <div className="text-[9px] text-slate-400 truncate" title={info.desc}>
                          {info.desc}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {/* Score & Modifier */}
                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-100 flex items-center gap-1 justify-end">
                          <span>{currentVal}</span>
                          {allocated > 0 && (
                            <span className="text-[10px] text-emerald-400 font-bold">+{allocated}</span>
                          )}
                        </div>
                        <div className={`text-[9px] font-bold ${isModUp ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}>
                          {currentMod >= 0 ? `+${currentMod}` : currentMod} MOD
                        </div>
                      </div>

                      {/* +/- Touch-Friendly Ergonomic Buttons (minimum 44x44px touch area) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => allocateStatPoint(currentLevelUp.entityId, ability, -1)}
                          disabled={!canSub}
                          className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-25 disabled:cursor-not-allowed text-base font-black flex items-center justify-center border border-white/10 active:scale-90"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => allocateStatPoint(currentLevelUp.entityId, ability, 1)}
                          disabled={!canAdd}
                          className="min-w-[44px] min-h-[44px] rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 disabled:opacity-25 disabled:cursor-not-allowed text-base font-black flex items-center justify-center shadow active:scale-90"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Live Derived Combat Stats Recalculation Summary */}
          <div className="p-3 rounded-2xl bg-slate-900/40 border border-white/5 flex flex-wrap justify-between gap-2 text-center">
            <div className="flex-1 min-w-[70px] p-2 rounded-xl bg-slate-950/80 border border-white/5">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Defensa</span>
              <span className="text-xs font-black text-amber-300">{previewAc} AC</span>
            </div>

            <div className="flex-1 min-w-[70px] p-2 rounded-xl bg-slate-950/80 border border-white/5">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Iniciativa</span>
              <span className="text-xs font-black text-amber-300">{getModifier(previewAttributes.DEX) >= 0 ? `+${getModifier(previewAttributes.DEX)}` : getModifier(previewAttributes.DEX)}</span>
            </div>

            <div className="flex-1 min-w-[70px] p-2 rounded-xl bg-slate-950/80 border border-white/5">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Estamina</span>
              <span className="text-xs font-black text-yellow-300">{previewMaxStamina} ⚡</span>
            </div>

            <div className="flex-1 min-w-[70px] p-2 rounded-xl bg-slate-950/80 border border-white/5">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">Conjuros</span>
              <span className="text-xs font-black text-purple-300">
                {currentLevelUp.newSpellSlots.max > 0 ? `${currentLevelUp.newSpellSlots.max} Ranuras` : 'Ninguno'}
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 px-4 sm:px-6 border-t border-white/10 bg-white/5 flex justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {currentLevelUp.availableStatPoints > 0 ? (
              <span className="text-amber-400 font-bold text-[11px]">⚠️ Quedan {currentLevelUp.availableStatPoints} puntos</span>
            ) : (
              <span className="text-emerald-400 font-bold text-[11px]">✓ Puntos asignados</span>
            )}
          </div>

          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[48px] py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black uppercase tracking-wider text-xs shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all active:scale-95 flex items-center gap-2"
          >
            <span>Confirmar Nivel</span>
            {totalLeveled > 1 && currentLevelUpIndex < totalLeveled - 1 ? (
              <span>(Siguiente Héroe ➔)</span>
            ) : (
              <span>(Continuar 🏆)</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
