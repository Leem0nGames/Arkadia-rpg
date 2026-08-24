import React from 'react';
import { CharacterRace, CharacterClass, Difficulty, EquipmentSlot } from '../../types';
import { getHitDieForClass } from '../../services/dndRules';
import { generateFantasyName } from '../../services/nameGenerator';
import { sfx } from '../../services/SoundSystem';

interface ClassRaceSelectorProps {
  step: number;
  name: string;
  setName: (name: string) => void;
  race: CharacterRace;
  setRace: (race: CharacterRace) => void;
  cls: CharacterClass;
  setCls: (cls: CharacterClass) => void;
  difficulty: Difficulty;
  setDifficulty: (diff: Difficulty) => void;
  raceBonus: Record<string, any>;
  availablePackages: any[];
  selectedPackageId: string;
  setSelectedPackageId: (id: string) => void;
}

const RaceIcons: Record<string, React.ReactNode> = {
    [CharacterRace.HUMAN]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4L4 8l1.5 9.5A11 11 0 0 0 12 21a11 11 0 0 0 6.5-3.5L20 8l-8-4z"/><path d="M12 9v4"/><path d="M12 4v1"/></svg>
    ),
    [CharacterRace.ELF]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c.5 0 .5 2 2 3 1.5-1 3.5 0 3.5 1.5 0 2-2 3-2 3s3 2 4 5c-4 0-5.5 3-5.5 3s0 3.5-2 3.5-2-3.5-2-3.5-1.5-3-5.5-3c1-3 4-5 4-5s-2-1-2-3c0-1.5 2-2.5 3.5-1.5 1.5-1 1.5-3 2-3z"/></svg>
    ),
    [CharacterRace.DWARF]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="M12 3v18"/><path d="M6 12l2-3"/><path d="M18 12l-2-3"/><path d="M4 18l3-3"/><path d="M20 18l-3-3"/></svg>
    ),
    [CharacterRace.HALFLING]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>
    ),
    [CharacterRace.DRAGONBORN]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l-2 2h4l-2-2zM4 6h16M4 6l2 12h12l2-12M6 18l6 4 6-4" /></svg>
    ),
    [CharacterRace.GNOME]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="M19 12h3" /><path d="M2 12h3" /><path d="M17 17l2.1 2.1" /><path d="M4.9 4.9L7 7" /><path d="M17 7l2.1-2.1" /><path d="M4.9 19.1L7 17" /></svg>
    ),
    [CharacterRace.TIEFLING]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 4l-4 6 4 2" /><path d="M16 4l4 6-4 2" /><path d="M12 10v10" /><path d="M9 20h6" /></svg>
    ),
    [CharacterRace.HALF_ORC]: (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6-6 6 6" /><path d="M12 3v18" /><path d="M6 15l6 6 6-6" /></svg>
    )
};

const getClassIcon = (c: CharacterClass) => {
    switch(c) {
        case CharacterClass.FIGHTER: return '⚔️';
        case CharacterClass.BARBARIAN: return '🪓';
        case CharacterClass.PALADIN: return '🛡️';
        case CharacterClass.RANGER: return '🏹';
        case CharacterClass.ROGUE: return '🗡️';
        case CharacterClass.WIZARD: return '🔮';
        case CharacterClass.SORCERER: return '🔥';
        case CharacterClass.WARLOCK: return '👁️';
        case CharacterClass.CLERIC: return '✨';
        case CharacterClass.DRUID: return '🌿';
        case CharacterClass.BARD: return '🎵';
        default: return '❓';
    }
};

export const ClassRaceSelector: React.FC<ClassRaceSelectorProps> = ({
  step,
  name,
  setName,
  race,
  setRace,
  cls,
  setCls,
  difficulty,
  setDifficulty,
  raceBonus,
  availablePackages,
  selectedPackageId,
  setSelectedPackageId
}) => {
  if (step === 1) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* LEFT: Name & Difficulty */}
        <div className="space-y-8">
            {/* Name Input */}
            <div className="group/input">
                <span className="text-amber-100/90 font-serif text-xl block mb-3 pl-1">Name Your Legend</span>
                <div className="relative">
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-950/50 border border-slate-700 rounded-lg pl-5 pr-12 py-4 text-xl text-amber-50 placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:shadow-[0_0_15px_rgba(245,158,11,0.1)] outline-none transition-all duration-300"
                        placeholder="Enter hero name..."
                        autoFocus
                    />
                    <button 
                        onClick={() => { sfx.playUiClick(); setName(generateFantasyName(race)); }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                        title="Generate Fantasy Name"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                    </button>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block pl-1">
                    Click the dice icon or type a custom name.
                </span>
            </div>

            {/* Difficulty Options */}
            <div>
                 <div className="flex justify-between items-center mb-3 px-1">
                     <span className="text-amber-100/90 font-serif text-xl">Difficulty</span>
                     <span className="text-[10px] text-amber-500/60 uppercase tracking-widest font-bold">Challenge Level</span>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-3">
                     {Object.values(Difficulty).map(d => (
                         <button
                             key={d}
                             onClick={() => { sfx.playUiClick(); setDifficulty(d); }}
                             className={`
                                py-3 px-2 rounded-lg border text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer
                                ${difficulty === d 
                                    ? 'bg-gradient-to-br from-amber-700 to-amber-900 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)] scale-105 ring-1 ring-amber-400/30' 
                                    : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}
                             `}
                         >
                             {d}
                         </button>
                     ))}
                 </div>
                 <div className="mt-3 text-center min-h-[24px]">
                    <p className={`text-xs italic transition-all duration-300 ${difficulty === Difficulty.HARD ? 'text-red-400' : 'text-slate-400'}`}>
                        {difficulty === Difficulty.EASY && "Enemies deal reduced damage. Generous camp resources."}
                        {difficulty === Difficulty.NORMAL && "Standard D&D 5E combat peril and tactical depth."}
                        {difficulty === Difficulty.HARD && "Ruthless adversary AI, higher damage and critical danger."}
                    </p>
                 </div>
            </div>
        </div>

        {/* RIGHT: Lineage / Races */}
        <div>
            <div className="flex justify-between items-end mb-4 px-1">
                <span className="text-amber-100/90 font-serif text-xl">Choose Lineage</span>
                <span className="text-[10px] text-amber-500/60 uppercase tracking-widest font-bold">Racial Traits</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                {Object.values(CharacterRace).map(r => {
                    const isSelected = race === r;
                    const bonus = raceBonus[r] || {};
                    const bonusText = Object.entries(bonus).map(([k,v]) => `${k} +${v}`).join(', ');

                    return (
                        <button
                            key={r}
                            onClick={() => { 
                              sfx.playUiClick();
                              setRace(r); 
                              if(!name) setName(generateFantasyName(r)); 
                            }}
                            className={`w-full p-3 border rounded-xl flex flex-col gap-2 transition-all duration-200 text-left cursor-pointer
                                ${isSelected 
                                    ? 'bg-gradient-to-r from-amber-900/50 to-slate-900 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40' 
                                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-900 hover:border-slate-700'}
                            `}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'text-amber-400 bg-amber-900/30' : 'text-slate-500 bg-slate-900'}`}>
                                    {RaceIcons[r]}
                                </div>
                                <span className={`text-sm font-serif font-bold tracking-wide truncate ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                                    {r}
                                </span>
                            </div>
                            
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border self-start
                                ${isSelected 
                                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300' 
                                    : 'bg-slate-950 border-slate-800 text-slate-500'}
                            `}>
                                {r === CharacterRace.HUMAN ? 'ALL STATS +1' : bonusText}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-amber-100/90 font-serif text-xl">1. Select Class</span>
              <span className="text-xs text-amber-500 font-bold uppercase tracking-wider">Hit Die & Archetypes</span>
            </div>

            {/* Class Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {Object.values(CharacterClass).map(c => {
                     const isSelected = cls === c;
                     const hitDie = getHitDieForClass(c);
                     return (
                        <button
                            key={c}
                            onClick={() => { sfx.playUiClick(); setCls(c); }}
                            className={`p-3 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer
                                ${isSelected
                                    ? 'bg-gradient-to-b from-amber-950/60 to-slate-900 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/40 scale-105' 
                                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-900 hover:border-slate-700 opacity-80 hover:opacity-100'}
                            `}
                        >
                            <div className={`text-2xl transition-transform ${isSelected ? 'scale-110' : 'grayscale group-hover:grayscale-0'}`}>
                                {getClassIcon(c)}
                            </div>
                            <span className={`text-xs font-serif font-bold ${isSelected ? 'text-amber-200' : 'text-slate-400'}`}>{c}</span>
                            <span className="text-[9px] font-mono text-amber-500/80 font-bold">d{hitDie}</span>
                        </button>
                     );
                })}
            </div>
          </div>

          {/* Starting Equipment Package Choice */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <span className="text-amber-100/90 font-serif text-xl">2. Starting Equipment Package</span>
              <span className="text-xs text-slate-400">Choose your initial combat loadout</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availablePackages.map((pkg) => {
                const isPkgSelected = pkg.id === selectedPackageId;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => { sfx.playUiClick(); setSelectedPackageId(pkg.id); }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                      isPkgSelected
                        ? 'bg-gradient-to-b from-amber-950/50 via-slate-900 to-slate-900 border-amber-500 ring-1 ring-amber-400/30 shadow-lg shadow-amber-950/30'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-base font-serif font-bold text-amber-100">{pkg.name}</div>
                        <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mt-0.5">{pkg.archetype}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isPkgSelected ? 'bg-amber-500 text-black font-extrabold' : 'bg-slate-800 text-slate-400'}`}>
                        {isPkgSelected ? 'Selected' : 'Select'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mb-3">{pkg.description}</p>

                    {/* Equipped items preview */}
                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Included Gear:</div>
                      {pkg.equipment[EquipmentSlot.MAIN_HAND] && (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <span>⚔️</span>
                          <span>{pkg.equipment[EquipmentSlot.MAIN_HAND]?.name}</span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            ({pkg.equipment[EquipmentSlot.MAIN_HAND]?.equipmentStats?.diceCount}d{pkg.equipment[EquipmentSlot.MAIN_HAND]?.equipmentStats?.diceSides} dmg)
                          </span>
                        </div>
                      )}
                      {pkg.equipment[EquipmentSlot.OFF_HAND] && (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <span>🛡️</span>
                          <span>{pkg.equipment[EquipmentSlot.OFF_HAND]?.name}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">(+{pkg.equipment[EquipmentSlot.OFF_HAND]?.equipmentStats?.ac} AC)</span>
                        </div>
                      )}
                      {pkg.equipment[EquipmentSlot.BODY] && (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <span>🥋</span>
                          <span>{pkg.equipment[EquipmentSlot.BODY]?.name}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">({pkg.equipment[EquipmentSlot.BODY]?.equipmentStats?.ac} AC)</span>
                        </div>
                      )}
                      {pkg.bonusItems && pkg.bonusItems.length > 0 && (
                        <div className="flex items-center gap-1.5 text-amber-300/90 pt-1 border-t border-slate-800/60">
                          <span>🎒</span>
                          <span>Bonus: {pkg.bonusItems.map((b: any) => `${b.quantity}x ${b.item.name}`).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      </div>
    );
  }

  return null;
};
