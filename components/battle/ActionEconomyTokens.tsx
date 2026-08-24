import React from 'react';

interface ActionEconomyTokensProps {
  hasActed: boolean;
  hasMoved: boolean;
  activeEntity: any;
  compact?: boolean;
}

export const ActionEconomyTokens: React.FC<ActionEconomyTokensProps> = ({
  hasActed,
  hasMoved,
  activeEntity,
  compact = true,
}) => {
  if (!activeEntity) return null;
  const maxSpeed = Math.floor((activeEntity.stats?.attributes?.DEX || 10) / 2) + 2;
  const remainingSpeed = hasMoved ? 0 : maxSpeed;
  const spellSlots = activeEntity.stats?.spellSlots || { current: 0, max: 0 };

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 border border-amber-500/40 backdrop-blur-md shadow-lg text-[10px] font-bold select-none">
      {/* Main Action Token */}
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
          !hasActed
            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_6px_rgba(16,185,129,0.3)]'
            : 'bg-slate-900/80 border-slate-700 text-slate-500 opacity-60'
        }`}
        title={!hasActed ? 'Acción Disponible' : 'Acción Usada'}
      >
        <span className="text-[9px]">{!hasActed ? '🟢' : '🔴'}</span>
        <span className="hidden sm:inline">Acción</span>
      </div>

      {/* Movement Token */}
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-all ${
          !hasMoved
            ? 'bg-blue-950/90 border-blue-500 text-blue-300 shadow-[0_0_6px_rgba(59,130,246,0.3)]'
            : 'bg-slate-900/80 border-slate-700 text-slate-500 opacity-60'
        }`}
        title="Puntos de Movimiento"
      >
        <span className="text-[9px]">🦶</span>
        <span>{remainingSpeed}/{maxSpeed}</span>
      </div>

      {/* Spell Slots Tokens */}
      {spellSlots.max > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border bg-purple-950/90 border-purple-500 text-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.3)]">
          <span className="text-[9px]">🔮</span>
          <div className="flex gap-0.5 items-center">
            {Array.from({ length: spellSlots.max }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${
                  i < spellSlots.current
                    ? 'bg-purple-400 shadow-[0_0_4px_#a855f7]'
                    : 'bg-slate-800 border border-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

