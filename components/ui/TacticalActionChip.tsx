import React from 'react';

interface TacticalActionChipProps {
  icon: string;
  label: string;
  badge?: string | number;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'sky';
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
  className?: string;
}

export const TacticalActionChip: React.FC<TacticalActionChipProps> = ({
  icon,
  label,
  badge,
  badgeColor = 'amber',
  actionLabel,
  onAction,
  disabled = false,
  className = ''
}) => {
  const badgeStyles = {
    emerald: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
    amber: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
    rose: 'bg-rose-950/80 border-rose-500/50 text-rose-300 animate-pulse',
    sky: 'bg-sky-950/80 border-sky-500/50 text-sky-300'
  }[badgeColor];

  return (
    <div className={`inline-flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-xl border border-white/15 px-2.5 py-1 rounded-xl shadow-lg text-[10px] select-none ${className}`}>
      <span className="text-xs shrink-0">{icon}</span>
      <span className="font-bold text-slate-200 truncate">{label}</span>
      {badge !== undefined && (
        <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-extrabold border ${badgeStyles}`}>
          {badge}
        </span>
      )}
      {actionLabel && onAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onAction();
          }}
          disabled={disabled}
          className={`ml-1 px-2 py-0.5 rounded-lg font-serif font-black text-[9px] uppercase tracking-wider transition-all flex items-center gap-1 min-h-[28px] ${
            disabled
              ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 cursor-pointer shadow-sm'
          }`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
