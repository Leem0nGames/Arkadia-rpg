import React from 'react';
import { ItemRarity } from '../../types';
import { RARITY_COLORS } from '../../constants';

interface ItemRarityFrameProps {
    rarity: ItemRarity;
    children: React.ReactNode;
    className?: string;
    isSelected?: boolean;
    isEquipped?: boolean;
    quantity?: number;
    onClick?: (e: React.MouseEvent) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

/**
 * ItemRarityFrame render frame with memoization to prevent unnecessary re-renders
 * during inventory grid filtering, selection, and scrolling updates.
 */
export const ItemRarityFrame: React.FC<ItemRarityFrameProps> = React.memo(({
    rarity,
    children,
    className = '',
    isSelected = false,
    isEquipped = false,
    quantity = 1,
    onClick,
    onMouseEnter,
    onMouseLeave
}) => {
    const color = RARITY_COLORS[rarity] || '#9ca3af';
    const isLegendary = rarity === ItemRarity.LEGENDARY;
    const isVeryRare = rarity === ItemRarity.VERY_RARE;
    const isRare = rarity === ItemRarity.RARE;

    return (
        <div 
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`
                relative group select-none transition-all duration-150 cursor-pointer
                rounded-2xl border
                ${isSelected 
                    ? 'ring-2 ring-amber-400 border-amber-300 scale-[1.03] shadow-[0_0_15px_rgba(251,191,36,0.4)] z-10' 
                    : 'border-white/10 hover:border-white/30 hover:scale-[1.02]'}
                ${className}
            `}
            style={{ 
                background: isSelected 
                    ? `radial-gradient(circle at center, ${color}25 0%, rgba(15, 23, 42, 0.9) 100%)`
                    : `radial-gradient(circle at center, ${color}12 0%, rgba(10, 15, 30, 0.85) 100%)`,
                boxShadow: isSelected 
                    ? `0 0 16px ${color}50, inset 0 0 8px ${color}30`
                    : `inset 0 0 0 1px ${color}25`
            }}
        >
            {/* Corner Filigrees for Legendary & Very Rare Items */}
            {(isLegendary || isVeryRare) && (
                <>
                    <div className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 border-t-2 border-l-2 rounded-tl-sm pointer-events-none" style={{ borderColor: color }} />
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-t-2 border-r-2 rounded-tr-sm pointer-events-none" style={{ borderColor: color }} />
                    <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 border-b-2 border-l-2 rounded-bl-sm pointer-events-none" style={{ borderColor: color }} />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-b-2 border-r-2 rounded-br-sm pointer-events-none" style={{ borderColor: color }} />
                </>
            )}

            {/* Rare/Legendary Ambient Pulse Glow */}
            {isLegendary && (
                <div 
                    className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none animate-pulse"
                    style={{ background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 70%)` }}
                />
            )}

            {/* Equipped Badge Indicator */}
            {isEquipped && (
                <div className="absolute -top-1.5 -left-1.5 z-20 px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-950 text-[7px] font-black uppercase tracking-wider shadow-md border border-amber-300">
                    Eq
                </div>
            )}

            {/* Stack Quantity Badge */}
            {quantity > 1 && (
                <div className="absolute bottom-1 right-1 z-20 px-1.5 py-0.2 rounded-md bg-slate-950/90 text-amber-200 text-[8px] font-mono font-black border border-amber-500/30 shadow-md">
                    x{quantity}
                </div>
            )}

            {/* Inner Content */}
            {children}
        </div>
    );
});
