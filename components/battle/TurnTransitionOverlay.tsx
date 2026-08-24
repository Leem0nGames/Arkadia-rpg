import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Entity } from '../../types';
import { sfx } from '../../services/SoundSystem';
import { UnitPortrait } from '../ui/UnitPortrait';

interface TurnTransitionOverlayProps {
  currentTurnEntityId: string;
  entities: Entity[];
}

export const TurnTransitionOverlay: React.FC<TurnTransitionOverlayProps> = ({
  currentTurnEntityId,
  entities
}) => {
  const [activeTurn, setActiveTurn] = useState<{
    id: string;
    entity: Entity | null;
    isPlayer: boolean;
  } | null>(null);

  const [isVisible, setIsVisible] = useState(false);
  const prevTurnIdRef = useRef<string | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentTurnEntityId) return;

    // Trigger transition only when turn switches
    if (prevTurnIdRef.current !== currentTurnEntityId) {
      prevTurnIdRef.current = currentTurnEntityId;

      const entity = entities.find((e) => e.id === currentTurnEntityId) || null;
      if (!entity) return;

      const isPlayer = entity.type === 'PLAYER';

      setActiveTurn({
        id: currentTurnEntityId,
        entity,
        isPlayer
      });

      setIsVisible(true);

      // Play audio notification
      try {
        if (sfx) {
          if (isPlayer) {
            if (typeof (sfx as any).playUiClick === 'function') {
              (sfx as any).playUiClick();
            }
          } else {
            if (typeof (sfx as any).playAttack === 'function') {
              (sfx as any).playAttack();
            }
          }
        }
      } catch (err) {
        // Ignore audio errors silently
      }

      // Fast auto-hide (800ms max vs previous 2200ms!)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 800);
    }

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [currentTurnEntityId, entities]);

  if (!activeTurn || !activeTurn.entity) return null;

  const { entity, isPlayer } = activeTurn;
  const unitName = entity.name || (isPlayer ? 'Héroe' : 'Enemigo');

  return (
    <div className="fixed top-16 sm:top-18 left-0 right-0 flex justify-center pointer-events-none z-30 select-none px-4">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border shadow-2xl backdrop-blur-2xl transition-all ${
              isPlayer
                ? 'bg-slate-950/85 border-emerald-500/50 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'bg-slate-950/85 border-rose-500/50 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
            }`}
          >
            {/* Unit Micro Portrait Avatar */}
            <div className={`w-6 h-6 rounded-full overflow-hidden border shrink-0 bg-slate-900 flex items-center justify-center ${
              isPlayer ? 'border-emerald-400' : 'border-rose-500'
            }`}>
              <UnitPortrait entity={entity as any} scale={1.4} />
            </div>

            {/* Micro Tag Text */}
            <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px]">
              <span className={`font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-[8px] ${
                isPlayer ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {isPlayer ? 'TURNO DE HÉROE' : 'TURNO ENEMIGO'}
              </span>
              <span className="font-serif font-bold text-slate-100 truncate max-w-[120px] sm:max-w-[160px]">
                {unitName}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
