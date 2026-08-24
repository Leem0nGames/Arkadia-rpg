import React from 'react';
import { Ability, Attributes, CharacterClass, CharacterRace, StatGenerationMethod } from '../../types';
import { getModifier, POINT_BUY_COST_TABLE, STANDARD_ARRAY } from '../../services/dndRules';
import { sfx } from '../../services/SoundSystem';

interface AttributeAllocatorProps {
  statMethod: StatGenerationMethod;
  setStatMethod: (m: StatGenerationMethod) => void;
  baseScores: Attributes;
  setBaseScores: React.Dispatch<React.SetStateAction<Attributes>>;
  finalStats: Attributes;
  race: CharacterRace;
  raceBonus: Record<string, any>;
  pointBuyRemaining: number;
  diceRollsData: any;
  handleRoll4d6: () => void;
  previewMaxHp: number;
  previewHitDie: number;
  previewAc: number;
  previewInitiative: number;
  previewSpellSlots: Record<number, number>;
  previewMaxStamina: number;
}

export const AttributeAllocator: React.FC<AttributeAllocatorProps> = ({
  statMethod,
  setStatMethod,
  baseScores,
  setBaseScores,
  finalStats,
  race,
  raceBonus,
  pointBuyRemaining,
  diceRollsData,
  handleRoll4d6,
  previewMaxHp,
  previewHitDie,
  previewAc,
  previewInitiative,
  previewSpellSlots,
  previewMaxStamina
}) => {
  const handlePointBuyChange = (ability: Ability, delta: number) => {
    const current = baseScores[ability];
    const next = current + delta;
    if (next < 8 || next > 15) return;
    
    const costCurrent = POINT_BUY_COST_TABLE[current] ?? 0;
    const costNext = POINT_BUY_COST_TABLE[next] ?? 0;
    const diff = costNext - costCurrent;
    
    if (delta > 0 && pointBuyRemaining < diff) return;
    
    sfx.playUiClick();
    setBaseScores(prev => ({ ...prev, [ability]: next }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      {/* Method Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-xl font-serif text-amber-100 font-bold">5E Attribute Assignment</h3>
          <p className="text-xs text-slate-400">Configure base scores before racial modifiers</p>
        </div>

        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => { sfx.playUiClick(); setStatMethod(StatGenerationMethod.POINT_BUY); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statMethod === StatGenerationMethod.POINT_BUY ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🧮 Point Buy (27)
          </button>
          <button
            onClick={() => { sfx.playUiClick(); setStatMethod(StatGenerationMethod.STANDARD_ARRAY); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statMethod === StatGenerationMethod.STANDARD_ARRAY ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            📊 Standard Array
          </button>
          <button
            onClick={() => { sfx.playUiClick(); setStatMethod(StatGenerationMethod.ROLLED_4D6); if(!diceRollsData) handleRoll4d6(); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statMethod === StatGenerationMethod.ROLLED_4D6 ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            🎲 4d6 Drop Lowest
          </button>
          <button
            onClick={() => { sfx.playUiClick(); setStatMethod(StatGenerationMethod.CLASSIC_BASE); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${statMethod === StatGenerationMethod.CLASSIC_BASE ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            ⭐ Class Default
          </button>
        </div>
      </div>

      {/* Point Buy Status Bar */}
      {statMethod === StatGenerationMethod.POINT_BUY && (
        <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚖️</span>
            <div>
              <span className="text-xs text-amber-200 font-bold uppercase tracking-wider">Point Buy Pool:</span>
              <div className="text-sm text-slate-300">Each score costs points (8=0, 14=7, 15=9 pts). Max score 15 before racial traits.</div>
            </div>
          </div>
          <div className={`text-lg font-mono font-extrabold px-3 py-1 rounded-lg border ${pointBuyRemaining === 0 ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300' : pointBuyRemaining > 0 ? 'bg-amber-900/60 border-amber-400 text-amber-300' : 'bg-red-950/80 border-red-500 text-red-300'}`}>
            {pointBuyRemaining} pts left
          </div>
        </div>
      )}

      {/* 4d6 Roller Header */}
      {statMethod === StatGenerationMethod.ROLLED_4D6 && (
        <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
          <div className="text-xs text-slate-300">
            <span className="text-amber-400 font-bold">4d6 Method:</span> Rolled 4 dice per ability, discarded the lowest die.
          </div>
          <button
            onClick={handleRoll4d6}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow cursor-pointer transition-all"
          >
            🎲 Re-roll All 4d6
          </button>
        </div>
      )}

      {/* Attributes Interactive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(baseScores) as Ability[]).map(ab => {
          const baseVal = baseScores[ab];
          const bonus = raceBonus[race]?.[ab] || (race === CharacterRace.HUMAN ? 1 : 0);
          const finalVal = finalStats[ab];
          const mod = getModifier(finalVal);

          return (
            <div key={ab} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center relative flex flex-col justify-between">
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">{ab}</div>
              
              {/* Final Score Circle */}
              <div className="relative my-2 mx-auto w-14 h-14 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
                <span className="text-2xl font-bold text-slate-100 font-mono">{finalVal}</span>
                <div className={`absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${mod >= 0 ? 'bg-amber-950 border-amber-500 text-amber-300' : 'bg-red-950 border-red-500 text-red-300'}`}>
                  {mod >= 0 ? `+${mod}` : mod}
                </div>
              </div>

              {/* Base vs Bonus details */}
              <div className="text-[10px] text-slate-400 font-mono mb-2">
                Base: <span className="text-slate-200 font-bold">{baseVal}</span> {bonus > 0 && <span className="text-emerald-400">(+{bonus})</span>}
              </div>

              {/* Point Buy Controls */}
              {statMethod === StatGenerationMethod.POINT_BUY && (
                <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handlePointBuyChange(ab, -1)}
                    disabled={baseVal <= 8}
                    className="w-7 h-7 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-amber-500 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-mono text-slate-500">{POINT_BUY_COST_TABLE[baseVal] ?? 0}p</span>
                  <button
                    onClick={() => handlePointBuyChange(ab, 1)}
                    disabled={baseVal >= 15 || pointBuyRemaining <= 0}
                    className="w-7 h-7 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:border-amber-500 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              )}

              {/* Standard Array Selector */}
              {statMethod === StatGenerationMethod.STANDARD_ARRAY && (
                <div className="pt-2 border-t border-slate-800">
                  <select
                    value={baseVal}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setBaseScores(prev => ({ ...prev, [ab]: val }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-xs text-amber-200 font-mono outline-none"
                  >
                    {STANDARD_ARRAY.map(score => (
                      <option key={score} value={score}>{score}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Live Derived Combat Stats Preview Bar */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hit Points (HP)</div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-0.5">{previewMaxHp}</div>
          <div className="text-[9px] text-slate-500">d{previewHitDie} + CON mod</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Armor Class (AC)</div>
          <div className="text-xl font-mono font-bold text-cyan-400 mt-0.5">{previewAc}</div>
          <div className="text-[9px] text-slate-500">Armor + Shield + DEX</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Initiative</div>
          <div className="text-xl font-mono font-bold text-amber-400 mt-0.5">{previewInitiative >= 0 ? `+${previewInitiative}` : previewInitiative}</div>
          <div className="text-[9px] text-slate-500">DEX Modifier</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Speed / Move</div>
          <div className="text-xl font-mono font-bold text-slate-200 mt-0.5">30 ft (6 tiles)</div>
          <div className="text-[9px] text-slate-500">Tactical Grid</div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Resource</div>
          <div className="text-xl font-mono font-bold text-purple-400 mt-0.5">
            {previewSpellSlots[1] ? `${previewSpellSlots[1]} Spell Slots` : `${previewMaxStamina} Stamina`}
          </div>
          <div className="text-[9px] text-slate-500">Level 1 Capacity</div>
        </div>
      </div>
    </div>
  );
};
