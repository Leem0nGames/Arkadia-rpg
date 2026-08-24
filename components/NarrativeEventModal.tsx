import React from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'motion/react';

export const NarrativeEventModal: React.FC = () => {
  const { 
    activeNarrativeEvent, 
    activeNarrativeOutcome, 
    triggerEventChoice, 
    closeNarrativeEvent 
  } = useGameStore();

  if (!activeNarrativeEvent) return null;

  const currentOutcome = activeNarrativeOutcome 
    ? activeNarrativeEvent.choices.find(c => c.outcome.text === activeNarrativeOutcome)?.outcome 
    : null;

  return (
    <AnimatePresence>
      <div id="narrative-event-overlay" className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xl select-none">
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-slate-950/85 backdrop-blur-2xl shadow-2xl"
          style={{ boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)' }}
        >
          {/* Top Decorative Border */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />

          <div className="p-5 sm:p-7 max-h-[85dvh] overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="mb-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                ✨ Encuentro Narrativo
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-serif font-black text-slate-100 tracking-wide">
                {activeNarrativeEvent.title}
              </h2>
              <div className="mx-auto mt-2.5 h-[1px] w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>

            {/* Description / Outcome Content */}
            <div className="mb-6 min-h-[90px] text-slate-300 text-xs sm:text-sm leading-relaxed text-center whitespace-pre-line px-1 sm:px-3">
              {!activeNarrativeOutcome ? (
                activeNarrativeEvent.description
              ) : (
                <div className="space-y-3">
                  <p className="italic text-slate-200 text-xs sm:text-sm leading-relaxed">
                    "{activeNarrativeOutcome}"
                  </p>
                  
                  {/* Consequence Badges */}
                  {currentOutcome && (
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                      {currentOutcome.goldChange !== 0 && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                          currentOutcome.goldChange > 0 
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' 
                            : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                        }`}>
                          🪙 {currentOutcome.goldChange > 0 ? '+' : ''}{currentOutcome.goldChange} Oro
                        </span>
                      )}
                      
                      {currentOutcome.hpChange !== 0 && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold border ${
                          currentOutcome.hpChange > 0 
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' 
                            : 'bg-rose-950/60 text-rose-300 border-rose-500/30'
                        }`}>
                          ❤️ {currentOutcome.hpChange > 0 ? '+' : ''}{currentOutcome.hpChange} HP Grupo
                        </span>
                      )}

                      {currentOutcome.xpReward > 0 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-950/60 text-blue-300 border border-blue-500/30">
                          ⚡ +{currentOutcome.xpReward} XP
                        </span>
                      )}

                      {currentOutcome.gainItem && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-purple-950/60 text-purple-300 border border-purple-500/30">
                          📦 Objeto: {currentOutcome.gainItem.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      )}

                      {currentOutcome.startBattle && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-950/80 text-rose-300 border border-rose-500/40 animate-pulse">
                          ⚔️ ¡Combate Inminente!
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions Panel */}
            <div className="space-y-2.5">
              {!activeNarrativeOutcome ? (
                /* Choices Mode */
                activeNarrativeEvent.choices.map((choice, index) => (
                  <button
                    key={index}
                    onClick={() => triggerEventChoice(choice)}
                    className="w-full min-h-[48px] flex items-center justify-between p-3.5 px-4 rounded-2xl border border-white/10 bg-slate-900/60 text-left text-xs sm:text-sm font-semibold text-slate-200 transition-all hover:border-amber-400/50 hover:bg-amber-950/20 active:scale-[0.98] group"
                  >
                    <span>{choice.text}</span>
                    <span className="ml-3 text-amber-400 font-bold text-xs shrink-0">
                      ➜
                    </span>
                  </button>
                ))
              ) : (
                /* Outcome Continue Mode */
                <button
                  onClick={closeNarrativeEvent}
                  className="w-full min-h-[48px] py-3 rounded-2xl text-center text-xs font-black tracking-widest uppercase transition-all duration-200 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-[0.98] shadow-lg shadow-amber-500/20"
                >
                  {currentOutcome?.startBattle ? '⚔️ ENTRAR EN COMBATE' : '➜ CONTINUAR AVENTURA'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
