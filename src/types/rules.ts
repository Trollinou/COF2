import type {
  AcquiredAbility,
  ProfileFamily,
  StatCode,
  WeaponCategory,
  WeaponModifierRule,
} from '../bindings';

export type {
  AcquiredAbility,
  ProfileFamily,
  StatCode,
  WeaponCategory,
  WeaponModifierRule,
};

export type AbilityRef = AcquiredAbility;

export type BookSource = 'base' | 'compagnon';

export type WeaponTag =
  | 'legere'
  | 'lancer'
  | 'allonge'
  | 'deux-mains'
  | 'polyvalente'
  | 'epee'
  | 'sabre'
  | 'hache'
  | 'marteau'
  | 'masse'
  | 'lance'
  | 'baton'
  | 'arc'
  | 'arbalete'
  | 'poudre'
  | 'fronde'
  | 'mains-nues'
  | 'escrime'
  | 'duelliste'
  | 'danseur'
  | 'outil';

export type StatSubstitutionTarget = 'attackContact' | 'attackDistance' | 'defense';
export type WeaponFilterCategory =
  | 'bareHands'
  | 'lightWeapons'
  | 'oneHanded'
  | 'sabres'
  | 'duellisteWeapons'
  | 'danseurWeapons'
  | 'projectiles'
  | 'any';

export interface StatSubstitutionRule {
  target: StatSubstitutionTarget;
  replacementStat: StatCode;
  baseStat: StatCode;
  weaponFilter?: WeaponFilterCategory;
  conditionNote?: string;
  sourceName?: string;
  fallbackDefenseBonus?: {
    flat: number;
    atRank?: Record<string, number>;
  };
}

export type BonusTarget =
  | 'defense'
  | 'hp'
  | 'initiative'
  | 'pc'
  | 'dr'
  | 'pm'
  | 'damageReduction'
  | 'atkContact'
  | 'atkDistance'
  | 'atkMagic'
  | 'dmContact'
  | 'dmDistance'
  | 'dmMagic'
  | 'critRange';

export interface ScalingBonusRule {
  target: BonusTarget;
  flat?: number;
  stat?: StatCode;
  perRank?: number;
  perLevel?: number;
  atRank?: Record<string, number>;
  atLevel?: Record<string, number>;
  cap?: 'rank' | number;
  condition?: 'noArmor' | 'noShield' | 'lightArmor';
  nonStackingGroup?: string;
  note?: string;
}

export interface ExternalAbilityGrantRule {
  allowedProfiles: string[] | 'any';
  maxRank: number;
  alternativeMaxRankNoArmor?: number;
  ignoreArmorPenalty?: boolean;
  maxFreeSpellArmorId?: string;
  count?: number;
  label?: string;
  defaultAbility?: AbilityRef;
  replacementAbilities?: AbilityRef[];
}

export interface RankChoiceOption {
  id: string;
  label: string;
  modifiers: RankModifiers;
}

export interface RankModifiers {
  // Permanent characteristic bonuses (+1 FOR, etc.).
  stats?: Partial<Record<StatCode, number>>;

  // Declarative scaling & conditional bonuses (DEF, HP, Init, PC, DR, PM, RD, Attacks, Damage, Crit).
  bonuses?: ScalingBonusRule[];

  // Stat substitutions (e.g. AGI instead of FOR for contact attack, CON instead of AGI for DEF).
  statSubstitutions?: StatSubstitutionRule[];

  // Weapon-specific bonuses & proficiencies (e.g. Nain axes/hammers, Elfe sylvain bows, Gnome crossbows/powder).
  weaponModifiers?: WeaponModifierRule[];

  // Stat replacements for derived resources (PC & PM).
  luckStatReplacement?: StatCode;
  manaStatReplacement?: StatCode;

  // Grants an external ability from another profile (e.g. Touche-à-tout, Talent pour la magie).
  grantExternalAbility?: ExternalAbilityGrantRule;

  // Player choice options (e.g. +1 INT or +1 CHA).
  choiceOptions?: RankChoiceOption[];

  // Situational notes / tactical reminders.
  situationalNotes?: string[];
}
