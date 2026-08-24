import { Quest } from '../types';

export const CAMPAIGNS: Record<string, Quest> = {
  GOBIN_TUTORIAL: {
    id: 'GOBIN_TUTORIAL',
    title: 'Tutorial: La Incursión Goblin y la Guarida Oculta (Niveles 1 a 7)',
    description: 'Una campaña tutorial de iniciación para llevar a tu grupo de Nivel 1 a Nivel 7. Reúne pistas en la plaza preguntando a los NPCs por la guarida de los trasgos, viaja a las colinas (2, -3) para asaltar el escondite, vence a Grommash el Jefe Goblin y regresa al Gremio para reclamar un arsenal completo de armas y armaduras forjadas y +23,500 EXP de grupo.',
    completed: false,
    type: 'CAMPAIGN',
    currentStageId: 'STAGE_1_NPC_CLUES',
    objectives: [
      {
        id: 'OBJ_ASK_NPCS',
        description: 'Pregunta a los 3 NPCs en la plaza de la ciudad para reunir pistas sobre la ubicación de la guarida goblin',
        type: 'INTERACT',
        targetId: 'NPC_GOBLIN_CLUE',
        currentProgress: 0,
        requiredProgress: 3,
        completed: false
      },
      {
        id: 'OBJ_FIND_GOBLIN_LAIR',
        description: 'Descubre e inspecciona la Guarida Oculta de Grommash en las colinas cercanas (q: 2, r: -3)',
        type: 'EXPLORE',
        targetId: 'GOBLIN_LAIR',
        currentProgress: 0,
        requiredProgress: 1,
        completed: false
      },
      {
        id: 'OBJ_DEFEAT_GOBLIN_BOSS',
        description: 'Asalta la Guarida y vence al Jefe Goblin Grommash el Destripador y su guardia',
        type: 'KILL',
        targetId: 'GOBIN_BOSS',
        currentProgress: 0,
        requiredProgress: 1,
        completed: false
      },
      {
        id: 'OBJ_CLAIM_TUTORIAL_REWARDS',
        description: 'Regresa al Gremio de Aventureros en la capital para reclamar el arsenal de iniciación y +23,500 EXP (Nivel 1 al 7)',
        type: 'INTERACT',
        targetId: 'GUILDMASTER',
        currentProgress: 0,
        requiredProgress: 1,
        completed: false
      }
    ],
    reward: {
      xp: 23500,
      gold: 1000,
      items: ['LONGSWORD', 'CHAIN_MAIL', 'SHIELD', 'POTION_GREATER_HEALING']
    }
  },

  DRAGON_HUNT: {
    id: 'DRAGON_HUNT',
    title: 'La Caza del Dragón Ancestral (Nivel 7+)',
    description: 'Un milenario Dragón Rojo ha despertado en las profundidades ígneas. Investiga Ruinas Ancestrales y Cuevas Místicas para reunir 3 Pistas del Dragón y revelar las 5 entradas al Dungeon Subterráneo.',
    completed: false,
    type: 'CAMPAIGN',
    currentStageId: 'STAGE_1_CLUES',
    objectives: [
      {
        id: 'OBJ_CLUES',
        description: 'Reúne 3 pistas de dragón investigando Ruinas Ancestrales o Cuevas Místicas (o venciendo monstruos en ellas)',
        type: 'COLLECT',
        targetId: 'DRAGON_CLUE',
        currentProgress: 0,
        requiredProgress: 3,
        completed: false
      },
      {
        id: 'OBJ_DUNGEON_ENEMIES',
        description: 'Entra a una de las 5 entradas reveladas y derrota a los 4 guardianes en el Dungeon Voxel (3 Habitaciones)',
        type: 'KILL',
        targetId: 'DUNGEON_GUARDIAN',
        currentProgress: 0,
        requiredProgress: 4,
        completed: false
      },
      {
        id: 'OBJ_KILL_DRAGON',
        description: 'Cruza el Portal Arcano y derrota al Gran Dragón Rojo en su Guarida Volcánica 3D',
        type: 'KILL',
        targetId: 'RED_DRAGON_BOSS',
        currentProgress: 0,
        requiredProgress: 1,
        completed: false
      },
      {
        id: 'OBJ_RETURN_GUILD',
        description: 'Vuelve al Gremio de Aventureros en la ciudad para reclamar el Set de Dragón y tu Arma de Jade',
        type: 'INTERACT',
        targetId: 'GUILDMASTER',
        currentProgress: 0,
        requiredProgress: 1,
        completed: false
      }
    ]
  }
};
