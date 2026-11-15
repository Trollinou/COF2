import type {
  ProfileFamily,
  StatCode,
  StatSubstitutionRule,
  WeaponModifierRule,
} from './rules';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
}

export interface CharacterWeaponInstance {
  id: string;
  weaponRefId: string;
  name: string;
  damage: string;
  range: string;
  category: 'contact' | 'distance';
  bonusAttack?: number;
  bonusDamage?: number;
  requiresTwoHands?: boolean;
  attackStatUsed?: StatCode;
  attackStatSource?: string;
}

export type LiteracyStatus = 'illiterate' | 'hesitant' | 'literate';

export interface LanguageSummary {
  automaticLanguages: string[];
  bonusLanguageSlots: number;
  usedBonusSlots: number;
  argotienSlotCost: number;
  literacy: LiteracyStatus;
  intNote: string | null;
}

export interface LevelProgressionStep {
  level: number;
  hpGain: number;
  abilitiesLearned?: Array<{ pathId: string; rank: number }>;
  selectedPathIds?: string[];
  pathRankChoices?: Record<string, string>;
  manualStatBonuses?: Partial<Record<StatCode, number>>;
  languagesLearned?: string[];
  secondaryTalentsLearned?: string[];
  timestamp?: string;
}

export interface HumanDiversityChoice {
  originId: string;
  customOriginName?: string;
  customDomain1?: string;
  customDomain2?: string;
  replacedDomainIndex?: number; // 0 or 1
  replacementTrade?: string;
}

export interface CharacterSheet {
  id: string;
  version: string;
  updatedAt: string;
  creationCompleted?: boolean;

  // Identity.
  name: string;
  playerName: string;
  sex?: string;
  age?: string;
  height?: string;
  weight?: string;
  physicalTraits?: string;
  languages?: string[];
  secondaryTalents?: string[];
  background?: string;
  ideal?: string;
  flaw?: string;
  notes?: string;
  deity?: string;

  // Heritage & Profession.
  peopleId: string;
  profileId: string;
  profileFamily?: ProfileFamily;
  isHybrid?: boolean;
  secondaryProfileId?: string;
  level: number;

  // Stats.
  baseStats: Record<StatCode, number>;
  statArrayPreset?: string;
  racialStatChoices?: StatCode[];
  racialStatModifiers?: Record<StatCode, number>;
  manualStatBonuses?: Partial<Record<StatCode, number>>;

  // Paths & Abilities.
  selectedPathIds: string[];
  acquiredAbilities: Array<{ pathId: string; rank: number }>;
  pathRankChoices?: Record<string, string>; // Maps `${pathId}_${rank}` -> choiceOptionId
  externalAbilityChoices?: Record<string, { pathId: string; rank: number }>; // Maps `${pathId}_${rank}` -> borrowed ability
  humanDiversity?: HumanDiversityChoice | null;

  // Historique des montées de niveau
  progressionHistory?: LevelProgressionStep[];

  // Live state during play.
  currentHp: number;
  maxHpBonus: number;
  levelUpHpGains?: number[]; // Exact base HP gained at each level (index 0 = level 1)
  halfHpPending?: boolean; // Tracks an unrounded half-HP pending for next level-up
  currentDr: number;
  currentPc: number;
  currentPm: number;

  // Equipment.
  equippedArmorId?: string;
  equippedShieldId?: string;
  weapons: CharacterWeaponInstance[];
  inventory: InventoryItem[];
  coins: {
    pa: number;
    pc: number;
    po: number;
  };
}

export interface ComputedCharacterStats {
  baseStats: Record<StatCode, number>;
  finalStats: Record<StatCode, number>;
  bab: number;
  attacks: {
    contact: number;
    distance: number;
    magique: number;
  };
  initiative: number;
  maxHp: number;
  maxDr: number;
  drDice: string;
  maxPc: number;
  maxPm: number;
  energyType?: 'PM' | 'PE';
  effectiveFamily?: ProfileFamily;
  isHybrid?: boolean;
  secondaryProfileName?: string;
  armorSpellMalus?: number;
  defense: number;
  armorDefense: number;
  shieldDefense: number;
  effectiveAgi: number;

  // Stat substitutions.
  contactAttackStat?: StatCode;
  contactAttackStatSource?: string;
  distanceAttackStat?: StatCode;
  distanceAttackStatSource?: string;
  defenseStat?: StatCode;
  defenseStatSource?: string;
  activeSubstitutions?: StatSubstitutionRule[];

  // Active weapon modifiers from paths.
  activeWeaponModifiers?: WeaponModifierRule[];

  // Breakdown of racial & path passive bonuses.
  racialBonusStats: Record<StatCode, number>;
  pathBonusStats: Record<StatCode, number>;
  manualBonusStats: Record<StatCode, number>;
  otherBonusStats: Record<StatCode, number>;
  pathBonusDefense: number;
  pathBonusInitiative: number;
  pathBonusHp: number;
  pathBonusAttacks: {
    contact: number;
    distance: number;
    magique: number;
  };
  pathBonusDamage: {
    contact: number;
    distance: number;
    magique: number;
  };
  pathCritRangeBonus: number;
  pathBonusPc: number;
  pathBonusDr: number;
  pathBonusPm: number;
  pathSituationalNotes: string[];
  languagesInfo: LanguageSummary;
}
