import { useState, useEffect } from 'react';
import { Entity } from '../types';

export const useTurnTransition = (
  currentTurnIndex: number,
  activeEntity: Entity | undefined,
  onTurnChange?: () => void
) => {
  const [showEnemyBanner, setShowEnemyBanner] = useState(false);

  useEffect(() => {
    if (onTurnChange) {
      onTurnChange();
    }
    
    if (activeEntity && activeEntity.type !== 'PLAYER') {
      setShowEnemyBanner(true);
      const timer = setTimeout(() => setShowEnemyBanner(false), 1600);
      return () => clearTimeout(timer);
    } else {
      setShowEnemyBanner(false);
    }
  }, [currentTurnIndex, activeEntity?.type]);

  return { showEnemyBanner };
};
