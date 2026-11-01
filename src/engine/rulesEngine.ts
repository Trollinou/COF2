import {
  CharacterSheet,
  ComputedCharacterStats,
  PeopleData,
  ProfileData,
  PathData,
  ActionRank,
  ArmorItem,
  WeaponItem,
  CharacterWeaponInstance,
  StatCode,
  StatSubstitutionRule,
  WeaponFilterCategory,
  PriestDeity,
  ProfileFamily,
} from "../types/cof2";

import peoplesData from "../data/peoples.json";
import profilesData from "../data/profiles.json";
import pathsData from "../data/paths.json";
import equipmentData from "../data/equipment.json";

export const PEOPLES = peoplesData as PeopleData[];
export const PROFILES = profilesData as ProfileData[];
export const PATHS = pathsData as PathData[];
export const ARMORS = equipmentData.armors as ArmorItem[];
export const WEAPONS = equipmentData.weapons as WeaponItem[];
export const ADVENTURER_KIT = equipmentData.startingAdventurerKit;

// O(1) Precomputed Maps
export const PEOPLES_MAP = new Map<string, PeopleData>(
  PEOPLES.map((p) => [p.id, p]),
);
export const PROFILES_MAP = new Map<string, ProfileData>(
  PROFILES.map((p) => [p.id, p]),
);
export const PATHS_MAP = new Map<string, PathData>(PATHS.map((p) => [p.id, p]));
export const ARMORS_MAP = new Map<string, ArmorItem>(
  ARMORS.map((a) => [a.id, a]),
);
export const WEAPONS_MAP = new Map<string, WeaponItem>(
  WEAPONS.map((w) => [w.id, w]),
);

export function getPeopleById(id: string): PeopleData | undefined {
  return PEOPLES_MAP.get(id);
}

export function getProfileById(id: string): ProfileData | undefined {
  return PROFILES_MAP.get(id);
}

export function getPathById(id: string): PathData | undefined {
  return PATHS_MAP.get(id);
}

export function getArmorById(id: string): ArmorItem | undefined {
  return ARMORS_MAP.get(id);
}

export function getWeaponById(id: string): WeaponItem | undefined {
  return WEAPONS_MAP.get(id);
}

// ---------------------------------------------------------
// Priest Deities & Domain Paths (Voies de Domaine de Prêtre)
// ---------------------------------------------------------
export const PRIEST_DEITIES: PriestDeity[] = (PATHS as PathData[])
  .filter((p) => p.type === "domain" && p.deity)
  .map((p) => ({
    name: p.deity!,
    domainTitle: p.domainTitle || "",
    symbolDesc: p.symbolDesc || "",
    sacredWeapon: p.sacredWeapon || "",
    domainPathId: p.id,
  }));

export const DEITIES_MAP = new Map<string, PriestDeity>(
  PRIEST_DEITIES.map((d) => [d.name.toLowerCase(), d]),
);

export const DOMAIN_PATHS_MAP = new Map<string, PriestDeity>(
  PRIEST_DEITIES.map((d) => [d.domainPathId, d]),
);

export function isDomainPath(pathId: string): boolean {
  const p = getPathById(pathId);
  return p?.type === "domain" && pathId.startsWith("voie-du-domaine-");
}

export function isMageProfile(profileId: string): boolean {
  return ["ensorceleur", "forgesort", "magicien", "sorcier"].includes(
    profileId,
  );
}

export function isRacialReplacementPath(pathId: string): boolean {
  return isDomainPath(pathId) || pathId === "voie-du-mage";
}

export function getReplacedRacialPath(char: CharacterSheet): {
  path: PathData;
  rank1: ActionRank;
} | null {
  const replacementPathId = char.selectedPathIds?.find((id) =>
    isRacialReplacementPath(id),
  );
  if (!replacementPathId) return null;

  // Find acquired racial ability if any, otherwise default for people
  const racialAcq = char.acquiredAbilities?.find((a) => {
    const p = getPathById(a.pathId);
    return p?.type === "racial" && a.rank === 1;
  });

  const racialPathId = racialAcq?.pathId || getRacialPathId(char.peopleId);
  const path = getPathById(racialPathId);
  if (!path || !path.ranks || path.ranks.length === 0) return null;

  return {
    path,
    rank1: path.ranks[0],
  };
}

export function getDomainPaths(): PathData[] {
  return PATHS.filter((p) => p.type === "domain");
}

export function getDeityByDomainPathId(
  pathId: string,
): PriestDeity | undefined {
  return DOMAIN_PATHS_MAP.get(pathId);
}

export function getDeityByName(name: string): PriestDeity | undefined {
  return DEITIES_MAP.get(name.toLowerCase());
}

export function getDomainPathForDeity(deityName: string): PathData | undefined {
  const deity = getDeityByName(deityName);
  if (!deity) return undefined;
  return getPathById(deity.domainPathId);
}

export function isWeaponEligibleForFilter(
  weapon: WeaponItem | CharacterWeaponInstance,
  filter?: WeaponFilterCategory,
): boolean {
  if (!filter || filter === "any") return true;

  const weaponRefId = "weaponRefId" in weapon ? weapon.weaponRefId : weapon.id;
  const baseW =
    getWeaponById(weaponRefId) ||
    ("category" in weapon ? (weapon as WeaponItem) : undefined);
  const notes = baseW?.notes || "";

  switch (filter) {
    case "bareHands":
      return weaponRefId === "mains-nues";

    case "lightWeapons":
      return (
        ["dague", "epee-courte", "rapiere", "sabre-court"].includes(
          weaponRefId,
        ) || notes.toLowerCase().includes("arme légère")
      );

    case "sabres":
      return ["sabre-court", "sabre-droit", "vivelame"].includes(weaponRefId);

    case "duellisteWeapons":
      return [
        "dague",
        "epee-courte",
        "epee-longue",
        "rapiere",
        "vivelame",
      ].includes(weaponRefId);

    case "danseurWeapons":
      return [
        "dague",
        "epee-courte",
        "epee-longue",
        "epee-batarde",
        "epee-deux-mains",
        "sabre-court",
        "sabre-droit",
        "vivelame",
        "lance",
      ].includes(weaponRefId);

    case "projectiles":
      return (
        baseW?.category === "distance" &&
        !baseW.isPowder &&
        [
          "arc-court",
          "arc-long",
          "arbalete-legere",
          "arbalete-lourde",
          "arbalete-poing",
          "fronde",
        ].includes(weaponRefId)
      );

    case "oneHanded":
      return baseW ? baseW.hands === 1 : true;

    default:
      return false;
  }
}

export type ShieldPermission = "none" | "small" | "any";

export interface ProfileEquipmentRule {
  maxArmorId: string | null;
  shieldPermission: ShieldPermission;
  summaryArmor: string;
  summaryShield: string;
  summaryWeapons: string;
}

// 1. Data-driven armor hierarchy from equipment.json
export const ARMOR_HIERARCHY: string[] = (
  equipmentData as { armorHierarchy?: string[] }
).armorHierarchy || [
  "tissus",
  "cuir-simple",
  "cuir-renforce",
  "chemise-mailles",
  "cotte-mailles",
  "plaques",
  "plaque-complete",
];

// 2. Data-driven profile rules mapped dynamically from profiles.json
export const PROFILE_EQUIPMENT_RULES: Record<string, ProfileEquipmentRule> = {};
PROFILES.forEach((p) => {
  if (p.equipmentRules) {
    PROFILE_EQUIPMENT_RULES[p.id] = {
      maxArmorId: p.equipmentRules.maxArmorId,
      shieldPermission: p.equipmentRules.shieldPermission,
      summaryArmor: p.equipmentRules.summaryArmor,
      summaryShield: p.equipmentRules.summaryShield,
      summaryWeapons: p.equipmentRules.summaryWeapons,
    };
  }
});

export function getAllowedArmors(
  profileId: string,
  secondaryProfileId?: string,
): ArmorItem[] {
  const p1 = getProfileById(profileId);
  const p2 = secondaryProfileId
    ? getProfileById(secondaryProfileId)
    : undefined;

  const max1 = p1?.equipmentRules?.maxArmorId;
  const max2 = p2?.equipmentRules?.maxArmorId;

  const idx1 = max1 ? ARMOR_HIERARCHY.indexOf(max1) : -1;
  const idx2 = max2 ? ARMOR_HIERARCHY.indexOf(max2) : -1;
  const maxIdx = Math.max(idx1, idx2);

  if (maxIdx === -1) return [];
  const allowedIds = ARMOR_HIERARCHY.slice(0, maxIdx + 1);
  return ARMORS.filter((a) => a.type === "armor" && allowedIds.includes(a.id));
}

export function getAllowedShields(
  profileId: string,
  secondaryProfileId?: string,
): ArmorItem[] {
  const p1 = getProfileById(profileId);
  const p2 = secondaryProfileId
    ? getProfileById(secondaryProfileId)
    : undefined;

  const perm1 = p1?.equipmentRules?.shieldPermission || "none";
  const perm2 = p2?.equipmentRules?.shieldPermission || "none";

  if (perm1 !== "none" && perm1 !== "small") {
    return ARMORS.filter((a) => a.type === "shield");
  }
  if (perm2 !== "none" && perm2 !== "small") {
    return ARMORS.filter((a) => a.type === "shield");
  }
  if (perm1 === "small" || perm2 === "small") {
    return ARMORS.filter((a) => a.id === "petit-bouclier");
  }
  return [];
}

export function isArmorAllowed(
  armorId: string | undefined,
  profileId: string,
  secondaryProfileId?: string,
): boolean {
  if (!armorId) return true;
  const allowed = getAllowedArmors(profileId, secondaryProfileId);
  return allowed.some((a) => a.id === armorId);
}

export function isShieldAllowed(
  shieldId: string | undefined,
  profileId: string,
  secondaryProfileId?: string,
): boolean {
  if (!shieldId) return true;
  const allowed = getAllowedShields(profileId, secondaryProfileId);
  return allowed.some((s) => s.id === shieldId);
}

export interface WeaponProficiencyCheck {
  allowed: boolean;
  reason?: string;
  requiresTwoHands?: boolean;
}

export function matchesSacredWeapon(
  weaponId: string,
  sacredWeaponDesc: string,
): boolean {
  const desc = sacredWeaponDesc.toLowerCase();
  const weapon = getWeaponById(weaponId);
  if (!weapon) return false;
  const name = weapon.name.toLowerCase();

  if (desc.includes(name) || name.includes(desc)) return true;
  if (desc.includes("bâton") && weaponId.includes("baton")) return true;
  if (desc.includes("marteau") && weaponId.includes("marteau")) return true;
  if (desc.includes("arc") && weaponId.includes("arc")) return true;
  if (desc.includes("épée courte") && weaponId === "epee-courte") return true;
  if (desc.includes("épée longue") && weaponId === "epee-longue") return true;
  if (desc.includes("épée à deux mains") && weaponId === "epee-deux-mains")
    return true;
  if (desc.includes("masse") && weaponId.includes("masse")) return true;
  if (desc.includes("dague") && weaponId === "dague") return true;
  if (desc.includes("rapière") && weaponId === "rapiere") return true;
  if (desc.includes("arbalète légère") && weaponId === "arbalete-legere")
    return true;
  if (desc.includes("mains nues") && weaponId === "mains-nues") return true;
  return false;
}

function checkProfileWeaponRule(
  weapon: WeaponItem,
  profileId: string,
): { allowed: boolean; reason?: string } {
  const profile = getProfileById(profileId);
  const wRules = profile?.equipmentRules?.weaponRules;
  if (!wRules) return { allowed: true };

  if (
    wRules.allowedCategories &&
    !wRules.allowedCategories.includes(weapon.category)
  ) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} dédaigne les armes à distance.`,
    };
  }
  if (
    wRules.allowedDamageTypes &&
    !wRules.allowedDamageTypes.includes(weapon.damageType)
  ) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} a l'interdiction de faire couler le sang (${wRules.allowedDamageTypes.join(", ")} uniquement).`,
    };
  }
  if (wRules.forbidPowder && weapon.isPowder) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} refuse les armes à poudre.`,
    };
  }
  if (wRules.forbidCrossbows && weapon.isCrossbow) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} refuse les arbalètes.`,
    };
  }
  if (wRules.maxHands && weapon.hands > wRules.maxHands) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} manie uniquement les armes à 1 main (doit conserver une main libre).`,
    };
  }
  if (
    wRules.maxHandsMelee &&
    weapon.category === "contact" &&
    weapon.hands > wRules.maxHandsMelee
  ) {
    if (
      !wRules.allowedExceptionWeaponIds ||
      !wRules.allowedExceptionWeaponIds.includes(weapon.id)
    ) {
      return {
        allowed: false,
        reason: `${profile?.name || "Ce profil"} sait manier les armes de contact à 1 main uniquement.`,
      };
    }
  }
  if (
    wRules.explicitAllowedWeaponIds &&
    !wRules.explicitAllowedWeaponIds.includes(weapon.id)
  ) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} ne maîtrise pas cette arme.`,
    };
  }
  if (
    wRules.maxDamageDice &&
    (weapon.maxDamageDice || 0) > wRules.maxDamageDice
  ) {
    if (
      !wRules.allowedExceptionWeaponIds ||
      !wRules.allowedExceptionWeaponIds.includes(weapon.id)
    ) {
      return {
        allowed: false,
        reason: `${profile?.name || "Ce profil"} est limité aux armes n'excédant pas ${wRules.maxDamageDice} de DM.`,
      };
    }
  }
  return { allowed: true };
}

// 3. Declarative weapon check matching weapon attributes vs profile rules & people rules
export function checkWeaponProficiency(
  weaponId: string,
  profileId: string,
  peopleId: string,
  deityOrDomainPathId?: string,
  secondaryProfileId?: string,
): WeaponProficiencyCheck {
  const weapon = getWeaponById(weaponId);
  if (!weapon) return { allowed: false, reason: "Arme inconnue" };

  // Sacred weapon exception for Priests (Règles COF2 / Compagnon):
  if (
    (profileId === "pr-tre" || secondaryProfileId === "pr-tre") &&
    deityOrDomainPathId
  ) {
    const deity =
      getDeityByDomainPathId(deityOrDomainPathId) ||
      getDeityByName(deityOrDomainPathId);
    if (deity && matchesSacredWeapon(weaponId, deity.sacredWeapon)) {
      return { allowed: true, requiresTwoHands: weapon.hands === 2 };
    }
  }

  // Check profile declarative rules (either profileId or secondaryProfileId can grant proficiency)
  const rule1 = checkProfileWeaponRule(weapon, profileId);
  let profileAllowed = rule1.allowed;
  let profileReason = rule1.reason;

  if (!profileAllowed && secondaryProfileId) {
    const rule2 = checkProfileWeaponRule(weapon, secondaryProfileId);
    if (rule2.allowed) {
      profileAllowed = true;
      profileReason = undefined;
    }
  }

  if (!profileAllowed) {
    return { allowed: false, reason: profileReason };
  }

  const people = getPeopleById(peopleId);
  const profile = getProfileById(profileId);
  const wRules = profile?.equipmentRules?.weaponRules;

  // Evaluate racial rules
  let requiresTwoHands = weapon.hands === 2;
  const pRules = people?.equipmentRules;
  if (pRules) {
    if (
      pRules.forbiddenWeaponIds &&
      pRules.forbiddenWeaponIds.includes(weapon.id)
    ) {
      return {
        allowed: false,
        reason: `Morphologie ${people?.name || "raciale"} : arme interdite.`,
      };
    }
    if (
      pRules.maxDamageDice &&
      (weapon.maxDamageDice || 0) > pRules.maxDamageDice
    ) {
      return {
        allowed: false,
        reason: `Taille ${people?.name || "raciale"} : armes supérieures à 1d10 DM interdites.`,
      };
    }
    if (
      (pRules.twoHandedWeaponIds &&
        pRules.twoHandedWeaponIds.includes(weapon.id)) ||
      (pRules.twoHandedMinDamageDice &&
        (weapon.maxDamageDice || 0) >= pRules.twoHandedMinDamageDice &&
        (weapon.maxDamageDice || 0) <= 10)
    ) {
      requiresTwoHands = true;
      if (wRules?.maxHands === 1 && !secondaryProfileId) {
        return {
          allowed: false,
          reason: `Un ${people?.name || "personnage de petite taille"} doit manier cette arme à deux mains, or ${profile?.name || "ce profil"} requiert une main libre.`,
        };
      }
    }
  }

  return { allowed: true, requiresTwoHands };
}

export function getAllowedWeapons(
  profileId: string,
  peopleId: string,
  secondaryProfileId?: string,
): Array<WeaponItem & { requiresTwoHands?: boolean }> {
  const result: Array<WeaponItem & { requiresTwoHands?: boolean }> = [];
  (WEAPONS as WeaponItem[]).forEach((w) => {
    const check = checkWeaponProficiency(
      w.id,
      profileId,
      peopleId,
      undefined,
      secondaryProfileId,
    );
    if (check.allowed) {
      result.push({
        ...w,
        requiresTwoHands: check.requiresTwoHands,
      });
    }
  });
  return result;
}

// 4. Data-driven default equipment resolution from profiles.json
export function getDefaultEquipmentForProfile(
  profileId: string,
  peopleId: string,
): {
  armorId?: string;
  shieldId?: string;
  weapons: CharacterWeaponInstance[];
} {
  const profile = getProfileById(profileId) || PROFILES[0];
  const people = getPeopleById(peopleId);
  const def = profile.defaultEquipment;

  const armorId = def?.armorId || undefined;
  const shieldId = def?.shieldId || undefined;

  let targetWeaponIds = def?.defaultWeaponIds
    ? [...def.defaultWeaponIds]
    : ["epee-courte"];

  // Smart resolution for small races (e.g. Halfelin, Frouïn, Gobelin, Kobold, Fée, Farfadet)
  const isSmallRace =
    people?.equipmentRules?.forbiddenWeaponIds?.includes("rapiere") ||
    people?.id === "halfelin";
  if (isSmallRace) {
    targetWeaponIds = targetWeaponIds.map((wid) => {
      if (wid === "rapiere") return "epee-courte";
      if (wid === "hache-deux-mains") return "hache-armes";
      if (wid === "epee-deux-mains") return "epee-longue";
      if (wid === "arc-long") return "arc-court";
      if (wid === "arbalete-lourde") return "arbalete-legere";
      if (wid === "mousquet") return "petoire";
      if (wid === "epee-longue" && profile.id === "barde") return "epee-courte";
      return wid;
    });
  }

  const weapons: CharacterWeaponInstance[] = [];
  targetWeaponIds.forEach((wid, idx) => {
    const w = getWeaponById(wid);
    if (w) {
      const check = checkWeaponProficiency(w.id, profileId, peopleId);
      if (check.allowed) {
        weapons.push({
          id: `w_${idx + 1}`,
          weaponRefId: w.id,
          name: w.name,
          damage: w.damage,
          range: w.range,
          category: w.category,
          requiresTwoHands: check.requiresTwoHands,
        });
      }
    }
  });

  return { armorId, shieldId, weapons };
}

export function sanitizeCharacterEquipment(
  char: CharacterSheet,
): CharacterSheet {
  const allowedArmors = getAllowedArmors(char.profileId);
  const allowedShields = getAllowedShields(char.profileId);

  let equippedArmorId = char.equippedArmorId;
  if (equippedArmorId && !allowedArmors.some((a) => a.id === equippedArmorId)) {
    // If not allowed, fallback to highest allowed armor or undefined
    equippedArmorId =
      allowedArmors.length > 0
        ? allowedArmors[allowedArmors.length - 1].id
        : undefined;
  }

  let equippedShieldId = char.equippedShieldId;
  if (
    equippedShieldId &&
    !allowedShields.some((s) => s.id === equippedShieldId)
  ) {
    equippedShieldId =
      allowedShields.length > 0 ? allowedShields[0].id : undefined;
  }

  // Find priest domain path or deity for sacred weapon checks
  const domainPathId = char.selectedPathIds?.find((pid) => isDomainPath(pid));
  const deityContext = domainPathId || char.deity;

  // Filter and sanitize weapons
  const sanitizedWeapons: CharacterWeaponInstance[] = [];
  for (const w of char.weapons) {
    const check = checkWeaponProficiency(
      w.weaponRefId,
      char.profileId,
      char.peopleId,
      deityContext,
    );
    if (check.allowed) {
      sanitizedWeapons.push({
        ...w,
        requiresTwoHands: check.requiresTwoHands,
      });
    }
  }

  // If no weapons left after sanitization, give default starting weapons
  if (sanitizedWeapons.length === 0) {
    const defaultEq = getDefaultEquipmentForProfile(
      char.profileId,
      char.peopleId,
    );
    sanitizedWeapons.push(...defaultEq.weapons);
  }

  return {
    ...char,
    equippedArmorId,
    equippedShieldId,
    weapons: sanitizedWeapons,
  };
}

export const STAT_NAMES: Record<StatCode, string> = {
  FOR: "Force",
  AGI: "Agilité",
  CON: "Constitution",
  PER: "Perception",
  INT: "Intelligence",
  VOL: "Volonté",
  CHA: "Charisme",
};

export function computeCharacterStats(
  char: CharacterSheet,
): ComputedCharacterStats {
  const profile = getProfileById(char.profileId) || PROFILES[0];
  const stats: Record<StatCode, number> = { ...char.baseStats };

  // Apply racial bonus & malus
  if (char.selectedRacialBonuses && char.selectedRacialBonuses.length > 0) {
    char.selectedRacialBonuses.forEach((b) => {
      if (stats[b] !== undefined) stats[b] += 1;
    });
  } else if (
    char.selectedRacialBonus &&
    stats[char.selectedRacialBonus] !== undefined
  ) {
    stats[char.selectedRacialBonus] += 1;
  }

  if (char.selectedRacialMaluses && char.selectedRacialMaluses.length > 0) {
    char.selectedRacialMaluses.forEach((m) => {
      if (stats[m] !== undefined) stats[m] -= 1;
    });
  } else if (
    char.selectedRacialMalus &&
    stats[char.selectedRacialMalus] !== undefined
  ) {
    stats[char.selectedRacialMalus] -= 1;
  }

  // Apply manual adjustments if any
  if (char.manualStatBonuses) {
    for (const [key, val] of Object.entries(char.manualStatBonuses)) {
      if (val && stats[key as StatCode] !== undefined) {
        stats[key as StatCode] += val;
      }
    }
  }

  // Aggregate passive path modifiers from all acquired abilities
  const pathBonusStats: Record<StatCode, number> = {
    FOR: 0,
    AGI: 0,
    CON: 0,
    PER: 0,
    INT: 0,
    VOL: 0,
    CHA: 0,
  };
  let pathBonusDefense = 0;
  const pendingDefenseStatBonuses: Array<{
    pathId: string;
    rank: number;
    stat: StatCode;
    condition?: 'noArmor';
    maxRankCapped?: boolean;
  }> = [];
  let pathBonusInitiative = 0;
  let pathInitiativeStatBonus: StatCode | undefined;
  let pathBonusHp = 0;
  let pathHpStatBonus: StatCode | undefined;
  const pathBonusAttacks = {
    contact: 0,
    distance: 0,
    magique: 0,
  };
  let pathBonusPc = 0;
  let pathBonusDr = 0;
  let pathBonusPm = 0;
  let pathLuckStatReplacement: StatCode | undefined;
  let pathManaStatReplacement: StatCode | undefined;
  let pathManaStatBonus: StatCode | undefined;
  const pathSituationalNotes: string[] = [];
  const allStatSubstitutions: StatSubstitutionRule[] = [];

  char.acquiredAbilities.forEach((acq) => {
    const pth = getPathById(acq.pathId);
    if (!pth) return;
    const rankData = pth.ranks.find((r) => r.rank === acq.rank);
    if (!rankData || !rankData.modifiers) return;

    const mod = rankData.modifiers;

    // Resolve choice option if defined for this rank
    if (mod.choiceOptions && mod.choiceOptions.length > 0) {
      const choiceKey = `${acq.pathId}_${acq.rank}`;
      const chosenId = char.pathRankChoices?.[choiceKey];
      const selectedOption =
        mod.choiceOptions.find((o) => o.id === chosenId) ||
        mod.choiceOptions[0];
      if (selectedOption && selectedOption.modifiers) {
        const optMod = selectedOption.modifiers;
        if (optMod.stats) {
          for (const [s, val] of Object.entries(optMod.stats)) {
            if (val) pathBonusStats[s as StatCode] += val;
          }
        }
        if (optMod.defense) pathBonusDefense += optMod.defense;
        if (optMod.defenseStatBonus) {
          pendingDefenseStatBonuses.push({
            pathId: acq.pathId,
            rank: acq.rank,
            stat: optMod.defenseStatBonus,
            condition: optMod.defenseCondition,
            maxRankCapped: optMod.defenseMaxRankCapped,
          });
        }
        if (optMod.initiative) pathBonusInitiative += optMod.initiative;
        if (optMod.hpBonus) pathBonusHp += optMod.hpBonus;
        if (optMod.damageReduction) {
          pathSituationalNotes.push(`RD ${optMod.damageReduction}`);
        }
        if (optMod.statSubstitutions) {
          allStatSubstitutions.push(...optMod.statSubstitutions);
        }
        if (optMod.situationalNotes) {
          optMod.situationalNotes.forEach((n) => {
            if (!pathSituationalNotes.includes(n)) pathSituationalNotes.push(n);
          });
        }
      }
    }

    // Direct rank modifiers
    if (mod.stats) {
      for (const [s, val] of Object.entries(mod.stats)) {
        if (val) pathBonusStats[s as StatCode] += val;
      }
    }
    if (mod.statSubstitutions) {
      allStatSubstitutions.push(...mod.statSubstitutions);
    }
    if (mod.defense) pathBonusDefense += mod.defense;
    if (mod.defenseStatBonus) {
      pendingDefenseStatBonuses.push({
        pathId: acq.pathId,
        rank: acq.rank,
        stat: mod.defenseStatBonus,
        condition: mod.defenseCondition,
        maxRankCapped: mod.defenseMaxRankCapped,
      });
    }
    if (mod.initiative) pathBonusInitiative += mod.initiative;
    if (mod.initiativeStatBonus)
      pathInitiativeStatBonus = mod.initiativeStatBonus;
    if (mod.hpBonus) pathBonusHp += mod.hpBonus;
    if (mod.hpStatBonus) pathHpStatBonus = mod.hpStatBonus;
    if (mod.hpPerRankInPath) {
      const ranksInPath = char.acquiredAbilities.filter(
        (a) => a.pathId === acq.pathId,
      ).length;
      pathBonusHp += ranksInPath;
    }
    if (mod.attackBonus) {
      if (mod.attackBonus.contact)
        pathBonusAttacks.contact += mod.attackBonus.contact;
      if (mod.attackBonus.distance)
        pathBonusAttacks.distance += mod.attackBonus.distance;
      if (mod.attackBonus.magique)
        pathBonusAttacks.magique += mod.attackBonus.magique;
      if (mod.attackBonus.all) {
        pathBonusAttacks.contact += mod.attackBonus.all;
        pathBonusAttacks.distance += mod.attackBonus.all;
        pathBonusAttacks.magique += mod.attackBonus.all;
      }
    }
    if (mod.bonusPC) pathBonusPc += mod.bonusPC;
    if (mod.bonusDR) pathBonusDr += mod.bonusDR;
    if (mod.bonusPm) pathBonusPm += mod.bonusPm;
    if (mod.luckStatReplacement)
      pathLuckStatReplacement = mod.luckStatReplacement;
    if (mod.manaStatReplacement)
      pathManaStatReplacement = mod.manaStatReplacement;
    if (mod.manaStatBonus) pathManaStatBonus = mod.manaStatBonus;
    if (mod.situationalNotes) {
      mod.situationalNotes.forEach((n) => {
        if (!pathSituationalNotes.includes(n)) pathSituationalNotes.push(n);
      });
    }
  });

  // Apply pathBonusStats to final stats
  for (const [s, val] of Object.entries(pathBonusStats)) {
    if (val && stats[s as StatCode] !== undefined) {
      stats[s as StatCode] += val;
    }
  }

  const level = Math.max(1, char.level || 1);
  const bab = Math.min(level, 10);

  // Armor & Defense
  const armor = char.equippedArmorId
    ? getArmorById(char.equippedArmorId)
    : undefined;
  const shield = char.equippedShieldId
    ? getArmorById(char.equippedShieldId)
    : undefined;

  let defenseStat: StatCode = "AGI";
  let defenseStatSource: string | undefined = undefined;

  // Check defense substitutions (e.g. CON from Peau de pierre, PER from Défense intuitive)
  const defSubstitutions = allStatSubstitutions.filter(
    (s) => s.target === "defense",
  );

  // Default effective AGI with armor maxAgi cap
  let effectiveStatMod = stats.AGI;
  if (armor && armor.maxAgi !== null && effectiveStatMod > armor.maxAgi) {
    effectiveStatMod = armor.maxAgi;
  }

  for (const sub of defSubstitutions) {
    const repVal = stats[sub.replacementStat];
    let cappedRepVal = repVal;
    if (armor && armor.maxAgi !== null && cappedRepVal > armor.maxAgi) {
      cappedRepVal = armor.maxAgi;
    }

    // If replacement stat provides a strictly higher defense bonus
    if (cappedRepVal > effectiveStatMod) {
      effectiveStatMod = cappedRepVal;
      defenseStat = sub.replacementStat;
      defenseStatSource = sub.sourceName;
    }
  }

  // Voie du pagne (Peau de pierre R2) fallback rule:
  // "Autrement (si son AGI est supérieure ou égale à sa CON), il reçoit +1 en DEF et ce bonus passe à +2 au rang 4."
  const pagneAcq = char.acquiredAbilities.find(
    (a) => a.pathId === "voie-du-pagne",
  );
  if (pagneAcq && pagneAcq.rank >= 2 && defenseStat !== "CON") {
    const fallbackDefBonus = pagneAcq.rank >= 4 ? 2 : 1;
    pathBonusDefense += fallbackDefBonus;
  }

  // Dynamic stat bonuses to defense (e.g. Voie de la séduction R2: Dentelles et rapière)
  for (const bonusRule of pendingDefenseStatBonuses) {
    const isConditionMet =
      bonusRule.condition === "noArmor" ? !armor || armor.def === 0 : true;

    if (isConditionMet) {
      let statBonus = Math.max(0, stats[bonusRule.stat]);
      if (bonusRule.maxRankCapped) {
        const ranksInPath = char.acquiredAbilities
          .filter((a) => a.pathId === bonusRule.pathId)
          .map((a) => a.rank);
        const maxRankInPath =
          ranksInPath.length > 0 ? Math.max(...ranksInPath) : bonusRule.rank;
        statBonus = Math.min(statBonus, maxRankInPath);
      }
      pathBonusDefense += statBonus;
    }
  }

  // Backwards compatibility safeguard for Voie de la séduction (Dentelles et rapière R2)
  if (
    pendingDefenseStatBonuses.length === 0 &&
    (!armor || armor.def === 0)
  ) {
    const seductionAbilities = char.acquiredAbilities.filter(
      (a) => a.pathId === "voie-de-la-s-duction",
    );
    if (seductionAbilities.length > 0) {
      const seductionMaxRank = Math.max(
        ...seductionAbilities.map((a) => a.rank),
      );
      if (seductionMaxRank >= 2) {
        const chaDefBonus = Math.min(Math.max(0, stats.CHA), seductionMaxRank);
        pathBonusDefense += chaDefBonus;
      }
    }
  }

  const armorDefense = armor ? armor.def : 0;
  const shieldDefense = shield ? shield.def : 0;
  const defense =
    10 + effectiveStatMod + armorDefense + shieldDefense + pathBonusDefense;
  const effectiveAgi = effectiveStatMod;

  // Attacks base stats & general substitutions
  let contactAttackStat: StatCode = "FOR";
  let contactAttackStatSource: string | undefined = undefined;
  let distanceAttackStat: StatCode = "AGI";
  let distanceAttackStatSource: string | undefined = undefined;

  const contactGeneralSubs = allStatSubstitutions.filter(
    (s) =>
      s.target === "attackContact" &&
      (!s.weaponFilter || s.weaponFilter === "any"),
  );
  for (const sub of contactGeneralSubs) {
    if (stats[sub.replacementStat] > stats[contactAttackStat]) {
      contactAttackStat = sub.replacementStat;
      contactAttackStatSource = sub.sourceName;
    }
  }

  const distanceGeneralSubs = allStatSubstitutions.filter(
    (s) =>
      s.target === "attackDistance" &&
      (!s.weaponFilter || s.weaponFilter === "any"),
  );
  for (const sub of distanceGeneralSubs) {
    if (stats[sub.replacementStat] > stats[distanceAttackStat]) {
      distanceAttackStat = sub.replacementStat;
      distanceAttackStatSource = sub.sourceName;
    }
  }

  const attacks = {
    contact: bab + stats[contactAttackStat] + pathBonusAttacks.contact,
    distance: bab + stats[distanceAttackStat] + pathBonusAttacks.distance,
    magique: bab + stats.VOL + pathBonusAttacks.magique,
  };

  // Evaluate weapon instances in char.weapons
  if (char.weapons) {
    char.weapons.forEach((w) => {
      const isContact = w.category === "contact";
      const defaultStat: StatCode = isContact ? "FOR" : "AGI";
      let bestStat: StatCode = defaultStat;
      let bestSource: string | undefined = undefined;
      let bestMod = stats[defaultStat];

      const target = isContact ? "attackContact" : "attackDistance";
      const applicableSubs = allStatSubstitutions.filter(
        (s) => s.target === target,
      );

      for (const sub of applicableSubs) {
        if (isWeaponEligibleForFilter(w, sub.weaponFilter)) {
          const repMod = stats[sub.replacementStat];
          if (repMod > bestMod) {
            bestStat = sub.replacementStat;
            bestSource = sub.sourceName;
            bestMod = repMod;
          }
        }
      }

      w.attackStatUsed = bestStat;
      w.attackStatSource = bestSource;
    });
  }

  // Initiative: 10 + PER + pathBonusInitiative + (optional stat bonus like CHA/VOL)
  let initiative = 10 + stats.PER + pathBonusInitiative;
  if (pathInitiativeStatBonus && stats[pathInitiativeStatBonus] !== undefined) {
    initiative += stats[pathInitiativeStatBonus];
  }

  // HP: at level 1: 2 * hpPerLevel + CON (or profileA + profileB + CON for hybrid)
  // At level L: baseHpSum + (L * CON) + pathBonusHp
  let baseHp: number;
  if (char.levelUpHpGains && char.levelUpHpGains.length > 0) {
    baseHp = char.levelUpHpGains.reduce((acc, v) => acc + v, 0);
  } else if (
    (char.isHybrid ||
      (char.secondaryProfileId &&
        char.secondaryProfileId !== char.profileId)) &&
    level === 1
  ) {
    const secProfile = char.secondaryProfileId
      ? getProfileById(char.secondaryProfileId)
      : undefined;
    const secHp = secProfile?.hpPerLevel || profile.hpPerLevel;
    baseHp = profile.hpPerLevel + secHp;
  } else {
    baseHp = (level + 1) * profile.hpPerLevel;
  }

  let maxHp = Math.max(
    1,
    baseHp + level * stats.CON + (char.maxHpBonus || 0) + pathBonusHp,
  );
  if (pathHpStatBonus && stats[pathHpStatBonus] !== undefined) {
    maxHp += stats[pathHpStatBonus];
  }

  // Effective profile family (player choice for Psionique, standard profile family otherwise)
  const effectiveFamily =
    char.profileId === "psionique" && char.profileFamily
      ? char.profileFamily
      : profile.family;

  let bonusPC = profile.bonusPC || 0;
  let bonusDR = profile.bonusDR || 0;
  let drDice = profile.hd || "d8";

  if (char.profileId === "psionique") {
    if (effectiveFamily === "Combattants") {
      drDice = "d10";
      bonusPC = 0;
      bonusDR = 0;
    } else if (effectiveFamily === "Aventuriers") {
      drDice = "d8";
      bonusPC = 1;
      bonusDR = 0;
    } else if (effectiveFamily === "Mystiques") {
      drDice = "d8";
      bonusPC = 0;
      bonusDR = 1;
    } else if (effectiveFamily === "Mages") {
      drDice = "d6";
      bonusPC = 0;
      bonusDR = 0;
    }
  }

  // Recovery Dice (DR): [2 + CON] + bonusDR (Mystiques get +1 DR) + pathBonusDr
  const maxDr = Math.max(0, 2 + stats.CON + bonusDR + pathBonusDr);

  // Luck Points (PC): [2 + CHA (or luck replacement)] + bonusPC + pathBonusPc
  const luckStatVal = pathLuckStatReplacement
    ? stats[pathLuckStatReplacement]
    : stats.CHA;
  const maxPc = Math.max(0, 2 + luckStatVal + bonusPC + pathBonusPc);

  // Mana / Ego Points (PM / PE): VOL (or mana replacement) + spellsCount (if spellsCount > 0)
  let spellCount = 0;
  char.acquiredAbilities.forEach((acq) => {
    const pth = getPathById(acq.pathId);
    if (pth) {
      const rankData = pth.ranks.find((r) => r.rank === acq.rank);
      if (rankData && rankData.isSpell) {
        spellCount++;
      }
    }
  });

  const manaBaseStat = pathManaStatReplacement
    ? stats[pathManaStatReplacement]
    : stats.VOL;
  let maxPm =
    spellCount > 0 ? Math.max(0, manaBaseStat + spellCount + pathBonusPm) : 0;
  if (pathManaStatBonus && stats[pathManaStatBonus] !== undefined) {
    maxPm += stats[pathManaStatBonus];
    pathBonusPm += stats[pathManaStatBonus];
  }

  const energyType: "PM" | "PE" = char.profileId === "psionique" ? "PE" : "PM";

  const isHybrid = Boolean(
    char.isHybrid ||
    (char.secondaryProfileId && char.secondaryProfileId !== char.profileId) ||
    char.acquiredAbilities.some((a) => {
      const pth = getPathById(a.pathId);
      return pth && pth.type === "profile" && !profile.paths.includes(a.pathId);
    }),
  );
  const secProfile = char.secondaryProfileId
    ? getProfileById(char.secondaryProfileId)
    : undefined;
  const secondaryProfileName = secProfile?.name;

  return {
    finalStats: stats,
    bab,
    attacks,
    contactAttackStat,
    contactAttackStatSource,
    distanceAttackStat,
    distanceAttackStatSource,
    defenseStat,
    defenseStatSource,
    activeSubstitutions: allStatSubstitutions,
    initiative,
    maxHp,
    maxDr,
    drDice,
    maxPc,
    maxPm,
    energyType,
    effectiveFamily,
    isHybrid,
    secondaryProfileName,
    defense,
    armorDefense,
    shieldDefense,
    effectiveAgi,
    pathBonusStats,
    pathBonusDefense,
    pathBonusInitiative,
    pathBonusHp,
    pathBonusAttacks,
    pathBonusPc,
    pathBonusDr,
    pathBonusPm,
    pathSituationalNotes,
  };
}

export interface WeaponAttackInfo {
  atkBonus: number;
  statUsed: StatCode;
  sourceName?: string;
  isSubstituted: boolean;
  dmBonus: string;
}

export function getWeaponAttackInfo(
  w: CharacterWeaponInstance,
  stats: ComputedCharacterStats,
): WeaponAttackInfo {
  const isContact = w.category === "contact";
  const defaultStat: StatCode = isContact ? "FOR" : "AGI";
  const statUsed = w.attackStatUsed || defaultStat;
  const isSubstituted = statUsed !== defaultStat;
  const sourceName = w.attackStatSource;

  const statMod = stats.finalStats[statUsed] ?? 0;
  const pathBonus = isContact
    ? stats.pathBonusAttacks.contact
    : stats.pathBonusAttacks.distance;
  const customBonus = w.bonusAttack || 0;
  const atkBonus = stats.bab + statMod + pathBonus + customBonus;

  // Damage bonus
  let dmBonus = "";
  if (isContact) {
    const forMod = stats.finalStats.FOR ?? 0;
    const extraDm = w.bonusDamage || 0;
    const totalDmMod = forMod + extraDm;
    if (totalDmMod > 0) {
      dmBonus = `+ ${totalDmMod}`;
    } else if (totalDmMod < 0) {
      dmBonus = `- ${Math.abs(totalDmMod)}`;
    }
  } else if (w.bonusDamage) {
    dmBonus =
      w.bonusDamage > 0 ? `+ ${w.bonusDamage}` : `- ${Math.abs(w.bonusDamage)}`;
  }

  return {
    atkBonus,
    statUsed,
    sourceName,
    isSubstituted,
    dmBonus,
  };
}

/**
 * Returns the exact racial path ID for a given race.
 * For Halfelin, Nain, Elfe, Gnome, Demi-orc, Humain: always their dedicated racial path.
 * For Demi-elfe: returns the chosen cultural path among the 3 options.
 */
export function getRacialPathId(
  peopleId: string,
  currentRacialPathId?: string,
): string {
  const p = getPeopleById(peopleId);
  if (!p) return "voie-de-l-humain";

  // Dedicated racial path
  if (p.path?.id) {
    return p.path.id;
  }

  // Demi-elfe cultural choice
  if (p.selectableRacialPaths && p.selectableRacialPaths.length > 0) {
    if (
      currentRacialPathId &&
      p.selectableRacialPaths.includes(currentRacialPathId)
    ) {
      return currentRacialPathId;
    }
    return p.selectableRacialPaths[0]; // defaults to 'voie-de-l-humain'
  }

  return "voie-de-l-humain";
}

/**
 * Applies racial baseline attributes (traits, age, height, weight, languages, racial path)
 * when a player chooses or switches their race.
 */
export function applyRacialDefaults(
  char: CharacterSheet,
  peopleId: string,
  chosenRacialPathId?: string,
): CharacterSheet {
  const p = getPeopleById(peopleId);
  if (!p) return char;

  const racialBonuses: StatCode[] = [];
  p.bonusOptions.forEach((optGroup) => {
    const first = optGroup[0];
    if (first && first !== "ANY_LOWEST") {
      racialBonuses.push(first as StatCode);
    }
  });

  const racialMaluses: StatCode[] = [];
  p.malusOptions.forEach((optGroup) => {
    const first = optGroup[0];
    if (first) {
      racialMaluses.push(first as StatCode);
    }
  });

  const racialBonus =
    racialBonuses[0] ||
    (p.bonusOptions[0]?.[0] !== "ANY_LOWEST"
      ? (p.bonusOptions[0]?.[0] as StatCode)
      : "FOR");
  const racialMalus = racialMaluses[0];

  const racialPathId = getRacialPathId(peopleId, chosenRacialPathId);

  // Keep the 2 profile paths, replace the racial path (at index 2)
  const profile = getProfileById(char.profileId) || PROFILES[0];
  const secProfile =
    char.isHybrid && char.secondaryProfileId
      ? getProfileById(char.secondaryProfileId)
      : undefined;
  const allProfilePaths = [
    ...profile.paths,
    ...(secProfile ? secProfile.paths : []),
  ];

  const currentProfilePaths = char.selectedPathIds.filter((id) =>
    allProfilePaths.includes(id),
  );
  const p1 = currentProfilePaths[0] || profile.paths[0];
  const p2 =
    currentProfilePaths[1] ||
    (secProfile
      ? secProfile.paths[0]
      : profile.paths.find((id) => id !== p1) || profile.paths[1]);
  const updatedPaths = [p1, p2, racialPathId];

  // Keep profile abilities, replace racial ability
  const updatedAcquired = [
    ...char.acquiredAbilities.filter((a) => a.pathId === p1 || a.pathId === p2),
    { pathId: racialPathId, rank: 1 },
  ];

  const updatedChar: CharacterSheet = {
    ...char,
    peopleId,
    age: p.startingAge,
    height: p.heightRange,
    weight: p.weightRange,
    physicalTraits: p.physicalTraits,
    languages: p.defaultLanguages,
    selectedRacialBonus: racialBonus,
    selectedRacialMalus: racialMalus,
    selectedRacialBonuses: racialBonuses,
    selectedRacialMaluses: racialMaluses,
    selectedPathIds: updatedPaths,
    acquiredAbilities: updatedAcquired,
    updatedAt: new Date().toISOString(),
  };

  const sanitized = sanitizeCharacterEquipment(updatedChar);
  const computed = computeCharacterStats(sanitized);
  sanitized.currentHp = computed.maxHp;
  sanitized.currentDr = computed.maxDr;
  sanitized.currentPc = computed.maxPc;
  sanitized.currentPm = computed.maxPm;
  return sanitized;
}

/**
 * Creates a brand new default character initialized at Level 1.
 */
export function createDefaultCharacter(): CharacterSheet {
  const defaultProfile = PROFILES[0]; // Arquebusier
  const defaultPeople = getPeopleById("humain") || PEOPLES[0];

  const initialChar: CharacterSheet = {
    id: "char_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    version: "1.0.0",
    updatedAt: new Date().toISOString(),
    name: "Nouveau Héros",
    playerName: "",
    sex: "Masculin",
    age: defaultPeople.startingAge,
    height: defaultPeople.heightRange,
    weight: defaultPeople.weightRange,
    physicalTraits: defaultPeople.physicalTraits,
    languages: defaultPeople.defaultLanguages,
    background: "",
    ideal: "Courage",
    flaw: "Impulsif",
    notes: "",
    peopleId: defaultPeople.id,
    profileId: defaultProfile.id,
    level: 1,
    baseStats: {
      FOR: 0,
      AGI: 2,
      CON: 1,
      PER: 2,
      INT: 1,
      VOL: 0,
      CHA: -1,
    },
    selectedRacialBonus: "FOR",
    selectedRacialMalus: undefined,
    manualStatBonuses: {},
    selectedPathIds: [
      defaultProfile.paths[0],
      defaultProfile.paths[1],
      getRacialPathId(defaultPeople.id),
    ],
    acquiredAbilities: [
      { pathId: defaultProfile.paths[0], rank: 1 },
      { pathId: defaultProfile.paths[1], rank: 1 },
      { pathId: getRacialPathId(defaultPeople.id), rank: 1 },
    ],
    currentHp: 10,
    maxHpBonus: 0,
    currentDr: 3,
    currentPc: 2,
    currentPm: 0,
    equippedArmorId: "cuir-simple",
    equippedShieldId: undefined,
    weapons: [
      {
        id: "w_1",
        weaponRefId: "epee-longue",
        name: "Épée longue",
        damage: "1d8",
        range: "Contact",
        category: "contact",
      },
      {
        id: "w_2",
        weaponRefId: "dague",
        name: "Dague",
        damage: "1d4",
        range: "Contact (ou 10 m)",
        category: "contact",
      },
    ],
    inventory: ADVENTURER_KIT.map((item, idx) => ({
      id: "inv_" + idx,
      name: item,
      quantity: 1,
    })),
    coins: {
      pa: 12,
      pc: 0,
      po: 0,
    },
  };

  const computed = computeCharacterStats(initialChar);
  initialChar.currentHp = computed.maxHp;
  initialChar.currentDr = computed.maxDr;
  initialChar.currentPc = computed.maxPc;
  initialChar.currentPm = computed.maxPm;

  return initialChar;
}

/**
 * Calculates capability points budget and spending for a character.
 */
export function calculateCapabilityPoints(char: CharacterSheet) {
  const level = Math.max(1, char.level || 1);
  // Total points earned: Level 1 provides 2 rank 1 abilities + racial rank 1.
  // Each subsequent level provides 2 points.
  const levelUpPoints = (level - 1) * 2;

  // Let's count points spent on abilities beyond starting package:
  let pointsSpent = 0;
  // Starting free abilities:
  // Racial rank 1 is free
  // First two profile rank 1s are free
  // All other rank 1 & 2 cost 1 point
  // Rank 3, 4, 5 cost 2 points
  char.acquiredAbilities.forEach((acq) => {
    // If it's rank 1 in the chosen starting paths, we don't bill up to 3 starting rank 1s
    // Simple way: rank 1 & 2 cost 1, rank 3+ cost 2
    const cost = acq.rank <= 2 ? 1 : 2;
    pointsSpent += cost;
  });

  // Base free points at creation = 3 (1 racial rank 1 + 2 profile rank 1).
  // If character has chosen a domain path (which replaces the racial path but retains racial R1 per rules),
  // they start with 4 rank 1 abilities (2 profile + 1 racial R1 + 1 domain R1).
  const hasDomainR1 = char.acquiredAbilities.some((a) => {
    const p = getPathById(a.pathId);
    return (
      (p?.type === "domain" || a.pathId === "voie-du-mage") && a.rank === 1
    );
  });
  const hasRacialR1 = char.acquiredAbilities.some((a) => {
    const p = getPathById(a.pathId);
    return p?.type === "racial" && a.rank === 1;
  });

  const baseFreePoints = hasDomainR1 && hasRacialR1 ? 4 : 3;
  const netSpent = Math.max(0, pointsSpent - baseFreePoints);
  const available = levelUpPoints - netSpent;

  return {
    totalEarned: levelUpPoints,
    spent: netSpent,
    available,
  };
}

/**
 * Checks whether a path is a prestige path.
 */
export function isPrestigePath(pathId: string): boolean {
  return PATHS_MAP.get(pathId)?.type === "prestige";
}

/**
 * Returns point cost for a given rank:
 * - Ranks 1 and 2: 1 point
 * - Ranks 3 to 8: 2 points
 */
export function getRankPointCost(rank: number): number {
  return rank <= 2 ? 1 : 2;
}

/**
 * Returns the minimum character level required to learn a given rank.
 * Prestige paths:
 * - Voie du familier fantastique: rank 3 -> level 3, rank 4 -> level 5, etc.
 * - Standard prestige paths: rank 4 -> level 5, rank 5 -> level 7, rank 6 -> level 9, rank 7 -> level 11, rank 8 -> level 13.
 * Standard paths:
 * - Rank 1 & 2: level 1
 * - Rank 3: level 3
 * - Rank 4: level 5
 * - Rank 5: level 7
 */
export function getRankLevelRequirement(
  isPrestige: boolean,
  rank: number,
  pathId?: string,
): number {
  if (isPrestige) {
    if (pathId === "voie-du-familier-fantastique") {
      switch (rank) {
        case 3:
          return 3;
        case 4:
          return 5;
        case 5:
          return 7;
        case 6:
          return 9;
        case 7:
          return 11;
        default:
          return 3;
      }
    }
    switch (rank) {
      case 3:
        return 3;
      case 4:
        return 5;
      case 5:
        return 7;
      case 6:
        return 9;
      case 7:
        return 11;
      case 8:
        return 13;
      default:
        return 5;
    }
  }
  switch (rank) {
    case 1:
    case 2:
      return 1;
    case 3:
      return 3;
    case 4:
      return 5;
    case 5:
      return 7;
    default:
      return 1;
  }
}

/**
 * Checks whether a character satisfies all prerequisites for a specific prestige path.
 */
export function checkPrestigePathPrerequisites(
  char: CharacterSheet,
  pathId: string,
  targetLevel: number = char.level || 1,
  currentAcquired: Array<{
    pathId: string;
    rank: number;
  }> = char.acquiredAbilities,
): { eligible: boolean; reason?: string } {
  const path = PATHS_MAP.get(pathId);
  if (!path || path.type !== "prestige") {
    return {
      eligible: false,
      reason: "Cette voie n'est pas une voie de prestige.",
    };
  }

  // Check if character already has a different prestige path
  const existingPrestige = char.selectedPathIds
    .map((id) => PATHS_MAP.get(id))
    .find((p) => p?.type === "prestige" && p.id !== pathId);
  if (existingPrestige) {
    return {
      eligible: false,
      reason: `Vous possédez déjà une voie de prestige (${existingPrestige.name}). Un héros ne peut choisir qu'une seule voie de prestige dans sa carrière.`,
    };
  }

  // Level requirement check
  const minLevel = pathId === "voie-du-familier-fantastique" ? 3 : 5;
  if (targetLevel < minLevel) {
    return {
      eligible: false,
      reason: `Niveau ${minLevel} requis (votre niveau actuel ou cible est ${targetLevel}).`,
    };
  }

  // Profile family check
  const profile = getProfileById(char.profileId);
  const effectiveFamily: ProfileFamily =
    char.profileId === "psionique" && char.profileFamily
      ? char.profileFamily
      : profile?.family || "Combattants";

  if (pathId === "voie-de-l-entite" && effectiveFamily !== "Mages") {
    return {
      eligible: false,
      reason: "Réservé aux membres de la famille des Mages.",
    };
  }

  if (
    pathId !== "voie-des-mutations" &&
    path.familyRestriction &&
    path.familyRestriction !== "All" &&
    path.familyRestriction !== effectiveFamily
  ) {
    return {
      eligible: false,
      reason: `Réservé à la famille ${path.familyRestriction} (vous êtes ${effectiveFamily}).`,
    };
  }

  // Check owner field if familyRestriction not explicitly set
  if (
    pathId !== "voie-des-mutations" &&
    pathId !== "voie-de-l-entite" &&
    !path.familyRestriction &&
    path.owner &&
    path.owner !== "Générique" &&
    path.owner !== "Mage / Générique"
  ) {
    const normOwner = path.owner === "Mage" ? "Mages" : path.owner;
    if (normOwner !== effectiveFamily) {
      return {
        eligible: false,
        reason: `Réservé à la famille ${normOwner} (vous êtes ${effectiveFamily}).`,
      };
    }
  }

  // Specific path mechanics prerequisites
  if (pathId === "voie-de-l-expert") {
    // Requires rank 2 in at least 3 paths of the same profile
    const profilePathIds = profile ? profile.paths : [];
    const countPathsWithRank2 = profilePathIds.filter((pid) =>
      currentAcquired.some((a) => a.pathId === pid && a.rank >= 2),
    ).length;

    if (countPathsWithRank2 < 3) {
      return {
        eligible: false,
        reason: `Prérequis : avoir acquis au moins le rang 2 dans 3 voies de votre profil principal (${countPathsWithRank2}/3 actuellement).`,
      };
    }
  }

  if (pathId === "voie-du-specialiste") {
    // Requires rank 4 in at least one path of the main profile
    const profilePathIds = profile ? profile.paths : [];
    const hasRank4 = currentAcquired.some(
      (a) => profilePathIds.includes(a.pathId) && a.rank >= 4,
    );

    if (!hasRank4) {
      return {
        eligible: false,
        reason:
          "Prérequis : avoir acquis au moins le rang 4 dans une voie de votre profil principal.",
      };
    }
  }

  return { eligible: true };
}

/**
 * Returns all prestige paths with eligibility status for a character.
 */
export function getEligiblePrestigePaths(
  char: CharacterSheet,
  targetLevel: number = char.level || 1,
  currentAcquired: Array<{
    pathId: string;
    rank: number;
  }> = char.acquiredAbilities,
): Array<{ path: PathData; eligible: boolean; reason?: string }> {
  const prestigePaths = PATHS.filter((p) => p.type === "prestige");
  return prestigePaths.map((path) => {
    const check = checkPrestigePathPrerequisites(
      char,
      path.id,
      targetLevel,
      currentAcquired,
    );
    return {
      path,
      eligible: check.eligible,
      reason: check.reason,
    };
  });
}

/**
 * Returns all paths accessible during level up:
 * - All 5 paths of the character's profile
 * - Character's racial / domain / replacement path
 * - Any other paths already selected by the character (e.g. prestige, hybrid)
 */
export function getAccessiblePathsForLevelUp(char: CharacterSheet): PathData[] {
  const profile = getProfileById(char.profileId);
  const profilePathIds = profile ? profile.paths : [];

  const orderedIds: string[] = [...profilePathIds];

  char.selectedPathIds.forEach((id) => {
    if (!orderedIds.includes(id)) {
      orderedIds.push(id);
    }
  });

  return orderedIds
    .map((id) => PATHS_MAP.get(id))
    .filter((p): p is PathData => Boolean(p));
}

/**
 * Resolves all profile IDs mastered by a character:
 * - Primary profile
 * - Secondary profile (if hybrid)
 * - Any profile where character has >= 2 acquired ranks
 */
export function getCharacterMasteredProfileIds(char: CharacterSheet): string[] {
  const ids = new Set<string>();
  if (char.profileId) ids.add(char.profileId);
  if (char.secondaryProfileId) ids.add(char.secondaryProfileId);

  PROFILES.forEach((p) => {
    const ranksInProfile = char.acquiredAbilities.filter((a) =>
      p.paths.includes(a.pathId),
    ).length;
    if (ranksInProfile >= 2) {
      ids.add(p.id);
    }
  });

  return Array.from(ids);
}

/**
 * Checks whether a path is considered racial or a racial replacement (domain / voie du mage)
 */
export function isRacialOrReplacementPath(
  pathId: string,
  peopleId: string,
): boolean {
  const pth = getPathById(pathId);
  if (!pth) return false;
  return (
    pth.type === "racial" ||
    pth.type === "domain" ||
    pathId === "voie-du-mage" ||
    pathId === getRacialPathId(peopleId)
  );
}

/**
 * Counts non-racial active paths (where character has acquired at least 1 ability).
 * Per COF2 rules: "Au total, un personnage ne peut jamais posséder plus de six voies, plus la voie de peuple."
 */
export function getNonRacialActivePathsCount(char: CharacterSheet): number {
  const activeNonRacialPathIds = new Set(
    char.acquiredAbilities
      .map((a) => a.pathId)
      .filter((pid) => !isRacialOrReplacementPath(pid, char.peopleId)),
  );
  return activeNonRacialPathIds.size;
}

/**
 * Validates if a character is eligible to adopt a new hybrid path.
 * Official rules:
 * 1. "Tant qu'il reste au moins une voie sur les cinq de son profil dans laquelle le joueur n'a investi aucun point de capacité..."
 * 2. "Au total, un personnage ne peut jamais posséder plus de six voies, plus la voie de peuple."
 */
export function canCharacterAdoptHybridPath(
  char: CharacterSheet,
  candidatePathId?: string,
): { eligible: boolean; reason?: string } {
  const profile = getProfileById(char.profileId);
  if (!profile) return { eligible: true };

  // 1. Règle des 5 voies du profil principal
  const profilePathsInvested = profile.paths.filter((pathId) =>
    char.acquiredAbilities.some((a) => a.pathId === pathId),
  ).length;

  if (profilePathsInvested >= profile.paths.length) {
    return {
      eligible: false,
      reason:
        "Vous avez déjà acquis des capacités dans les 5 voies de votre profil principal. L'hybridation n'est plus permise (Règles COF2, chap. 9).",
    };
  }

  // 2. Plafond absolu : max 6 voies (hors voie de peuple/domaine/mage)
  const currentNonRacialCount = getNonRacialActivePathsCount(char);
  const isNewPath = candidatePathId
    ? !char.acquiredAbilities.some((a) => a.pathId === candidatePathId)
    : true;

  if (isNewPath && currentNonRacialCount >= 6) {
    return {
      eligible: false,
      reason:
        "Plafond atteint : un personnage ne peut jamais posséder plus de 6 voies au total, plus la voie de peuple (Règles COF2, p. 622).",
    };
  }

  return { eligible: true };
}

export interface LevelUpHpGainResult {
  hpGain: number;
  baseHp: number;
  conBonus: number;
  newHalfHpPending: boolean;
  details: string;
}

/**
 * Calculates HP gained upon leveling up, honoring hybrid capability families,
 * racial path rule (counts as primary profile family), and half-HP unrounded residue.
 */
export function calculateLevelUpHpGain(
  char: CharacterSheet,
  newlyAcquiredRanks: Array<{ pathId: string; rank: number }>,
  pendingHalfHp: boolean = false,
): LevelUpHpGainResult {
  const profile = getProfileById(char.profileId) || PROFILES[0];
  const stats = computeCharacterStats(char);
  const conBonus = stats.finalStats.CON;

  const getPathHpPerLevel = (
    pathId: string,
  ): { hp: number; familyName: string } => {
    if (isRacialOrReplacementPath(pathId, char.peopleId)) {
      return { hp: profile.hpPerLevel, familyName: profile.family };
    }
    const owningProfile = PROFILES.find((p) => p.paths.includes(pathId));
    if (owningProfile) {
      return { hp: owningProfile.hpPerLevel, familyName: owningProfile.family };
    }
    return { hp: profile.hpPerLevel, familyName: profile.family };
  };

  if (!newlyAcquiredRanks || newlyAcquiredRanks.length === 0) {
    return {
      hpGain: profile.hpPerLevel + conBonus,
      baseHp: profile.hpPerLevel,
      conBonus,
      newHalfHpPending: pendingHalfHp,
      details: `${profile.hpPerLevel} base (${profile.family}) + ${conBonus} CON`,
    };
  }

  const hpInfos = newlyAcquiredRanks.map((r) => getPathHpPerLevel(r.pathId));
  const uniqueFamilies = Array.from(new Set(hpInfos.map((h) => h.familyName)));

  if (uniqueFamilies.length <= 1) {
    const baseHp = hpInfos[0].hp;
    return {
      hpGain: baseHp + conBonus,
      baseHp,
      conBonus,
      newHalfHpPending: pendingHalfHp,
      details: `${baseHp} base (${uniqueFamilies[0]}) + ${conBonus} CON`,
    };
  }

  // 2 different families: average
  const totalHp = hpInfos.reduce((acc, h) => acc + h.hp, 0);
  const rawAverage = totalHp / hpInfos.length;

  let baseHp = Math.floor(rawAverage);
  let newHalfHpPending = pendingHalfHp;

  const hasHalfPoint = rawAverage % 1 !== 0;
  if (hasHalfPoint) {
    if (pendingHalfHp) {
      baseHp = Math.ceil(rawAverage);
      newHalfHpPending = false;
    } else {
      baseHp = Math.floor(rawAverage);
      newHalfHpPending = true;
    }
  }

  const details = `${baseHp} base (moyenne ${uniqueFamilies.join("/")}${hasHalfPoint ? (pendingHalfHp ? " + ½ PV récupéré" : " - ½ PV reporté") : ""}) + ${conBonus} CON`;

  return {
    hpGain: baseHp + conBonus,
    baseHp,
    conBonus,
    newHalfHpPending,
    details,
  };
}

/**
 * Calculates the extra PM required to cast a spell in armor exceeding the path's maximum authorized armor.
 * Priests can cast in any armor without penalty.
 * Barde allows up to cuir renforcé (DEF +3).
 * Druide / Forgesort allow up to cuir simple (DEF +2).
 * Other spellcasters allow no armor (DEF 0).
 */
export function calculateArmorSpellManaCost(
  char: CharacterSheet,
  pathId: string,
  rank: number,
): number {
  const pth = getPathById(pathId);
  if (!pth) return 0;
  const rankData = pth.ranks.find((r) => r.rank === rank);
  if (!rankData || !rankData.isSpell) return 0;

  if (!char.equippedArmorId) return 0;
  const armor = getArmorById(char.equippedArmorId);
  if (!armor || armor.def <= 0) return 0;

  const owningProfile = PROFILES.find((p) => p.paths.includes(pathId));
  if (owningProfile?.id === "pr-tre" || pth.type === "domain") {
    return 0;
  }

  if (owningProfile?.id === "barde") {
    return Math.max(0, armor.def - 3);
  }

  if (owningProfile?.id === "druide" || owningProfile?.id === "forgesort") {
    return Math.max(0, armor.def - 2);
  }

  return armor.def;
}
