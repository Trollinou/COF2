import {
  CharacterSheet,
  HumanDiversityChoice,
  LevelProgressionStep,
  ProfileFamily,
  StatCode,
} from '../types/cof2';
import { createDefaultCharacter, computeRacialStatModifiers } from '../engine/rulesEngine';

const VALID_STATS: StatCode[] = ['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

  if (!isRecord(data)) {
    return {
      isValid: false,
      character: defaultChar,
      warnings: ['Données invalides : format non reconnu. Réinitialisé avec un personnage par défaut.'],
    };
  }

  const raw = data;

  // Check critical identifiers
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : defaultChar.id;
  const version = typeof raw.version === 'string' ? raw.version : '1.0.0';
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Héros sans nom';
  const playerName = typeof raw.playerName === 'string' ? raw.playerName : '';
  const peopleId = typeof raw.peopleId === 'string' ? raw.peopleId : defaultChar.peopleId;
  const profileId = typeof raw.profileId === 'string' ? raw.profileId : defaultChar.profileId;
  const secondaryProfileId = typeof raw.secondaryProfileId === 'string' ? raw.secondaryProfileId : undefined;
  const level = typeof raw.level === 'number' && Number.isInteger(raw.level) && raw.level >= 1 && raw.level <= 20 ? raw.level : 1;

  // Validate Base Stats
  const baseStats: Record<StatCode, number> = { ...defaultChar.baseStats };
  if (isRecord(raw.baseStats)) {
    const rawBaseStats = raw.baseStats;
    VALID_STATS.forEach(stat => {
      const val = Number(rawBaseStats[stat]);
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
        .filter((a): a is { pathId: string; rank: number } =>
          isRecord(a) && typeof a.pathId === 'string' && typeof a.rank === 'number' && Number.isInteger(a.rank) && a.rank >= 1 && a.rank <= 8
        )
        .map(a => ({ pathId: a.pathId, rank: a.rank }))
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
  if (isRecord(raw.externalAbilityChoices)) {
    externalAbilityChoices = {};
    for (const [key, val] of Object.entries(raw.externalAbilityChoices)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (isRecord(val) && typeof val.pathId === 'string' && typeof val.rank === 'number' && Number.isInteger(val.rank) && val.rank >= 1 && val.rank <= 8) {
        externalAbilityChoices[key] = { pathId: val.pathId, rank: val.rank };
      }
    }
  }

  let humanDiversity: HumanDiversityChoice | undefined = undefined;
  if (isRecord(raw.humanDiversity) && typeof raw.humanDiversity.originId === 'string') {
    const hd = raw.humanDiversity;
    const originId = raw.humanDiversity.originId.trim();
    if (/^[a-z0-9_-]+$/i.test(originId)) {
      humanDiversity = {
        originId,
        customOriginName: typeof hd.customOriginName === 'string' ? hd.customOriginName.trim() || undefined : undefined,
        customDomain1: typeof hd.customDomain1 === 'string' ? hd.customDomain1.trim() || undefined : undefined,
        customDomain2: typeof hd.customDomain2 === 'string' ? hd.customDomain2.trim() || undefined : undefined,
        replacedDomainIndex: hd.replacedDomainIndex === 0 || hd.replacedDomainIndex === 1 ? hd.replacedDomainIndex : undefined,
        replacementTrade: typeof hd.replacementTrade === 'string' ? hd.replacementTrade.trim() || undefined : undefined,
      };
    }
  }

  // Validate Weapons
  const weapons = Array.isArray(raw.weapons)
    ? raw.weapons.filter(isRecord).map((w, idx) => ({
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
    ? raw.inventory.filter(isRecord).map((item, idx) => ({
        id: typeof item.id === 'string' ? item.id : `inv_${idx}`,
        name: typeof item.name === 'string' ? item.name : 'Objet',
        quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity >= 0 ? item.quantity : 1,
        notes: typeof item.notes === 'string' ? item.notes : undefined,
      }))
    : defaultChar.inventory;

  // Validate Coins
  const rawCoins = isRecord(raw.coins) ? raw.coins : undefined;
  const coins = {
    pa: typeof rawCoins?.pa === 'number' && Number.isFinite(rawCoins.pa) ? rawCoins.pa : 0,
    pc: typeof rawCoins?.pc === 'number' && Number.isFinite(rawCoins.pc) ? rawCoins.pc : 0,
    po: typeof rawCoins?.po === 'number' && Number.isFinite(rawCoins.po) ? rawCoins.po : 0,
  };

  const racialStatChoices = Array.isArray(raw.racialStatChoices)
    ? raw.racialStatChoices.filter((s: unknown): s is StatCode => typeof s === 'string' && VALID_STATS.includes(s as StatCode))
    : defaultChar.racialStatChoices;

  const racialStatModifiers = computeRacialStatModifiers(
    peopleId,
    racialStatChoices,
    isRecord(raw.racialStatModifiers) ? (raw.racialStatModifiers as Partial<Record<StatCode, number>>) : undefined,
  );

  const migratedChar: CharacterSheet = {
    id,
    version,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    creationCompleted: typeof raw.creationCompleted === 'boolean' ? raw.creationCompleted : true,
    name,
    playerName,
    sex: typeof raw.sex === 'string' ? raw.sex : 'Masculin',
    age: typeof raw.age === 'string' ? raw.age : '',
    height: typeof raw.height === 'string' ? raw.height : '',
    weight: typeof raw.weight === 'string' ? raw.weight : '',
    physicalTraits: typeof raw.physicalTraits === 'string' ? raw.physicalTraits : '',
    languages: Array.isArray(raw.languages)
      ? raw.languages.filter((l: unknown): l is string => typeof l === 'string' && l.trim().length > 0)
      : [],
    secondaryTalents: Array.isArray(raw.secondaryTalents)
      ? raw.secondaryTalents.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
      : [],
    background: typeof raw.background === 'string' ? raw.background : '',
    ideal: typeof raw.ideal === 'string' ? raw.ideal : '',
    flaw: typeof raw.flaw === 'string' ? raw.flaw : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    deity: typeof raw.deity === 'string' ? raw.deity : undefined,
    peopleId,
    profileId,
    profileFamily: typeof raw.profileFamily === 'string' ? (raw.profileFamily as ProfileFamily) : undefined,
    isHybrid: typeof raw.isHybrid === 'boolean' ? raw.isHybrid : undefined,
    secondaryProfileId,
    level,
    baseStats,
    statArrayPreset,
    racialStatChoices,
    racialStatModifiers,
    manualStatBonuses: (() => {
      const safe: Partial<Record<StatCode, number>> = {};
      if (isRecord(raw.manualStatBonuses)) {
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
    humanDiversity,
    currentHp: typeof raw.currentHp === 'number' && Number.isFinite(raw.currentHp) ? raw.currentHp : defaultChar.currentHp,
    maxHpBonus: typeof raw.maxHpBonus === 'number' && Number.isFinite(raw.maxHpBonus) ? raw.maxHpBonus : 0,
    levelUpHpGains: Array.isArray(raw.levelUpHpGains)
      ? raw.levelUpHpGains.filter((n): n is number => typeof n === 'number' && Number.isInteger(n))
      : undefined,
    progressionHistory: Array.isArray(raw.progressionHistory)
      ? raw.progressionHistory.filter(
          (s): s is LevelProgressionStep => isRecord(s) && typeof s.level === 'number' && Number.isInteger(s.level),
        )
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

