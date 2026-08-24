import React, { useRef, useEffect, useState, useCallback } from 'react';
import { WorldGenerator } from '../../services/WorldGenerator';
import { 
    hexToScreenPosition, 
    screenToHexPosition, 
    drawBiomeTile, 
    drawPoiMarker, 
    drawPlayerToken, 
    drawCompassRose,
    getBiomeNameForCoords
} from './mapUtils';
import { Dimension, HexCell } from '../../types';

interface MapCanvasProps {
    exploredTiles: Record<Dimension, Set<string> | string[] | any>;
    dimension: Dimension;
    playerPos: { x: number; y: number };
    scale: number;
    pan: { x: number; y: number };
    themeConfig: any;
    onWheel: (e: React.WheelEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseUp: () => void;
    onSelectTile?: (tile: HexCell, coords: { q: number; r: number }) => void;
    hoveredTileCoords?: { q: number; r: number } | null;
    setHoveredTileCoords?: (coords: { q: number; r: number } | null) => void;
    viewMode?: string;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
    exploredTiles,
    dimension,
    playerPos,
    scale,
    pan,
    themeConfig,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onSelectTile,
    hoveredTileCoords,
    setHoveredTileCoords,
    viewMode = 'CARTOGRAPHIC'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const startTimeRef = useRef<number>(Date.now());

    // Coordinate conversion helper for mouse events
    const getHexFromEvent = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const centerX = width / 2 + pan.x;
        const centerY = height / 2 + pan.y;

        return screenToHexPosition(mouseX, mouseY, playerPos.x, playerPos.y, centerX, centerY, scale);
    }, [pan, playerPos, scale]);

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        onMouseMove(e);
        if (setHoveredTileCoords) {
            const hex = getHexFromEvent(e);
            if (hex) {
                setHoveredTileCoords(hex);
            }
        }
    };

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const hex = getHexFromEvent(e);
        if (hex && onSelectTile) {
            const tile = WorldGenerator.getTile(hex.q, hex.r, dimension);
            onSelectTile(tile, hex);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) return;

            const width = canvas.width = canvas.clientWidth;
            const height = canvas.height = canvas.clientHeight;

            const animTime = (Date.now() - startTimeRef.current) / 1000;

            // 1. Cartographic Antique Background / Void Background
            const isUD = dimension === Dimension.UPSIDE_DOWN;
            const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
            
            if (isUD) {
                bgGrad.addColorStop(0, '#0a0518');
                bgGrad.addColorStop(1, '#020008');
            } else if (themeConfig.id === 'parchment') {
                bgGrad.addColorStop(0, '#2b1d14');
                bgGrad.addColorStop(1, '#150c08');
            } else {
                bgGrad.addColorStop(0, '#0f172a');
                bgGrad.addColorStop(1, '#020617');
            }

            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            // 2. Subtle Cartographic Latitude/Longitude Grid Lines
            ctx.strokeStyle = isUD ? 'rgba(168, 85, 247, 0.05)' : 'rgba(245, 158, 11, 0.05)';
            ctx.lineWidth = 1;
            const gridSpacing = 40;
            for (let gx = 0; gx < width; gx += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, height);
                ctx.stroke();
            }
            for (let gy = 0; gy < height; gy += gridSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(width, gy);
                ctx.stroke();
            }

            const rawExplored = exploredTiles[dimension];
            const exploredSet: string[] = Array.isArray(rawExplored) 
                ? rawExplored 
                : rawExplored instanceof Set 
                    ? Array.from(rawExplored) 
                    : [];

            const centerX = width / 2 + pan.x;
            const centerY = height / 2 + pan.y;

            // Render Explored Hexagonal Tiles
            exploredSet.forEach(key => {
                const [q, r] = key.split(',').map(Number);
                const { x, y } = hexToScreenPosition(q, r, playerPos.x, playerPos.y, centerX, centerY, scale);

                // Frustum Culling
                const margin = scale * 2.5;
                if (x < -margin || x > width + margin || y < -margin || y > height + margin) return;

                const tile = WorldGenerator.getTile(q, r, dimension);
                const isHovered = hoveredTileCoords?.q === q && hoveredTileCoords?.r === r;

                // Draw Procedural High-Detail Biome Hexagon
                drawBiomeTile(ctx, tile, x, y, scale, dimension, animTime, isHovered, viewMode);

                // Draw POI Badges (Lairs, Ancient Sites, Castles, Portals)
                drawPoiMarker(ctx, tile, x, y, scale, animTime);
            });

            // 3. Player Party Token & Pulsing Beacon
            const { x: playerScreenX, y: playerScreenY } = hexToScreenPosition(
                playerPos.x, 
                playerPos.y, 
                playerPos.x, 
                playerPos.y, 
                centerX, 
                centerY, 
                scale
            );
            drawPlayerToken(ctx, playerScreenX, playerScreenY, scale, animTime);

            // 4. Overworld Camera Viewport Frame (Current visible exploration sector)
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.35)';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(playerScreenX - (12 * scale), playerScreenY - (9 * scale), 24 * scale, 18 * scale);
            ctx.setLineDash([]);

            // 5. Cartographic Compass Rose (Bottom Left)
            drawCompassRose(ctx, 48, height - 48, 30);

            // 6. Scale Bar in Bottom Right
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(width - 130, height - 32, 115, 22);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.strokeRect(width - 130, height - 32, 115, 22);

            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`1 Hex ≈ ${Math.round(scale * 1.5)} km`, width - 72, height - 18);

            if (isMounted) {
                animFrameRef.current = requestAnimationFrame(render);
            }
        };

        render();

        return () => {
            isMounted = false;
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [exploredTiles, dimension, playerPos, scale, pan, themeConfig, hoveredTileCoords, viewMode]);

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => {
                onMouseUp();
                if (setHoveredTileCoords) setHoveredTileCoords(null);
            }}
            onClick={handleCanvasClick}
        />
    );
};
