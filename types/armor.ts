export enum DamageType {
    MELEE = 'melee',
    PROJECTILE = 'projectile',
    FIRE = 'fire',
    BLUNT = 'blunt',
    SLASH = 'slash',
    PIERCE = 'pierce'
}

export interface ArmorResistances {
    [DamageType.MELEE]?: number;
    [DamageType.PROJECTILE]?: number;
    [DamageType.FIRE]?: number;
    [DamageType.BLUNT]?: number;
    [DamageType.SLASH]?: number;
    [DamageType.PIERCE]?: number;
}

export enum ArmorImmunities {
    BURN = 'burn',
    COLD = 'cold',
    WETNESS = 'wetness',
    KNOCKBACK = 'knockback',
    BLEED = 'bleed'
}

export interface ArmorSpecialEffects {
    meleeDamageReflection?: number; // percentage
    detectionRadiusModifier?: number; // scalar
    lowHealthDamageBonus?: number; // percentage
    silentMovement?: boolean;
    animalIntimidation?: boolean;
    coldResistanceScaling?: number; // per level
    dryingSpeedModifier?: number; // scalar
}
