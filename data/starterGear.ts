import { Item, ItemRarity, EquipmentSlot, Ability } from '../types';
import { WESNOTH_BASE_URL } from '../constants';

export const STARTER_TUTORIAL_REWARDS: Record<string, Item> = {
  // --- WEAPONS FOR ALL CLASSES ---
  'REFORGED_IRON_GREATSWORD': {
    id: 'reforged_iron_greatsword',
    name: 'Mandoble de Acero Forjado',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Espada pesada forjada por los herreros del reino para nuevos campeones. Ideal para Guerreros.',
    flavorText: 'El filo templado brilla con determinación.',
    icon: `${WESNOTH_BASE_URL}/items/sword.png`,
    equipmentStats: {
      slot: EquipmentSlot.MAIN_HAND,
      diceCount: 2,
      diceSides: 6,
      modifiers: { [Ability.STR]: 2, [Ability.CON]: 1 }
    }
  },
  'REFORGED_LONGSWORD': {
    id: 'reforged_longsword',
    name: 'Espada Larga del Heraldo',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Arma noble bendecida por los sacerdotes de la capital. Excelente para Paladines y Guerreros.',
    flavorText: 'Equilibrada con maestría.',
    icon: `${WESNOTH_BASE_URL}/items/sword.png`,
    equipmentStats: {
      slot: EquipmentSlot.MAIN_HAND,
      diceCount: 1,
      diceSides: 8,
      modifiers: { [Ability.STR]: 2, [Ability.CHA]: 1 }
    }
  },
  'REFORGED_GREATAXE': {
    id: 'reforged_greataxe',
    name: 'Hacha de Guerra de los Picos',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Hacha devastadora con doble filo. Diseñada para Bárbaros implacables.',
    flavorText: 'El peso de su hoja aplasta armaduras sin esfuerzo.',
    icon: `${WESNOTH_BASE_URL}/attacks/battleaxe.png`,
    equipmentStats: {
      slot: EquipmentSlot.MAIN_HAND,
      diceCount: 1,
      diceSides: 12,
      modifiers: { [Ability.STR]: 3, [Ability.CON]: 1 }
    }
  },
  'REFORGED_DAGGER': {
    id: 'reforged_dagger',
    name: 'Daga de Sombras Agudas',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Hoja envenenada y ligera para Pícaros y Bardos.',
    flavorText: 'Atraviesa los puntos débiles con sutileza.',
    icon: `${WESNOTH_BASE_URL}/items/dagger.png`,
    equipmentStats: {
      slot: EquipmentSlot.MAIN_HAND,
      diceCount: 1,
      diceSides: 6,
      properties: ['Finesse'],
      modifiers: { [Ability.DEX]: 2, [Ability.CHA]: 1 }
    }
  },
  'REFORGED_COMPOSITE_BOW': {
    id: 'reforged_composite_bow',
    name: 'Arco Compuesto de los Bosques',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Arco de madera de tejo reforzado con tendón de bestia. Arma predilecta de Exploradores.',
    flavorText: 'Cada flecha vuela certera hacia su objetivo.',
    icon: `${WESNOTH_BASE_URL}/items/bow.png`,
    equipmentStats: {
      slot: EquipmentSlot.MAIN_HAND,
      diceCount: 1,
      diceSides: 8,
      modifiers: { [Ability.DEX]: 3, [Ability.WIS]: 1 }
    }
  },
  'REFORGED_SACRED_MACE': {
    id: 'reforged_sacred_mace',
    name: 'Maza Bendita del Amanecer',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Maza de plata grabada con plegarias sagradas para Clérigos.',
    flavorText: 'Castiga a los no-muertos y a los impíos.',
    icon: `${WESNOTH_BASE_URL}/attacks/mace.png`,
    equipmentStats: {
      slot: EquipmentSlot.MAIN_HAND,
      diceCount: 1,
      diceSides: 8,
      modifiers: { [Ability.WIS]: 2, [Ability.STR]: 1 }
    }
  },
  'REFORGED_OAK_STAFF': {
    id: 'reforged_oak_staff',
    name: 'Báculo de Roble Rúnico',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Canalizador mágico para Magos y Druidas tallado con runas antiguas.',
    flavorText: 'Canaliza los vientos arcanos sin fatiga.',
    icon: `${WESNOTH_BASE_URL}/items/staff.png`,
    equipmentStats: {
      slot: EquipmentSlot.MAIN_HAND,
      diceCount: 1,
      diceSides: 8,
      modifiers: { [Ability.INT]: 2, [Ability.WIS]: 2 }
    }
  },
  'REFORGED_CRYSTAL_SCEPTRE': {
    id: 'reforged_crystal_sceptre',
    name: 'Cetro del Pacto Primordial',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Foco mágico imbuido con magia cósmica para Hechiceros y Brujos.',
    flavorText: 'Emite pulsos de energía pura.',
    icon: `${WESNOTH_BASE_URL}/items/staff-magic.png`,
    equipmentStats: {
      slot: EquipmentSlot.MAIN_HAND,
      diceCount: 1,
      diceSides: 8,
      modifiers: { [Ability.CHA]: 3, [Ability.CON]: 1 }
    }
  },

  // --- ARMORS FOR ALL CLASSES ---
  'REFORGED_PLATE_ARMOR': {
    id: 'reforged_plate_armor',
    name: 'Armadura de Placas de la Guardia',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Conjunto de coraza pesada para Guerreros y Paladines.',
    flavorText: 'Excelente protección contra impactos frontales.',
    icon: `${WESNOTH_BASE_URL}/items/armor.png`,
    equipmentStats: {
      slot: EquipmentSlot.BODY,
      ac: 17,
      modifiers: { [Ability.CON]: 1 }
    }
  },
  'REFORGED_STUDDED_LEATHER': {
    id: 'reforged_studded_leather',
    name: 'Cuero Tachonado de Explorador',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Armadura flexible para Pícaros, Exploradores y Bardos.',
    flavorText: 'Silenciosa y ligera como una pluma.',
    icon: `${WESNOTH_BASE_URL}/items/armor.png`,
    equipmentStats: {
      slot: EquipmentSlot.BODY,
      ac: 13,
      modifiers: { [Ability.DEX]: 1 }
    }
  },
  'REFORGED_MAGE_ROBE': {
    id: 'reforged_mage_robe',
    name: 'Túnica de Tejido Arcano',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Vestimenta encantada para Magos, Hechiceros y Brujos.',
    flavorText: 'Otorga agudeza mental y resistencia mágica.',
    icon: `${WESNOTH_BASE_URL}/items/armor.png`,
    equipmentStats: {
      slot: EquipmentSlot.BODY,
      ac: 12,
      modifiers: { [Ability.INT]: 1, [Ability.CHA]: 1 }
    }
  },
  'REFORGED_CHAIN_MAIL': {
    id: 'reforged_chain_mail',
    name: 'Cota de Malla del Templo',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Protección media robusta para Clérigos y Druidas.',
    flavorText: 'Las anillas bendecidas dispersan el daño físico.',
    icon: `${WESNOTH_BASE_URL}/items/armor.png`,
    equipmentStats: {
      slot: EquipmentSlot.BODY,
      ac: 15,
      modifiers: { [Ability.WIS]: 1 }
    }
  },
  'REFORGED_SHIELD': {
    id: 'reforged_shield',
    name: 'Escudo del León de Hierro',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Escudo protector adornado con el blasón de la capital.',
    flavorText: 'Desvía proyectiles y golpes devastadores.',
    icon: `${WESNOTH_BASE_URL}/attacks/heater-shield.png`,
    equipmentStats: {
      slot: EquipmentSlot.OFF_HAND,
      ac: 2,
      modifiers: { [Ability.CON]: 1 }
    }
  },

  // --- ACCESSORIES & CONSUMABLES ---
  'RING_OF_PROTECTION_IRON': {
    id: 'ring_of_protection_iron',
    name: 'Anillo de Protección del Novicio',
    type: 'equipment',
    rarity: ItemRarity.RARE,
    description: 'Sortija encantada que envuelve al portador con una barrera mágica sutil.',
    flavorText: 'Un talismán otorgado a los mejores aventureros novatos.',
    icon: `${WESNOTH_BASE_URL}/items/ring-gold.png`,
    equipmentStats: {
      slot: EquipmentSlot.OFF_HAND,
      ac: 1,
      modifiers: { [Ability.CON]: 1, [Ability.WIS]: 1 }
    }
  },
  'POTION_GREATER_HEALING': {
    id: 'potion_greater_healing',
    name: 'Poción Mayor de Salud',
    type: 'consumable',
    rarity: ItemRarity.UNCOMMON,
    description: 'Restaura 25 Puntos de Golpe al instante.',
    icon: `${WESNOTH_BASE_URL}/items/potion-red.png`,
    effect: { type: 'heal_hp', amount: 25 }
  }
};
