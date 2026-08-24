import React, { useRef, useState, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { WorldGenerator } from '../services/WorldGenerator';
import { TERRAIN_NAMES, TERRAIN_MOVEMENT_COST } from '../constants';
import { Dimension, HexCell, WeatherType } from '../types';
import { getThemeConfig } from '../services/themeSystem';
import { QuestLog } from './world_map/QuestLog';
import { AncientSitesList } from './world_map/AncientSitesList';
import { BiomeAtlasList } from './world_map/BiomeAtlasList';
import { MapCanvas } from './world_map/MapCanvas';
import { getBiomeNameForCoords } from './world_map/mapUtils';
import { sfx } from '../services/SoundSystem';

export const WorldMapScreen: React.FC = () => {
    const { exploredTiles, dimension, playerPos, toggleMap, quests, uiTheme, searchedSites } = useGameStore();
    const [scale, setScale] = useState(14); // Realistic hex radius for deep RPG visual clarity
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [selectedTab, setSelectedTab] = useState<'QUESTS' | 'SITES' | 'BIOMES'>('QUESTS');
    const [selectedTileInfo, setSelectedTileInfo] = useState<{ tile: HexCell; coords: { q: number; r: number } } | null>(null);
    const [hoveredTileCoords, setHoveredTileCoords] = useState<{ q: number; r: number } | null>(null);
    const [viewMode, setViewMode] = useState<'CARTOGRAPHIC' | 'ELEVATION' | 'MOISTURE' | 'KINGDOMS'>('CARTOGRAPHIC');

    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    const themeConfig = getThemeConfig(uiTheme);
    const activeQuests = quests.filter(q => !q.completed);

    const currentBiomeName = useMemo(() => {
        return getBiomeNameForCoords(playerPos.x, playerPos.y, dimension);
    }, [playerPos.x, playerPos.y, dimension]);

    // Zoom Handlers
    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? -2 : 2;
        setScale(s => Math.max(6, Math.min(28, s + delta)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        isDragging.current = false;
    };

    const handleRecenter = () => {
        setPan({ x: 0, y: 0 });
        setScale(14);
        sfx.playUiClick();
    };

    const handleSelectTile = (tile: HexCell, coords: { q: number; r: number }) => {
        setSelectedTileInfo({ tile, coords });
        sfx.playUiClick();
    };

    // Calculate distance from player party
    const inspectedDistance = selectedTileInfo ? Math.round(
        (Math.abs(selectedTileInfo.coords.q - playerPos.x) +
         Math.abs(selectedTileInfo.coords.q + selectedTileInfo.coords.r - playerPos.x - playerPos.y) +
         Math.abs(selectedTileInfo.coords.r - playerPos.y)) / 2
    ) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-200 p-2 sm:p-4 lg:p-6 pointer-events-auto select-none">
            <div className="w-full max-w-7xl h-full max-h-[94dvh] grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] relative border border-white/15 bg-slate-950/90 backdrop-blur-2xl">
                
                {/* Close Button */}
                <button 
                    onClick={() => {
                        sfx.playUiClick();
                        toggleMap();
                    }}
                    className="absolute top-3 right-3 lg:top-4 lg:right-4 z-50 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center border border-white/20 bg-slate-900/90 text-amber-300 hover:bg-slate-800 shadow-xl transition-transform active:scale-90 font-black text-sm"
                    aria-label="Cerrar Mapa"
                >
                    ✕
                </button>

                {/* LEFT & CENTER: HIGH-DETAIL RPG MAP CANVAS (8 cols on desktop) */}
                <div className="lg:col-span-8 relative bg-slate-950 border-b lg:border-b-0 lg:border-r border-white/10 h-[52vh] lg:h-auto overflow-hidden flex flex-col">
                    
                    {/* Top Floating Region & Position Banner */}
                    <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 pointer-events-none">
                        <div className="bg-slate-950/80 backdrop-blur-xl px-3.5 py-1.5 rounded-2xl border border-white/15 shadow-xl text-left pointer-events-auto">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs">🗺️</span>
                                <span className="text-xs font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400">
                                    {dimension === Dimension.UPSIDE_DOWN ? 'REINO DE LAS SOMBRAS' : 'ARCADIA'}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-300 font-mono mt-0.5 flex items-center gap-2">
                                <span>📍 {currentBiomeName}</span>
                                <span className="text-amber-400 font-bold">({playerPos.x}, {playerPos.y})</span>
                            </div>
                        </div>

                        {/* Procedural Map Layers Selector */}
                        <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-xl p-1 rounded-2xl border border-white/15 shadow-xl pointer-events-auto overflow-x-auto max-w-[280px] xs:max-w-[340px] md:max-w-md">
                            <button
                                onClick={() => { setViewMode('CARTOGRAPHIC'); sfx.playUiClick(); }}
                                className={`px-2.5 py-1 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all min-h-[32px] ${
                                    viewMode === 'CARTOGRAPHIC' 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black' 
                                        : 'text-slate-300 hover:bg-slate-800'
                                }`}
                                title="Cartografía Artística"
                            >
                                <span>🎨</span> <span className="hidden xs:inline">Físico</span>
                            </button>
                            <button
                                onClick={() => { setViewMode('ELEVATION'); sfx.playUiClick(); }}
                                className={`px-2.5 py-1 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all min-h-[32px] ${
                                    viewMode === 'ELEVATION' 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black' 
                                        : 'text-slate-300 hover:bg-slate-800'
                                }`}
                                title="Mapa de Elevación"
                            >
                                <span>🌋</span> <span className="hidden xs:inline">Altura</span>
                            </button>
                            <button
                                onClick={() => { setViewMode('MOISTURE'); sfx.playUiClick(); }}
                                className={`px-2.5 py-1 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all min-h-[32px] ${
                                    viewMode === 'MOISTURE' 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black' 
                                        : 'text-slate-300 hover:bg-slate-800'
                                }`}
                                title="Humedad y Ríos"
                            >
                                <span>💧</span> <span className="hidden xs:inline">Humedad</span>
                            </button>
                            <button
                                onClick={() => { setViewMode('KINGDOMS'); sfx.playUiClick(); }}
                                className={`px-2.5 py-1 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all min-h-[32px] ${
                                    viewMode === 'KINGDOMS' 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black' 
                                        : 'text-slate-300 hover:bg-slate-800'
                                }`}
                                title="Reinos Políticos"
                            >
                                <span>👑</span> <span className="hidden xs:inline">Reinos</span>
                            </button>
                        </div>
                    </div>

                    {/* Top Right Quick Legend */}
                    <div className="absolute top-3 right-16 z-20 hidden md:flex items-center gap-2.5 bg-slate-950/80 backdrop-blur-xl px-3 py-1.5 rounded-2xl border border-white/15 text-[9px] text-slate-300 pointer-events-none font-mono">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Ruinas</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Cuevas</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Dragón</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Capital</span>
                    </div>

                    {/* Floating Zoom & Recenter Controls (Bottom Right) */}
                    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
                        <button 
                            onClick={handleRecenter}
                            className="min-w-[44px] min-h-[44px] rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-amber-300 flex items-center justify-center shadow-xl active:scale-90 font-bold text-xs"
                            title="Recentrar en el Grupo"
                        >
                            🎯
                        </button>
                        <button 
                            onClick={() => {
                                setScale(s => Math.min(28, s + 3));
                                sfx.playUiClick();
                            }}
                            className="min-w-[44px] min-h-[44px] rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-amber-300 flex items-center justify-center shadow-xl active:scale-90 font-black text-base"
                            title="Acercar Zoom"
                        >
                            +
                        </button>
                        <button 
                            onClick={() => {
                                setScale(s => Math.max(6, s - 3));
                                sfx.playUiClick();
                            }}
                            className="min-w-[44px] min-h-[44px] rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-amber-300 flex items-center justify-center shadow-xl active:scale-90 font-black text-base"
                            title="Alejar Zoom"
                        >
                            -
                        </button>
                    </div>

                    {/* Floating Tile Inspector Card (Bottom Left) */}
                    {selectedTileInfo && (
                        <div className="absolute bottom-4 left-4 z-20 max-w-xs bg-slate-950/90 backdrop-blur-2xl p-3 rounded-2xl border border-amber-500/40 shadow-2xl animate-in fade-in zoom-in-95 duration-150 pointer-events-auto">
                            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-1.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm">🧭</span>
                                    <h4 className="font-serif font-black text-xs text-amber-300">
                                        {TERRAIN_NAMES[selectedTileInfo.tile.terrain] || 'Terreno Desconocido'}
                                    </h4>
                                </div>
                                <button 
                                    onClick={() => setSelectedTileInfo(null)}
                                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-1 text-[10px]">
                                <div className="text-slate-300 font-mono flex justify-between">
                                    <span>Bioma:</span>
                                    <span className="text-amber-200 font-bold truncate max-w-[150px]">
                                        {getBiomeNameForCoords(selectedTileInfo.coords.q, selectedTileInfo.coords.r, dimension)}
                                    </span>
                                </div>
                                <div className="text-slate-300 font-mono flex justify-between">
                                    <span>Coordenadas:</span>
                                    <span className="text-slate-100 font-bold">({selectedTileInfo.coords.q}, {selectedTileInfo.coords.r})</span>
                                </div>
                                <div className="text-slate-300 font-mono flex justify-between">
                                    <span>Distancia:</span>
                                    <span className="text-sky-300 font-bold">{inspectedDistance} hexágonos</span>
                                </div>
                                <div className="text-slate-300 font-mono flex justify-between">
                                    <span>Coste Movimiento:</span>
                                    <span className="text-emerald-400 font-bold">
                                        {TERRAIN_MOVEMENT_COST[selectedTileInfo.tile.terrain] >= 99 ? 'Infranqueable' : `${TERRAIN_MOVEMENT_COST[selectedTileInfo.tile.terrain]} MP`}
                                    </span>
                                </div>
                                {selectedTileInfo.tile.poiName && (
                                    <div className="mt-1 pt-1 border-t border-white/10 text-amber-300 font-serif font-bold text-[10px]">
                                        ⭐ {selectedTileInfo.tile.poiName}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Interactive Canvas */}
                    <MapCanvas 
                        exploredTiles={exploredTiles}
                        dimension={dimension}
                        playerPos={playerPos}
                        scale={scale}
                        pan={pan}
                        themeConfig={themeConfig}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onSelectTile={handleSelectTile}
                        hoveredTileCoords={hoveredTileCoords}
                        setHoveredTileCoords={setHoveredTileCoords}
                        viewMode={viewMode}
                    />
                </div>

                {/* RIGHT: TABS & ATLAS SIDEBAR (4 cols on desktop) */}
                <div className="lg:col-span-4 flex flex-col bg-slate-900/60 backdrop-blur-xl h-[42vh] lg:h-auto overflow-hidden">
                    
                    {/* Header & Tabs */}
                    <div className="p-3 sm:p-4 border-b border-white/10 bg-slate-950/70 flex flex-col gap-2 shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm sm:text-base font-serif font-black text-slate-100 flex items-center gap-1.5">
                                <span>📜</span> Atlas & Bitácora
                            </h2>
                            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                {dimension === Dimension.UPSIDE_DOWN ? 'Sombra' : 'Arcadia'}
                            </span>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-white/10">
                            <button 
                                onClick={() => {
                                    setSelectedTab('QUESTS');
                                    sfx.playUiClick();
                                }}
                                className={`min-h-[44px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 ${
                                    selectedTab === 'QUESTS' 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black' 
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <span>⚔️</span>
                                <span>Misiones</span>
                            </button>

                            <button 
                                onClick={() => {
                                    setSelectedTab('SITES');
                                    sfx.playUiClick();
                                }}
                                className={`min-h-[44px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 ${
                                    selectedTab === 'SITES' 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black' 
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <span>🏛️</span>
                                <span>Sitios</span>
                            </button>

                            <button 
                                onClick={() => {
                                    setSelectedTab('BIOMES');
                                    sfx.playUiClick();
                                }}
                                className={`min-h-[44px] py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 active:scale-95 ${
                                    selectedTab === 'BIOMES' 
                                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black' 
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <span>🌲</span>
                                <span>Biomas</span>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content Container */}
                    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar">
                        {selectedTab === 'QUESTS' ? (
                            <QuestLog activeQuests={activeQuests} themeClasses={themeConfig.classes} />
                        ) : selectedTab === 'SITES' ? (
                            <AncientSitesList searchedSites={searchedSites} themeClasses={themeConfig.classes} />
                        ) : (
                            <BiomeAtlasList themeClasses={themeConfig.classes} />
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
