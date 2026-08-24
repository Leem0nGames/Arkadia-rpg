import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameState, TerrainType } from '../types';
import { TERRAIN_NAMES } from '../constants';

export const MapLoadingScreen: React.FC = () => {
  const mapLoading = useGameStore((s) => s.mapLoading);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (!mapLoading) return;
    const timer = setInterval(() => {
      setAnimatedProgress((prev) => {
        const target = mapLoading.progress || 100;
        if (prev >= target) return target;
        return Math.min(target, prev + 5);
      });
    }, 30);
    return () => clearInterval(timer);
  }, [mapLoading?.progress]);

  if (!mapLoading) return null;

  const getBiomeBadge = () => {
    if (mapLoading.targetState === GameState.HUNT_MODE) return '🔥 Cacería 3D';
    if (mapLoading.targetState === GameState.BATTLE_TACTICAL) return '⚔️ Encuentro Táctico 5E';
    if (mapLoading.targetState === GameState.TOWN_EXPLORATION) return '🛡️ Asentamiento';
    return '🧭 Tierras de Arcadia';
  };

  const getTargetTitle = () => {
    if (mapLoading.targetLocationName) return mapLoading.targetLocationName;
    if (mapLoading.targetState === GameState.BATTLE_TACTICAL) return 'Campo de Batalla Táctico';
    if (mapLoading.targetState === GameState.HUNT_MODE) return 'Escenario de Cacería 3D';
    if (mapLoading.targetState === GameState.TOWN_EXPLORATION) return 'Asentamiento Seguro';
    return 'Tierras de Arcadia';
  };

  return (
    <div 
      id="map-loading-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 md:p-12 bg-slate-950/95 text-slate-100 select-none overflow-hidden backdrop-blur-md transition-opacity duration-300"
    >
      {/* Background Decorative Radial Gradient */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(217, 119, 6, 0.3) 0%, rgba(2, 6, 23, 0.95) 75%)',
          backgroundSize: '100% 100%' 
        }} 
      />

      {/* Header Info */}
      <div className="relative z-10 flex flex-col items-center text-center mt-6 max-w-lg">
        <div className="w-16 h-16 rounded-2xl bg-slate-900/90 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-950/50 mb-4 text-2xl">
          {mapLoading.targetState === GameState.HUNT_MODE ? '🐉' : (mapLoading.targetState === GameState.BATTLE_TACTICAL ? '⚔️' : (mapLoading.targetState === GameState.TOWN_EXPLORATION ? '🏰' : '🗺️'))}
        </div>
        <span className="text-xs uppercase tracking-widest font-bold text-amber-400/90 flex items-center gap-1.5 mb-1">
          ✨ {getBiomeBadge()}
        </span>
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-amber-100 tracking-wide drop-shadow-md">
          {getTargetTitle()}
        </h2>
        {mapLoading.targetBiome && (
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            📍 Bioma: <span className="text-amber-300 font-semibold">{typeof mapLoading.targetBiome === 'string' ? (TERRAIN_NAMES[mapLoading.targetBiome as TerrainType] || mapLoading.targetBiome) : mapLoading.targetBiome}</span>
          </p>
        )}
      </div>

      {/* Center Dynamic Status Animation */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto max-w-md w-full text-center">
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          {/* Circular Spinners */}
          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" style={{ animationDuration: '1.5s' }} />
          <div className="absolute inset-2 rounded-full border border-slate-700/40 border-b-cyan-400/70 animate-spin" style={{ animationDuration: '2.5s', animationDirection: 'reverse' }} />
          <span className="font-mono text-lg font-bold text-amber-300">
            {Math.round(animatedProgress)}%
          </span>
        </div>

        {/* Status Text */}
        <p className="text-sm font-medium text-slate-300 min-h-[20px] animate-pulse">
          {mapLoading.statusText || 'Precargando texturas y malla de terreno...'}
        </p>

        {/* Progress Bar Container */}
        <div className="w-full h-2.5 bg-slate-900/90 rounded-full border border-slate-800 p-0.5 mt-4 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 rounded-full transition-all duration-150 ease-out shadow-sm"
            style={{ width: `${Math.max(5, animatedProgress)}%` }}
          />
        </div>
      </div>

      {/* Footer Game Tip */}
      <div className="relative z-10 w-full max-w-lg mb-4 bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 text-center backdrop-blur-sm shadow-md">
        <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500/80 block mb-1">
          Consejo Táctico
        </span>
        <p className="text-xs md:text-sm text-slate-300 font-sans italic leading-relaxed">
          "{mapLoading.tip || 'Explora con precaución y mantén tus recursos preparados.'}"
        </p>
      </div>
    </div>
  );
};

