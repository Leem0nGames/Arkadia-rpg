
import React from 'react';
import { Item } from '../types';
import { useGameStore } from '../store/gameStore';

interface BattleResultModalProps {
  type: 'victory' | 'defeat';
  rewards?: { xp: number; gold: number; items: Item[] };
  onContinue?: () => void;
  onRestart?: () => void;
  onQuit?: () => void;
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({ 
  type, 
  rewards, 
  onContinue, 
  onRestart, 
  onQuit 
}) => {
  const isVictory = type === 'victory';
  const { party } = useGameStore();

  const renderIcon = (icon: string) => {
        if (icon.startsWith('http') || icon.startsWith('/')) {
            return <img src={icon} className="w-8 h-8 object-contain pixelated" alt="loot" />;
        }
        return <span className="text-xl">{icon}</span>;
  };

  // Check if any alive party member will level up with this battle's XP
  const xpReward = rewards?.xp || 0;
  const levelingMembers = party.filter(m => m.stats.hp > 0 && (m.stats.xp + xpReward >= (m.stats.xpToNextLevel || 999999)));
  const hasLevelUps = levelingMembers.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto p-3 sm:p-6">
      <div className={`
        relative w-full max-w-md p-0.5 rounded-3xl overflow-hidden shadow-2xl transform transition-all
        ${isVictory ? 'bg-gradient-to-b from-amber-400/40 via-amber-500/20 to-amber-700/40 border border-amber-400/30' : 'bg-gradient-to-b from-slate-600/40 via-slate-800/20 to-black/40 border border-rose-500/30'}
      `}>
        {/* Inner Content */}
        <div className="bg-slate-950/85 backdrop-blur-2xl rounded-[22px] p-5 sm:p-7 text-center border border-white/10 max-h-[88dvh] overflow-y-auto custom-scrollbar">
          
          {/* Icon */}
          <div className="mb-2 text-4xl sm:text-5xl animate-bounce">
            {isVictory ? '🏆' : '💀'}
          </div>

          {/* Title */}
          <h2 className={`
            text-2xl sm:text-3xl font-serif font-black mb-1 tracking-wider
            ${isVictory ? 'text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-400' : 'text-rose-400'}
          `}>
            {isVictory ? 'VICTORIA' : 'DERROTA'}
          </h2>

          {/* Divider */}
          <div className="h-px w-24 mx-auto bg-gradient-to-r from-transparent via-white/20 to-transparent mb-4" />

          {/* Rewards or Message */}
          {isVictory && rewards ? (
            <div className="space-y-3 mb-5 animate-in slide-in-from-bottom-4 duration-500">
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Recompensas Obtenidas</p>
              
              <div className="flex justify-center gap-3">
                {/* XP */}
                <div className="bg-slate-900/70 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-amber-500/30 flex flex-col items-center min-w-[90px] shadow-lg">
                  <span className="block text-xl font-black text-amber-300">+{rewards.xp}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Experiencia</span>
                </div>
                
                {/* Gold */}
                <div className="bg-slate-900/70 backdrop-blur-md p-2.5 px-4 rounded-2xl border border-yellow-500/30 flex flex-col items-center min-w-[90px] shadow-lg">
                  <span className="block text-xl font-black text-yellow-300">{rewards.gold}</span>
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Monedas de Oro</span>
                </div>
              </div>

              {/* Party XP & Level Up Preview */}
              <div className="bg-slate-900/50 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-2 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Progresión del Grupo</span>
                {party.map(member => {
                  const isAlive = member.stats.hp > 0;
                  const currentXp = member.stats.xp;
                  const newXp = isAlive ? currentXp + xpReward : currentXp;
                  const targetXp = member.stats.xpToNextLevel || 999999;
                  const willLevel = isAlive && newXp >= targetXp;
                  const progressPct = Math.min(100, Math.round((newXp / targetXp) * 100));

                  return (
                    <div key={member.id} className="text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5">
                          {member.name}
                          <span className="text-[9px] text-slate-400 font-normal">Nv. {member.stats.level}</span>
                        </span>

                        {willLevel ? (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 animate-pulse shadow">
                            🌟 ¡SUBE DE NIVEL!
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-mono">
                            {newXp}/{targetXp} XP
                          </span>
                        )}
                      </div>

                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/10">
                        <div 
                          className={`h-full transition-all duration-700 ${willLevel ? 'bg-amber-400' : 'bg-sky-400'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Items */}
              {rewards.items && rewards.items.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-slate-400 text-[10px] mb-2 font-bold uppercase tracking-wider">Botín Hallado</p>
                      <div className="flex gap-2 justify-center flex-wrap">
                          {rewards.items.map((item, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-slate-900/80 p-2 px-3 rounded-xl border border-white/10 animate-in zoom-in-50 duration-300 shadow-md" style={{animationDelay: `${idx * 100}ms`}}>
                                  {renderIcon(item.icon)}
                                  <span className="text-xs font-bold text-slate-200">{item.name}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-slate-400 italic text-xs leading-relaxed">
                "El sendero del aventurero está lleno de peligros. Reagrupa a tu grupo y vuelve a luchar."
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            {isVictory ? (
              <button 
                onClick={onContinue}
                className="w-full min-h-[48px] bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black py-3.5 px-6 rounded-2xl shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all transform active:scale-95 uppercase tracking-wider text-xs flex items-center justify-center gap-2"
              >
                {hasLevelUps ? (
                  <>
                    <span>¡Subir Nivel y Continuar!</span>
                    <span>🌟</span>
                  </>
                ) : (
                  <span>Continuar Aventura</span>
                )}
              </button>
            ) : (
              <button 
                onClick={onRestart}
                className="w-full min-h-[48px] bg-slate-800 hover:bg-slate-700 text-white font-black py-3.5 px-6 rounded-2xl border border-white/15 transition-all uppercase tracking-widest text-xs active:scale-95 shadow-lg"
              >
                Reintentar Batalla
              </button>
            )}
            
            {!isVictory && (
                <button 
                    onClick={onQuit}
                    className="w-full min-h-[44px] text-slate-400 hover:text-slate-200 py-2.5 text-xs uppercase tracking-widest transition-colors font-bold"
                >
                    Volver al Menú Principal
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

