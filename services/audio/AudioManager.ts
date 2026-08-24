import { Howler } from 'howler';
import { TerrainType } from '../../types';

export type SpellAudioCategory = 'fire' | 'ice' | 'lightning' | 'arcane' | 'holy' | 'dark' | 'buff' | 'generic';

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.7;
  private sfxVolume: number = 0.8;

  constructor() {
    this.loadSettings();

    // Unlock Web Audio Context and Howler on first user interaction
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.initAudioContext();
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume();
        }
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };

      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }
  }

  private loadSettings() {
    try {
      const savedMaster = localStorage.getItem('arcadia_audio_master');
      const savedSfx = localStorage.getItem('arcadia_audio_sfx');
      const savedMute = localStorage.getItem('arcadia_audio_muted');

      if (savedMaster !== null) this.masterVolume = parseFloat(savedMaster);
      if (savedSfx !== null) this.sfxVolume = parseFloat(savedSfx);
      if (savedMute !== null) this.isMuted = savedMute === 'true';
    } catch {
      // Ignore local storage errors in sandbox
    }

    Howler.volume(this.isMuted ? 0 : this.masterVolume * this.sfxVolume);
  }

  private saveSettings() {
    try {
      localStorage.setItem('arcadia_audio_master', this.masterVolume.toString());
      localStorage.setItem('arcadia_audio_sfx', this.sfxVolume.toString());
      localStorage.setItem('arcadia_audio_muted', this.isMuted.toString());
    } catch {
      // Ignore
    }
  }

  private initAudioContext(): AudioContext | null {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.updateGains();

      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      return this.ctx;
    } catch (e) {
      console.warn('AudioContext init failed:', e);
      return null;
    }
  }

  private updateGains() {
    const effectiveMaster = this.isMuted ? 0 : this.masterVolume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(effectiveMaster, this.ctx.currentTime);
    }
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
    Howler.volume(this.isMuted ? 0 : this.masterVolume * this.sfxVolume);
  }

  // --- VOLUME & MUTE CONTROLS ---

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.updateGains();
    this.saveSettings();
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.updateGains();
    this.saveSettings();
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public toggleMute(muted?: boolean) {
    this.isMuted = muted !== undefined ? muted : !this.isMuted;
    this.updateGains();
    this.saveSettings();
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public toggle(mute: boolean) {
    this.toggleMute(mute);
  }

  // --- LOW-LEVEL SYNTHESIS ENGINE ---

  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    vol: number = 1,
    slideTo: number | null = null,
    delaySec: number = 0
  ) {
    const ctx = this.initAudioContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;

    const startTime = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(10, freq), startTime);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, slideTo), startTime + duration);
    }

    gain.gain.setValueAtTime(vol * 0.4, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  private playNoise(
    duration: number,
    vol: number = 1,
    filterType: BiquadFilterType = 'lowpass',
    filterFreq: number = 1000,
    delaySec: number = 0
  ) {
    const ctx = this.initAudioContext();
    if (!ctx || !this.sfxGain || this.isMuted) return;

    const startTime = ctx.currentTime + delaySec;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, startTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(startTime);
    noise.stop(startTime + duration + 0.05);
  }

  // --- 1. SPECIFIC SOUND EFFECTS: CRITICAL HITS & COMBAT FEEDBACK ---

  /**
   * Visceral Critical Hit sound effect:
   * Layer 1: Sub-bass shockwave impact
   * Layer 2: Sharp metallic high-speed clash
   * Layer 3: Noise blast burst
   * Layer 4: Shimmering triumph harmonic chime
   */
  public playCrit(variant: 'melee' | 'spell' | 'heavy' = 'melee') {
    const ctx = this.initAudioContext();
    if (!ctx || this.isMuted) return;

    // Sub-bass impact thud (65Hz -> 25Hz)
    this.playTone(85, 'sine', 0.35, 1.2, 25);
    this.playTone(55, 'triangle', 0.4, 0.9, 20);

    // Explosive noise snap
    this.playNoise(0.25, 0.9, 'bandpass', 1400);

    if (variant === 'spell') {
      // Arcane critical harmonics
      this.playTone(880, 'square', 0.25, 0.5, 1760);
      this.playTone(1320, 'sine', 0.35, 0.4, 2640, 0.04);
      this.playTone(1760, 'sine', 0.45, 0.3, 3520, 0.08);
    } else {
      // Metallic blade/hammer impact crunch
      this.playTone(450, 'sawtooth', 0.12, 0.8, 120);
      this.playTone(900, 'square', 0.18, 0.6, 250, 0.02);
      this.playTone(1400, 'triangle', 0.3, 0.5, 400, 0.05);
    }

    // Triumphant golden sparkle arpeggio
    setTimeout(() => {
      this.playTone(1046.5, 'sine', 0.2, 0.35); // C6
      this.playTone(1318.5, 'sine', 0.25, 0.35, null, 0.05); // E6
      this.playTone(1567.98, 'sine', 0.35, 0.4, null, 0.1); // G6
      this.playTone(2093.0, 'sine', 0.45, 0.45, null, 0.16); // C7
    }, 40);
  }

  /**
   * Critical Fail / Fumble sound effect
   */
  public playCritFail() {
    this.playNoise(0.2, 0.5, 'lowpass', 400);
    this.playTone(220, 'sawtooth', 0.3, 0.6, 80);
    this.playTone(160, 'square', 0.35, 0.5, 60, 0.05);
  }

  /**
   * Standard Hit Impact
   */
  public playHit(damageType: 'slashing' | 'piercing' | 'bludgeoning' = 'slashing') {
    if (damageType === 'piercing') {
      this.playNoise(0.1, 0.5, 'highpass', 2000);
      this.playTone(600, 'sawtooth', 0.1, 0.5, 150);
    } else if (damageType === 'bludgeoning') {
      this.playNoise(0.18, 0.7, 'lowpass', 600);
      this.playTone(120, 'sine', 0.2, 0.8, 40);
    } else {
      this.playNoise(0.15, 0.6, 'bandpass', 1200);
      this.playTone(240, 'sawtooth', 0.15, 0.5, 80);
    }
  }

  /**
   * Attack swing swoosh
   */
  public playAttack() {
    this.playNoise(0.09, 0.45, 'bandpass', 1800);
    this.playTone(320, 'sawtooth', 0.08, 0.3, 90);
  }

  // --- 2. SPECIFIC SOUND EFFECTS: SPELL CASTS ---

  /**
   * Categorized spell casting audio with unique elemental signatures
   */
  public playSpellCast(spellNameOrType: string, _level: number = 1) {
    const name = (spellNameOrType || '').toLowerCase();

    if (name.includes('fire') || name.includes('flame') || name.includes('fuego') || name.includes('inferno')) {
      this.playFireSpell();
    } else if (name.includes('ice') || name.includes('frost') || name.includes('hielo') || name.includes('glac')) {
      this.playIceSpell();
    } else if (name.includes('thunder') || name.includes('lightning') || name.includes('trueno') || name.includes('rayo') || name.includes('electr')) {
      this.playLightningSpell();
    } else if (name.includes('missile') || name.includes('arcane') || name.includes('mágico') || name.includes('magic')) {
      this.playArcaneMissileSpell();
    } else if (name.includes('cure') || name.includes('heal') || name.includes('curar') || name.includes('vida') || name.includes('holy') || name.includes('sanct')) {
      this.playHolyHealingSpell();
    } else if (name.includes('dark') || name.includes('eldritch') || name.includes('oscur') || name.includes('shadow') || name.includes('nec')) {
      this.playDarkEldritchSpell();
    } else {
      this.playGenericSpell();
    }
  }

  /**
   * Fire Spell: Whoosh ignition + roar + crackle burst
   */
  private playFireSpell() {
    // Ignition whoosh
    this.playNoise(0.35, 0.8, 'lowpass', 800);
    this.playTone(180, 'sawtooth', 0.3, 0.5, 60);

    // Crackle flame explosion
    setTimeout(() => {
      this.playNoise(0.4, 0.9, 'bandpass', 600);
      this.playTone(90, 'triangle', 0.35, 0.7, 30);
      this.playTone(420, 'sawtooth', 0.15, 0.3, 110, 0.05);
    }, 80);
  }

  /**
   * Ice / Frost Spell: High crystalline chime + crackling frost
   */
  private playIceSpell() {
    this.playTone(1400, 'sine', 0.25, 0.4, 2200);
    this.playTone(1760, 'triangle', 0.3, 0.45, 2800, 0.04);
    this.playTone(2200, 'sine', 0.35, 0.3, 3400, 0.08);
    this.playNoise(0.2, 0.4, 'highpass', 3000, 0.05);
  }

  /**
   * Lightning / Thunderwave: High voltage zap + low thunder resonance
   */
  private playLightningSpell() {
    // Sharp electric zap
    this.playTone(1600, 'sawtooth', 0.08, 0.7, 300);
    this.playTone(2400, 'square', 0.06, 0.5, 600);
    this.playNoise(0.12, 0.8, 'highpass', 2400);

    // Deep reverberant thunder roll
    setTimeout(() => {
      this.playTone(90, 'sine', 0.5, 0.9, 30);
      this.playNoise(0.45, 0.6, 'lowpass', 400);
    }, 40);
  }

  /**
   * Magic Missile / Arcane: Rapid triple dart ascending laser pings
   */
  private playArcaneMissileSpell() {
    const freqs = [587.33, 783.99, 1046.5]; // D5, G5, C6
    freqs.forEach((f, idx) => {
      setTimeout(() => {
        this.playTone(f, 'sine', 0.15, 0.4, f * 1.8);
        this.playTone(f * 2, 'triangle', 0.12, 0.2, f * 3);
      }, idx * 90);
    });
  }

  /**
   * Holy / Healing Spell: Warm celestial major chord arpeggio
   */
  private playHolyHealingSpell() {
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sine', 0.4, 0.35);
        this.playTone(freq * 1.5, 'triangle', 0.3, 0.15);
      }, idx * 70);
    });
  }

  /**
   * Dark / Eldritch Spell: Low eerie descending drone
   */
  private playDarkEldritchSpell() {
    this.playTone(130, 'sawtooth', 0.45, 0.6, 65);
    this.playTone(125, 'square', 0.45, 0.4, 60);
    this.playNoise(0.3, 0.4, 'bandpass', 500, 0.05);
  }

  private playGenericSpell() {
    this.playTone(600, 'sine', 0.35, 0.3, 1200);
    this.playTone(800, 'sine', 0.35, 0.2, 1600, 0.08);
    this.playTone(1200, 'triangle', 0.4, 0.15, 2400, 0.16);
  }

  public playMagic() {
    this.playGenericSpell();
  }

  // --- 3. SPECIFIC SOUND EFFECTS: TACTICAL MOVEMENT & FOOTSTEPS ---

  /**
   * Terrain-aware tactical movement sounds
   */
  public playTacticalMove(terrain?: TerrainType, isDash: boolean = false) {
    if (isDash) {
      // Swift stamina sprint whoosh + rapid double step
      this.playNoise(0.12, 0.35, 'bandpass', 1500);
      this.playTone(160, 'sawtooth', 0.08, 0.25, 80);
      setTimeout(() => {
        this.playNoise(0.06, 0.3, 'lowpass', 1000);
        this.playTone(120, 'triangle', 0.06, 0.2);
      }, 90);
      return;
    }

    switch (terrain) {
      case TerrainType.STONE_FLOOR:
      case TerrainType.COBBLESTONE:
      case TerrainType.CASTLE:
      case TerrainType.RUINS:
        // Crisp stone boot tap with subtle high click
        this.playNoise(0.04, 0.3, 'bandpass', 2200);
        this.playTone(180, 'square', 0.04, 0.18, 90);
        break;

      case TerrainType.WOOD_FLOOR:
        // Hollow resonant wood thud
        this.playNoise(0.05, 0.2, 'lowpass', 600);
        this.playTone(140, 'triangle', 0.08, 0.3, 60);
        break;

      case TerrainType.DESERT:
      case TerrainType.DIRT_ROAD:
      case TerrainType.CAVE_FLOOR:
        // Gritty sand/dirt crunch
        this.playNoise(0.08, 0.35, 'bandpass', 900);
        this.playTone(90, 'triangle', 0.06, 0.15);
        break;

      case TerrainType.SWAMP:
      case TerrainType.WATER:
        // Splashy mud squelch
        this.playNoise(0.09, 0.3, 'lowpass', 1400);
        this.playTone(220, 'sine', 0.08, 0.2, 110);
        break;

      case TerrainType.GRASS:
      case TerrainType.PLAINS:
      case TerrainType.FOREST:
      case TerrainType.JUNGLE:
      default:
        // Light grass brush + soft step
        this.playNoise(0.05, 0.2, 'highpass', 1200);
        this.playTone(110, 'triangle', 0.05, 0.15, 60);
        break;
    }
  }

  public playStep(terrain?: TerrainType) {
    this.playTacticalMove(terrain);
  }

  // --- 4. TACTICAL TURN & UI FEEDBACK ---

  /**
   * Turn switch notification chime
   */
  public playTurnStart(isPlayerTurn: boolean) {
    if (isPlayerTurn) {
      // Clear bright chime for player's turn
      this.playTone(659.25, 'triangle', 0.12, 0.35); // E5
      setTimeout(() => this.playTone(987.77, 'sine', 0.2, 0.4), 60); // B5
    } else {
      // Lower tactical warning tone for enemy turn
      this.playTone(220, 'sawtooth', 0.15, 0.25, 180);
      this.playTone(164.81, 'triangle', 0.2, 0.3, null, 0.05);
    }
  }

  public playUiClick() {
    this.playTone(880, 'sine', 0.04, 0.4);
  }

  public playUiClose() {
    this.playTone(660, 'sine', 0.04, 0.4);
  }

  public playUiHover() {
    this.playTone(440, 'triangle', 0.02, 0.08);
  }

  public playDiceRoll() {
    // Rapid rhythmic tumble of polyhedral dice
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playNoise(0.02, 0.25, 'highpass', 1500);
        this.playTone(350 + Math.random() * 250, 'triangle', 0.025, 0.2);
      }, i * 50);
    }
    setTimeout(() => {
      this.playTone(987.77, 'sine', 0.18, 0.35, 1318.5);
    }, 300);
  }

  public playLevelUp() {
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.25, 0.4);
        this.playTone(freq * 2, 'sine', 0.18, 0.18);
      }, idx * 80);
    });
  }

  public playVictory() {
    const progression = [
      { freq: 440, delay: 0 },
      { freq: 554.37, delay: 140 },
      { freq: 659.25, delay: 280 },
      { freq: 880, delay: 480 },
    ];
    progression.forEach(({ freq, delay }) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.35, 0.45);
        this.playTone(freq * 1.5, 'sine', 0.25, 0.2);
      }, delay);
    });
  }

  public playStatUp() {
    this.playTone(523.25, 'sine', 0.1, 0.35, 659.25);
    setTimeout(() => this.playTone(783.99, 'triangle', 0.15, 0.3), 50);
  }

  public playStatDown() {
    this.playTone(659.25, 'sine', 0.1, 0.3, 440);
  }

  public playPortal() {
    this.playNoise(0.4, 0.6, 'bandpass', 1200);
    this.playTone(330, 'sine', 0.4, 0.45, 880);
    setTimeout(() => this.playTone(660, 'sine', 0.5, 0.5, 1320), 80);
    setTimeout(() => this.playTone(990, 'triangle', 0.4, 0.3, 1760), 160);
  }
}

export const audioManager = new AudioManager();
