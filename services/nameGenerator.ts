import { CharacterRace } from '../types';

const NAME_PARTS: Record<
  CharacterRace,
  { prefixes: string[]; suffixes: string[] }
> = {
  [CharacterRace.HUMAN]: {
    prefixes: ['Ald', 'Ed', 'Wil', 'Fen', 'Ro', 'Gar', 'Os', 'War', 'Hal', 'Cor', 'God', 'Roder', 'Stan'],
    suffixes: ['ric', 'win', 'ard', 'mund', 'ton', 'wick', 'ford', 'son', 'brand', 'mere', 'bert', 'red', 'ic'],
  },
  [CharacterRace.ELF]: {
    prefixes: ['Ae', 'Gil', 'La', 'The', 'Sil', 'Fae', 'Cae', 'Thal', 'Va', 'Xan', 'El', 'Fino', 'Are'],
    suffixes: ['las', 'lan', 'rion', 'niel', 'van', 'dril', 'wyn', 'thil', 'lor', 'ar', 'fiel', 'nor', 'dil'],
  },
  [CharacterRace.DWARF]: {
    prefixes: ['Thor', 'Bal', 'Dur', 'Gro', 'Bom', 'Kil', 'Or', 'Glo', 'Thra', 'Kaz', 'Bar', 'Dwal', 'Thrum'],
    suffixes: ['in', 'gar', 'im', 'oak', 'ur', 'grum', 'dain', 'bek', 'gorn', 'zak', 'lin', 'fur', 'bis'],
  },
  [CharacterRace.HALFLING]: {
    prefixes: ['Bil', 'Fro', 'Mer', 'Pip', 'Sam', 'Tol', 'Wil', 'Ros', 'Pri', 'Ber', 'Don'],
    suffixes: ['bo', 'do', 'iad', 'in', 'wise', 'man', 'by', 'co', 'da', 'la', 'min'],
  },
  [CharacterRace.DRAGONBORN]: {
    prefixes: ['Arj', 'Bal', 'Bar', 'Dra', 'Ghe', 'Hes', 'Kriv', 'Med', 'Meh', 'Nad', 'Pand'],
    suffixes: ['han', 'sar', 'kas', 'thos', 'kan', 'rash', 'born', 'gar', 'rinn', 'shed'],
  },
  [CharacterRace.GNOME]: {
    prefixes: ['Alv', 'Bro', 'Dim', 'Eld', 'Fon', 'Glim', 'Jeb', 'Nam', 'Pog', 'Zook'],
    suffixes: ['in', 'ck', 'ble', 'ji', 'kin', 'm', 'foodle', 'bar', 'n', 'spark'],
  },
  [CharacterRace.TIEFLING]: {
    prefixes: ['Ak', 'Cas', 'Ea', 'Kall', 'Ler', 'Mak', 'Nem', 'Ori', 'Phel', 'Ri'],
    suffixes: ['menos', 'vir', 'us', 'ista', 'issa', 'vari', 'os', 'anna', 'aia', 'xus'],
  },
  [CharacterRace.HALF_ORC]: {
    prefixes: ['Den', 'Fen', 'Gel', 'Hen', 'Hol', 'Im', 'Kel', 'Krus', 'Mhur', 'Ront'],
    suffixes: ['ch', 'sh', 'gar', 'k', 'g', 'z', 'th', 'd', 'b', 'r'],
  },
};

export const generateFantasyName = (race: CharacterRace): string => {
  const parts = NAME_PARTS[race] || NAME_PARTS[CharacterRace.HUMAN];
  const prefix = parts.prefixes[Math.floor(Math.random() * parts.prefixes.length)];
  const suffix = parts.suffixes[Math.floor(Math.random() * parts.suffixes.length)];
  return prefix + suffix;
};
