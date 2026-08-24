import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getThemeConfig } from '../services/themeSystem';
import { getHitDieForClass, getModifier } from '../services/dndRules';
import { UnitPortrait } from './ui/UnitPortrait';

interface RestModalProps {
  onClose: () => void;
}

export const RestModal: React.FC<RestModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'SHORT' | 'LONG'>('SHORT');
  const [isSleeping, setIsSleeping] = useState(false);
  const [sleepStep, setSleepStep] = useState(0);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [recentRollResults, setRecentRollResults] = useState<Record<string, string>>({});

  const party = useGameStore(state => state.party);
  const uiTheme = useGameStore(state => state.uiTheme);
  const useHitDieForShortRest = useGameStore(state => state.useHitDieForShortRest);
  const performLongRest = useGameStore(state => state.performLongRest);

  const themeConfig = getThemeConfig(uiTheme);

  const handleRollHitDie = (entityId: string) => {
    const target = party.find(p => p.id === entityId);
    if (!target) return;
    const hitDie = getHitDieForClass(target.stats.class);
    const conMod = getModifier(target.stats.attributes.CON);

    useHitDieForShortRest(entityId);

    setRecentRollResults(prev => ({
      ...prev,
      [entityId]: `🎲 d${hitDie} + ${conMod >= 0 ? `+${conMod}` : conMod} CON`
    }));

    setTimeout(() => {
      setRecentRollResults(prev => {
        const copy = { ...prev };
        delete copy[entityId];
        return copy;
      });
    }, 3000);
  };

  const handleStartLongRest = () => {
    setIsSleeping(true);
    setSleepStep(1);

    setTimeout(() => {
      setSleepStep(2);
    }, 1200);

    setTimeout(() => {
      performLongRest();
      setSleepStep(3);
    }, 2400);

    setTimeout(() => {
      setIsSleeping(false);
      setShowSuccessBanner(true);
      setSleepStep(0);
    }, 3200);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Full-screen Atmospheric Sleep Transition Overlay */}
      {isSleeping && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-400/30 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-pulse">
              <span className="text-5xl animate-bounce">🌙</span>
            </div>
            <div className="absolute -top-2 -right-2 text-xl animate-ping">✨</div>
          </div>

          <div className="max-w-md space-y-3 font-serif">
            <h2 className="text-2xl md:text-3xl font-bold text-amber-200 tracking-wider">
              Descanso Largo en la Posada
            </h2>
            
            <p className="text-sm text-slate-300 italic min-h-[48px] transition-all duration-500 leading-relaxed">
              {sleepStep === 1 && "Las luces de la posada se apagan tranquilamente y el fuego de la chimenea crepita en la penumbra..."}
              {sleepStep === 2 && "La fiesta descansa plácidamente mientras las estrellas cruzan el cielo nocturno. Las heridas sanan..."}
              {sleepStep === 3 && "Un nuevo amanecer dorado despierta a los héroes con vitalidad, magia y energía totalmente restauradas!"}
            </p>
          </div>

          <div className="mt-8 flex gap-2">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${sleepStep >= 1 ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]' : 'bg-slate-800'}`} />
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${sleepStep >= 2 ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]' : 'bg-slate-800'}`} />
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${sleepStep >= 3 ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]' : 'bg-slate-800'}`} />
          </div>
        </div>
      )}

      {/* Main Rest Modal Container */}
      <div 
        className={`w-full max-w-3xl rounded-2xl shadow-2xl border flex flex-col overflow-hidden max-h-[85vh] ${themeConfig.classes.modalBg}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 md:p-5 border-b flex justify-between items-center ${themeConfig.classes.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-md">
              ⛺
            </div>
            <div>
              <h2 className={`font-serif text-lg md:text-xl font-bold ${themeConfig.classes.titleText}`}>
                Asentamientos y Descanso (Rest & Recovery)
              </h2>
              <p className="text-[11px] text-slate-400">
                Recupera Puntos de Golpe, Estamina, Ranuras de Conjuro y Dados de Golpe (Reglas D&D 5E)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all hover:scale-105 ${themeConfig.classes.circleButton}`}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`p-2.5 sm:px-4 sm:py-2 border-b grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold ${themeConfig.classes.divider}`}>
          <button 
            onClick={() => setActiveTab('SHORT')} 
            className={`px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center justify-center gap-2 min-h-[44px] ${
              activeTab === 'SHORT' 
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40' 
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>🎲</span>
            <span>Descanso Corto (D&D 5E)</span>
          </button>

          <button 
            onClick={() => setActiveTab('LONG')} 
            className={`px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center justify-center gap-2 min-h-[44px] ${
              activeTab === 'LONG' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' 
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>🏨</span>
            <span>Descanso Largo (Posada)</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {showSuccessBanner && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/50 p-3 px-5 text-emerald-200 text-xs font-bold flex items-center justify-between animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <span className="text-base">✨</span>
              <span>¡Descanso Largo Completado! Toda la party recuperó todo el HP, Estamina, Conjuros y Dados de Golpe.</span>
            </div>
            <button onClick={() => setShowSuccessBanner(false)} className="text-emerald-400 hover:text-emerald-100">✕</button>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-4 md:p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
          
          {/* TAB 1: SHORT REST */}
          {activeTab === 'SHORT' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3.5 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
                <span className="text-lg shrink-0">💡</span>
                <div>
                  <strong className="text-amber-300 font-serif">Mecánica de Descanso Corto (Reglas D&D 5E):</strong>
                  <p className="mt-0.5 text-slate-300">
                    Gasta tus <strong>Dados de Golpe acumulados</strong> (ej. 1d10 + mod CON) para curar individualmente a los miembros de tu fiesta y recuperar estamina. Cada personaje tiene dados según su clase y nivel.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {party.map(member => {
                  const hitDie = getHitDieForClass(member.stats.class);
                  const hitDiceState = member.stats.hitDice || { current: member.stats.level, max: member.stats.level, dieSides: hitDie };
                  const conMod = getModifier(member.stats.attributes.CON);
                  const isFull = member.stats.hp >= member.stats.maxHp && member.stats.stamina >= member.stats.maxStamina;
                  const hasDice = hitDiceState.current > 0;
                  const rollInfo = recentRollResults[member.id];

                  return (
                    <div 
                      key={member.id}
                      className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg"
                    >
                      {/* Avatar & Info */}
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-14 h-14 rounded-xl border border-amber-500/40 bg-slate-950 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                          <UnitPortrait entity={member} />
                        </div>
                        
                        <div className="flex flex-col gap-1 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-sm text-amber-100">{member.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                              Nivel {member.stats.level} {member.stats.class}
                            </span>
                          </div>

                          {/* HP Bar */}
                          <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden relative">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, (member.stats.hp / member.stats.maxHp) * 100))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-slate-400">
                            <span>HP: {member.stats.hp} / {member.stats.maxHp}</span>
                            <span>STM: {member.stats.stamina} / {member.stats.maxStamina}</span>
                          </div>
                        </div>
                      </div>

                      {/* Hit Dice Status & Action */}
                      <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-amber-400 font-bold">Dados de Golpe:</span>
                          <span className={`px-2 py-0.5 rounded-md font-mono font-bold border ${
                            hasDice 
                              ? 'bg-purple-950/80 border-purple-500/50 text-purple-300' 
                              : 'bg-red-950/80 border-red-500/50 text-red-400'
                          }`}>
                            🎲 {hitDiceState.current} / {hitDiceState.max} (d{hitDie})
                          </span>
                        </div>

                        {rollInfo && (
                          <div className="text-[10px] font-mono text-emerald-400 font-bold animate-pulse">
                            {rollInfo}
                          </div>
                        )}

                        <button
                          onClick={() => handleRollHitDie(member.id)}
                          disabled={!hasDice || isFull}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                            !hasDice 
                              ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed opacity-60' 
                              : isFull 
                                ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-amber-400/50 shadow-md hover:scale-105 active:scale-95'
                          }`}
                        >
                          <span>🎲</span>
                          <span>
                            {isFull ? 'Vida al Máximo' : !hasDice ? 'Sin Dados Restantes' : `Gastar Dado (d${hitDie} +${conMod})`}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: LONG REST AT INN */}
          {activeTab === 'LONG' && (
            <div className="space-y-5">
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-gradient-to-br from-purple-950/80 via-slate-900 to-amber-950/40 p-6 shadow-xl text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                  🏨
                </div>
                
                <h3 className="font-serif font-bold text-xl text-amber-200">
                  Posada del Viajero y Descanso Largo
                </h3>
                <p className="text-xs text-slate-300 max-w-lg mt-1 leading-relaxed">
                  Pasar la noche en una posada segura le permite a la party recuperarse por completo de batallas agotadoras y renovar sus habilidades mágicas.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl my-5 text-left text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex flex-col gap-1">
                    <span className="text-lg">💖</span>
                    <strong className="text-emerald-300">HP & Stamina</strong>
                    <span className="text-[10px] text-slate-400">Restaura 100% de salud</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 flex flex-col gap-1">
                    <span className="text-lg">🔮</span>
                    <strong className="text-purple-300">Conjuros</strong>
                    <span className="text-[10px] text-slate-400">Recarga ranuras de hechizo</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 flex flex-col gap-1">
                    <span className="text-lg">🎲</span>
                    <strong className="text-amber-300">Dados de Golpe</strong>
                    <span className="text-[10px] text-slate-400">Recupera todos los dados</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-blue-500/30 flex flex-col gap-1">
                    <span className="text-lg">🌿</span>
                    <strong className="text-blue-300">Estados</strong>
                    <span className="text-[10px] text-slate-400">Limpia venenos y debilidades</span>
                  </div>
                </div>

                <button
                  onClick={handleStartLongRest}
                  className="w-full max-w-md py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-amber-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-serif font-bold text-sm tracking-wider border border-amber-400/50 shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
                >
                  <span className="text-lg">🛌</span>
                  <span>Tomar Descanso Largo en la Posada</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end ${themeConfig.classes.headerBg}`}>
          <button
            onClick={onClose}
            className={`px-5 py-2 rounded-xl text-xs font-bold border transition-all ${themeConfig.classes.buttonSecondary}`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
