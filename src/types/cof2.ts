export type StatCode = 'FOR' | 'AGI' | 'CON' | 'PER' | 'INT' | 'VOL' | 'CHA';

export type ProfileFamily = 'Aventuriers' | 'Combattants' | 'Mages' | 'Mystiques';

export type StatSubstitutionTarget = 'attackContact' | 'attackDistance' | 'defense';
export type WeaponFilterCategory = 'bareHands' | 'lightWeapons' | 'oneHanded' | 'sabres' | 'duellisteWeapons' | 'danseurWeapons' | 'projectiles' | 'any';

export interface StatSubstitutionRule {
  target: StatSubstitutionTarget;
  replacementStat: StatCode;
  baseStat: StatCode;
  weaponFilter?: WeaponFilterCategory;
  conditionNote?: string;
  sourceName?: string;
}

export interface RankChoiceOption {
  id: string;
  label: string;
  modifiers: RankModifiers;
}

export interface RankModifiers {
  // Stat bonuses
  stats?: Partial<Record<StatCode, number>>;
  
  // Stat substitutions (e.g. AGI instead of FOR for contact attack, PER instead of AGI for ranged, CON instead of AGI for DEF)
  statSubstitutions?: StatSubstitutionRule[];
  
  // Defense & Protections
  defense?: number;
  damageReduction?: number;
  
  // Initiative
  initiative?: number;
  initiativeStatBonus?: StatCode; // Ex: 'CHA' (Voie du baroudeur) or 'VOL' (Contrôle du métabolisme)
  
  // Hit Points (PV)
  hpBonus?: number;
  hpStatBonus?: StatCode; // Ex: 'VOL' (Voie du contrôle corporel, Talent personnel)
  hpPerRankInPath?: boolean; // Ex: +1 PV par rang atteint dans cette voie
  
  // Attack & Damage bonuses
  attackBonus?: {
    contact?: number;
    distance?: number;
    magique?: number;
    all?: number;
  };
  damageBonus?: {
    contact?: number;
    distance?: number;
    magique?: number;
  };
  
  // Resources (PC & DR & PM)
  bonusPC?: number;
  bonusDR?: number;
  bonusPm?: number;
  luckStatReplacement?: StatCode; // Ex: 'VOL' remplace CHA pour les PC (Voie de l'honneur)
  manaStatBonus?: StatCode; // Ex: 'PER' s'ajoute au total de PM (Perception des esprits)
  
  // Combat specifics
  critRangeBonus?: number; // Ex: +1 à la plage de critique
  
  // Player choice options (e.g. PER +1 ou CON +1)
  choiceOptions?: RankChoiceOption[];
  
  // Situational notes / reminders
  situationalNotes?: string[];
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
}

export interface PriestDeity {
  name: string;
  domainTitle: string;
  symbolDesc: string;
  sacredWeapon: string;
  domainPathId: string;
}

export interface PathData {
  id: string;
  name: string;
  symbol: string;
  ranks: ActionRank[];
  type: 'profile' | 'racial' | 'generic' | 'prestige' | 'domain';
  owner?: string;
  familyRestriction?: ProfileFamily | 'All';
  deity?: string;
  domainTitle?: string;
  symbolDesc?: string;
  sacredWeapon?: string;
}

export type ShieldPermission = 'none' | 'small' | 'any';

export interface ProfileWeaponRules {
  allowedCategories?: Array<'contact' | 'distance'>;
  maxHands?: number;
  maxHandsMelee?: number;
  allowedDamageTypes?: string[];
  forbidPowder?: boolean;
  forbidCrossbows?: boolean;
  explicitAllowedWeaponIds?: string[];
  maxDamageDice?: number;
  allowedExceptionWeaponIds?: string[];
}

export interface ProfileEquipmentRule {
  maxArmorId: string | null;
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
  twoHandedMinDamageDice?: number;
  twoHandedWeaponIds?: string[];
  summary?: string;
}

export interface PeopleData {
  id: string;
  name: string;
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
  selectableRacialPaths?: string[];
  equipmentRules?: PeopleEquipmentRules | null;
  names: {
    masculine: string[];
    feminine: string[];
    namingTip: string;
  };
  path: PathData | null;
}

export interface ProfileData {
  id: string;
  name: string;
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
}

export interface WeaponItem {
  id: string;
  name: string;
  category: 'contact' | 'distance';
  damage: string;
  maxDamageDice?: number;
  damageType: string;
  range: string;
  hands: number;
  isPowder?: boolean;
  isCrossbow?: boolean;
  isBow?: boolean;
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
  
  // Identity
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

  // Heritage & Profession
  peopleId: string;
  profileId: string;
  profileFamily?: ProfileFamily;
  isHybrid?: boolean;
  secondaryProfileId?: string;
  level: number;

  // Stats
  baseStats: Record<StatCode, number>;
  selectedRacialBonus?: StatCode;
  selectedRacialMalus?: StatCode;
  selectedRacialBonuses?: StatCode[];
  selectedRacialMaluses?: StatCode[];
  manualStatBonuses?: Partial<Record<StatCode, number>>;

  // Paths & Abilities
  selectedPathIds: string[];
  acquiredAbilities: Array<{ pathId: string; rank: number }>;
  pathRankChoices?: Record<string, string>; // Maps `${pathId}_${rank}` -> choiceOptionId

  // Live state during play
  currentHp: number;
  maxHpBonus: number;
  levelUpHpGains?: number[]; // Exact base HP gained at each level (index 0 = level 1)
  halfHpPending?: boolean; // Tracks an unrounded half-HP pending for next level-up
  currentDr: number;
  currentPc: number;
  currentPm: number;

  // Equipment
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
  
  // Stat substitutions
  contactAttackStat?: StatCode;
  contactAttackStatSource?: string;
  distanceAttackStat?: StatCode;
  distanceAttackStatSource?: string;
  defenseStat?: StatCode;
  defenseStatSource?: string;
  activeSubstitutions?: StatSubstitutionRule[];
  
  // Breakdown of path passive bonuses
  pathBonusStats: Record<StatCode, number>;
  pathBonusDefense: number;
  pathBonusInitiative: number;
  pathBonusHp: number;
  pathBonusAttacks: {
    contact: number;
    distance: number;
    magique: number;
  };
  pathBonusPc: number;
  pathBonusDr: number;
  pathBonusPm: number;
  pathSituationalNotes: string[];
}

