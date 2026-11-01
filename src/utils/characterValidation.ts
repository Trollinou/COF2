import { CharacterSheet, StatCode } from '../types/cof2';
import { createDefaultCharacter } from '../engine/rulesEngine';

const VALID_STATS: StatCode[] = ['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'];

export const LEGACY_ID_MAP: Record<string, string> = {
  // Profiles
  'r-deur': 'rodeur',
  'pr-tre': 'pretre',
  // Paths
  'voie-de-la-pr-cision': 'voie-de-la-precision',
  'voie-de-la-s-duction': 'voie-de-la-seduction',
  'voie-du-combat-deux-armes': 'voie-du-combat-a-deux-armes',
  'voie-du-d-placement': 'voie-du-deplacement',
  'voie-du-ma-tre-d-armes': 'voie-du-maitre-d-armes',
  'voie-de-la-r-sistance': 'voie-de-la-resistance',
  'voie-de-l-envo-teur': 'voie-de-l-envouteur',
  'voie-des-lixirs': 'voie-des-elixirs',
  'voie-du-m-tal': 'voie-du-metal',
  'voie-de-la-magie-l-mentaire': 'voie-de-la-magie-elementaire',
  'voie-du-d-mon': 'voie-du-demon',
  'voie-des-v-g-taux': 'voie-des-vegetaux',
  'voie-de-l-nergie-vitale': 'voie-de-l-energie-vitale',
  'voie-de-la-ma-trise': 'voie-de-la-maitrise',
  'voie-de-la-m-ditation': 'voie-de-la-meditation',
  'voie-de-la-pri-re': 'voie-de-la-priere',
  'voie-de-la-spiritualit-': 'voie-de-la-spiritualite',
};

export function migrateLegacyId(id: string): string {
  return LEGACY_ID_MAP[id] || id;
}

export interface ValidationResult {
  isValid: boolean;
  character: CharacterSheet;
  warnings: string[];
}

/**
 * Validates, repairs and migrates an untrusted character object (from file or storage).
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
  const peopleId = typeof raw.peopleId === 'string' ? migrateLegacyId(raw.peopleId) : defaultChar.peopleId;
  const profileId = typeof raw.profileId === 'string' ? migrateLegacyId(raw.profileId) : defaultChar.profileId;
  const secondaryProfileId = typeof raw.secondaryProfileId === 'string' ? migrateLegacyId(raw.secondaryProfileId) : undefined;
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

  // Validate Paths and Abilities (with legacy ID migrations)
  const selectedPathIds: string[] = Array.isArray(raw.selectedPathIds)
    ? raw.selectedPathIds
        .filter((p: unknown) => typeof p === 'string')
        .map((p: string) => migrateLegacyId(p))
    : defaultChar.selectedPathIds;

  const acquiredAbilities: Array<{ pathId: string; rank: number }> = Array.isArray(raw.acquiredAbilities)
    ? raw.acquiredAbilities
        .filter((a: any) => a && typeof a.pathId === 'string' && Number.isInteger(a.rank) && a.rank >= 1 && a.rank <= 5)
        .map((a: any) => ({ pathId: migrateLegacyId(a.pathId), rank: a.rank }))
    : defaultChar.acquiredAbilities;

  // Migrate path choices keys if applicable
  let pathRankChoices: Record<string, string> | undefined = undefined;
  if (raw.pathRankChoices && typeof raw.pathRankChoices === 'object') {
    pathRankChoices = {};
    for (const [key, val] of Object.entries(raw.pathRankChoices)) {
      if (typeof val === 'string') {
        const lastUnderscore = key.lastIndexOf('_');
        if (lastUnderscore !== -1) {
          const rawPid = key.substring(0, lastUnderscore);
          const rankSuffix = key.substring(lastUnderscore);
          const migratedPid = migrateLegacyId(rawPid);
          pathRankChoices[`${migratedPid}${rankSuffix}`] = val;
        } else {
          pathRankChoices[key] = val;
        }
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
        bonusAttack: typeof w.bonusAttack === 'number' ? w.bonusAttack : 0,
        bonusDamage: typeof w.bonusDamage === 'number' ? w.bonusDamage : 0,
        requiresTwoHands: Boolean(w.requiresTwoHands),
        attackStatUsed: w.attackStatUsed,
        attackStatSource: w.attackStatSource,
      }))
    : defaultChar.weapons;

  // Validate Inventory
  const inventory = Array.isArray(raw.inventory)
    ? raw.inventory.map((item: any, idx: number) => ({
        id: typeof item.id === 'string' ? item.id : `inv_${idx}`,
        name: typeof item.name === 'string' ? item.name : 'Objet',
        quantity: typeof item.quantity === 'number' && item.quantity >= 0 ? item.quantity : 1,
        notes: typeof item.notes === 'string' ? item.notes : undefined,
      }))
    : defaultChar.inventory;

  // Validate Coins
  const coins = {
    pa: typeof raw.coins?.pa === 'number' ? raw.coins.pa : 0,
    pc: typeof raw.coins?.pc === 'number' ? raw.coins.pc : 0,
    po: typeof raw.coins?.po === 'number' ? raw.coins.po : 0,
  };

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
    selectedRacialBonus: raw.selectedRacialBonus,
    selectedRacialMalus: raw.selectedRacialMalus,
    selectedRacialBonuses: Array.isArray(raw.selectedRacialBonuses) ? raw.selectedRacialBonuses : undefined,
    selectedRacialMaluses: Array.isArray(raw.selectedRacialMaluses) ? raw.selectedRacialMaluses : undefined,
    manualStatBonuses: raw.manualStatBonuses && typeof raw.manualStatBonuses === 'object' ? raw.manualStatBonuses : {},
    selectedPathIds,
    acquiredAbilities,
    pathRankChoices,
    currentHp: typeof raw.currentHp === 'number' ? raw.currentHp : defaultChar.currentHp,
    maxHpBonus: typeof raw.maxHpBonus === 'number' ? raw.maxHpBonus : 0,
    levelUpHpGains: Array.isArray(raw.levelUpHpGains) ? raw.levelUpHpGains.filter((n: any) => typeof n === 'number') : undefined,
    halfHpPending: typeof raw.halfHpPending === 'boolean' ? raw.halfHpPending : undefined,
    currentDr: typeof raw.currentDr === 'number' ? raw.currentDr : defaultChar.currentDr,
    currentPc: typeof raw.currentPc === 'number' ? raw.currentPc : defaultChar.currentPc,
    currentPm: typeof raw.currentPm === 'number' ? raw.currentPm : defaultChar.currentPm,
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

