import React, { useState } from 'react';
import { motion } from 'motion/react';

export type SpritesheetButtonType =
    | 'WAIT'
    | 'MOVE'
    | 'ITEM'
    | 'ATTACK'
    | 'MAGIC'
    | 'RUN'
    | 'INVENTORY'
    | 'SETTINGS'
    | 'CAMP'
    | 'QUESTS'
    | 'PORTAL'
    | 'MAP'
    | 'BACK';

export const SPRITESHEET_FRAMES: Record<string, { x: number; y: number; w: number; h: number }> = {
    "frame_000.png": { x: 4, y: 0, w: 508, h: 512 }, // Hourglass Normal
    "frame_001.png": { x: 548, y: 0, w: 512, h: 512 }, // Wind Boot Normal
    "frame_002.png": { x: 1098, y: 0, w: 503, h: 512 }, // Red Potion Normal
    "frame_003.png": { x: 6, y: 542, w: 503, h: 512 }, // Lion Shield Normal
    "frame_004.png": { x: 552, y: 542, w: 503, h: 512 }, // Magic Book Normal
    "frame_005.png": { x: 1098, y: 542, w: 503, h: 512 }, // Brown Boots Normal
    "frame_006.png": { x: 4, y: 1084, w: 508, h: 512 }, // Hourglass Selected
    "frame_007.png": { x: 548, y: 1084, w: 512, h: 512 }, // Wind Boot Selected
    "frame_008.png": { x: 1096, y: 1084, w: 508, h: 512 }, // Red Potion Selected
    "frame_009.png": { x: 4, y: 1626, w: 508, h: 512 }, // Lion Shield Selected
    "frame_010.png": { x: 552, y: 1626, w: 503, h: 512 }, // Magic Book Selected
    "frame_011.png": { x: 1098, y: 1626, w: 503, h: 512 }, // Brown Boots Selected
    "frame_012.png": { x: 2, y: 2168, w: 512, h: 512 }, // Backpack Normal
    "frame_013.png": { x: 546, y: 2168, w: 516, h: 512 }, // Gears Normal
    "frame_014.png": { x: 1094, y: 2168, w: 512, h: 512 }, // Food/Flask Normal
    "frame_015.png": { x: 6, y: 2710, w: 503, h: 512 }, // Quest Scroll Normal
    "frame_016.png": { x: 550, y: 2710, w: 508, h: 512 }, // Portal Normal
    "frame_017.png": { x: 1096, y: 2710, w: 508, h: 512 }, // Map Scroll Normal
    "frame_018.png": { x: 6, y: 3252, w: 503, h: 512 }, // Backpack Selected
    "frame_019.png": { x: 550, y: 3252, w: 508, h: 512 }, // Gears Selected
    "frame_020.png": { x: 1098, y: 3252, w: 503, h: 512 }, // Food/Flask Selected
    "frame_021.png": { x: 6, y: 3794, w: 503, h: 512 }, // Quest Scroll Selected
    "frame_022.png": { x: 552, y: 3794, w: 503, h: 512 }, // Portal Selected
    "frame_023.png": { x: 1098, y: 3794, w: 503, h: 512 } // Map Scroll Selected
};

export const BUTTON_MAP: Record<SpritesheetButtonType, { normal: string; selected: string }> = {
    WAIT: { normal: 'frame_000.png', selected: 'frame_006.png' },
    MOVE: { normal: 'frame_001.png', selected: 'frame_007.png' },
    ITEM: { normal: 'frame_002.png', selected: 'frame_008.png' },
    ATTACK: { normal: 'frame_003.png', selected: 'frame_009.png' },
    MAGIC: { normal: 'frame_004.png', selected: 'frame_010.png' },
    RUN: { normal: 'frame_005.png', selected: 'frame_011.png' },
    INVENTORY: { normal: 'frame_012.png', selected: 'frame_018.png' },
    SETTINGS: { normal: 'frame_013.png', selected: 'frame_019.png' },
    CAMP: { normal: 'frame_014.png', selected: 'frame_020.png' },
    QUESTS: { normal: 'frame_015.png', selected: 'frame_021.png' },
    PORTAL: { normal: 'frame_016.png', selected: 'frame_022.png' },
    MAP: { normal: 'frame_017.png', selected: 'frame_023.png' },
    BACK: { normal: 'frame_013.png', selected: 'frame_019.png' } // Reusing gears
};

interface SpritesheetButtonProps {
    type: SpritesheetButtonType;
    onClick?: (e: React.MouseEvent) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onTouchStart?: () => void;
    selected?: boolean;
    disabled?: boolean;
    size?: number; // pixel diameter (default: 44 for ideal touch target)
    badge?: string | number;
    title?: string;
    id?: string;
    className?: string;
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    style?: React.CSSProperties;
}

export const SpritesheetButton: React.FC<SpritesheetButtonProps> = ({
    type,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onTouchStart,
    selected = false,
    disabled = false,
    size = 46,
    badge,
    title,
    id,
    className = '',
    initial,
    animate,
    exit,
    transition,
    style = {}
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Get corresponding frames
    const frameKeys = type ? BUTTON_MAP[type] : null;
    if (!frameKeys) return null;
    const activeFrameKey = (selected || isHovered) ? frameKeys.selected : frameKeys.normal;
    const frame = SPRITESHEET_FRAMES[activeFrameKey];

    // Calculate dimensions
    const scale = size / frame.w;
    const imgWidth = 1608 * scale;
    const imgHeight = 4306 * scale;
    const left = -frame.x * scale;
    const top = -frame.y * scale;

    const handleMouseEnter = () => {
        if (disabled) return;
        setIsHovered(true);
        onMouseEnter?.();
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        onMouseLeave?.();
    };

    const handleTouchStart = () => {
        if (disabled) return;
        onTouchStart?.();
    };

    return (
        <motion.button
            id={id}
            title={title}
            onClick={disabled ? undefined : onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            disabled={disabled}
            whileHover={disabled ? {} : { scale: 1.08 }}
            whileTap={disabled ? {} : { scale: 0.92 }}
            initial={initial}
            animate={animate}
            exit={exit}
            transition={transition}
            style={{
                width: size,
                height: size,
                minWidth: size,
                minHeight: size,
                ...style
            }}
            className={`
                relative overflow-hidden rounded-full flex items-center justify-center select-none cursor-pointer
                transition-shadow duration-150 border border-white/10 shadow-lg backdrop-blur-md bg-slate-900/40
                ${selected ? 'ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'hover:shadow-[0_0_10px_rgba(255,255,255,0.15)]'}
                ${disabled ? 'opacity-35 cursor-not-allowed filter grayscale' : ''}
                ${className}
            `}
        >
            {/* The clipped Spritesheet Image */}
            <img
                src="https://raw.githubusercontent.com/Leem0nGames/gameassets/main/RO/icons/spritesheetbuttonsUI.png"
                alt={type}
                draggable={false}
                referrerPolicy="no-referrer"
                style={{
                    position: 'absolute',
                    width: imgWidth,
                    height: imgHeight,
                    left: left,
                    top: top,
                    maxWidth: 'none',
                    imageRendering: 'pixelated'
                }}
            />

            {/* Badge overlay if defined */}
            {badge !== undefined && badge !== '' && (
                <span className="absolute -top-1 -right-1 text-[8.5px] font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 shadow border border-amber-300">
                    {badge}
                </span>
            )}
        </motion.button>
    );
};
