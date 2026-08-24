import { UITheme } from '../types';

export interface ThemeConfig {
  id: UITheme;
  name: string;
  subtitle: string;
  icon: string;
  description: string;
  previewColors: {
    bg: string;
    card: string;
    border: string;
    accent: string;
    text: string;
  };
  // CSS Classes mapping
  classes: {
    modalBg: string;
    cardBg: string;
    cardBorder: string;
    headerBg: string;
    titleText: string;
    bodyText: string;
    subText: string;
    accentText: string;
    hudBg: string;
    hudBorder: string;
    buttonPrimary: string;
    buttonSecondary: string;
    circleButton: string;
    tooltipBg: string;
    tabActive: string;
    tabInactive: string;
    divider: string;
  };
}

export const THEMES: Record<UITheme, ThemeConfig> = {
  dark_stone: {
    id: 'dark_stone',
    name: 'Graphite Stone',
    subtitle: 'Graphite & Obsidian',
    icon: '🗿',
    description: 'Sleek matte graphite grey with dark obsidian elements and glowing gold highlights.',
    previewColors: {
      bg: '#242528',
      card: '#2e3035',
      border: '#4a4d52',
      accent: '#f59e0b',
      text: '#f8fafc'
    },
    classes: {
      modalBg: 'bg-[#242528]/95 border-neutral-700/80 shadow-[0_0_50px_rgba(0,0,0,0.8)] text-slate-100',
      cardBg: 'bg-[#2e3035]/90 border-neutral-700/60 text-slate-100',
      cardBorder: 'border-neutral-700/60',
      headerBg: 'bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-neutral-600',
      titleText: 'text-amber-300 font-serif font-bold',
      bodyText: 'text-slate-200',
      subText: 'text-slate-400',
      accentText: 'text-amber-400',
      hudBg: 'bg-[#242528]/85 backdrop-blur-md border border-neutral-700/60 shadow-xl text-slate-100',
      hudBorder: 'border-neutral-700/60',
      buttonPrimary: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold border border-amber-400/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
      buttonSecondary: 'bg-neutral-800 hover:bg-neutral-700 text-slate-200 border border-neutral-600',
      circleButton: 'bg-[#2e3035]/90 hover:bg-neutral-800 text-slate-300 hover:text-amber-400 border border-neutral-700 shadow-lg',
      tooltipBg: 'bg-[#242528]/95 border-neutral-700 text-slate-100 shadow-2xl',
      tabActive: 'bg-amber-600 text-white border-amber-400 shadow-md',
      tabInactive: 'bg-neutral-800/80 text-slate-400 border-neutral-700 hover:text-slate-200',
      divider: 'border-neutral-800'
    }
  },
  parchment: {
    id: 'parchment',
    name: 'Scroll & Parchment',
    subtitle: 'Ancient Tome & Vellum',
    icon: '📜',
    description: 'Warm aged vellum and weathered paper scroll aesthetics with leather bindings and sepia ink tones.',
    previewColors: {
      bg: '#2b1d0c',
      card: '#f4ebd0',
      border: '#8b5a2b',
      accent: '#c2410c',
      text: '#2e1c0c'
    },
    classes: {
      modalBg: 'bg-[#f4ebd0] border-[#8b5a2b] shadow-[0_0_50px_rgba(43,29,12,0.9)] text-[#2e1c0c]',
      cardBg: 'bg-[#ebe0be] border-[#9c6634]/70 text-[#2e1c0c]',
      cardBorder: 'border-[#9c6634]/70',
      headerBg: 'bg-gradient-to-r from-[#d9c7a3] via-[#e8d7b5] to-[#d9c7a3] border-b border-[#8b5a2b]/60',
      titleText: 'text-[#451a03] font-serif font-black',
      bodyText: 'text-[#2e1c0c]',
      subText: 'text-[#6e4e30]',
      accentText: 'text-[#9a3412] font-bold',
      hudBg: 'bg-[#f4ebd0]/95 backdrop-blur-md border-2 border-[#8b5a2b] shadow-2xl text-[#2e1c0c]',
      hudBorder: 'border-[#8b5a2b]',
      buttonPrimary: 'bg-gradient-to-r from-[#9a3412] to-[#c2410c] hover:from-[#c2410c] hover:to-[#ea580c] text-[#fef3c7] font-bold border border-[#7c2d12] shadow-[0_0_15px_rgba(194,65,12,0.35)]',
      buttonSecondary: 'bg-[#e2d2ae] hover:bg-[#d5c39c] text-[#3e2312] border border-[#8b5a2b]',
      circleButton: 'bg-[#f4ebd0] hover:bg-[#e8d7b5] text-[#451a03] hover:text-[#9a3412] border-2 border-[#8b5a2b] shadow-md',
      tooltipBg: 'bg-[#f8f1de] border-2 border-[#8b5a2b] text-[#2e1c0c] shadow-2xl',
      tabActive: 'bg-[#9a3412] text-[#fef3c7] border-[#7c2d12] shadow-md font-bold',
      tabInactive: 'bg-[#dfceaa] text-[#6e4e30] border-[#9c6634]/60 hover:text-[#2e1c0c]',
      divider: 'border-[#b89b72]'
    }
  },
  arcane_wood: {
    id: 'arcane_wood',
    name: 'Arcane Wood',
    subtitle: 'Elven Grove & Carved Timber',
    icon: '🌲',
    description: 'Deep carved mahogany timber with glowing emerald runes, golden filigree, and forest realm essence.',
    previewColors: {
      bg: '#051811',
      card: '#0d281e',
      border: '#10b981',
      accent: '#34d399',
      text: '#ecfdf5'
    },
    classes: {
      modalBg: 'bg-[#0b2118]/95 border-[#059669]/70 shadow-[0_0_50px_rgba(5,150,105,0.25)] text-emerald-50',
      cardBg: 'bg-[#0f2d22]/90 border-[#10b981]/40 text-emerald-100',
      cardBorder: 'border-[#10b981]/40',
      headerBg: 'bg-gradient-to-r from-[#071a13] via-[#0e3527] to-[#071a13] border-b border-[#059669]/60',
      titleText: 'text-emerald-300 font-serif font-bold',
      bodyText: 'text-emerald-100',
      subText: 'text-emerald-300/70',
      accentText: 'text-emerald-400',
      hudBg: 'bg-[#0b2118]/90 backdrop-blur-md border border-[#10b981]/50 shadow-xl text-emerald-100',
      hudBorder: 'border-[#10b981]/50',
      buttonPrimary: 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold border border-emerald-300/50 shadow-[0_0_15px_rgba(16,185,129,0.35)]',
      buttonSecondary: 'bg-[#0f2d22] hover:bg-[#163f30] text-emerald-200 border border-emerald-700/60',
      circleButton: 'bg-[#0b2118]/90 hover:bg-[#123629] text-emerald-300 hover:text-emerald-100 border border-emerald-600/60 shadow-lg',
      tooltipBg: 'bg-[#071a13]/95 border border-emerald-600 text-emerald-100 shadow-2xl',
      tabActive: 'bg-emerald-600 text-white border-emerald-400 shadow-md',
      tabInactive: 'bg-[#0e2c21]/80 text-emerald-400/70 border-emerald-800 hover:text-emerald-200',
      divider: 'border-emerald-900/60'
    }
  }
};

export const getThemeConfig = (theme: UITheme = 'dark_stone'): ThemeConfig => {
  return THEMES[theme] || THEMES.dark_stone;
};
