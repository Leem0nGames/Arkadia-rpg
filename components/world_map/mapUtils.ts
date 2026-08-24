import { TerrainType, Dimension, HexCell, WeatherType } from '../../types';
import { TERRAIN_COLORS, TERRAIN_NAMES, TERRAIN_MOVEMENT_COST } from '../../constants';

// Precise Axial Hex Coordinate Conversion (Flat-Topped Layout aligned with Overworld)
export const HEX_RADIUS_RATIO = Math.sqrt(3);

export const hexToScreenPosition = (
    q: number,
    r: number,
    playerX: number,
    playerY: number,
    centerX: number,
    centerY: number,
    scale: number
) => {
    const relQ = q - playerX;
    const relR = r - playerY;
    const x = centerX + relQ * (scale * 1.5);
    const y = centerY + (relR + relQ / 2) * (scale * HEX_RADIUS_RATIO);
    return { x, y };
};

export const screenToHexPosition = (
    screenX: number,
    screenY: number,
    playerX: number,
    playerY: number,
    centerX: number,
    centerY: number,
    scale: number
) => {
    const dx = screenX - centerX;
    const dy = screenY - centerY;
    
    // Reverse hex transformation
    const qRel = (2 / 3 * dx) / scale;
    const rRel = ((-1 / 3 * dx) + (Math.sqrt(3) / 3 * dy)) / scale;
    
    const axialRound = (q: number, r: number) => {
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(-q - r);
        const qDiff = Math.abs(rq - q);
        const rDiff = Math.abs(rr - r);
        const sDiff = Math.abs(rs - (-q - r));
        if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
        else if (rDiff > sDiff) rr = -rq - rs;
        return { q: rq, r: rr };
    };

    const rounded = axialRound(qRel, rRel);
    return { q: rounded.q + playerX, r: rounded.r + playerY };
};

// Draw a regular flat-topped Hexagon Path
export const traceHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
};

export const drawHexPolygon = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    fillColor: string | CanvasGradient,
    strokeColor?: string,
    lineWidth: number = 1
) => {
    traceHexagon(ctx, x, y, radius);
    ctx.fillStyle = fillColor;
    ctx.fill();
    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
};

// ==========================================
// PROCEDURAL RPG BIOME RENDERING ENGINE
// ==========================================

export const drawBiomeTile = (
    ctx: CanvasRenderingContext2D,
    tile: HexCell,
    x: number,
    y: number,
    size: number,
    dimension: Dimension,
    animTime: number = 0,
    isHovered: boolean = false,
    viewMode: string = 'CARTOGRAPHIC'
) => {
    const isUD = dimension === Dimension.UPSIDE_DOWN;
    const terrain = tile.terrain;

    const strokeColor = isHovered 
        ? '#fbbf24' 
        : isUD 
            ? 'rgba(168, 85, 247, 0.25)' 
            : 'rgba(255, 255, 255, 0.12)';

    // --- Procedural View Mode Overlays ---
    if (viewMode === 'ELEVATION') {
        const e = tile.elevation !== undefined ? tile.elevation : 0.15;
        let heightColor = '#000000';
        if (e <= 0.14) {
            heightColor = `rgb(2, ${Math.min(255, Math.max(0, Math.round(20 + e * 400)))}, ${Math.min(255, Math.max(0, Math.round(40 + e * 700)))})`;
        } else if (e < 0.3) {
            heightColor = `rgb(${Math.min(255, Math.max(0, Math.round(10 + (e - 0.14) * 200)))}, ${Math.min(255, Math.max(0, Math.round(100 + (e - 0.14) * 350)))}, 30)`;
        } else if (e < 0.6) {
            heightColor = `rgb(${Math.min(255, Math.max(0, Math.round(150 + (e - 0.3) * 150)))}, ${Math.min(255, Math.max(0, Math.round(110 + (e - 0.3) * 100)))}, 50)`;
        } else if (e < 0.8) {
            heightColor = `rgb(${Math.min(255, Math.max(0, Math.round(80 + (e - 0.6) * 200)))}, ${Math.min(255, Math.max(0, Math.round(90 + (e - 0.6) * 200)))}, ${Math.min(255, Math.max(0, Math.round(100 + (e - 0.6) * 200)))})`;
        } else {
            heightColor = `rgb(${Math.min(255, Math.max(0, Math.round(220 + (e - 0.8) * 175)))}, ${Math.min(255, Math.max(0, Math.round(220 + (e - 0.8) * 175)))}, ${Math.min(255, Math.max(0, Math.round(240 + (e - 0.8) * 75)))})`;
        }
        drawHexPolygon(ctx, x, y, size, heightColor, strokeColor, isHovered ? 2.5 : 0.8);
        return;
    }

    if (viewMode === 'MOISTURE') {
        const m = tile.moisture !== undefined ? tile.moisture : 0.3;
        let moistColor = '#000000';
        if (m < 0.2) {
            moistColor = `rgb(${Math.min(255, Math.max(0, Math.round(230 - m * 150)))}, ${Math.min(255, Math.max(0, Math.round(180 - m * 200)))}, 70)`;
        } else if (m < 0.45) {
            moistColor = `rgb(${Math.min(255, Math.max(0, Math.round(180 - (m - 0.2) * 250)))}, ${Math.min(255, Math.max(0, Math.round(190 + (m - 0.2) * 150)))}, 60)`;
        } else if (m < 0.7) {
            moistColor = `rgb(20, ${Math.min(255, Math.max(0, Math.round(120 + (m - 0.45) * 200)))}, ${Math.min(255, Math.max(0, Math.round(80 + (m - 0.45) * 150)))})`;
        } else {
            moistColor = `rgb(5, ${Math.min(255, Math.max(0, Math.round(80 + (m - 0.7) * 150)))}, ${Math.min(255, Math.max(0, Math.round(150 + (m - 0.7) * 200)))})`;
        }
        drawHexPolygon(ctx, x, y, size, moistColor, strokeColor, isHovered ? 2.5 : 0.8);
        if (size >= 12 && tile.isRiver) {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }
        return;
    }

    if (viewMode === 'KINGDOMS') {
        const kId = tile.kingdomId;
        let kColor = '#475569';
        if (kId === 'ARCADIA_CENTRAL') kColor = '#fbbf24';
        else if (kId === 'SYLVANDELL_ELVES') kColor = '#22c55e';
        else if (kId === 'KAER_DURN_DWARVES') kColor = '#94a3b8';
        else if (kId === 'ZUN_SANDS') kColor = '#f59e0b';
        else if (kId === 'FROSTHOLM_NORTH') kColor = '#38bdf8';
        else if (kId === 'MORTH_SWAMPS') kColor = '#84cc16';

        if (tile.terrain === TerrainType.WATER) {
            kColor = 'rgba(15, 23, 42, 0.85)';
        }
        drawHexPolygon(ctx, x, y, size, kColor, strokeColor, isHovered ? 2.5 : 0.8);
        return;
    }

    // 1. Base Hexagon Fill with rich gradient & elevation shading
    let baseColor = TERRAIN_COLORS[terrain] || '#22c55e';
    let grad = ctx.createLinearGradient(x - size, y - size, x + size, y + size);

    switch (terrain) {
        case TerrainType.WATER:
            grad.addColorStop(0, isUD ? '#1e1b4b' : '#0284c7');
            grad.addColorStop(1, isUD ? '#090514' : '#0369a1');
            break;
        case TerrainType.GRASS:
        case TerrainType.PLAINS:
            grad.addColorStop(0, isUD ? '#1f2937' : '#22c55e');
            grad.addColorStop(1, isUD ? '#111827' : '#15803d');
            break;
        case TerrainType.FOREST:
            grad.addColorStop(0, isUD ? '#4c1d95' : '#166534');
            grad.addColorStop(1, isUD ? '#2e1065' : '#052e16');
            break;
        case TerrainType.JUNGLE:
            grad.addColorStop(0, isUD ? '#581c87' : '#047857');
            grad.addColorStop(1, isUD ? '#3b0764' : '#022c22');
            break;
        case TerrainType.MOUNTAIN:
            grad.addColorStop(0, isUD ? '#475569' : '#64748b');
            grad.addColorStop(1, isUD ? '#0f172a' : '#334155');
            break;
        case TerrainType.TUNDRA:
            grad.addColorStop(0, isUD ? '#334155' : '#e0f2fe');
            grad.addColorStop(1, isUD ? '#1e293b' : '#93c5fd');
            break;
        case TerrainType.DESERT:
            grad.addColorStop(0, isUD ? '#451a03' : '#f59e0b');
            grad.addColorStop(1, isUD ? '#1c1917' : '#b45309');
            break;
        case TerrainType.SWAMP:
            grad.addColorStop(0, isUD ? '#14532d' : '#4d7c0f');
            grad.addColorStop(1, isUD ? '#052e16' : '#1a2e05');
            break;
        case TerrainType.CASTLE:
            grad.addColorStop(0, '#94a3b8');
            grad.addColorStop(1, '#475569');
            break;
        case TerrainType.VILLAGE:
            grad.addColorStop(0, '#d97706');
            grad.addColorStop(1, '#78350f');
            break;
        case TerrainType.RUINS:
            grad.addColorStop(0, '#64748b');
            grad.addColorStop(1, '#1e293b');
            break;
        case TerrainType.LAVA:
            const pulse = (Math.sin(animTime * 2 + (x + y) * 0.1) + 1) * 0.5;
            grad.addColorStop(0, pulse > 0.5 ? '#ef4444' : '#f97316');
            grad.addColorStop(1, '#7f1d1d');
            break;
        case TerrainType.FUNGUS:
            grad.addColorStop(0, '#a855f7');
            grad.addColorStop(1, '#581c87');
            break;
        case TerrainType.CHASM:
            grad.addColorStop(0, '#0f172a');
            grad.addColorStop(1, '#020617');
            break;
        default:
            grad.addColorStop(0, baseColor);
            grad.addColorStop(1, '#0f172a');
    }

    drawHexPolygon(ctx, x, y, size, grad, strokeColor, isHovered ? 2.5 : 0.8);

    // 2. High-Detail Procedural Biome Icons & Textures (when scale is sufficiently visible)
    if (size >= 8) {
        ctx.save();
        ctx.beginPath();
        traceHexagon(ctx, x, y, size - 0.5);
        ctx.clip();

        switch (terrain) {
            case TerrainType.WATER:
                drawWaterDetails(ctx, x, y, size, animTime, isUD);
                break;
            case TerrainType.FOREST:
            case TerrainType.JUNGLE:
                drawForestDetails(ctx, x, y, size, terrain === TerrainType.JUNGLE, isUD);
                break;
            case TerrainType.MOUNTAIN:
                drawMountainDetails(ctx, x, y, size, isUD);
                break;
            case TerrainType.TUNDRA:
                drawTundraDetails(ctx, x, y, size);
                break;
            case TerrainType.DESERT:
                drawDesertDetails(ctx, x, y, size);
                break;
            case TerrainType.SWAMP:
                drawSwampDetails(ctx, x, y, size, animTime);
                break;
            case TerrainType.CASTLE:
                drawCastleDetails(ctx, x, y, size);
                break;
            case TerrainType.VILLAGE:
                drawVillageDetails(ctx, x, y, size);
                break;
            case TerrainType.RUINS:
                drawRuinsDetails(ctx, x, y, size, isUD);
                break;
            case TerrainType.FUNGUS:
                drawFungusDetails(ctx, x, y, size, animTime);
                break;
            case TerrainType.LAVA:
                drawLavaDetails(ctx, x, y, size, animTime);
                break;
            case TerrainType.CHASM:
                drawChasmDetails(ctx, x, y, size, animTime);
                break;
            case TerrainType.GRASS:
            case TerrainType.PLAINS:
                drawGrassDetails(ctx, x, y, size, isUD);
                break;
        }

        ctx.restore();
    }
};

// Details: Water Waves and Coastlines
const drawWaterDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, animTime: number, isUD: boolean) => {
    ctx.strokeStyle = isUD ? 'rgba(192, 132, 252, 0.3)' : 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    const waveOffset = Math.sin(animTime * 1.5 + x * 0.05) * (size * 0.1);

    for (let i = -1; i <= 1; i++) {
        const wy = y + i * (size * 0.35) + waveOffset;
        ctx.beginPath();
        ctx.moveTo(x - size * 0.4, wy);
        ctx.quadraticCurveTo(x - size * 0.2, wy - size * 0.08, x, wy);
        ctx.quadraticCurveTo(x + size * 0.2, wy + size * 0.08, x + size * 0.4, wy);
        ctx.stroke();
    }
};

// Details: Forest and Pine Trees
const drawForestDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isJungle: boolean, isUD: boolean) => {
    const treeColor = isUD 
        ? '#c084fc' 
        : isJungle ? '#065f46' : '#14532d';
    const trunkColor = '#3e2723';

    const treeOffsets = [
        { dx: 0, dy: -size * 0.2, s: size * 0.38 },
        { dx: -size * 0.25, dy: size * 0.15, s: size * 0.3 },
        { dx: size * 0.25, dy: size * 0.18, s: size * 0.32 },
    ];

    treeOffsets.forEach(t => {
        const tx = x + t.dx;
        const ty = y + t.dy;
        const ts = t.s;

        // Tree Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(tx + ts * 0.1, ty + ts * 0.5, ts * 0.45, ts * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trunk
        ctx.fillStyle = trunkColor;
        ctx.fillRect(tx - ts * 0.08, ty, ts * 0.16, ts * 0.45);

        // Canopy Layer
        ctx.fillStyle = treeColor;
        ctx.beginPath();
        if (isJungle) {
            ctx.arc(tx, ty - ts * 0.1, ts * 0.4, 0, Math.PI * 2);
        } else {
            // Pine Triangle
            ctx.moveTo(tx, ty - ts * 0.55);
            ctx.lineTo(tx + ts * 0.35, ty + ts * 0.1);
            ctx.lineTo(tx - ts * 0.35, ty + ts * 0.1);
            ctx.closePath();
        }
        ctx.fill();
    });
};

// Details: Mountain Peaks with Light & Shadow Facets
const drawMountainDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isUD: boolean) => {
    const peaks = [
        { dx: 0, dy: -size * 0.1, w: size * 0.7, h: size * 0.75 },
        { dx: -size * 0.3, dy: size * 0.2, w: size * 0.5, h: size * 0.55 },
        { dx: size * 0.3, dy: size * 0.25, w: size * 0.45, h: size * 0.5 },
    ];

    peaks.forEach(p => {
        const px = x + p.dx;
        const py = y + p.dy;
        const topY = py - p.h * 0.5;
        const baseY = py + p.h * 0.4;
        const leftX = px - p.w * 0.5;
        const rightX = px + p.w * 0.5;

        // Dark side (Shadow)
        ctx.fillStyle = isUD ? '#0f172a' : '#1e293b';
        ctx.beginPath();
        ctx.moveTo(px, topY);
        ctx.lineTo(rightX, baseY);
        ctx.lineTo(px, baseY);
        ctx.closePath();
        ctx.fill();

        // Light side
        ctx.fillStyle = isUD ? '#334155' : '#475569';
        ctx.beginPath();
        ctx.moveTo(px, topY);
        ctx.lineTo(leftX, baseY);
        ctx.lineTo(px, baseY);
        ctx.closePath();
        ctx.fill();

        // Snow Cap
        if (!isUD) {
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.moveTo(px, topY);
            ctx.lineTo(px - p.w * 0.18, topY + p.h * 0.25);
            ctx.lineTo(px, topY + p.h * 0.2);
            ctx.lineTo(px + p.w * 0.18, topY + p.h * 0.25);
            ctx.closePath();
            ctx.fill();
        }
    });
};

// Details: Desert Dunes
const drawDesertDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.4)';
    ctx.lineWidth = 1.2;

    for (let i = -1; i <= 1; i++) {
        const dy = y + i * (size * 0.28);
        ctx.beginPath();
        ctx.moveTo(x - size * 0.5, dy);
        ctx.quadraticCurveTo(x - size * 0.1, dy - size * 0.12, x + size * 0.4, dy + size * 0.05);
        ctx.stroke();
    }
};

// Details: Tundra Ice Crystals
const drawTundraDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1;

    // Small snow sparkle
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.25);
    ctx.lineTo(x, y + size * 0.25);
    ctx.moveTo(x - size * 0.25, y);
    ctx.lineTo(x + size * 0.25, y);
    ctx.stroke();
};

// Details: Swamp Reeds
const drawSwampDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, animTime: number) => {
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 1.2;
    const sway = Math.sin(animTime * 2 + x) * (size * 0.05);

    [-0.2, 0, 0.2].forEach(ox => {
        ctx.beginPath();
        ctx.moveTo(x + ox * size, y + size * 0.2);
        ctx.lineTo(x + (ox * size) + sway, y - size * 0.2);
        ctx.stroke();
    });
};

// Details: Castle Keep
const drawCastleDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const s = size * 0.6;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - s * 0.4, y - s * 0.3, s * 0.8, s * 0.7);

    // Towers
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - s * 0.5, y - s * 0.5, s * 0.3, s * 0.9);
    ctx.fillRect(x + s * 0.2, y - s * 0.5, s * 0.3, s * 0.9);

    // Banners
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x - s * 0.1, y - s * 0.65, s * 0.2, s * 0.25);
};

// Details: Village Roofs
const drawVillageDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const s = size * 0.5;
    [-0.2, 0.2].forEach(ox => {
        const hx = x + ox * size;
        const hy = y + (ox === 0.2 ? -0.1 : 0.1) * size;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(hx - s * 0.3, hy, s * 0.6, s * 0.4);
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(hx, hy - s * 0.35);
        ctx.lineTo(hx + s * 0.35, hy);
        ctx.lineTo(hx - s * 0.35, hy);
        ctx.closePath();
        ctx.fill();
    });
};

// Details: Ancient Ruins
const drawRuinsDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isUD: boolean) => {
    const s = size * 0.5;
    ctx.fillStyle = isUD ? '#c084fc' : '#94a3b8';
    
    // Cracked Pillars
    ctx.fillRect(x - s * 0.4, y - s * 0.35, s * 0.2, s * 0.7);
    ctx.fillRect(x + s * 0.2, y - s * 0.2, s * 0.2, s * 0.55);
    // Lintel
    ctx.fillRect(x - s * 0.45, y - s * 0.45, s * 0.9, s * 0.15);
};

// Details: Bioluminescent Fungus
const drawFungusDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, animTime: number) => {
    const s = size * 0.5;
    const glow = (Math.sin(animTime * 3 + x) + 1) * 0.5;

    ctx.fillStyle = glow > 0.5 ? '#e879f9' : '#c084fc';
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.35, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fdf4ff';
    ctx.fillRect(x - s * 0.06, y - s * 0.1, s * 0.12, s * 0.4);
};

// Details: Magma Cracks
const drawLavaDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, animTime: number) => {
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.4, y - size * 0.2);
    ctx.lineTo(x, y);
    ctx.lineTo(x + size * 0.3, y + size * 0.3);
    ctx.stroke();
};

// Details: Void Chasm
const drawChasmDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, animTime: number) => {
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.3, y - size * 0.4);
    ctx.lineTo(x + size * 0.1, y);
    ctx.lineTo(x - size * 0.2, y + size * 0.4);
    ctx.stroke();
};

// Details: Grass blades
const drawGrassDetails = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, isUD: boolean) => {
    ctx.strokeStyle = isUD ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - size * 0.15, y + size * 0.1);
    ctx.lineTo(x - size * 0.1, y - size * 0.15);
    ctx.moveTo(x + size * 0.1, y + size * 0.15);
    ctx.lineTo(x + size * 0.15, y - size * 0.1);
    ctx.stroke();
};

// ==========================================
// POI, QUEST & PLAYER ACCENT OVERLAYS
// ==========================================

export const drawPoiMarker = (
    ctx: CanvasRenderingContext2D,
    tile: HexCell,
    x: number,
    y: number,
    scale: number,
    animTime: number = 0
) => {
    const pulse = (Math.sin(animTime * 3) + 1) * 0.5;

    // Dragon Lair: Fiery Crimson Marker
    if (tile.poiType === 'DRAGON_LAIR') {
        const radius = scale * 0.85;
        // Outer pulsing hazard ring
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();

        // Badge
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fca5a5';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = `${Math.max(10, scale * 0.9)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐉', x, y);
    }
    // Goblin Lair: Emerald War Trophy
    else if (tile.poiType === 'GOBLIN_LAIR') {
        const radius = scale * 0.75;
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = `${Math.max(9, scale * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👺', x, y);
    }
    // Ancient Ruins: Cyan Archaic Keystone
    else if (tile.poiType === 'ANCIENT_RUINS') {
        const radius = scale * 0.75;
        ctx.fillStyle = '#0891b2';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = `${Math.max(9, scale * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏛️', x, y);
    }
    // Mystic Cave: Amethyst Portal/Cave
    else if (tile.poiType === 'MYSTIC_CAVE') {
        const radius = scale * 0.75;
        ctx.fillStyle = '#7e22ce';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d8b4fe';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.font = `${Math.max(9, scale * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛰️', x, y);
    }
    // Sanctuary: Golden Celestial Beacon
    else if (tile.poiType === 'SANCTUARY') {
        const radius = scale * 0.8;
        // Outer pulsing holy halo
        ctx.strokeStyle = `rgba(250, 204, 21, ${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + pulse * 3.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#854d0e';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.font = `${Math.max(9, scale * 0.85)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✨', x, y);
    }
    // Watchtower: Slate / Steel Spyglass Beacon
    else if (tile.poiType === 'WATCHTOWER') {
        const radius = scale * 0.75;
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.font = `${Math.max(9, scale * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🗼', x, y);
    }
    // Dungeon: Obsidian / Crimson Catacombs Portal
    else if (tile.poiType === 'DUNGEON') {
        const radius = scale * 0.82;
        ctx.strokeStyle = `rgba(225, 29, 72, ${0.4 + pulse * 0.45})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + pulse * 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#4c0519';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.font = `${Math.max(9, scale * 0.85)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🗝️', x, y);
    }
    // Portal / Dimension Gate
    else if (tile.hasPortal) {
        const radius = scale * 0.8;
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, radius + pulse * 5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#6b21a8';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${Math.max(9, scale * 0.8)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌀', x, y);
    }
};

// Player Party Token
export const drawPlayerToken = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    animTime: number = 0
) => {
    const pulse = (Math.sin(animTime * 4) + 1) * 0.5;
    const radius = Math.max(7, scale * 0.9);

    // Radar pulse ring
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.4 * (1 - pulse)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + pulse * 14, 0, Math.PI * 2);
    ctx.stroke();

    // Outer Gold Shield Frame
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.fill();

    // Inner Core
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Party Icon / Star
    ctx.fillStyle = '#fbbf24';
    ctx.font = `${Math.max(9, scale * 0.8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️', x, y);
};

// Compass Rose (Rosa de los Vientos)
export const drawCompassRose = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
) => {
    ctx.save();
    ctx.translate(x, y);

    // Outer Dial Ring
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Cardinal Needles
    const cardinals = [
        { angle: -Math.PI / 2, label: 'N', color: '#ef4444' }, // North = Red
        { angle: Math.PI / 2, label: 'S', color: '#cbd5e1' },
        { angle: 0, label: 'E', color: '#cbd5e1' },
        { angle: Math.PI, label: 'O', color: '#cbd5e1' }
    ];

    cardinals.forEach(c => {
        ctx.save();
        ctx.rotate(c.angle);

        // Needle
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-radius * 0.12, -radius * 0.2);
        ctx.lineTo(0, -radius * 0.9);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius * 0.12, -radius * 0.2);
        ctx.lineTo(0, -radius * 0.9);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Label
        const lx = Math.cos(c.angle) * (radius * 1.22);
        const ly = Math.sin(c.angle) * (radius * 1.22);
        ctx.fillStyle = c.color === '#ef4444' ? '#f87171' : '#94a3b8';
        ctx.font = 'bold 10px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.label, lx, ly);
    });

    // Center Gold Pivot
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};

export const getBiomeNameForCoords = (q: number, r: number, dimension: Dimension): string => {
    if (dimension === Dimension.UPSIDE_DOWN) {
        return 'Reino de las Sombras (Abismo)';
    }

    const dist = Math.sqrt(q * q + r * r);
    if (dist > 52) return 'Archipiélago de la Niebla y Océano';
    if (r < -20) return 'Yermos Glaciales de Frostholm';
    if (r > 20) return 'Arenas del Sol de Zun';
    if (q < -15) return 'Dominio Feérico de Sylvandell';
    if (q > 15 && r < 15) return 'Bastión Enano de Kaer-Durn';
    if (q > 6 && q < 20 && r > 6 && r < 20) return 'Ciénaga Prohibida de Morth';
    return 'Tierras Centrales de Arcadia';
};
