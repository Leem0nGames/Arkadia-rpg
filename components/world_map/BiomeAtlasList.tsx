import React from 'react';
import { TerrainType } from '../../types';
import { TERRAIN_NAMES, TERRAIN_MOVEMENT_COST } from '../../constants';

interface BiomeAtlasListProps {
    themeClasses: any;
}

interface BiomeRegion {
    id: string;
    name: string;
    icon: string;
    climate: string;
    dangerLevel: string;
    description: string;
    keyTerrains: string;
    notableSites: string;
}

const ARCADIA_BIOMES: BiomeRegion[] = [
    {
        id: 'CENTRAL',
        name: 'Reino Central de Arcadia',
        icon: '🏰',
        climate: 'Templado y Fértil',
        dangerLevel: 'Bajo (Nv. 1-2)',
        description: 'El corazón pacífico del continente donde se alza la Gran Ciudadela de Arcadia. Rodeada de extensas praderas verdes, campos cultivados, ríos navegables y caminos adoquinados seguros.',
        keyTerrains: 'Praderas, Llanuras, Caminos de Adoquín',
        notableSites: 'Plaza Mayor del Castillo, Aldeas campesinas'
    },
    {
        id: 'WOODS',
        name: 'Dominio Feérico de Sylvandell',
        icon: '🌲',
        climate: 'Húmedo, Frondoso y Místico',
        dangerLevel: 'Medio (Nv. 2-3)',
        description: 'Frondoso manto forestal ancestral situado al oeste. Sus densas copas ocultan campamentos de asalto goblin, santuarios élficos y el Gran Roble de los Druidas.',
        keyTerrains: 'Bosque de Pinos, Selva Virgen, Robles Milenarios',
        notableSites: 'Santuario del Gran Roble, Guarida de Grommash'
    },
    {
        id: 'PEAKS',
        name: 'Bastión Enano de Kaer-Durn',
        icon: '⛰️',
        climate: 'Rocoso, Ventoso y Forjas Ardientes',
        dangerLevel: 'Medio-Alto (Nv. 3-4)',
        description: 'Imponentes cordilleras que flanquean el este de Arcadia. Ricas en vetas de mineral y antiguas forjas subterráneas excavadas en la roca viva por los enanos.',
        keyTerrains: 'Picos Montañosos, Forjas de Piedra, Cañones',
        notableSites: 'Forja del Corazón de Piedra, Minas de Kaer'
    },
    {
        id: 'DESERT',
        name: 'Arenas del Sol de Zun',
        icon: '🏜️',
        climate: 'Árido, Tórrido y Cegador',
        dangerLevel: 'Alto (Nv. 4-5)',
        description: 'Vasto mar de dunas doradas y cañones de arenisca en el sur del reino. Los vientos borran los caminos y bajo la arena reposan necrópolis y monolitos olvidados.',
        keyTerrains: 'Dunas del Desierto, Cañones Áridos, Oases',
        notableSites: 'Ciudadela del Sol Ardiente, Templo del Sol Olvidado'
    },
    {
        id: 'NORTH',
        name: 'Yermos Glaciales de Frostholm',
        icon: '❄️',
        climate: 'Polar, Ventiscas y Hielo Perpetuo',
        dangerLevel: 'Peligroso (Nv. 5+)',
        description: 'Yermos perpetuamente congelados custodiados por murallas de hielo. Las tormentas de nieve reducen la visibilidad y es el territorio predilecto de dragones y gigantes.',
        keyTerrains: 'Tundra Nevada, Glaciares, Bosque Nevado',
        notableSites: 'Bastión del Viento Helado, Guaridas de Dragón'
    },
    {
        id: 'SWAMP',
        name: 'Ciénaga Prohibida de Morth',
        icon: '🦎',
        climate: 'Cálido, Cenagoso y Nocivo',
        dangerLevel: 'Alto (Nv. 3-5)',
        description: 'Pantano brumoso y traicionero donde el lodo ralentiza el avance de las tropas. Las emanaciones de gas y aguas turbias ocultan secretos y brujas de los pantanos.',
        keyTerrains: 'Ciénaga Fangosa, Manglares, Hongos Gigantes',
        notableSites: 'Altar de los Lamentos, Cueva de los Lamentos'
    },
    {
        id: 'SHADOW',
        name: 'Reino de las Sombras (Abismo)',
        icon: '🌌',
        climate: 'Aire Corrupto y Vacío Dimensional',
        dangerLevel: 'Extremo (Nv. 5+)',
        description: 'La dimensión invertida reflejada bajo la realidad. Ríos de magma ardiente, hongos bioluminiscentes carmesí y abismos insondables donde acechan aberraciones arcanas.',
        keyTerrains: 'Bosque Fúngico Arcano, Magma, Abismo',
        notableSites: 'Portales de Transmutación, Fisuras del Vacío'
    }
];

export const BiomeAtlasList: React.FC<BiomeAtlasListProps> = ({ themeClasses }) => {
    return (
        <div className="space-y-3">
            <div className="border-b pb-2 border-slate-800">
                <h3 className={`text-xs font-bold uppercase tracking-widest ${themeClasses.accentText}`}>
                    Atlas Geográfico y Biomas
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                    Guía de supervivencia regional, peligros y orografía de Arcadia.
                </p>
            </div>

            <div className="space-y-2.5">
                {ARCADIA_BIOMES.map(biome => (
                    <div 
                        key={biome.id}
                        className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-amber-500/40 transition-all"
                    >
                        <div className="flex items-center justify-between gap-1 mb-1">
                            <div className="flex items-center gap-1.5">
                                <span className="text-base">{biome.icon}</span>
                                <h4 className="font-serif font-bold text-xs text-amber-200">{biome.name}</h4>
                            </div>
                            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-white/10 text-slate-300 font-bold">
                                {biome.dangerLevel}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 text-[9px] text-slate-400 font-mono mb-1.5">
                            <span>Clima: <span className="text-sky-300">{biome.climate}</span></span>
                        </div>

                        <p className="text-[10px] text-slate-300 leading-snug mb-2">
                            {biome.description}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 border-t border-white/5 text-[9px]">
                            <div className="text-slate-400">
                                <span className="text-slate-500 uppercase font-bold">Terrenos: </span>
                                <span className="text-slate-300">{biome.keyTerrains}</span>
                            </div>
                            <div className="text-slate-400">
                                <span className="text-slate-500 uppercase font-bold">Puntos Clave: </span>
                                <span className="text-amber-400">{biome.notableSites}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
