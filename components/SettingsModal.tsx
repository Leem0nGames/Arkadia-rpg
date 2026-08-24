import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { THEMES, getThemeConfig } from '../services/themeSystem';
import { UITheme, TerrainType } from '../types';
import { sfx } from '../services/SoundSystem';
import { SaveLoadManager } from './SaveLoadManager';
import { DebugDiagnosticModal } from './DebugDiagnosticModal';
import { gpuManager } from '../services/GPUPerformanceManager';

export const SettingsModal: React.FC = () => {
  const { 
    isSettingsOpen, 
    toggleSettings, 
    uiTheme, 
    setUITheme, 
    dofEnabled = true,
    toggleDof,
    showGridLines = true,
    toggleGridLines,
    quitToMenu,
    gameState,
    zoomSensitivity = 1.0,
    rotateSensitivity = 1.0,
    setGestureSensitivity,
    resetCameraGesture,
    battleSpeed = 1.0,
    setBattleSpeed
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'SAVE' | 'GUIDE'>('SETTINGS');
  const [masterVol, setMasterVol] = useState<number>(sfx.getMasterVolume());
  const [sfxVol, setSfxVol] = useState<number>(sfx.getSfxVolume());
  const [isMuted, setIsMuted] = useState<boolean>(sfx.getIsMuted());
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);

  if (!isSettingsOpen) return null;

  const currentThemeConfig = getThemeConfig(uiTheme);

  const handleThemeChange = (themeId: UITheme) => {
    setUITheme(themeId);
    sfx.playUiClick();
  };

  const handleMasterVolChange = (val: number) => {
    setMasterVol(val);
    sfx.setMasterVolume(val);
  };

  const handleSfxVolChange = (val: number) => {
    setSfxVol(val);
    sfx.setSfxVolume(val);
  };

  const handleMuteToggle = () => {
    const next = sfx.toggleMute();
    setIsMuted(next);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 pointer-events-auto">
      <div className={`relative w-full max-w-2xl rounded-2xl border p-1 shadow-2xl overflow-hidden ${currentThemeConfig.classes.modalBg}`}>
        
        {/* Header */}
        <div className={`p-3.5 md:p-5 flex justify-between items-center rounded-t-xl ${currentThemeConfig.classes.headerBg}`}>
          <div className="flex items-center gap-2.5">
            <span className="text-xl md:text-2xl">⚙️</span>
            <div>
              <h2 className={`text-lg md:text-2xl ${currentThemeConfig.classes.titleText}`}>
                Menú de Sistema & Pausa
              </h2>
              <p className={`text-[10px] sm:text-xs ${currentThemeConfig.classes.subText}`}>
                Ajustes, partidas guardadas y guía táctica de juego
              </p>
            </div>
          </div>

          <button 
            onClick={toggleSettings}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${currentThemeConfig.classes.circleButton}`}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex border-b border-white/10 p-1.5 gap-1.5 bg-slate-950/60 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => { sfx.playUiClick(); setActiveTab('SETTINGS'); }}
            className={`flex-1 min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'SETTINGS'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span>⚙️</span> Opciones & Audio
          </button>

          <button
            type="button"
            onClick={() => { sfx.playUiClick(); setActiveTab('SAVE'); }}
            className={`flex-1 min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'SAVE'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span>💾</span> Guardar / Cargar
          </button>

          <button
            type="button"
            onClick={() => { sfx.playUiClick(); setActiveTab('GUIDE'); }}
            className={`flex-1 min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeTab === 'GUIDE'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span>🧭</span> Guía de Juego
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 md:p-6 space-y-5 max-h-[72vh] overflow-y-auto custom-scrollbar">
          
          {activeTab === 'SAVE' && (
            <div className={`p-4 rounded-xl border ${currentThemeConfig.classes.cardBg}`}>
              <h3 className={`text-sm uppercase font-bold tracking-widest flex items-center gap-2 mb-3 ${currentThemeConfig.classes.accentText}`}>
                <span>💾</span> Administrador de Partidas Guardadas
              </h3>
              <SaveLoadManager onClose={toggleSettings} />
            </div>
          )}

          {activeTab === 'GUIDE' && (
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 leading-relaxed text-slate-200">
                <h3 className="font-bold text-amber-300 text-sm mb-1 font-serif flex items-center gap-2">
                  <span>🧭</span> Arcadia Tactics - Guía Rápida
                </h3>
                Arcadia Tactics combina la exploración hexagonal por turnos en el overworld, combates tácticos 3D por turnos basados en D&D 5E y misiones de gremio.
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start space-x-3 bg-slate-900/60 border border-white/10 rounded-xl p-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center font-black text-amber-300 text-xs shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-amber-300 text-xs font-serif">Exploración Overworld</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Muévete por los hexágonos del mapa, recolecta recursos, descubre ruinas antiguas y evita o combate patrullas enemigas.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-slate-900/60 border border-white/10 rounded-xl p-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center font-black text-amber-300 text-xs shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-amber-300 text-xs font-serif">Pueblos & Gremios</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Visita el Gremio de Aventureros para aceptar contratos, comerciar ítems y descansar en la posada para curar al grupo.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 bg-slate-900/60 border border-white/10 rounded-xl p-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center font-black text-amber-300 text-xs shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-amber-300 text-xs font-serif">Combate Táctico 3D</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">Aprovecha el dial radial táctico, cobertura del terreno, posicionamiento y hechizos de área para salir victorioso.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SETTINGS' && (
            <>

          {/* Section: Aesthetic UI Theme Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-sm uppercase font-bold tracking-widest flex items-center gap-2 ${currentThemeConfig.classes.accentText}`}>
                <span>🎨</span> Visual HUD & Interface Theme
              </h3>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${currentThemeConfig.classes.tabActive}`}>
                Active: {currentThemeConfig.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(THEMES) as UITheme[]).map((themeKey) => {
                const theme = THEMES[themeKey];
                const isSelected = uiTheme === themeKey;

                return (
                  <button
                    key={themeKey}
                    type="button"
                    onClick={() => handleThemeChange(themeKey)}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group ${
                      isSelected 
                        ? `${theme.classes.cardBg} border-2 ring-2 ring-offset-2 ring-amber-500 scale-[1.02] shadow-xl` 
                        : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-500 opacity-80 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: isSelected ? theme.previewColors.accent : undefined
                    }}
                  >
                    {/* Header badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl">{theme.icon}</span>
                      {isSelected && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 shadow">
                          ✓ ACTIVE
                        </span>
                      )}
                    </div>

                    {/* Color Swatch Preview */}
                    <div className="flex gap-1.5 mb-2.5 p-1.5 rounded-lg bg-black/40 border border-white/10">
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.previewColors.bg }} title="Background" />
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.previewColors.card }} title="Surface" />
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.previewColors.border }} title="Borders" />
                      <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: theme.previewColors.accent }} title="Accent" />
                    </div>

                    <div>
                      <div className="font-serif font-bold text-sm leading-tight text-slate-100 group-hover:text-amber-300">
                        {theme.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                        {theme.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Battle Speed & Animation Pacing */}
          <div className={`p-4 rounded-xl border ${currentThemeConfig.classes.cardBg}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className={`text-sm uppercase font-bold tracking-widest flex items-center gap-2 ${currentThemeConfig.classes.accentText}`}>
                  <span>⏩</span> Velocidad de Combate & Ritmo de Turnos
                </h3>
                <p className={`text-xs mt-0.5 ${currentThemeConfig.classes.subText}`}>
                  Controla la cadencia de animaciones de dados, hechizos y turnos de la IA para un flujo más rápido y sin interrupciones.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { speed: 1.0, label: '1.0x', desc: 'Cinemático (Estándar)' },
                { speed: 1.5, label: '1.5x', desc: 'Ágil (Recomendado)' },
                { speed: 2.0, label: '2.0x', desc: 'Rápido (Táctico)' }
              ].map(({ speed, label, desc }) => {
                const isSelected = Math.abs(battleSpeed - speed) < 0.1;
                return (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => {
                      sfx.playUiClick();
                      setBattleSpeed(speed);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200 ring-2 ring-amber-400 shadow-md font-bold'
                        : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-sm font-black font-mono">{label}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: 3D Graphics & Miniature Depth-of-Field (Tilt-Shift) */}
          <div className={`p-4 rounded-xl border ${currentThemeConfig.classes.cardBg}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className={`text-sm uppercase font-bold tracking-widest flex items-center gap-2 ${currentThemeConfig.classes.accentText}`}>
                  <span>📷</span> Profundidad de Campo 3D (Depth-of-Field / Tilt-Shift)
                </h3>
                <p className={`text-xs mt-0.5 ${currentThemeConfig.classes.subText}`}>
                  Desenfoca dinámicamente el terreno lejano y primer plano con bokeh óptico, enfocando al personaje chibi activo para acentuar el efecto diorama miniatura.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleDof}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ml-3 ${
                  dofEnabled
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700'
                }`}
              >
                {dofEnabled ? '✨ Activado (Bokeh 3D)' : 'Desactivado'}
              </button>
            </div>

            {/* Grid Line Visualizer Toggle */}
            <div className="flex items-center justify-between py-3 border-t border-slate-800/80">
              <div>
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-200 flex items-center gap-2">
                  <span>🏁</span> Cuadrícula Táctica de Combate
                </h4>
                <p className={`text-[11px] mt-0.5 ${currentThemeConfig.classes.subText}`}>
                  Muestra las líneas de división de celdas en el terreno táctico durante el combate.
                </p>
              </div>
              <button
                type="button"
                onClick={toggleGridLines}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 ml-3 ${
                  showGridLines
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700'
                }`}
              >
                {showGridLines ? '✨ Cuadrícula Visible' : 'Ocultar Líneas'}
              </button>
            </div>

            {/* Gesture Sensitivity Sub-controls */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>🤏</span> Sensibilidad Pinch-to-Zoom (Distancia Táctica):
                </span>
                <span className="text-xs font-mono text-amber-300 font-bold">
                  {zoomSensitivity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={zoomSensitivity}
                onChange={(e) => setGestureSensitivity(parseFloat(e.target.value), rotateSensitivity)}
                className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>🔄</span> Sensibilidad Giro de 2 Dedos (Giro Azimutal):
                </span>
                <span className="text-xs font-mono text-sky-300 font-bold">
                  {rotateSensitivity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={rotateSensitivity}
                onChange={(e) => setGestureSensitivity(zoomSensitivity, parseFloat(e.target.value))}
                className="w-full accent-sky-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={resetCameraGesture}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold underline transition-colors flex items-center gap-1"
                >
                  <span>↺</span> Restablecer Encuadre Táctico por Defecto
                </button>
              </div>
            </div>
          </div>

          {/* Section: GPU & Mobile 60 FPS Optimization Tier */}
          <div className={`p-4 rounded-xl border ${currentThemeConfig.classes.cardBg}`}>
            <div className="mb-3">
              <h3 className={`text-sm uppercase font-bold tracking-widest flex items-center gap-2 ${currentThemeConfig.classes.accentText}`}>
                <span>⚡</span> Rendimiento GPU & Optimización Mobile (60 FPS)
              </h3>
              <p className={`text-xs mt-0.5 ${currentThemeConfig.classes.subText}`}>
                Ajusta inteligentemente la resolución de sombras, densidad de partículas y tasa de refresco DPR para garantizar 60 FPS fluidos en smartphones.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  gpuManager.forceTier('MOBILE_LOW');
                  sfx.playUiClick();
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  gpuManager.getProfile().tier === 'MOBILE_LOW'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                    : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1">
                  <span>🔋</span> Ahorro Batería / Low
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  DPR 1.0x, sombras 512p, partículas reducidas (Máxima fluidez en móviles de entrada).
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  gpuManager.forceTier('MOBILE_HIGH');
                  sfx.playUiClick();
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  gpuManager.getProfile().tier === 'MOBILE_HIGH'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                    : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1">
                  <span>📱</span> Smart Mobile (60 FPS)
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  DPR 1.25x, sombras 1024p, post-procesado optimizado (Ideal para smartphones).
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  gpuManager.forceTier('DESKTOP');
                  sfx.playUiClick();
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  gpuManager.getProfile().tier === 'DESKTOP'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                    : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1">
                  <span>💻</span> Calidad Desktop
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  DPR 1.5x, sombras 2048p, máximo nivel de detalle visual y efectos.
                </div>
              </button>
            </div>
          </div>

          {/* Section: Sound & Audio Manager */}
          <div className={`p-4 rounded-xl border ${currentThemeConfig.classes.cardBg}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-sm uppercase font-bold tracking-widest flex items-center gap-2 ${currentThemeConfig.classes.accentText}`}>
                <span>🔊</span> Audio & Tactical SFX Manager
              </h3>
              <button
                type="button"
                onClick={handleMuteToggle}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  isMuted 
                    ? 'bg-red-950/80 border-red-500 text-red-200' 
                    : 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                }`}
              >
                {isMuted ? '🔇 Silenciado' : '🔊 Sonido Activado'}
              </button>
            </div>

            <p className={`text-xs mb-4 ${currentThemeConfig.classes.subText}`}>
              Motor de audio sintetizado para impactos críticos, lanzamientos de hechizos y pisadas tácticas por terreno.
            </p>

            {/* Volume Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-black/30 p-3 rounded-xl border border-white/5">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1 text-slate-300">
                  <span>Volumen Maestro</span>
                  <span>{Math.round(masterVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterVol}
                  onChange={(e) => handleMasterVolChange(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1 text-slate-300">
                  <span>Efectos de Sonido (SFX)</span>
                  <span>{Math.round(sfxVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVol}
                  onChange={(e) => handleSfxVolChange(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
            
            {/* Tactical Sound Preview Grid */}
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Demostración de Efectos Tácticos:
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => sfx.playCrit('melee')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]`}
              >
                💥 Impacto Crítico
              </button>
              <button
                type="button"
                onClick={() => sfx.playCritFail()}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/50`}
              >
                💀 Pifia / Fumble
              </button>
              <button
                type="button"
                onClick={() => sfx.playSpellCast('Fireball')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-orange-950/60 hover:bg-orange-900/80 text-orange-200 border border-orange-500/50`}
              >
                🔥 Bola de Fuego
              </button>
              <button
                type="button"
                onClick={() => sfx.playSpellCast('Thunderwave')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-500/50`}
              >
                ⚡ Ola Atronadora
              </button>
              <button
                type="button"
                onClick={() => sfx.playSpellCast('Cure Wounds')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-500/50`}
              >
                ✨ Curar Heridas
              </button>
              <button
                type="button"
                onClick={() => sfx.playTacticalMove(TerrainType.STONE_FLOOR)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentThemeConfig.classes.buttonSecondary}`}
              >
                🦶 Paso (Piedra)
              </button>
              <button
                type="button"
                onClick={() => sfx.playTacticalMove(TerrainType.GRASS, true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentThemeConfig.classes.buttonSecondary}`}
              >
                💨 Sprint / Dash
              </button>
              <button
                type="button"
                onClick={() => sfx.playDiceRoll()}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentThemeConfig.classes.buttonSecondary}`}
              >
                🎲 Tirada d20
              </button>
            </div>
          </div>

          {/* Section: Controles y Accesibilidad (Hotkeys) */}
          <div className={`p-4 rounded-xl border ${currentThemeConfig.classes.cardBg}`}>
            <h3 className={`text-sm uppercase font-bold tracking-widest flex items-center gap-2 mb-2 ${currentThemeConfig.classes.accentText}`}>
              <span>⌨️</span> Atajos de Teclado & Accesibilidad
            </h3>
            <p className={`text-xs mb-3.5 ${currentThemeConfig.classes.subText}`}>
              Controles de accesibilidad integrados para desplazarte, rotar el tablero 3D y ejecutar acciones de combate táctico:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2.5 bg-black/30 p-3 rounded-xl border border-white/5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Desplazamiento y Cámara</div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Navegar Cursor en Rejilla:</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-200 font-bold">W/A/S/D o Flechas</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Rotar Tablero (Azimut):</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-200 font-bold">Q  /  E</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Acercar/Alejar Zoom:</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-amber-200 font-bold">Z  /  X</span>
                </div>
              </div>

              <div className="space-y-2.5 bg-black/30 p-3 rounded-xl border border-white/5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Habilidades y Acciones</div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Seleccionar Acciones:</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-sky-200 font-bold">Teclas 1, 2, 3, 4, 5</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Confirmar Acción Seleccionada:</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-sky-200 font-bold">Espacio</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">Cancelar Selección / Ajustes:</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-sky-200 font-bold">Escape</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Engine Diagnostics & Texture Debug */}
          <div className={`p-4 rounded-xl border ${currentThemeConfig.classes.cardBg} flex items-center justify-between`}>
            <div>
              <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>🔍</span> Diagnóstico de Texturas & Debug del Motor
              </div>
              <div className="text-xs text-slate-400">
                Auditar estado de assets de Minecraft, Wesnoth, fallbacks y memoria VRAM
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsDebugOpen(true)}
              className="py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md transition-colors cursor-pointer"
            >
              <span>⚙️</span> Abrir Diagnóstico
            </button>
          </div>

          {/* Section: Return to Title */}
          <div className={`p-4 rounded-xl border ${currentThemeConfig.classes.cardBg} flex items-center justify-between`}>
            <div>
              <div className="text-sm font-bold text-slate-200">Main Menu</div>
              <div className="text-xs text-slate-400">Return to character creation / title screen</div>
            </div>
            <button
              type="button"
              onClick={() => {
                quitToMenu();
                toggleSettings();
              }}
              className="py-2 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-red-950/70 hover:bg-red-900 text-red-200 border border-red-700/60 transition-colors cursor-pointer"
            >
              <span>🚪</span> Return to Title
            </button>
          </div>

          </>
          )}

        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end ${currentThemeConfig.classes.headerBg}`}>
          <button
            type="button"
            onClick={toggleSettings}
            className={`py-2 px-6 rounded-xl text-xs font-bold uppercase tracking-wider ${currentThemeConfig.classes.buttonPrimary}`}
          >
            Done
          </button>
        </div>

      </div>

      {/* Embedded Diagnostic Modal */}
      <DebugDiagnosticModal 
        isOpen={isDebugOpen} 
        onClose={() => setIsDebugOpen(false)} 
      />
    </div>
  );
};
