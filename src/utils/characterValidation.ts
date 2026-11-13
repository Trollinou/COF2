import { CharacterSheet, StatCode } from '../types/cof2';
import { createDefaultCharacter, computeRacialStatModifiers } from '../engine/rulesEngine';

const VALID_STATS: StatCode[] = ['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'];

export interface ValidationResult {
  isValid: boolean;
  character: CharacterSheet;
  warnings: string[];
}

/**
 * Validates and repairs an untrusted character object (from file or storage).
 * Guarantees a robust, non-crashing CharacterSheet object conforming to the current schema.
 */
export function validateAndMigrateCharacter(data: unknown): ValidationResult {
  const defaultChar = createDefaultCharacter();
  const warnings: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      character: defaultChar,
      warnings: ['Données invalides : format non reconnu. Réinitialisé avec un personnage par défaut.'],
    };
  }

  const raw = data as Record<string, any>;

  // Check critical identifiers
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : defaultChar.id;
  const version = typeof raw.version === 'string' ? raw.version : '1.0.0';
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Héros sans nom';
  const playerName = typeof raw.playerName === 'string' ? raw.playerName : '';
  const peopleId = typeof raw.peopleId === 'string' ? raw.peopleId : defaultChar.peopleId;
  const profileId = typeof raw.profileId === 'string' ? raw.profileId : defaultChar.profileId;
  const secondaryProfileId = typeof raw.secondaryProfileId === 'string' ? raw.secondaryProfileId : undefined;
  const level = Number.isInteger(raw.level) && raw.level >= 1 && raw.level <= 20 ? raw.level : 1;

  // Validate Base Stats
  const baseStats: Record<StatCode, number> = { ...defaultChar.baseStats };
  if (raw.baseStats && typeof raw.baseStats === 'object') {
    VALID_STATS.forEach(stat => {
      const val = Number(raw.baseStats[stat]);
      if (!Number.isNaN(val) && Number.isFinite(val)) {
        baseStats[stat] = val;
      } else {
        warnings.push(`Statistique ${stat} invalide ou manquante, réinitialisée à ${baseStats[stat]}.`);
      }
    });
  } else {
    warnings.push('Bloc de caractéristiques de base absent, initialisé aux valeurs par défaut.');
  }

  const statArrayPreset = typeof raw.statArrayPreset === 'string' ? raw.statArrayPreset : undefined;

  // Validate Paths and Abilities
  const selectedPathIds: string[] = Array.isArray(raw.selectedPathIds)
    ? raw.selectedPathIds.filter((p: unknown) => typeof p === 'string')
    : defaultChar.selectedPathIds;

  const acquiredAbilities: Array<{ pathId: string; rank: number }> = Array.isArray(raw.acquiredAbilities)
    ? raw.acquiredAbilities
        .filter((a: any) => a && typeof a.pathId === 'string' && Number.isInteger(a.rank) && a.rank >= 1 && a.rank <= 8)
        .map((a: any) => ({ pathId: a.pathId, rank: a.rank }))
    : defaultChar.acquiredAbilities;

  // Validate path choices keys if applicable
  let pathRankChoices: Record<string, string> | undefined = undefined;
  if (raw.pathRankChoices && typeof raw.pathRankChoices === 'object') {
    pathRankChoices = {};
    for (const [key, val] of Object.entries(raw.pathRankChoices)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (typeof val === 'string' && /^[a-zA-Z0-9_\-]+$/.test(key)) {
        pathRankChoices[key] = val;
      }
    }
  }

  let externalAbilityChoices: Record<string, { pathId: string; rank: number }> | undefined = undefined;
  if (raw.externalAbilityChoices && typeof raw.externalAbilityChoices === 'object') {
    externalAbilityChoices = {};
    for (const [key, val] of Object.entries(raw.externalAbilityChoices)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      const v = val as any;
      if (v && typeof v.pathId === 'string' && Number.isInteger(v.rank) && v.rank >= 1 && v.rank <= 8) {
        externalAbilityChoices[key] = { pathId: v.pathId, rank: v.rank };
      }
    }
  }

  // Validate Weapons
  const weapons = Array.isArray(raw.weapons)
    ? raw.weapons.map((w: any, idx: number) => ({
        id: typeof w.id === 'string' ? w.id : `w_${idx + 1}`,
        weaponRefId: typeof w.weaponRefId === 'string' ? w.weaponRefId : 'mains-nues',
        name: typeof w.name === 'string' ? w.name : 'Arme inconnue',
        damage: typeof w.damage === 'string' ? w.damage : '1d4',
        range: typeof w.range === 'string' ? w.range : 'Contact',
        category: w.category === 'distance' ? ('distance' as const) : ('contact' as const),
        bonusAttack: typeof w.bonusAttack === 'number' && Number.isFinite(w.bonusAttack) ? w.bonusAttack : 0,
        bonusDamage: typeof w.bonusDamage === 'number' && Number.isFinite(w.bonusDamage) ? w.bonusDamage : 0,
        requiresTwoHands: Boolean(w.requiresTwoHands),
        attackStatUsed: typeof w.attackStatUsed === 'string' && VALID_STATS.includes(w.attackStatUsed as StatCode) ? (w.attackStatUsed as StatCode) : undefined,
        attackStatSource: typeof w.attackStatSource === 'string' ? w.attackStatSource : undefined,
      }))
    : defaultChar.weapons;

  // Validate Inventory
  const inventory = Array.isArray(raw.inventory)
    ? raw.inventory.map((item: any, idx: number) => ({
        id: typeof item.id === 'string' ? item.id : `inv_${idx}`,
        name: typeof item.name === 'string' ? item.name : 'Objet',
        quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity >= 0 ? item.quantity : 1,
        notes: typeof item.notes === 'string' ? item.notes : undefined,
      }))
    : defaultChar.inventory;

  // Validate Coins
  const coins = {
    pa: typeof raw.coins?.pa === 'number' && Number.isFinite(raw.coins.pa) ? raw.coins.pa : 0,
    pc: typeof raw.coins?.pc === 'number' && Number.isFinite(raw.coins.pc) ? raw.coins.pc : 0,
    po: typeof raw.coins?.po === 'number' && Number.isFinite(raw.coins.po) ? raw.coins.po : 0,
  };

  const racialStatChoices = Array.isArray(raw.racialStatChoices)
    ? raw.racialStatChoices.filter((s: unknown): s is StatCode => typeof s === 'string' && VALID_STATS.includes(s as StatCode))
    : defaultChar.racialStatChoices;

  const racialStatModifiers = computeRacialStatModifiers(
    peopleId,
    racialStatChoices,
    raw.racialStatModifiers && typeof raw.racialStatModifiers === 'object' ? raw.racialStatModifiers : undefined,
  );

  const migratedChar: CharacterSheet = {
    id,
    version,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    name,
    playerName,
    sex: typeof raw.sex === 'string' ? raw.sex : 'Masculin',
    age: typeof raw.age === 'string' ? raw.age : '',
    height: typeof raw.height === 'string' ? raw.height : '',
    weight: typeof raw.weight === 'string' ? raw.weight : '',
    physicalTraits: typeof raw.physicalTraits === 'string' ? raw.physicalTraits : '',
    languages: typeof raw.languages === 'string' ? raw.languages : '',
    background: typeof raw.background === 'string' ? raw.background : '',
    ideal: typeof raw.ideal === 'string' ? raw.ideal : '',
    flaw: typeof raw.flaw === 'string' ? raw.flaw : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    deity: typeof raw.deity === 'string' ? raw.deity : undefined,
    peopleId,
    profileId,
    profileFamily: raw.profileFamily,
    isHybrid: typeof raw.isHybrid === 'boolean' ? raw.isHybrid : undefined,
    secondaryProfileId,
    level,
    baseStats,
    statArrayPreset,
    racialStatChoices,
    racialStatModifiers,
    manualStatBonuses: (() => {
      const safe: Partial<Record<StatCode, number>> = {};
      if (raw.manualStatBonuses && typeof raw.manualStatBonuses === 'object') {
        for (const stat of VALID_STATS) {
          const val = Number(raw.manualStatBonuses[stat]);
          if (Number.isFinite(val) && val !== 0) {
            safe[stat] = val;
          }
        }
      }
      return safe;
    })(),
    selectedPathIds,
    acquiredAbilities,
    pathRankChoices,
    externalAbilityChoices,
    currentHp: typeof raw.currentHp === 'number' && Number.isFinite(raw.currentHp) ? raw.currentHp : defaultChar.currentHp,
    maxHpBonus: typeof raw.maxHpBonus === 'number' && Number.isFinite(raw.maxHpBonus) ? raw.maxHpBonus : 0,
    levelUpHpGains: Array.isArray(raw.levelUpHpGains)
      ? raw.levelUpHpGains.filter((n: any) => typeof n === 'number' && Number.isInteger(n))
      : undefined,
    progressionHistory: Array.isArray(raw.progressionHistory)
      ? raw.progressionHistory.filter((s: any) => s && typeof s.level === 'number' && Number.isInteger(s.level))
      : undefined,
    halfHpPending: typeof raw.halfHpPending === 'boolean' ? raw.halfHpPending : undefined,
    currentDr: typeof raw.currentDr === 'number' && Number.isFinite(raw.currentDr) ? raw.currentDr : defaultChar.currentDr,
    currentPc: typeof raw.currentPc === 'number' && Number.isFinite(raw.currentPc) ? raw.currentPc : defaultChar.currentPc,
    currentPm: typeof raw.currentPm === 'number' && Number.isFinite(raw.currentPm) ? raw.currentPm : defaultChar.currentPm,
    equippedArmorId: typeof raw.equippedArmorId === 'string' ? raw.equippedArmorId : undefined,
    equippedShieldId: typeof raw.equippedShieldId === 'string' ? raw.equippedShieldId : undefined,
    weapons,
    inventory,
    coins,
  };

  return {
    isValid: warnings.length === 0,
    character: migratedChar,
    warnings,
  };
}

