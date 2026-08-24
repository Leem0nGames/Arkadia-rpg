import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { sfx } from '../../services/SoundSystem';

/**
 * Mobile Gesture HUD & Tactical Ergonomic Camera Controls
 * 
 * Provides thumb-friendly floating controls for 90° snap camera rotation,
 * orientation resetting, and Danger Zone threat overlay toggling on portrait mobile screens.
 */
export const MobileGestureHUD: React.FC = () => {
  const {
    cameraZoomFactor = 1.0,
    cameraAzimuthOffset = 0,
    resetCameraGesture,
    snapCameraRotation,
    showDangerZone,
    toggleDangerZone
  } = useGameStore();

  const isRotatedOrZoomed = Math.abs(cameraAzimuthOffset) > 0.05 || Math.abs(cameraZoomFactor - 1.0) > 0.05;
  const zoomPercent = Math.round((1 / cameraZoomFactor) * 100);
  let degrees = Math.round(((cameraAzimuthOffset * 180) / Math.PI) % 360);
  if (degrees < 0) degrees += 360;

  return (
    <div className="absolute top-24 right-2 sm:top-20 sm:right-4 z-30 pointer-events-auto flex flex-col items-end gap-1 animate-in fade-in duration-200">
      {/* Dynamic Mini Status Pill */}
      <div className="bg-slate-950/85 backdrop-blur-xl border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xl text-[9px] font-mono text-slate-200">
        <span className="text-amber-400 font-bold">🔍 {zoomPercent}%</span>
        <span className="text-slate-600">•</span>
        <span className="text-sky-300 font-bold">🧭 {degrees}°</span>
      </div>

      {/* Ergonomic Floating Controls Bar */}
      <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-xl border border-slate-700/60 p-1 rounded-2xl shadow-2xl">
        {/* Snap Left 90° */}
        <button
          onClick={() => {
            sfx.playUiClick();
            snapCameraRotation('LEFT');
          }}
          className="min-w-[38px] min-h-[38px] px-1.5 bg-slate-900/90 hover:bg-slate-800 active:bg-amber-600/40 border border-white/20 text-sky-300 rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-transform font-bold text-xs gap-0.5 cursor-pointer touch-manipulation"
          title="Rotar 90° Izquierda"
          aria-label="Rotar 90° Izquierda"
        >
          <span className="text-xs">↶</span>
          <span className="text-[8.5px] font-mono font-black">-90°</span>
        </button>

        {/* Reset Camera Orientation */}
        <button
          onClick={() => {
            sfx.playUiClick();
            resetCameraGesture();
          }}
          className={`min-w-[38px] min-h-[38px] px-1.5 bg-slate-900/90 hover:bg-slate-800 border text-amber-300 rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-transform font-bold text-xs cursor-pointer touch-manipulation ${
            isRotatedOrZoomed ? 'border-amber-400 text-amber-300 animate-pulse' : 'border-white/20 text-slate-400'
          }`}
          title="Restablecer Vista"
          aria-label="Restablecer Vista"
        >
          ↺
        </button>

        {/* Snap Right 90° */}
        <button
          onClick={() => {
            sfx.playUiClick();
            snapCameraRotation('RIGHT');
          }}
          className="min-w-[38px] min-h-[38px] px-1.5 bg-slate-900/90 hover:bg-slate-800 active:bg-amber-600/40 border border-white/20 text-sky-300 rounded-xl flex items-center justify-center shadow-md active:scale-90 transition-transform font-bold text-xs gap-0.5 cursor-pointer touch-manipulation"
          title="Rotar 90° Derecha"
          aria-label="Rotar 90° Derecha"
        >
          <span className="text-[8.5px] font-mono font-black">+90°</span>
          <span className="text-xs">↷</span>
        </button>

        {/* Danger Zone / Line of Fire Toggle */}
        <button
          onClick={() => {
            sfx.playUiClick();
            toggleDangerZone();
          }}
          className={`min-w-[38px] min-h-[38px] px-1.5 rounded-xl border flex items-center justify-center shadow-md active:scale-90 transition-all font-bold text-xs gap-1 cursor-pointer touch-manipulation ${
            showDangerZone
              ? 'bg-red-950/90 border-red-500 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.7)] animate-pulse'
              : 'bg-slate-900/90 border-white/20 text-slate-400 hover:bg-slate-800'
          }`}
          title="Zona de Amenaza Enemiga"
          aria-label="Zona de Amenaza Enemiga"
        >
          <span>⚠️</span>
        </button>
      </div>
    </div>
  );
};

