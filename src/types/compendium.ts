import type {
  BookSource,
  ProfileFamily,
  RankModifiers,
  StatCode,
  WeaponTag,
} from './rules';

export interface CompanionFormula {
  base?: number;
  perLevel?: number;
  perRank?: number;
  perProfileRank5?: number;
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

export interface RacialStatChoice {
  value: number;
  options: Array<StatCode | 'ANY_LOWEST'>;
}

export interface PeopleData {
  id: string;
  name: string;
  source: BookSource;
  description: string;
  stats?: Partial<Record<StatCode, number>>;
  statChoices?: RacialStatChoice[];
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
  optionalPaths?: string[];
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
  attackStat?: StatCode;
  damageStat?: StatCode | null;
  price?: string;
  notes: string;
}
