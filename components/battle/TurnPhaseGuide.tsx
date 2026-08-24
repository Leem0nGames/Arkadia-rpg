import React, { useState } from 'react';
import { BattleAction, Entity } from '../../types';

interface TurnPhaseGuideProps {
    activeEntity: Entity | null;
    hasMoved: boolean;
    hasActed: boolean;
    isPlayerTurn: boolean;
    selectedAction: BattleAction | null;
}

export const TurnPhaseGuide: React.FC<TurnPhaseGuideProps> = ({
    activeEntity,
    hasMoved,
    hasActed,
    isPlayerTurn,
    selectedAction
}) => {
    const [showHelp, setShowHelp] = useState(false);

    if (!activeEntity || !isPlayerTurn) return null;

    let stepTitle = 'Fase de Turno';
    let stepDescription = 'Tus acciones están listas.';
    let stepBadgeColor = 'bg-amber-950/80 border-amber-500/40 text-amber-300';
    let icon = '⚔️';

    if (selectedAction === BattleAction.MOVE) {
        stepTitle = 'Paso 1: Movimiento Táctico';
        stepDescription = 'Selecciona una casilla destino en la cuadrícula o usa "Mover aquí".';
        stepBadgeColor = 'bg-sky-950/80 border-sky-500/40 text-sky-300';
        icon = '🦶';
    } else if (selectedAction === BattleAction.ATTACK) {
        stepTitle = 'Paso 2: Objetivo de Ataque';
        stepDescription = 'Haz clic sobre una miniatura enemiga en rango para golpear.';
        stepBadgeColor = 'bg-red-950/80 border-red-500/40 text-red-300';
        icon = '🎯';
    } else if (selectedAction === BattleAction.MAGIC) {
        stepTitle = 'Paso 2: Objetivo Mágico';
        stepDescription = 'Selecciona el objetivo o zona para tu conjuro arcano.';
        stepBadgeColor = 'bg-purple-950/80 border-purple-500/40 text-purple-300';
        icon = '✨';
    } else if (!hasMoved) {
        stepTitle = 'Paso 1: Desplazamiento';
        stepDescription = 'Usa tu acción de movimiento o salta directo a la ofensiva.';
        stepBadgeColor = 'bg-sky-950/80 border-sky-500/40 text-sky-300';
        icon = '🚶';
    } else if (!hasActed) {
        stepTitle = 'Paso 2: Acción Principal';
        stepDescription = 'Realiza tu ataque físico, conjuro o usa un objeto.';
        stepBadgeColor = 'bg-amber-950/80 border-amber-500/40 text-amber-300';
        icon = '⚡';
    } else {
        stepTitle = 'Turno Completado';
        stepDescription = 'Has gastado tus acciones. Finaliza el turno para continuar.';
        stepBadgeColor = 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300';
        icon = '🛡️';
    }

    return (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center select-none w-full max-w-xs sm:max-w-sm px-2 animate-in fade-in duration-200">
            <div 
                onClick={() => setShowHelp(!showHelp)}
                className={`pointer-events-auto flex items-center justify-between gap-2 px-2.5 py-1 rounded-full backdrop-blur-2xl border shadow-lg cursor-pointer transition-all active:scale-95 ${stepBadgeColor}`}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs shrink-0">{icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider truncate">{stepTitle}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                    <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${!hasMoved ? 'bg-sky-400' : 'bg-slate-700'}`} title="Movimiento disponible" />
                        <div className={`w-1.5 h-1.5 rounded-full ${!hasActed ? 'bg-amber-400' : 'bg-slate-700'}`} title="Acción disponible" />
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold ml-0.5">{showHelp ? '▲' : 'ℹ️'}</span>
                </div>
            </div>

            {showHelp && (
                <div className="pointer-events-auto mt-1 p-2 rounded-xl bg-slate-950/90 border border-white/15 backdrop-blur-2xl text-[10px] text-slate-200 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
                    {stepDescription}
                </div>
            )}
        </div>
    );
};
