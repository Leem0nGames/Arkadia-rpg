import React from 'react';
import { sfx } from '../../services/SoundSystem';

interface MobileDPadProps {
  onMove: (x: number, y: number) => void;
  playerPos: { x: number; y: number };
}

export const MobileDPad: React.FC<MobileDPadProps> = ({ onMove, playerPos }) => {
  const handleDirectionPress = (dx: number, dy: number) => {
    sfx.playUiClick();
    onMove(playerPos.x + dx, playerPos.y + dy);
  };

  return (
    <div 
      id="mobile-thumb-dpad"
      className="relative z-30 pointer-events-auto flex flex-col items-center select-none animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      {/* Floating Translucent Hex Pad Cluster */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Center compass pivot */}
        <div className="absolute w-8 h-8 rounded-full bg-slate-950/40 backdrop-blur-md border border-amber-500/20 flex items-center justify-center pointer-events-none shadow-inner">
          <span className="text-[10px] text-amber-400/70 font-mono font-black">❖</span>
        </div>

        {/* Directional Petals - 6-way axial movement for hex/overworld map */}
        {/* 1. North-West (q - 1, r) */}
        <button
          onClick={() => handleDirectionPress(-1, 0)}
          className="absolute top-1 left-1 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/70 hover:bg-slate-900/80 active:bg-amber-500/50 border border-amber-500/30 active:border-amber-300 backdrop-blur-xl text-amber-200 font-black flex items-center justify-center text-sm shadow-lg active:scale-90 transition-all cursor-pointer touch-manipulation"
          title="Noroeste"
        >
          ↖
        </button>

        {/* 2. North (q, r - 1) */}
        <button
          onClick={() => handleDirectionPress(0, -1)}
          className="absolute top-0 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/70 hover:bg-slate-900/80 active:bg-amber-500/50 border border-amber-500/30 active:border-amber-300 backdrop-blur-xl text-amber-200 font-black flex items-center justify-center text-base shadow-lg active:scale-90 transition-all cursor-pointer touch-manipulation"
          title="Norte"
        >
          ▲
        </button>

        {/* 3. North-East (q + 1, r - 1) */}
        <button
          onClick={() => handleDirectionPress(1, -1)}
          className="absolute top-1 right-1 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/70 hover:bg-slate-900/80 active:bg-amber-500/50 border border-amber-500/30 active:border-amber-300 backdrop-blur-xl text-amber-200 font-black flex items-center justify-center text-sm shadow-lg active:scale-90 transition-all cursor-pointer touch-manipulation"
          title="Noreste"
        >
          ↗
        </button>

        {/* 4. South-West (q - 1, r + 1) */}
        <button
          onClick={() => handleDirectionPress(-1, 1)}
          className="absolute bottom-1 left-1 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/70 hover:bg-slate-900/80 active:bg-amber-500/50 border border-amber-500/30 active:border-amber-300 backdrop-blur-xl text-amber-200 font-black flex items-center justify-center text-sm shadow-lg active:scale-90 transition-all cursor-pointer touch-manipulation"
          title="Suroeste"
        >
          ↙
        </button>

        {/* 5. South (q, r + 1) */}
        <button
          onClick={() => handleDirectionPress(0, 1)}
          className="absolute bottom-0 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/70 hover:bg-slate-900/80 active:bg-amber-500/50 border border-amber-500/30 active:border-amber-300 backdrop-blur-xl text-amber-200 font-black flex items-center justify-center text-base shadow-lg active:scale-90 transition-all cursor-pointer touch-manipulation"
          title="Sur"
        >
          ▼
        </button>

        {/* 6. South-East (q + 1, r) */}
        <button
          onClick={() => handleDirectionPress(1, 0)}
          className="absolute bottom-1 right-1 w-11 h-11 min-h-[44px] min-w-[44px] rounded-2xl bg-slate-950/70 hover:bg-slate-900/80 active:bg-amber-500/50 border border-amber-500/30 active:border-amber-300 backdrop-blur-xl text-amber-200 font-black flex items-center justify-center text-sm shadow-lg active:scale-90 transition-all cursor-pointer touch-manipulation"
          title="Sureste"
        >
          ↘
        </button>
      </div>
    </div>
  );
};
