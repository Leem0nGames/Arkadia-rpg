import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { BattleAction, GameState } from '../../types';
import { sfx } from '../../services/SoundSystem';

interface TurnTimerUIProps {
  durationSeconds?: number;
}

export const TurnTimerUI: React.FC<TurnTimerUIProps> = ({ durationSeconds = 30 }) => {
  const {
    gameState,
    turnOrder,
    currentTurnIndex,
    battleEntities,
    isActionAnimating,
    activeSpellEffect,
    selectAction,
    nextTurn,
    addLog
  } = useGameStore();

  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTimedOutRef = useRef<boolean>(false);

  const activeId = turnOrder[currentTurnIndex];
  const activeEntity = battleEntities.find((e) => e.id === activeId);
  const isPlayerTurn = gameState === GameState.BATTLE_TACTICAL && activeEntity?.type === 'PLAYER';

  // Reset timer whenever turn changes or active entity changes
  useEffect(() => {
    if (isPlayerTurn) {
      setTimeLeft(durationSeconds);
      hasTimedOutRef.current = false;
    }
  }, [currentTurnIndex, activeId, isPlayerTurn, durationSeconds]);

  // Main countdown tick interval
  useEffect(() => {
    if (!isPlayerTurn || isPaused || isActionAnimating || activeSpellEffect) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlayerTurn, isPaused, isActionAnimating, activeSpellEffect]);

  // Handle low-time audio ticks and auto turn-pass on timeout
  useEffect(() => {
    if (!isPlayerTurn || isPaused) return;

    if (timeLeft === 0 && !hasTimedOutRef.current) {
      hasTimedOutRef.current = true;
      sfx.playUiClick();
      addLog("⚠️ ¡Tiempo de turno agotado! Pasando turno...", "combat");
      selectAction(BattleAction.WAIT);
    } else if (timeLeft <= 6 && timeLeft > 0) {
      sfx.playUiClick();
    }
  }, [timeLeft, isPlayerTurn, isPaused, addLog, selectAction]);

  if (!isPlayerTurn) return null;

  const percentage = (timeLeft / durationSeconds) * 100;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isUrgent = timeLeft <= 5;
  const isWarning = timeLeft <= 12 && timeLeft > 5;

  const colorClass = isUrgent
    ? 'text-red-500 stroke-red-500'
    : isWarning
    ? 'text-amber-400 stroke-amber-400'
    : 'text-emerald-400 stroke-emerald-400';

  const badgeBg = isUrgent
    ? 'bg-red-950/90 border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
    : isWarning
    ? 'bg-amber-950/90 border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
    : 'bg-slate-950/90 border-emerald-500/50 shadow-lg';

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md transition-all duration-300 select-none ${badgeBg}`}>
      {/* Circular Progress SVG */}
      <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="22"
            cy="22"
            r={radius}
            className={`transition-all duration-1000 ease-linear ${colorClass}`}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <span className={`absolute text-[10px] font-mono font-bold ${colorClass}`}>
          {timeLeft}
        </span>
      </div>

      {/* Time display & pause toggle */}
      <div className="flex items-center gap-1">
        <span className={`text-[10px] font-mono font-bold ${isPaused ? 'text-slate-400 italic' : colorClass}`}>
          {isPaused ? 'PAUSA' : `${timeLeft}s`}
        </span>
        <button
          onClick={() => setIsPaused(!isPaused)}
          title={isPaused ? "Reanudar Temporizador" : "Pausar Temporizador"}
          className="text-[10px] text-slate-400 hover:text-white transition-colors"
        >
          {isPaused ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  );
};
