export interface AncientSite {
  id: string;
  name: string;
  type: 'RUINS' | 'CAVE' | 'SANCTUARY' | 'WATCHTOWER' | 'DUNGEON';
  q: number;
  r: number;
  biomeName: string;
  description: string;
  clueLore: string;
  d20Difficulty: number;
  rewardXp: number;
  rewardGold: number;
  buffType?: 'BLESSING_HP' | 'BLESSING_STAT' | 'VISION_EXPAND';
}

export const ANCIENT_SITES: AncientSite[] = [
  // --- SANTUARIOS PRIMIGENIOS ---
  {
    id: 'SITE_SANCTUARY_OAK',
    name: 'Santuario del Gran Roble Primigenio',
    type: 'SANCTUARY',
    q: -12,
    r: -4,
    biomeName: 'Bosque de Sylvandell',
    description: 'Un altar consagrado por antiguos druidas bajo las raíces doradas de un roble milenario. Restaura la vitalidad y purifica los espíritus heridos.',
    clueLore: 'Las aguas benditas del altar emiten un fulgor celestial que restaura el vigor y revela inscripciones sobre los espíritus guardianes.',
    d20Difficulty: 9,
    rewardXp: 160,
    rewardGold: 100,
    buffType: 'BLESSING_HP'
  },
  {
    id: 'SITE_SANCTUARY_SOLAR',
    name: 'Santuario del Alba Radiante',
    type: 'SANCTUARY',
    q: 14,
    r: 22,
    biomeName: 'Arenas del Sol de Zun',
    description: 'Monolito piramidal de cuarzo solar que capta los rayos cenitales, consagrado a la diosa del fuego purificador.',
    clueLore: 'Al orar ante la reliquia solar, una bendición de llama sagrada envuelve tus armas aumentando el poder espiritual del grupo.',
    d20Difficulty: 10,
    rewardXp: 190,
    rewardGold: 140,
    buffType: 'BLESSING_STAT'
  },
  {
    id: 'SITE_SANCTUARY_FROST',
    name: 'Santuario del Viento Helado',
    type: 'SANCTUARY',
    q: -4,
    r: -24,
    biomeName: 'Yermos Glaciales de Frostholm',
    description: 'Columna de hielo perenne consagrada al titán del invierno. Su aura otorga resistencia ante las ventiscas implacables.',
    clueLore: 'Tocas el hielo sagrado y sientes cómo el frío cristalino agudiza los reflejos y la fortaleza del grupo.',
    d20Difficulty: 11,
    rewardXp: 210,
    rewardGold: 150,
    buffType: 'BLESSING_HP'
  },

  // --- ATALAYAS DE VIGILANCIA ---
  {
    id: 'SITE_TOWER_NORTH',
    name: 'Atalaya de los Vientos del Norte',
    type: 'WATCHTOWER',
    q: 5,
    r: -16,
    biomeName: 'Tierras Altas Septentrionales',
    description: 'Baluarte de piedra de los antiguos reyes que otea las estepas heladas y las cordilleras del confín norte.',
    clueLore: 'Desde el campanario de la atalaya tus ojos barren leguas a la redonda, disipando la niebla de guerra y revelando caminos ocultos.',
    d20Difficulty: 8,
    rewardXp: 150,
    rewardGold: 80,
    buffType: 'VISION_EXPAND'
  },
  {
    id: 'SITE_TOWER_EAST',
    name: 'Atalaya del Bastión Rocoso',
    type: 'WATCHTOWER',
    q: 24,
    r: -6,
    biomeName: 'Picos Enanos de Kaer-Durn',
    description: 'Torreón de vigía enano tallado en el desfiladero que protege las rutas comerciales orientales.',
    clueLore: 'Alineas las lentes telescópicas de latón enano, revelando la posición de campamentos orcos y cavernas mineras lejanas.',
    d20Difficulty: 9,
    rewardXp: 170,
    rewardGold: 90,
    buffType: 'VISION_EXPAND'
  },
  {
    id: 'SITE_TOWER_SOUTH',
    name: 'Atalaya de las Dunas Doradas',
    type: 'WATCHTOWER',
    q: -10,
    r: 16,
    biomeName: 'Desierto Austral de Zun',
    description: 'Torre de arenisca con miradores de 360 grados erigida sobre un oasis seco para vigilar el tránsito del desierto.',
    clueLore: 'Inspeccionas el horizonte infinito del desierto desde la cima, localizando templos sepultados y pasos seguros entre las dunas.',
    d20Difficulty: 10,
    rewardXp: 180,
    rewardGold: 100,
    buffType: 'VISION_EXPAND'
  },

  // --- MAZMORRAS Y CATACUMBAS (DUNGEONS) ---
  {
    id: 'SITE_DUNGEON_CRYPT',
    name: 'Mazmorra de la Cripta de los Reyes Caídos',
    type: 'DUNGEON',
    q: -16,
    r: 8,
    biomeName: 'Ciénaga Prohibida de Morth',
    description: 'Foso subterráneo inundado donde descansan los monarcas traidores protegidos por caballeros no-muertos y trampas venenosas.',
    clueLore: 'En la cámara sepulcral descifras la llave de paso de los túneles inferiores y hallas reliquias forjadas en acero negro.',
    d20Difficulty: 12,
    rewardXp: 260,
    rewardGold: 220
  },
  {
    id: 'SITE_DUNGEON_FORGE',
    name: 'Mazmorra de la Forja Abisal',
    type: 'DUNGEON',
    q: 18,
    r: -2,
    biomeName: 'Garganta de Kaer-Durn',
    description: 'Antiguos hornos enanos subterráneos invadidos por elementales de magma, autómatas y bestias de hierro.',
    clueLore: 'Consigues penetrar en la armería central, desentrañando esquemas de armaduras rúnicas y tesoros de mineral puro.',
    d20Difficulty: 13,
    rewardXp: 280,
    rewardGold: 250
  },
  {
    id: 'SITE_DUNGEON_ABYSS',
    name: 'Mazmorra del Abismo de las Sombras',
    type: 'DUNGEON',
    q: 2,
    r: 20,
    biomeName: 'Fosa de las Sombras',
    description: 'Laberinto de catacumbas excavadas en piedra negra que desciende hacia los bordes del Reino de las Sombras.',
    clueLore: 'Rompes el sello umbrío de la antesala y obtienes un mapa arcano de las fallas dimensionales de Arcadia.',
    d20Difficulty: 13,
    rewardXp: 300,
    rewardGold: 280
  },

  // --- RUINAS CLÁSICAS Y CUEVAS ---
  {
    id: 'SITE_ELDORIA_RUINS',
    name: 'Ruinas de Eldoria',
    type: 'RUINS',
    q: 12,
    r: -8,
    biomeName: 'Bosque del Norte',
    description: 'Antiguas agujas élficas cubiertas de enredaderas y musgo arcano donde se custodiaban códices sobre dragones primigenios.',
    clueLore: 'Descifras un grabado rúnico que describe las 5 fallas tectónicas de Arcadia y los signos ígneos que anuncian el despertar del Dragón Rojo.',
    d20Difficulty: 10,
    rewardXp: 180,
    rewardGold: 120
  },
  {
    id: 'SITE_SOLAR_TEMPLE',
    name: 'Templo Solar en Ruinas',
    type: 'RUINS',
    q: 20,
    r: 15,
    biomeName: 'Desierto de las Arenas Abrasadoras',
    description: 'Un colosal santuario de arenisca calcinada consagrado a los cultos del fuego y la llama eterna.',
    clueLore: 'En el altar central encuentras una estela con el diagrama de las 3 cámaras subterráneas y el sello arcano que custodia la entrada al dungeon.',
    d20Difficulty: 11,
    rewardXp: 200,
    rewardGold: 150
  },
  {
    id: 'SITE_IRON_CITADEL',
    name: 'Ruinas de la Ciudadela de Hierro',
    type: 'RUINS',
    q: 28,
    r: 0,
    biomeName: 'Picos de Hierro Orientales',
    description: 'Fortaleza enana en la cumbre oriental cuyos salones subterráneos albergan archivos de expediciones milenarias.',
    clueLore: 'Encuentras un compendio forjado en metal que detalla los 4 guardianes arcanos del dungeon subterráneo y cómo romper su formación.',
    d20Difficulty: 12,
    rewardXp: 220,
    rewardGold: 160
  },
  {
    id: 'SITE_OAKHAVEN_RUINS',
    name: 'Ruinas Sumergidas de Oakhaven',
    type: 'RUINS',
    q: -18,
    r: 18,
    biomeName: 'Pantano de los Lamentos',
    description: 'Baluarte devorado por aguas oscuras con bajorrelieves que ilustran el Gran Portal a la Guarida del Dragón.',
    clueLore: 'Bajo el lodo rescatas una tablilla intacta con el glifo de transporte que se activa al purgar el dungeon de guardianes.',
    d20Difficulty: 10,
    rewardXp: 190,
    rewardGold: 130
  },
  {
    id: 'SITE_VOLCANIC_CAVE',
    name: 'Cueva de los Ecos Volcánicos',
    type: 'CAVE',
    q: 8,
    r: -18,
    biomeName: 'Tierras Altas del Norte',
    description: 'Caverna profunda de roca basáltica donde retumban rugidos térmicos y emana un calor sofocante.',
    clueLore: 'En el fondo de la gruta hallas una escama colosal de dragón rojo incrustada en magma solidificado junto a marcas de garras titánicas.',
    d20Difficulty: 11,
    rewardXp: 210,
    rewardGold: 140
  },
  {
    id: 'SITE_SHADOW_CRYSTAL_CAVE',
    name: 'Caverna de Cristal Umbrío',
    type: 'CAVE',
    q: -15,
    r: -12,
    biomeName: 'Colinas del Bosque Susurrante',
    description: 'Caverna repleta de estalagmitas cristalinas que resuenan con vibraciones arcanas y nidos de dracos menores.',
    clueLore: 'Descubres el diario carbonizado de un legendario explorador con mapas de túneles que conducen a los fosos subterráneos de Arcadia.',
    d20Difficulty: 10,
    rewardXp: 180,
    rewardGold: 110
  },
  {
    id: 'SITE_ANCIENT_WINDS_FOSSE',
    name: 'Fosa de los Vientos Antiguos',
    type: 'CAVE',
    q: -8,
    r: 24,
    biomeName: 'Garganta del Desierto Sur',
    description: 'Fisura tectónica natural donde corrientes de aire sulfuroso revelan restos de antiguas ofrendas a la bestia alada.',
    clueLore: 'Examinas las paredes de la fosa y descubres fragmentos de pergamino con el ritual para abrir los portales de retorno tras la cacería.',
    d20Difficulty: 11,
    rewardXp: 200,
    rewardGold: 130
  },
  {
    id: 'SITE_GLACIAL_DEPTHS_CRYPT',
    name: 'Cripta Glaciar de las Profundidades',
    type: 'CAVE',
    q: 22,
    r: -14,
    biomeName: 'Cordillera Helada',
    description: 'Cueva de hielo milenario con túneles esculpidos que descienden hacia las profundidades olvidadas de Arcadia.',
    clueLore: 'En el permafrost extraes un amuleto con el mapa de las 5 entradas al dungeon subterráneo y cómo despertar el portal.',
    d20Difficulty: 12,
    rewardXp: 230,
    rewardGold: 170
  }
];

export const getAncientSiteAt = (q: number, r: number): AncientSite | undefined => {
  return ANCIENT_SITES.find(site => site.q === q && site.r === r);
};
