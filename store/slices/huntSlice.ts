import { StateCreator } from 'zustand';
import { GameState, HuntPrey, HuntSession, HuntClue, HuntTrap, HuntPreyPart } from '../../types';
import { SchematicData } from '../../services/SchematicParser';
import { generatePresetInWorker } from '../../services/schematicWorkerService';
import { sfx } from '../../services/SoundSystem';

export interface HuntSlice {
  currentSchematic: SchematicData | null;
  huntSession: HuntSession | null;
  startHuntMode: (presetName?: string) => Promise<void>;
  loadCustomSchematic: (schematicData: SchematicData) => void;
  moveHuntPlayer: (x: number, y: number, z: number) => void;
  attackPreyInHunt: (preyId: string, partId?: string) => void;
  destroyCoverAtPos: (x: number, z: number) => void;
  investigateClue: (clueId: string) => void;
  placeTrap: (type: 'FREEZE' | 'STUN' | 'EXPLOSIVE') => void;
  toggleStealth: () => void;
  useHuntAbility: (abilityType: 'MARK' | 'ARCANE_CAGE' | 'SHATTER' | 'AMBUSH') => void;
  harvestPrey: (preyId: string) => void;
  completeHuntSession: () => void;
  claimHuntRewards: () => void;
  exitHuntMode: () => void;
}

function createDefaultPartsForPrey(type: string): HuntPreyPart[] {
  switch (type) {
    case 'dragon':
      return [
        { id: 'wings', name: 'Alas Ígneas', hp: 50, maxHp: 50, isBroken: false, effectDescription: 'Anula vuelo evasivo' },
        { id: 'tail', name: 'Cola de Magma', hp: 45, maxHp: 45, isBroken: false, effectDescription: 'Anula barrido de cola' },
        { id: 'horns', name: 'Cuernos Dragónicos', hp: 60, maxHp: 60, isBroken: false, effectDescription: 'Reduce potencia del aliento' }
      ];
    case 'golem':
      return [
        { id: 'core', name: 'Núcleo de Voxel', hp: 55, maxHp: 55, isBroken: false, effectDescription: 'Reduce armadura un 50%' },
        { id: 'fist', name: 'Puño de Obsidiana', hp: 40, maxHp: 40, isBroken: false, effectDescription: 'Desactiva temblor de tierra' }
      ];
    case 'wyvern':
      return [
        { id: 'wings', name: 'Membrana de Ala', hp: 35, maxHp: 35, isBroken: false, effectDescription: 'Derriba a tierra' },
        { id: 'claws', name: 'Garras Venenosas', hp: 30, maxHp: 30, isBroken: false, effectDescription: 'Inhabilita veneno' }
      ];
    case 'shadow_lord':
    default:
      return [
        { id: 'crown', name: 'Corona Sombría', hp: 70, maxHp: 70, isBroken: false, effectDescription: 'Disipa auras protectoras' },
        { id: 'orb', name: 'Orbe del Vacío', hp: 50, maxHp: 50, isBroken: false, effectDescription: 'Impide invocaciones' }
      ];
  }
}

export const createHuntSlice: StateCreator<any, [], [], HuntSlice> = (set, get) => ({
  currentSchematic: null,
  huntSession: null,

  startHuntMode: async (presetName = 'Castillo de Cacería de Obsidiana') => {
    sfx.playUiClick();
    try {
      const { schematicData } = await generatePresetInWorker(presetName);
      get().loadCustomSchematic(schematicData);
    } catch (err) {
      console.error('Error starting hunt mode via worker:', err);
    }
  },

  loadCustomSchematic: (schematicData: SchematicData) => {
    const isDragonLair = schematicData.title.includes('Dragón') || schematicData.title.includes('Guarida');
    const { party } = get();
    const avgPartyLevel = party && party.length > 0 ? Math.max(1, Math.floor(party.reduce((s: number, p: any) => s + (p.stats?.level || 1), 0) / party.length)) : 1;

    // Generate preys with hunt status, weaknesses, and destructible parts
    const rawPreys = isDragonLair ? [
      {
        id: `prey-dragon-boss`,
        name: 'Ignis, Gran Dragón Rojo Ancestral',
        type: 'dragon' as const,
        level: Math.max(12, avgPartyLevel + 4),
        hp: Math.floor(250 + avgPartyLevel * 25),
        maxHp: Math.floor(250 + avgPartyLevel * 25),
        x: Math.floor(schematicData.width / 2),
        y: Math.max(6, Math.floor(schematicData.height * 0.65)),
        z: Math.floor(schematicData.length / 2),
        color: '#ef4444',
        icon: '🐉',
        isDefeated: false,
        rewardXp: Math.floor(2000 + avgPartyLevel * 150),
        rewardGold: Math.floor(2500 + avgPartyLevel * 200),
        trophyName: 'Corazón y Escamas de Dragón Rojo',
        alertLevel: 'CALM' as const,
        weakness: 'ICE' as const
      },
      {
        id: `prey-golem-guard`,
        name: 'Gólem Guardián de Lava',
        type: 'golem' as const,
        level: Math.max(8, avgPartyLevel + 2),
        hp: Math.floor(140 + avgPartyLevel * 15),
        maxHp: Math.floor(140 + avgPartyLevel * 15),
        x: Math.floor(schematicData.width * 0.25),
        y: 4,
        z: Math.floor(schematicData.length * 0.75),
        color: '#f97316',
        icon: '🗿',
        isDefeated: false,
        rewardXp: Math.floor(500 + avgPartyLevel * 50),
        rewardGold: Math.floor(400 + avgPartyLevel * 50),
        trophyName: 'Núcleo de Magma',
        alertLevel: 'CALM' as const,
        weakness: 'LIGHTNING' as const
      },
      {
        id: `prey-wyvern-guard`,
        name: 'Guiverno Escupefuego',
        type: 'wyvern' as const,
        level: Math.max(9, avgPartyLevel + 3),
        hp: Math.floor(150 + avgPartyLevel * 18),
        maxHp: Math.floor(150 + avgPartyLevel * 18),
        x: Math.floor(schematicData.width * 0.75),
        y: Math.max(6, Math.floor(schematicData.height * 0.6)),
        z: Math.floor(schematicData.length * 0.25),
        color: '#dc2626',
        icon: '🦅',
        isDefeated: false,
        rewardXp: Math.floor(550 + avgPartyLevel * 60),
        rewardGold: Math.floor(450 + avgPartyLevel * 60),
        trophyName: 'Garra Ígnea',
        alertLevel: 'CALM' as const,
        weakness: 'ICE' as const
      }
    ] : [
      {
        id: `prey-dragon-1`,
        name: 'Gran Dragón Volcánico',
        type: 'dragon' as const,
        level: Math.max(10, avgPartyLevel + 3),
        hp: Math.floor(180 + avgPartyLevel * 20),
        maxHp: Math.floor(180 + avgPartyLevel * 20),
        x: Math.floor(schematicData.width / 2),
        y: Math.max(8, Math.floor(schematicData.height * 0.7)),
        z: Math.floor(schematicData.length / 2),
        color: '#ef4444',
        icon: '🐉',
        isDefeated: false,
        rewardXp: Math.floor(1200 + avgPartyLevel * 100),
        rewardGold: Math.floor(1500 + avgPartyLevel * 120),
        trophyName: 'Corazón de Dragón Volcánico',
        alertLevel: 'CALM' as const,
        weakness: 'ICE' as const
      },
      {
        id: `prey-golem-1`,
        name: 'Gólem de Obsidiana Ancestral',
        type: 'golem' as const,
        level: Math.max(7, avgPartyLevel + 1),
        hp: Math.floor(120 + avgPartyLevel * 12),
        maxHp: Math.floor(120 + avgPartyLevel * 12),
        x: Math.floor(schematicData.width * 0.25),
        y: 4,
        z: Math.floor(schematicData.length * 0.75),
        color: '#0284c7',
        icon: '🗿',
        isDefeated: false,
        rewardXp: Math.floor(400 + avgPartyLevel * 40),
        rewardGold: Math.floor(350 + avgPartyLevel * 40),
        trophyName: 'Núcleo de Obsidiana',
        alertLevel: 'CALM' as const,
        weakness: 'LIGHTNING' as const
      },
      {
        id: `prey-wyvern-1`,
        name: 'Guiverno del Vacío',
        type: 'wyvern' as const,
        level: Math.max(8, avgPartyLevel + 2),
        hp: Math.floor(140 + avgPartyLevel * 15),
        maxHp: Math.floor(140 + avgPartyLevel * 15),
        x: Math.floor(schematicData.width * 0.75),
        y: Math.max(6, Math.floor(schematicData.height * 0.6)),
        z: Math.floor(schematicData.length * 0.25),
        color: '#a855f7',
        icon: '🦅',
        isDefeated: false,
        rewardXp: Math.floor(500 + avgPartyLevel * 50),
        rewardGold: Math.floor(400 + avgPartyLevel * 50),
        trophyName: 'Garra de Guiverno de Bloques',
        alertLevel: 'CALM' as const,
        weakness: 'FIRE' as const
      },
      {
        id: `prey-lord-1`,
        name: 'Señor de las Sombras de Voxel',
        type: 'shadow_lord' as const,
        level: Math.max(12, avgPartyLevel + 4),
        hp: Math.floor(250 + avgPartyLevel * 25),
        maxHp: Math.floor(250 + avgPartyLevel * 25),
        x: Math.floor(schematicData.width * 0.5),
        y: Math.max(10, Math.floor(schematicData.height * 0.85)),
        z: Math.floor(schematicData.length * 0.5),
        color: '#eab308',
        icon: '👑',
        isDefeated: false,
        rewardXp: Math.floor(1800 + avgPartyLevel * 150),
        rewardGold: Math.floor(2000 + avgPartyLevel * 180),
        trophyName: 'Corona de Voxel Antiguo',
        alertLevel: 'CALM' as const,
        weakness: 'PHYSICAL' as const
      }
    ];

    const preys: HuntPrey[] = rawPreys.map(p => ({
      ...p,
      facingAngle: Math.atan2(11 - p.z, 11 - p.x), // Default facing toward map center
      parts: createDefaultPartsForPrey(p.type)
    }));

    // Generate Hunt Clues on map
    const clues: HuntClue[] = [
      {
        id: 'clue-1',
        x: Math.min(schematicData.width - 2, 6),
        y: 2,
        z: Math.min(schematicData.length - 2, 7),
        type: 'TRACKS',
        isInvestigated: false,
        description: 'Huellas calcinadas que apuntan al centro de la guarida.'
      },
      {
        id: 'clue-2',
        x: Math.min(schematicData.width - 2, 12),
        y: 3,
        z: Math.min(schematicData.length - 2, 14),
        type: 'RUNE',
        isInvestigated: false,
        description: 'Runa elemental con marcas de garras sangrientas.'
      },
      {
        id: 'clue-3',
        x: Math.min(schematicData.width - 2, 16),
        y: 2,
        z: Math.min(schematicData.length - 2, 5),
        type: 'CLAW_MARK',
        isInvestigated: false,
        description: 'Rasguño profundo en los bloques de obsidiana.'
      }
    ];

    let spawnY = 2;
    const spawnBlocks = schematicData.blocks.filter(b => Math.abs(b.x - 3) <= 2 && Math.abs(b.z - 3) <= 2 && b.isSolid);
    if (spawnBlocks.length > 0) {
      spawnY = Math.max(...spawnBlocks.map(b => b.y)) + 1;
    }

    const session: HuntSession = {
      schematicTitle: schematicData.title,
      playerPos: { x: 3, y: spawnY, z: 3 },
      preys,
      trophiesCollected: [],
      preysDefeatedCount: 0,
      totalPreysCount: preys.length,
      clues,
      trapsPlaced: [],
      stealthActive: false,
      insightLevel: 10,
      harvestedMaterials: [],
      comboMultiplier: 1.0
    };

    get().transitionToMap({
      targetState: GameState.HUNT_MODE,
      targetLocationName: schematicData.title,
      targetBiome: 'Estructura Voxel 3D',
      durationMs: 800,
      action: () => {
        set({
          currentSchematic: schematicData,
          huntSession: session
        });
        get().addLog(`🎮 Modo Cacería Voxel activado: Caza a las monstruosidades usando rastreo, trampas y sinergias.`, 'narrative');
      }
    });
  },

  moveHuntPlayer: (x: number, y: number, z: number) => {
    const session = get().huntSession;
    if (!session) return;

    // Check distance to active preys. If moving close and not stealthy, raise alert level!
    const isStealth = session.stealthActive || false;
    let trapTriggerLog = '';

    const updatedPreys = session.preys.map(prey => {
      if (prey.isDefeated) return prey;
      const dist = Math.hypot(prey.x - x, prey.z - z);

      // Trigger trap if prey steps on trap or player places trap near prey
      const steppedTrap = (session.trapsPlaced || []).find(t => t.active && Math.hypot(t.x - prey.x, t.z - prey.z) <= 2);
      if (steppedTrap && !prey.isTrapped) {
        trapTriggerLog = `⛓️ ¡${prey.name} cayó en la trampa de ${steppedTrap.type}! Queda inmovilizado.`;
        sfx.playVictory();
        return {
          ...prey,
          isTrapped: true,
          trapDuration: 2,
          alertLevel: 'ALERT' as const
        };
      }

      // Stealth check
      if (!isStealth) {
        if (dist <= 6 && prey.alertLevel === 'CALM') {
          return { ...prey, alertLevel: 'ALERT' as const };
        } else if (dist <= 3 && prey.alertLevel === 'ALERT') {
          return { ...prey, alertLevel: 'ENRAGED' as const };
        }
      }
      return prey;
    });

    if (trapTriggerLog) {
      get().addLog(trapTriggerLog, 'combat');
    }

    const dx = x - session.playerPos.x;
    const dz = z - session.playerPos.z;
    const facingAngle = (dx !== 0 || dz !== 0) 
      ? Math.atan2(dz, dx) 
      : (session.playerPos.facingAngle ?? 0);

    set({
      huntSession: {
        ...session,
        playerPos: { x, y, z, facingAngle },
        preys: updatedPreys
      }
    });
  },

  investigateClue: (clueId: string) => {
    const session = get().huntSession;
    if (!session || !session.clues) return;

    const clue = session.clues.find(c => c.id === clueId);
    if (!clue || clue.isInvestigated) return;

    sfx.playUiClick();

    const newInsight = Math.min(100, (session.insightLevel || 0) + 30);
    const updatedClues = session.clues.map(c => c.id === clueId ? { ...c, isInvestigated: true } : c);

    get().addLog(`🔎 Pista Investigada: "${clue.description}" -> (+30% Conocimiento de Caza). Reveladas debilidades.`, 'info');

    set({
      huntSession: {
        ...session,
        clues: updatedClues,
        insightLevel: newInsight,
        comboMultiplier: (session.comboMultiplier || 1.0) + 0.25
      }
    });
  },

  toggleStealth: () => {
    const session = get().huntSession;
    if (!session) return;

    sfx.playUiHover();
    const nextStealth = !session.stealthActive;

    if (nextStealth) {
      get().addLog('🥷 Activaste Modo Sigilo: Avanzas sin hacer ruido. Las bestias no notarán tu presencia.', 'info');
    } else {
      get().addLog('👣 Saliste de Modo Sigilo.', 'info');
    }

    set({
      huntSession: {
        ...session,
        stealthActive: nextStealth
      }
    });
  },

  placeTrap: (type: 'FREEZE' | 'STUN' | 'EXPLOSIVE') => {
    const session = get().huntSession;
    if (!session) return;

    sfx.playUiClick();
    const newTrap: HuntTrap = {
      id: `trap-${Date.now()}`,
      x: session.playerPos.x,
      y: session.playerPos.y,
      z: session.playerPos.z,
      type,
      active: true
    };

    const updatedTraps = [...(session.trapsPlaced || []), newTrap];
    get().addLog(`⚙️ Colocaste una Trampa de ${type === 'FREEZE' ? 'Hielo Crio-Lazo' : type === 'STUN' ? 'Parálisis' : 'Sublimación Explosiva'} en tu casilla (${session.playerPos.x}, ${session.playerPos.z}).`, 'info');

    set({
      huntSession: {
        ...session,
        trapsPlaced: updatedTraps
      }
    });
  },

  useHuntAbility: (abilityType: 'MARK' | 'ARCANE_CAGE' | 'SHATTER' | 'AMBUSH') => {
    const session = get().huntSession;
    if (!session) return;

    // Find nearest prey
    const nearestPrey = session.preys.find(p => !p.isDefeated && Math.hypot(p.x - session.playerPos.x, p.z - session.playerPos.z) <= 12);
    if (!nearestPrey) {
      get().addLog('⚠️ No hay presas en alcance para usar la habilidad de caza.', 'info');
      return;
    }

    sfx.playAttack();

    let logMsg = '';
    const updatedPreys = session.preys.map(p => {
      if (p.id !== nearestPrey.id) return p;

      if (abilityType === 'MARK') {
        logMsg = `🎯 ¡Marca del Depredador aplicada a ${p.name}! Recibirá +50% de daño de todas las fuentes.`;
        return { ...p, isMarked: true };
      } else if (abilityType === 'ARCANE_CAGE') {
        logMsg = `🔮 ¡Sello de Confinamiento Arcano! ${p.name} ha sido encerrado en una jaula de energía voxel.`;
        return { ...p, isTrapped: true, trapDuration: 3 };
      } else if (abilityType === 'SHATTER') {
        logMsg = `🛡️ ¡Golpe Rompe-Escamas! Destruiste una parte defensiva de ${p.name}.`;
        const parts = (p.parts || []).map((pt, idx) => idx === 0 ? { ...pt, isBroken: true, hp: 0 } : pt);
        return { ...p, parts, alertLevel: 'ENRAGED' as const };
      } else if (abilityType === 'AMBUSH') {
        const ambushDmg = Math.floor(60 + (session.insightLevel || 0) * 0.8);
        const newHp = Math.max(0, p.hp - ambushDmg);
        logMsg = `🗡️ ¡Ataque Furtivo de Emboscada! Le asestaste ${ambushDmg} de daño crítico a ${p.name}.`;
        return { ...p, hp: newHp, isDefeated: newHp === 0, alertLevel: 'ENRAGED' as const };
      }
      return p;
    });

    if (logMsg) {
      get().addLog(logMsg, 'combat');
    }

    set({
      huntSession: {
        ...session,
        preys: updatedPreys,
        comboMultiplier: (session.comboMultiplier || 1.0) + 0.3
      }
    });
  },

  destroyCoverAtPos: (x: number, z: number) => {
    const schematic = get().currentSchematic;
    const session = get().huntSession;
    if (!schematic || !session) return;

    sfx.playAttack();

    // Remove blocks at (x, z) where y >= 1 (trees, leaves, stone boulders, obsidian, crystals)
    const remainingBlocks = schematic.blocks.filter(b => !(b.x === x && b.z === z && b.y >= 1));
    const destroyedCount = schematic.blocks.length - remainingBlocks.length;

    if (destroyedCount > 0) {
      const updatedSchematic = {
        ...schematic,
        blocks: remainingBlocks,
        totalBlocks: remainingBlocks.length
      };

      sfx.playVictory();
      get().addLog(`💥 ¡DESTRUCCIÓN DE COBERTURA! Destruiste los obstáculos en (${x}, ${z}). ¡Línea de tiro despejada! (+20% Multiplicador Combo).`, 'levelup');

      set({
        currentSchematic: updatedSchematic,
        huntSession: {
          ...session,
          comboMultiplier: (session.comboMultiplier || 1.0) + 0.2
        }
      });
    } else {
      get().addLog(`⚠️ No hay cobertura destruible en las coordenadas (${x}, ${z}).`, 'info');
    }
  },

  attackPreyInHunt: (preyId: string, partId?: string) => {
    const session = get().huntSession;
    const schematic = get().currentSchematic;
    if (!session || !preyId) return;

    const prey = session.preys.find(p => p.id === preyId);
    if (!prey || prey.isDefeated) return;

    sfx.playAttack();

    // Check Line of Sight through voxel map cover
    let coverDestroyedLog = '';
    let comboMult = session.comboMultiplier || 1.0;

    if (schematic && schematic.blocks) {
      const steps = Math.max(Math.abs(prey.x - session.playerPos.x), Math.abs(prey.z - session.playerPos.z));
      if (steps > 1) {
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const cx = Math.round(session.playerPos.x + (prey.x - session.playerPos.x) * t);
          const cz = Math.round(session.playerPos.z + (prey.z - session.playerPos.z) * t);

          const coverBlock = schematic.blocks.find(b => b.x === cx && b.z === cz && b.y >= 1 && b.isSolid);
          if (coverBlock) {
            // Auto destroy cover on impact!
            const remaining = schematic.blocks.filter(b => !(b.x === cx && b.z === cz && b.y >= 1));
            set({
              currentSchematic: {
                ...schematic,
                blocks: remaining,
                totalBlocks: remaining.length
              }
            });
            coverDestroyedLog = `⚠️ ¡Línea de tiro bloqueada por ${coverBlock.name}! ¡Destruiste la cobertura en (${cx}, ${cz}) al atacar (+25% Sinergia)!`;
            comboMult *= 1.25;
            break;
          }
        }
      }
    }

    if (coverDestroyedLog) {
      get().addLog(coverDestroyedLog, 'combat');
    }

    // Position & Flanking Angle Calculation
    const preyFacing = prey.facingAngle ?? Math.atan2(11 - prey.z, 11 - prey.x);
    const angleToPlayer = Math.atan2(session.playerPos.z - prey.z, session.playerPos.x - prey.x);
    let angleDiff = Math.abs(preyFacing - angleToPlayer);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    const degDiff = angleDiff * (180 / Math.PI);

    let flankType: 'BACKSTAB' | 'FLANK' | 'FRONT' = 'FRONT';
    let flankMult = 1.0;
    let flankLog = '';

    if (degDiff >= 120) {
      flankType = 'BACKSTAB';
      flankMult = 2.0;
      flankLog = `🗡️ ¡ATAQUE POR LA ESPALDA! Backstab (+100% Crítico por Posicionamiento)`;
    } else if (degDiff >= 60) {
      flankType = 'FLANK';
      flankMult = 1.4;
      flankLog = `⚔️ ¡FLANQUEO TÁCTICO! (+40% Daño Lateral)`;
    } else {
      flankType = 'FRONT';
      flankMult = 1.0;
      flankLog = `🛡️ Ataque Frontal (Arco de Guardia de la Presa)`;
    }

    comboMult *= flankMult;
    if (flankLog) {
      get().addLog(flankLog, 'combat');
    }

    // D&D 20-sided dice roll calculation for attack zoom emphasis
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const insightBonus = Math.floor((session.insightLevel || 0) / 10);
    const modifier = 4 + insightBonus;
    const totalRoll = d20Roll + modifier;
    const isCrit = d20Roll >= 18 || session.stealthActive || flankType === 'BACKSTAB';

    // Synergy damage multiplier
    if (prey.isMarked) comboMult *= 1.5;
    if (prey.isTrapped) comboMult *= 1.35;

    // Damage prey calculation
    const baseDamage = Math.floor((25 + Math.random() * 20) * comboMult);
    const damage = isCrit ? Math.floor(baseDamage * 2.2) : baseDamage;

    // Handle targeting specific part
    let hitPartName = '';
    let updatedParts = prey.parts ? [...prey.parts] : [];
    if (partId && updatedParts.length > 0) {
      updatedParts = updatedParts.map(part => {
        if (part.id === partId && !part.isBroken) {
          const partHp = Math.max(0, part.hp - damage);
          const isBroken = partHp === 0;
          if (isBroken) {
            hitPartName = part.name;
            get().addLog(`💥 ¡PARTE DESTRUIDA! Destruiste [${part.name}] de ${prey.name}. Efecto: ${part.effectDescription}.`, 'levelup');
            sfx.playVictory();
          }
          return { ...part, hp: partHp, isBroken };
        }
        return part;
      });
    }

    const newHp = Math.max(0, prey.hp - damage);
    const isDefeated = newHp === 0;

    // Prey turns to face player upon taking damage
    const newPreyFacing = Math.atan2(session.playerPos.z - prey.z, session.playerPos.x - prey.x);

    const updatedPreys = session.preys.map(p => {
      if (p.id === preyId) {
        return {
          ...p,
          hp: newHp,
          isDefeated,
          parts: updatedParts,
          facingAngle: isDefeated ? p.facingAngle : newPreyFacing,
          alertLevel: isDefeated ? ('CALM' as const) : ('ENRAGED' as const)
        };
      }
      return p;
    });

    const defeatedCount = updatedPreys.filter(p => p.isDefeated).length;
    const newTrophies = isDefeated 
      ? [...session.trophiesCollected, prey.trophyName]
      : session.trophiesCollected;

    // Harvest legendary material
    const newHarvests = isDefeated ? [
      ...(session.harvestedMaterials || []),
      { name: `Escama Leyenda: ${prey.name}`, count: 2, rarity: 'LEGENDARY' as const }
    ] : (session.harvestedMaterials || []);

    let updatedReturnPortal = session.returnPortal;

    if (isDefeated) {
      sfx.playVictory();
      get().addLog(`⚔️ ¡BESTIA CAZADA! Derrotaste a ${prey.name}! Obtuviste ${prey.rewardXp} XP, ${prey.rewardGold} oro y el trofeo "${prey.trophyName}".`, 'levelup');
      
      if (prey.type === 'dragon' || prey.id.includes('dragon')) {
        get().progressQuestObjective('DRAGON_HUNT', 'OBJ_KILL_DRAGON', 1);
        get().addLog('🏆 ¡HAS CAZADO AL GRAN DRAGÓN ROJO! El corazón de la bestia es tuyo.', 'loot');
        get().addLog('🌀 ¡Se ha abierto un Portal Arcano de retorno! Úsalo para regresar a la salida del dungeon.', 'narrative');
        sfx.playPortal();
        updatedReturnPortal = {
          x: prey.x,
          y: Math.max(1, prey.y),
          z: prey.z,
          active: true
        };
      }
    } else {
      const logText = isCrit
        ? `💥 GOLPE CRÍTICO DE EMBOSCADA! D20 (${d20Roll}) + ${modifier} = ${totalRoll} -> Asestaste ${damage} de daño a ${prey.name}!`
        : `🗡️ Ataque certero de Caza: D20 (${d20Roll}) + ${modifier} = ${totalRoll} -> ${damage} de daño a ${prey.name}.`;
      get().addLog(logText, 'combat');
    }

    const allDefeated = defeatedCount === session.totalPreysCount;

    set({
      huntSession: {
        ...session,
        preys: updatedPreys,
        trophiesCollected: newTrophies,
        harvestedMaterials: newHarvests,
        preysDefeatedCount: defeatedCount,
        returnPortal: updatedReturnPortal,
        isCompleted: allDefeated || session.isCompleted,
        lastAttackEvent: {
          preyId: prey.id,
          preyName: prey.name,
          damage,
          isHit: true,
          isCrit,
          d20Roll,
          modifier,
          totalRoll,
          targetPos: { x: prey.x, y: prey.y, z: prey.z },
          timestamp: Date.now(),
          partHitName: hitPartName,
          flankType,
          comboSynergyApplied: comboMult > 1.0 ? `${Math.round(comboMult * 100)}% Multiplicador (${flankType})` : undefined
        }
      }
    });

    if (allDefeated) {
      get().addLog('🏆 ¡TODAS LAS PRESAS DE LA CACERÍA HAN SIDO CAZADAS CON ÉXITO!', 'levelup');
    }
  },

  harvestPrey: (preyId: string) => {
    const session = get().huntSession;
    if (!session) return;

    const prey = session.preys.find(p => p.id === preyId && p.isDefeated);
    if (!prey) return;

    sfx.playVictory();
    get().addLog(`🌾 Cosechaste materiales raros de ${prey.name}: Oído de Voxel, Sangre Dragónica y Piel de Obsidiana.`, 'loot');
  },

  completeHuntSession: () => {
    const session = get().huntSession;
    if (!session) return;
    set({
      huntSession: {
        ...session,
        isCompleted: true
      }
    });
  },

  claimHuntRewards: () => {
    const session = get().huntSession;
    if (!session) return;

    let totalXp = 0;
    let totalGold = 0;

    session.preys.filter(p => p.isDefeated).forEach(prey => {
      totalXp += prey.rewardXp;
      totalGold += prey.rewardGold;
    });

    // Add insight bonus XP
    const insightBonus = Math.floor((session.insightLevel || 0) * 15);
    totalXp += insightBonus;

    // Add Gold and items to party / inventory
    if (totalGold > 0) {
      get().addLog(`💰 ¡Recompensa de Caza obtenida! +${totalGold} Piezas de Oro acumuladas.`, 'loot');
    }

    // Add Materials to Inventory
    session.harvestedMaterials?.forEach(mat => {
      if (get().addInventoryItem) {
        get().addInventoryItem({
          id: `mat_${mat.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: mat.name,
          type: 'material',
          rarity: mat.rarity,
          value: 120,
          description: `Material raro de caza voxel: ${mat.name}. Úsalo en la forja o vende por oro.`,
          icon: '💎'
        });
      }
    });

    // Add Trophies to Inventory
    session.trophiesCollected?.forEach(trophy => {
      if (get().addInventoryItem) {
        get().addInventoryItem({
          id: `trophy_${trophy.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: `Trofeo: ${trophy}`,
          type: 'misc',
          rarity: 'LEGENDARY',
          value: 500,
          description: `Trofeo de victoria legendaria en Cacería Voxel: ${trophy}.`,
          icon: '🏆'
        });
      }
    });

    // Post battle level up check
    if (totalXp > 0) {
      get().addLog(`🌟 Recompensa de Experiencia de Caza: +${totalXp} XP totales para el grupo!`, 'levelup');
      if (get().initiatePostBattleLevelUp) {
        get().initiatePostBattleLevelUp(totalXp);
      }
    }

    // Exit Hunt Mode
    get().exitHuntMode();
  },

  exitHuntMode: () => {
    sfx.playPortal();
    const dungeonEntrance = get().dragonDungeonEntrancePos;
    if (dungeonEntrance) {
      set({
        gameState: GameState.OVERWORLD,
        playerPos: { x: dungeonEntrance.x, y: dungeonEntrance.y },
        dimension: dungeonEntrance.dimension ?? get().dimension,
        gracePeriodEndTime: Date.now() + 4000
      });
      get().addLog(`🌀 ¡Has cruzado el portal de regreso! Apareces a salvo en la salida del dungeon (${dungeonEntrance.x}, ${dungeonEntrance.y}). ¡Regresa a la ciudad para cobrar tu recompensa legendaria!`, 'narrative');
    } else {
      set({
        gameState: GameState.OVERWORLD,
        gracePeriodEndTime: Date.now() + 4000
      });
      get().addLog('Has regresado al mapa del mundo.', 'info');
    }
  }
});

