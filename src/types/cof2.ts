export type StatCode = 'FOR' | 'AGI' | 'CON' | 'PER' | 'INT' | 'VOL' | 'CHA';

export type ProfileFamily = 'Aventuriers' | 'Combattants' | 'Mages' | 'Mystiques';

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
  note?: string;
}

export interface WeaponModifierRule {
  tags?: WeaponTag[];
  weaponIds?: string[];
  category?: 'contact' | 'distance';
  grantProficiency?: boolean;
  attackBonus?: number;
  damageBonus?: number;
  damageStatBonus?: StatCode;
  critRangeBonus?: number;
  sourceName?: string;
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

export interface CompanionFormula {
  base?: number;
  perLevel?: number;
  perRank?: number;
  stat?: StatCode;
  heroStatRef?: 'initiative' | 'magicAttack' | 'contactAttack' | 'distanceAttack' | 'defense';
  offset?: number;
}

export interface CreatureAttack {
  name: string;
  attackBonus?: string;
  attackFormula?: CompanionFormula;
  damage: string;
  range?: string;
  special?: string;
}

export interface CompanionStatBlock {
  name: string;
  category?: string;
  stats?: Partial<Record<StatCode, string>>;
  defense?: string;
  defenseFormula?: CompanionFormula;
  hp?: string;
  hpFormula?: CompanionFormula;
  initiative?: string;
  initiativeFormula?: CompanionFormula;
  attacks?: CreatureAttack[];
  specialFeatures?: string[];
  notes?: string[];
}

export interface ActionRank {
  rank: number;
  title: string;
  actionType: 'Action' | 'Limitée' | 'Attaque' | 'Mouvement' | 'Gratuite';
  isSpell: boolean;
  isLimited?: boolean;
  isAttack?: boolean;
  isMovement?: boolean;
  isFreeAction?: boolean;
  isPassive?: boolean;
  description: string;
  modifiers?: RankModifiers;
  companions?: CompanionStatBlock[];
}

export interface PriestDeity {
  name: string;
  domainTitle: string;
  symbolDesc: string;
  sacredWeapon: string;
  sacredWeaponIds: string[];
  domainPathId: string;
}

export interface PrestigePrerequisites {
  minLevel: number;
  allowedFamilies?: ProfileFamily[] | 'All';
  minProfilePathsAtRank?: {
    count: number;
    rank: number;
  };
}

export interface PathData {
  id: string;
  name: string;
  symbol: string;
  ranks: ActionRank[];
  type: 'profile' | 'racial' | 'generic' | 'prestige' | 'domain';
  owner?: string;
  familyRestriction?: ProfileFamily | 'All';
  prerequisites?: PrestigePrerequisites;
  deity?: string;
  domainTitle?: string;
  symbolDesc?: string;
  sacredWeapon?: string;
  sacredWeaponIds?: string[];
}

export type ShieldPermission = 'none' | 'small' | 'any';

export interface ProfileWeaponRules {
  allowedCategories?: Array<'contact' | 'distance'>;
  maxHands?: number;
  maxHandsMelee?: number;
  allowedDamageTypes?: string[];
  forbidPowder?: boolean;
  forbidCrossbows?: boolean;
  forbidImprovedCrit?: boolean;
  forbiddenTags?: WeaponTag[];
  explicitAllowedWeaponIds?: string[];
  maxDamageDice?: number;
  allowedExceptionWeaponIds?: string[];
}

export interface ProfileEquipmentRule {
  maxArmorId: string | null;
  maxSpellcastingArmorDef?: number | null;
  shieldPermission: ShieldPermission;
  summaryArmor: string;
  summaryShield: string;
  summaryWeapons: string;
  weaponRules: ProfileWeaponRules;
}

export interface ProfileDefaultEquipment {
  armorId: string | null;
  shieldId: string | null;
  defaultWeaponIds: string[];
}

export interface PeopleEquipmentRules {
  forbiddenWeaponIds?: string[];
  maxDamageDice?: number;
  maxOneHandedDamageDice?: number;
  twoHandedMinDamageDice?: number;
  twoHandedWeaponIds?: string[];
  preferredArmorId?: string;
  sizeDefenseBonus?: number;
  sizeNotes?: string[];
  summary?: string;
}

export interface PeopleData {
  id: string;
  name: string;
  source: BookSource;
  description: string;
  bonusOptions: string[][];
  malusOptions: string[][];
  reperes: string;
  startingAge: string;
  lifeExpectancy: string;
  heightRange: string;
  weightRange: string;
  physicalTraits: string;
  defaultLanguages: string;
  interpretationTip?: string;
  racialPathId: string | null;
  selectableRacialPaths?: string[];
  equipmentRules?: PeopleEquipmentRules | null;
  names: {
    masculine: string[];
    feminine: string[];
    namingTip: string;
  };
}

export interface ProfileData {
  id: string;
  name: string;
  source: BookSource;
  family: ProfileFamily;
  isFamilySelectable?: boolean;
  tagline: string;
  primaryStats: StatCode[];
  hpPerLevel: number;
  hd: string;
  bonusPC: number;
  bonusDR: number;
  hasMageBonus: boolean;
  description: string;
  weaponsAndArmor: string;
  startingEquipment: string;
  paths: string[];
  equipmentRules?: ProfileEquipmentRule;
  defaultEquipment?: ProfileDefaultEquipment;
}

export interface ArmorItem {
  id: string;
  name: string;
  def: number;
  maxAgi: number | null;
  price: string;
  type: 'armor' | 'shield';
  equivalentArmorId?: string;
  restrictedToPeopleIds?: string[];
  notes?: string;
}

export interface WeaponItem {
  id: string;
  name: string;
  category: 'contact' | 'distance';
  damage: string;
  twoHandedDamage?: string;
  maxDamageDice: number;
  critMin: number;
  damageType: string;
  range: string;
  throwRange?: string;
  hands: number;
  tags: WeaponTag[];
  smallRaceReplacementId?: string;
  notes: string;
}

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

export interface CharacterSheet {
  id: string;
  version: string;
  updatedAt: string;

  // Identity.
  name: string;
  playerName: string;
  sex?: string;
  age?: string;
  height?: string;
  weight?: string;
  physicalTraits?: string;
  languages?: string;
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
  selectedRacialBonus?: StatCode;
  selectedRacialMalus?: StatCode;
  selectedRacialBonuses?: StatCode[];
  selectedRacialMaluses?: StatCode[];
  manualStatBonuses?: Partial<Record<StatCode, number>>;

  // Paths & Abilities.
  selectedPathIds: string[];
  acquiredAbilities: Array<{ pathId: string; rank: number }>;
  pathRankChoices?: Record<string, string>; // Maps `${pathId}_${rank}` -> choiceOptionId
  externalAbilityChoices?: Record<string, { pathId: string; rank: number }>; // Maps `${pathId}_${rank}` -> borrowed ability

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

  // Breakdown of path passive bonuses.
  pathBonusStats: Record<StatCode, number>;
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
}
