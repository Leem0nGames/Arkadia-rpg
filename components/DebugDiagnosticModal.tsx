import React, { useState, useEffect, useMemo } from 'react';
import { 
  textureManager, 
  getTextureDiagnostics, 
  printTextureDiagnosticsConsole, 
  TextureDiagnosticReport,
  TextureMetadata,
  verifyAssetPathsMapping
} from '../services/TextureManager';
import { ASSETS } from '../constants';

interface DebugDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterCategory = 'all' | 'local' | 'remote' | 'procedural' | 'error' | 'minecraft' | 'wesnoth' | 'other';
type ActiveTab = 'textures' | 'vram3d' | 'mapping';

export const DebugDiagnosticModal: React.FC<DebugDiagnosticModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<TextureDiagnosticReport>(() => getTextureDiagnostics());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all');
  const [activeTab, setActiveTab] = useState<ActiveTab>('textures');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Subscribe to live TextureManager updates
  useEffect(() => {
    if (!isOpen) return;
    setReport(getTextureDiagnostics());
    const unsubscribe = textureManager.subscribe(() => {
      setReport(getTextureDiagnostics());
    });
    return () => unsubscribe();
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleRefresh = () => {
    setReport(getTextureDiagnostics());
  };

  const handleRetryErrors = () => {
    setIsRetrying(true);
    textureManager.retryFailedTextures();
    setTimeout(() => {
      setReport(getTextureDiagnostics());
      setIsRetrying(false);
    }, 600);
  };

  const handleCopyJson = () => {
    const jsonStr = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    });
  };

  // Filtered textures list
  const filteredTextures = useMemo(() => {
    return report.textures.filter((t) => {
      // Category filter
      if (filterCategory === 'local' && t.sourceType !== 'LOCAL') return false;
      if (filterCategory === 'remote' && t.sourceType !== 'REMOTE') return false;
      if (filterCategory === 'procedural' && t.sourceType !== 'PROCEDURAL') return false;
      if (filterCategory === 'error' && t.status !== 'ERROR') return false;
      if (filterCategory === 'minecraft' && t.folder !== 'minecraft') return false;
      if (filterCategory === 'wesnoth' && t.folder !== 'wesnoth') return false;
      if (filterCategory === 'other' && t.folder !== 'other') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchKey = t.key.toLowerCase().includes(q);
        const matchUrl = t.url.toLowerCase().includes(q);
        const matchFilename = (t.url.split('/').pop() || '').toLowerCase().includes(q);
        return matchKey || matchUrl || matchFilename;
      }
      return true;
    });
  }, [report.textures, filterCategory, searchQuery]);

  if (!isOpen) return null;

  const total = report.totalRequested || 1;
  const localPct = Math.round((report.localCount / total) * 100);
  const remotePct = Math.round((report.remoteCount / total) * 100);
  const procPct = Math.round((report.proceduralCount / total) * 100);
  const errPct = Math.round((report.errorCount / total) * 100);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
              🔍
            </div>
            <div>
              <h2 className="text-base sm:text-lg md:text-xl font-black text-amber-300 tracking-wide flex items-center gap-2">
                DIAGNÓSTICO DE TEXTURAS Y MAPEO DE ASSETS
              </h2>
              <p className="text-xs text-slate-400">
                Verificación de archivos locales de Minecraft, Wesnoth y estado del motor gráfico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label="Cerrar modal de diagnóstico"
              className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('textures')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'textures'
                  ? 'bg-amber-600 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>🎨</span> Texturas ({report.totalRequested})
            </button>
            <button
              onClick={() => setActiveTab('vram3d')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'vram3d'
                  ? 'bg-amber-600 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>⚡</span> Motor 3D & VRAM
            </button>
            <button
              onClick={() => setActiveTab('mapping')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'mapping'
                  ? 'bg-amber-600 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>🗺️</span> Mapeo de Rutas
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRefresh}
              title="Refrescar estado"
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center gap-1"
            >
              🔄
            </button>
            <button
              onClick={handleCopyJson}
              title="Copiar reporte JSON"
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center gap-1"
            >
              {copiedNotification ? '✅ Copiado' : '📋 JSON'}
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* TOP METRICS BENTO GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Solicitadas */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Solicitadas</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-white">{report.totalRequested}</span>
                <span className="text-xs text-slate-500 font-mono">100%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-slate-400 h-full rounded-full w-full" />
              </div>
            </div>

            {/* Cargadas OK (Local) */}
            <div 
              onClick={() => setFilterCategory('local')}
              className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
                filterCategory === 'local' ? 'bg-emerald-950/60 border-emerald-500' : 'bg-slate-950/80 border-emerald-900/40 hover:border-emerald-700/60'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <span>✅</span> Local OK
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-emerald-300">{report.localCount}</span>
                <span className="text-xs text-emerald-400/80 font-mono">{localPct}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${localPct}%` }} />
              </div>
            </div>

            {/* Fallbacks Procedurales / Remoto */}
            <div 
              onClick={() => setFilterCategory(report.remoteCount > 0 ? 'remote' : 'procedural')}
              className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
                filterCategory === 'procedural' || filterCategory === 'remote'
                  ? 'bg-amber-950/60 border-amber-500'
                  : 'bg-slate-950/80 border-amber-900/40 hover:border-amber-700/60'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <span>🎨</span> Procedural / CDN
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-black text-amber-300">{report.proceduralCount + report.remoteCount}</span>
                <span className="text-xs text-amber-400/80 font-mono">{procPct + remotePct}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${procPct + remotePct}%` }} />
              </div>
            </div>

            {/* Errores / Fallbacks */}
            <div 
              onClick={() => setFilterCategory('error')}
              className={`border rounded-xl p-3 flex flex-col justify-between cursor-pointer transition-all ${
                filterCategory === 'error'
                  ? 'bg-red-950/60 border-red-500'
                  : report.errorCount > 0
                  ? 'bg-red-950/30 border-red-900/60 hover:border-red-600'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                <span>❌</span> Errores
              </span>
              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-2xl font-black ${report.errorCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                  {report.errorCount}
                </span>
                <span className="text-xs text-red-400/80 font-mono">{errPct}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${errPct}%` }} />
              </div>
            </div>
          </div>

          {/* FOLDER BREAKDOWN ROW */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📁</span> Estado por Carpeta de Origen
              </h3>
              {report.errorCount > 0 && (
                <button
                  onClick={handleRetryErrors}
                  disabled={isRetrying}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer disabled:opacity-50"
                >
                  {isRetrying ? 'Reintentando...' : 'Reintentar fallidos ↻'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Minecraft */}
              <div 
                onClick={() => setFilterCategory(filterCategory === 'minecraft' ? 'all' : 'minecraft')}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  filterCategory === 'minecraft'
                    ? 'bg-sky-950/60 border-sky-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-sky-300 font-bold flex items-center gap-1">
                    <span>⛏️</span> Minecraft
                  </span>
                  <span className="font-mono text-slate-300 font-bold">
                    {report.byFolder.minecraft.local + report.byFolder.minecraft.remote + report.byFolder.minecraft.procedural} / {report.byFolder.minecraft.total}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-sky-400 h-full rounded-full" 
                    style={{ 
                      width: `${report.byFolder.minecraft.total > 0 ? Math.round(((report.byFolder.minecraft.local + report.byFolder.minecraft.remote + report.byFolder.minecraft.procedural) / report.byFolder.minecraft.total) * 100) : 0}%` 
                    }} 
                  />
                </div>
              </div>

              {/* Wesnoth */}
              <div 
                onClick={() => setFilterCategory(filterCategory === 'wesnoth' ? 'all' : 'wesnoth')}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  filterCategory === 'wesnoth'
                    ? 'bg-emerald-950/60 border-emerald-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <span>🛡️</span> Wesnoth
                  </span>
                  <span className="font-mono text-slate-300 font-bold">
                    {report.byFolder.wesnoth.local + report.byFolder.wesnoth.remote + report.byFolder.wesnoth.procedural} / {report.byFolder.wesnoth.total}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full rounded-full" 
                    style={{ 
                      width: `${report.byFolder.wesnoth.total > 0 ? Math.round(((report.byFolder.wesnoth.local + report.byFolder.wesnoth.remote + report.byFolder.wesnoth.procedural) / report.byFolder.wesnoth.total) * 100) : 0}%` 
                    }} 
                  />
                </div>
              </div>

              {/* Otros */}
              <div 
                onClick={() => setFilterCategory(filterCategory === 'other' ? 'all' : 'other')}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  filterCategory === 'other'
                    ? 'bg-purple-950/60 border-purple-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-purple-300 font-bold flex items-center gap-1">
                    <span>🌐</span> Otros / UI
                  </span>
                  <span className="font-mono text-slate-300 font-bold">
                    {report.byFolder.other.local + report.byFolder.other.remote + report.byFolder.other.procedural} / {report.byFolder.other.total}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div 
                    className="bg-purple-400 h-full rounded-full" 
                    style={{ 
                      width: `${report.byFolder.other.total > 0 ? Math.round(((report.byFolder.other.local + report.byFolder.other.remote + report.byFolder.other.procedural) / report.byFolder.other.total) * 100) : 0}%` 
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TAB 1: TEXTURE REGISTRY */}
          {activeTab === 'textures' && (
            <div className="space-y-3">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar textura (ej. stone, grass, zombie, bow)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      filterCategory === 'all' ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    Todos ({report.textures.length})
                  </button>
                  <button
                    onClick={() => setFilterCategory('local')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      filterCategory === 'local' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    ✅ Locales ({report.localCount})
                  </button>
                  <button
                    onClick={() => setFilterCategory('procedural')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      filterCategory === 'procedural' ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    🎨 Procedurales ({report.proceduralCount})
                  </button>
                  {report.errorCount > 0 && (
                    <button
                      onClick={() => setFilterCategory('error')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        filterCategory === 'error' ? 'bg-red-500 text-white' : 'bg-red-950/40 text-red-400 border border-red-900/60'
                      }`}
                    >
                      ❌ Errores ({report.errorCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur text-slate-400 text-[10px] uppercase font-mono border-b border-slate-800 z-10">
                      <tr>
                        <th className="p-2.5 w-12 text-center">Vista</th>
                        <th className="p-2.5">Archivo / Clave</th>
                        <th className="p-2.5">Origen</th>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5">Resolución</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/80 text-xs font-mono">
                      {filteredTextures.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-500 text-xs">
                            No se encontraron texturas con los filtros actuales.
                          </td>
                        </tr>
                      ) : (
                        filteredTextures.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                            {/* Thumbnail Preview */}
                            <td className="p-2 text-center">
                              <div className="w-7 h-7 mx-auto rounded bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                                {t.thumbnailUrl ? (
                                  <img 
                                    src={t.thumbnailUrl} 
                                    alt={t.key}
                                    className="w-full h-full object-contain [image-rendering:pixelated]"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <span className="text-[10px] text-slate-500">🖼️</span>
                                )}
                              </div>
                            </td>

                            {/* Filename & URL */}
                            <td className="p-2">
                              <div className="font-bold text-amber-200/90 truncate max-w-[200px] sm:max-w-[280px]" title={t.url}>
                                {t.url.split('/').pop() || t.url}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate max-w-[200px] sm:max-w-[280px]" title={t.url}>
                                {t.key !== t.url ? t.key : t.url}
                              </div>
                            </td>

                            {/* Origin Folder */}
                            <td className="p-2">
                              <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                                {t.folder}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="p-2">
                              {t.status === 'LOADED' ? (
                                t.sourceType === 'LOCAL' ? (
                                  <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[10px] whitespace-nowrap">
                                    ✅ Local
                                  </span>
                                ) : t.sourceType === 'REMOTE' ? (
                                  <span className="text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30 text-[10px] whitespace-nowrap">
                                    ⚡ Remoto CDN
                                  </span>
                                ) : (
                                  <span className="text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px] whitespace-nowrap">
                                    🎨 Procedural
                                  </span>
                                )
                              ) : t.status === 'LOADING' ? (
                                <span className="text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 text-[10px]">
                                  ⏳ Cargando
                                </span>
                              ) : (
                                <span className="text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/30 text-[10px]">
                                  ❌ Error
                                </span>
                              )}
                            </td>

                            {/* Resolution */}
                            <td className="p-2 text-slate-400 text-[11px]">
                              {t.width ? `${t.width}×${t.height}px` : '32×32px'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3D MOTOR & VRAM */}
          {activeTab === 'vram3d' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span>⚙️</span> Estado de Renderizado Three.js & Caché de Memoria
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px] uppercase">Filtro de Texturas</div>
                    <div className="text-amber-300 font-bold mt-0.5">NearestFilter (Pixel Crisp)</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px] uppercase">Espacio de Color</div>
                    <div className="text-emerald-300 font-bold mt-0.5">SRGBColorSpace</div>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 text-[10px] uppercase">Caché 3D en VRAM</div>
                    <div className="text-sky-300 font-bold mt-0.5">{report.loadedCount} Texturas Activas</div>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      textureManager.clearCaches();
                      setReport(getTextureDiagnostics());
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-xs font-bold transition-all"
                  >
                    🗑️ Purgar Caché de Texturas
                  </button>
                  <button
                    onClick={() => {
                      printTextureDiagnosticsConsole();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
                  >
                    🔍 Imprimir Perfil Completo en Consola
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROUTE MAPPING */}
          {activeTab === 'mapping' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-amber-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span>🗺️</span> Mapeo de Constantes y Rutas de Assets
                  </h4>
                  <button
                    onClick={() => {
                      verifyAssetPathsMapping();
                      setReport(getTextureDiagnostics());
                    }}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
                  >
                    Validar Rutas Mapeadas
                  </button>
                </div>

                <div className="space-y-2 text-xs max-h-64 overflow-y-auto custom-scrollbar">
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <div className="font-bold text-slate-300 mb-1">Minecraft Block Textures ({Object.keys(ASSETS.BLOCK_TEXTURES).length})</div>
                    <div className="text-slate-400 font-mono text-[11px] truncate">
                      {Object.keys(ASSETS.BLOCK_TEXTURES).slice(0, 10).join(', ')}...
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <div className="font-bold text-slate-300 mb-1">Wesnoth Terrain Mappings ({Object.keys(ASSETS.TERRAIN).length})</div>
                    <div className="text-slate-400 font-mono text-[11px] truncate">
                      {Object.keys(ASSETS.TERRAIN).join(', ')}
                    </div>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <div className="font-bold text-slate-300 mb-1">Unit Sprites Mappings ({Object.keys(ASSETS.UNITS).length})</div>
                    <div className="text-slate-400 font-mono text-[11px] truncate">
                      {Object.keys(ASSETS.UNITS).join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap justify-between items-center gap-2 shrink-0">
          <button
            onClick={() => printTextureDiagnosticsConsole()}
            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <span>🔍</span> Imprimir Tabla en Consola
          </button>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-5 py-2 rounded-xl transition-all border border-slate-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
