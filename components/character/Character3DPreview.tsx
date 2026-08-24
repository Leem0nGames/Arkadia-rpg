import React from 'react';
import { Ability, Attributes, CharacterClass, CharacterRace, Difficulty } from '../../types';
import { getModifier } from '../../services/dndRules';
import { generateFantasyName } from '../../services/nameGenerator';

interface Character3DPreviewProps {
  name: string;
  race: CharacterRace;
  cls: CharacterClass;
  difficulty: Difficulty;
  currentPackage: any;
  finalStats: Attributes;
  previewMaxHp: number;
  previewAc: number;
  previewInitiative: number;
  spriteUrl: string;
}

export const Character3DPreview: React.FC<Character3DPreviewProps> = ({
  name,
  race,
  cls,
  difficulty,
  currentPackage,
  finalStats,
  previewMaxHp,
  previewAc,
  previewInitiative,
  spriteUrl
}) => {
  return (
    <div className="animate-in zoom-in-95 duration-500 space-y-6">
      <div className="text-center">
        <h3 className="text-2xl md:text-3xl font-serif text-amber-100 font-bold mb-1">Character Sheet Summary</h3>
        <p className="text-xs text-slate-400">Review your hero before entering the lands of Arcadia</p>
      </div>

      {/* Character Card */}
      <div className="bg-slate-950/70 rounded-2xl p-6 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-6">
          
          {/* Portrait */}
          <div className="w-28 h-28 bg-gradient-to-b from-amber-950 to-slate-900 rounded-2xl border-2 border-amber-500/60 shadow-xl overflow-hidden flex items-center justify-center shrink-0">
            {cls === CharacterClass.CLERIC || (spriteUrl && spriteUrl.toLowerCase().includes('priest')) ? (
              <img 
                src="/assets/players/priest/priest_roster.png" 
                alt="Character Portrait" 
                className="w-full h-full object-contain pixelated p-1" 
              />
            ) : cls === CharacterClass.FIGHTER || (spriteUrl && spriteUrl.toLowerCase().includes('fighter')) ? (
              <div 
                className="w-full h-full pixelated"
                style={{
                  backgroundImage: `url(/assets/fighter/fighter_walk.png)`,
                  backgroundSize: '400% 400%',
                  backgroundPosition: '0% 0%', // Top-left frame
                  imageRendering: 'pixelated'
                }}
              />
            ) : (
              <img src={spriteUrl} alt="Character Portrait" className="w-full h-full object-cover scale-150 translate-y-3 pixelated" />
            )}
          </div>

          {/* Details */}
          <div className="text-center md:text-left space-y-1.5 flex-1">
            <div className="text-2xl font-serif font-bold text-amber-200">
              {name || generateFantasyName(race)}
            </div>
            <div className="text-sm text-slate-300 font-bold">
              Level 1 {race} {cls}
            </div>
            <div className="text-xs text-amber-400/90 font-medium">
              Starting Package: <span className="text-white font-bold">{currentPackage?.name}</span> ({currentPackage?.archetype})
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-mono font-bold">
                ❤️ {previewMaxHp} Max HP
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 font-mono font-bold">
                🛡️ {previewAc} AC
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono font-bold">
                ⚡ Init: {previewInitiative >= 0 ? `+${previewInitiative}` : previewInitiative}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-mono font-bold">
                ⚔️ Mode: {difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Ability Scores Row */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-3 sm:grid-cols-6 gap-3">
          {(Object.entries(finalStats) as [Ability, number][]).map(([ab, score]) => {
            const mod = getModifier(score);
            return (
              <div key={ab} className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 font-mono font-bold uppercase">{ab}</div>
                <div className="text-xl font-bold font-mono text-amber-100">{score}</div>
                <div className="text-[11px] text-amber-400 font-mono font-bold">{mod >= 0 ? `+${mod}` : mod}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
