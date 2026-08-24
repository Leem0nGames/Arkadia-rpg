
import React, { useState } from 'react';
import { Entity, VisualComponent, CharacterClass } from '../../types';
import { ASSETS, sanitizeAssetUrl } from '../../constants';

interface UnitPortraitProps {
    entity: Entity & { visual: VisualComponent };
    className?: string;
    scale?: number;
}

const getClassIcon = (cls?: CharacterClass, type?: string, name?: string): { icon: string; bg: string } => {
    if (type === 'ENEMY') {
        const lowerName = (name || '').toLowerCase();
        if (lowerName.includes('dragon')) return { icon: '🐉', bg: 'bg-red-950 text-red-400' };
        if (lowerName.includes('wolf')) return { icon: '🐺', bg: 'bg-amber-950 text-amber-300' };
        if (lowerName.includes('skeleton')) return { icon: '💀', bg: 'bg-slate-900 text-slate-300' };
        if (lowerName.includes('orc')) return { icon: '👹', bg: 'bg-emerald-950 text-emerald-300' };
        return { icon: '👺', bg: 'bg-rose-950 text-rose-300' };
    }

    switch (cls) {
        case CharacterClass.CLERIC:
            return { icon: '✨', bg: 'bg-amber-950/80 text-amber-300' };
        case CharacterClass.FIGHTER:
        case CharacterClass.PALADIN:
            return { icon: '🛡️', bg: 'bg-sky-950/80 text-sky-300' };
        case CharacterClass.ROGUE:
            return { icon: '🗡️', bg: 'bg-emerald-950/80 text-emerald-300' };
        case CharacterClass.WIZARD:
        case CharacterClass.SORCERER:
        case CharacterClass.WARLOCK:
            return { icon: '🔮', bg: 'bg-purple-950/80 text-purple-300' };
        case CharacterClass.RANGER:
        case CharacterClass.DRUID:
            return { icon: '🏹', bg: 'bg-teal-950/80 text-teal-300' };
        case CharacterClass.BARBARIAN:
            return { icon: '🪓', bg: 'bg-orange-950/80 text-orange-300' };
        default:
            return { icon: '👤', bg: 'bg-slate-900 text-slate-300' };
    }
};

/**
 * UnitPortrait rendered with React.memo and fallback handling
 */
export const UnitPortrait: React.FC<UnitPortraitProps> = React.memo(({ entity, className = "w-full h-full", scale = 1.5 }) => {
    const [hasError, setHasError] = useState(false);
    const rawSpriteUrl = entity.visual?.spriteUrl;
    const spriteUrl = sanitizeAssetUrl(rawSpriteUrl);
    const isPriest = (spriteUrl && spriteUrl.toLowerCase().includes('priest')) || entity.stats?.class === CharacterClass.CLERIC;
    const isFighter = (spriteUrl && spriteUrl.toLowerCase().includes('fighter')) || entity.stats?.class === CharacterClass.FIGHTER;

    if (hasError || (!spriteUrl && !isPriest && !isFighter)) {
        const { icon, bg } = getClassIcon(entity.stats?.class, entity.type, entity.name);
        return (
            <div className={`w-full h-full flex items-center justify-center font-bold text-xs select-none border border-white/10 ${bg} ${className}`}>
                <span className="leading-none">{icon}</span>
            </div>
        );
    }

    if (isPriest) {
        return (
            <div className={`w-full h-full relative overflow-hidden flex items-center justify-center ${className}`}>
                <img 
                    src={ASSETS.UNITS.PLAYER_CLERIC_ROSTER || '/assets/players/priest/priest_roster.png'} 
                    alt="" 
                    onError={() => setHasError(true)}
                    className="w-full h-full object-cover scale-[1.36] translate-y-[2%] pixelated" 
                />
            </div>
        );
    }

    if (isFighter) {
        return (
            <div className={`w-full h-full relative overflow-hidden flex items-center justify-center ${className}`}>
                <div 
                    className="w-full h-full pixelated scale-125"
                    style={{
                        backgroundImage: `url(/assets/players/fighter/fighter_walk.png)`,
                        backgroundSize: '380% 380%',
                        backgroundPosition: '10% 8%', // Upper body frame
                        imageRendering: 'pixelated'
                    }}
                />
            </div>
        );
    }

    return (
        <img 
            src={spriteUrl} 
            alt="" 
            onError={() => setHasError(true)}
            className={`${className} object-cover pixelated`} 
            style={{ transform: `scale(${scale}) translateY(10%)` }}
        />
    );
});
