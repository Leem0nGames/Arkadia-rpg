import React from 'react';

interface StatusIconProps {
    condition: string;
    size?: number;
}

// Assuming a 32x32 grid for status_icons_UI.png
// This mapping might need adjustment based on the actual file content.
const STATUS_MAP: Record<string, { x: number; y: number }> = {
    'poisoned': { x: 0, y: 0 },
    'stunned': { x: 32, y: 0 },
    // Add more as needed
};

export const StatusIcon: React.FC<StatusIconProps> = ({ condition, size = 16 }) => {
    const icon = STATUS_MAP[condition.toLowerCase()];
    if (!icon) return null;

    return (
        <div 
            style={{
                width: size,
                height: size,
                backgroundImage: 'url(/assets/status_icons_UI.png)',
                backgroundPosition: `-${icon.x}px -${icon.y}px`,
                backgroundSize: '128px 128px', // Assuming 4x4 grid of 32x32 icons
                imageRendering: 'pixelated'
            }}
            className="inline-block"
            title={condition}
        />
    );
};
