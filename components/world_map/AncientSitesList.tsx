import React from 'react';
import { ANCIENT_SITES } from '../../data/ancientSites';

interface AncientSitesListProps {
    searchedSites: string[];
    themeClasses: any;
}

export const AncientSitesList: React.FC<AncientSitesListProps> = ({ searchedSites, themeClasses }) => {
    // Group sites by general tactical categories
    const dragClues = ANCIENT_SITES.filter(s => s.type === 'RUINS' || s.type === 'CAVE');
    const sanctuaries = ANCIENT_SITES.filter(s => s.type === 'SANCTUARY');
    const watchtowers = ANCIENT_SITES.filter(s => s.type === 'WATCHTOWER');
    const dungeons = ANCIENT_SITES.filter(s => s.type === 'DUNGEON');

    const getSiteIcon = (type: string) => {
        switch (type) {
            case 'SANCTUARY': return '✨';
            case 'WATCHTOWER': return '🗼';
            case 'DUNGEON': return '🗝️';
            case 'CAVE': return '⛰️';
            default: return '🏛️';
        }
    };

    const renderSiteGroup = (title: string, subtitle: string, sitesList: typeof ANCIENT_SITES, accentStyle: string) => {
        if (sitesList.length === 0) return null;

        return (
            <div className="space-y-2 pt-2 border-b pb-3 border-slate-800 last:border-0 last:pb-0">
                <div className="pb-1">
                    <h3 className={`text-[10px] font-bold uppercase tracking-widest ${accentStyle}`}>
                        {title}
                    </h3>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                        {subtitle}
                    </p>
                </div>

                <div className="space-y-2">
                    {sitesList.map(site => {
                        const isSearched = (searchedSites || []).includes(site.id);
                        return (
                            <div 
                                key={site.id} 
                                className={`p-2.5 rounded-xl border transition-all ${
                                    isSearched 
                                        ? 'bg-slate-900/50 border-emerald-500/30 opacity-80' 
                                        : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm">{getSiteIcon(site.type)}</span>
                                        <span className="font-serif font-bold text-xs text-slate-200">{site.name}</span>
                                    </div>
                                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${
                                        isSearched ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-amber-400'
                                    }`}>
                                        {isSearched ? '✓ Visitado' : `(${site.q}, ${site.r})`}
                                    </span>
                                </div>
                                <div className="text-[9px] text-amber-400/80 font-mono mt-0.5">{site.biomeName}</div>
                                <p className="text-[10px] text-slate-400 mt-1 leading-snug">{site.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {renderSiteGroup('Pistas de Dragón', 'Explora ruinas y cuevas para conseguir las 3 pistas ocultas.', dragClues, themeClasses.accentText)}
            {renderSiteGroup('Santuarios Sagrados', 'Ora ante los altares para curar por completo a tus héroes.', sanctuaries, 'text-yellow-400')}
            {renderSiteGroup('Atalayas de Ojeo', 'Sube a los miradores para revelar grandes porciones del mapa.', watchtowers, 'text-sky-400')}
            {renderSiteGroup('Mazmorras de Élite', 'Derrota a los oscuros guardianes para obtener oro y XP abundantes.', dungeons, 'text-rose-500')}
        </div>
    );
};
