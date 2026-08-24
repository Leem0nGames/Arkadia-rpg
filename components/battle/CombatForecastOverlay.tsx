import React from 'react';
import { Html } from '@react-three/drei';
import { useGameStore } from '../../store/gameStore';
import { BattleCell, Entity } from '../../types';

interface CombatForecastOverlayProps {
  targetEntity?: Entity | null;
  mapData?: BattleCell[];
}

export const CombatForecastOverlay: React.FC<CombatForecastOverlayProps> = ({ targetEntity, mapData }) => {
  const getAttackPrediction = useGameStore(s => s.getAttackPrediction);
  const forecast = getAttackPrediction(targetEntity);

  if (!forecast) return null;

  // Calculate 3D surface height above target entity tile
  let surfaceY = 0.5;
  if (mapData && forecast.target?.position) {
    const cell = mapData.find((c: BattleCell) => c.x === forecast.target.position.x && c.z === forecast.target.position.y);
    surfaceY = cell ? (cell.offsetY + cell.height) : 0.5;
  }

  const {
    actionName,
    actionIcon,
    hitChance,
    minDamage,
    maxDamage,
    avgDamage,
    diceFormula,
    currentHp,
    maxHp,
    projectedHp,
    isHealing,
    isFullCover,
    isHalfCover,
    hasHighGround,
    isFriendlyTarget,
    target
  } = forecast;

  // Hit chance color styling
  let hitColorClass = 'text-emerald-400';
  if (isFullCover || hitChance === 0) {
    hitColorClass = 'text-rose-400';
  } else if (hitChance < 40) {
    hitColorClass = 'text-rose-400';
  } else if (hitChance < 70) {
    hitColorClass = 'text-amber-400';
  }

  // HP Bar Percentage calculations
  const currentHpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  const projectedHpPct = Math.max(0, Math.min(100, (projectedHp / maxHp) * 100));

  return (
    <Html
      position={[target.position.x, surfaceY + 2.4, target.position.y]}
      center
      zIndexRange={[100, 0]}
    >
      <div className="pointer-events-none select-none w-48 sm:w-52 rounded-xl bg-slate-950/90 backdrop-blur-md border border-amber-500/40 p-2 text-slate-100 shadow-2xl transition-all duration-200 transform -translate-x-1/2 -translate-y-full mb-2">
        {/* Header: Action Name & Target */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1.5 text-[11px] font-semibold tracking-wide">
          <div className="flex items-center gap-1 text-amber-300 truncate max-w-[110px]">
            <span>{actionIcon || '⚔️'}</span>
            <span className="truncate">{actionName}</span>
          </div>
          <span className="text-slate-400 text-[10px] truncate max-w-[70px] text-right">{target.name}</span>
        </div>

        {/* Core Prediction Grid */}
        <div className="grid grid-cols-2 gap-1.5 mb-2 bg-slate-900/60 rounded-lg p-1.5 border border-slate-800/80">
          {/* Hit Probability */}
          <div className="flex flex-col items-center justify-center border-r border-slate-800 pr-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Golpe</span>
            <span className={`text-sm font-bold font-mono ${hitColorClass}`}>
              {isFullCover ? '0%' : `${hitChance}%`}
            </span>
          </div>

          {/* Predicted Damage / Healing */}
          <div className="flex flex-col items-center justify-center pl-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">
              {isHealing ? 'Curación' : 'Daño Est.'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-sm font-bold font-mono ${isHealing ? 'text-emerald-300' : 'text-amber-400'}`}>
                {minDamage === maxDamage ? minDamage : `${minDamage}-${maxDamage}`}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">({diceFormula})</span>
            </div>
          </div>
        </div>

        {/* Target HP Forecast Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 text-[9px]">Salud Obj:</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-300">{currentHp}</span>
              <span className="text-slate-500">➔</span>
              <span className={`font-bold ${isHealing ? 'text-emerald-400' : projectedHp === 0 ? 'text-rose-500 font-black' : 'text-amber-300'}`}>
                {projectedHp} {projectedHp === 0 ? '(CAE)' : 'HP'}
              </span>
            </div>
          </div>

          {/* Bar track */}
          <div className="relative h-1.5 w-full bg-slate-800/90 rounded-full overflow-hidden border border-slate-700/50">
            {/* Projected HP fill (darker / base) */}
            <div
              className={`absolute left-0 top-0 bottom-0 transition-all duration-300 ${isHealing ? 'bg-emerald-500' : 'bg-emerald-600'}`}
              style={{ width: `${projectedHpPct}%` }}
            />

            {/* Damage chunk loss fill (blinking warning red) */}
            {!isHealing && currentHpPct > projectedHpPct && (
              <div
                className="absolute top-0 bottom-0 bg-rose-500/80 animate-pulse transition-all duration-300"
                style={{
                  left: `${projectedHpPct}%`,
                  width: `${currentHpPct - projectedHpPct}%`
                }}
              />
            )}
          </div>
        </div>

        {/* Tactical Condition Badges */}
        {(isFullCover || isHalfCover || hasHighGround || isFriendlyTarget) && (
          <div className="mt-1.5 pt-1 border-t border-slate-800/80 flex flex-wrap gap-1 text-[9px]">
            {isFullCover && (
              <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
                🚫 Cobertura Total
              </span>
            )}
            {!isFullCover && isHalfCover && (
              <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/50">
                🛡️ Cobertura +2 CA
              </span>
            )}
            {hasHighGround && (
              <span className="px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-800/50">
                ⛰️ Altura +2 Ataque
              </span>
            )}
            {isFriendlyTarget && (
              <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">
                ⚠️ Aliado
              </span>
            )}
          </div>
        )}
      </div>
    </Html>
  );
};
