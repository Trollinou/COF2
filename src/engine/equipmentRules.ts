import type {
  ArmorItem,
  CharacterSheet,
  CharacterWeaponInstance,
  PriestDeity,
  ProfileData,
  WeaponFilterCategory,
  WeaponItem,
  WeaponModifierRule,
} from "../types/cof2";
import {
  ARMORS,
  PRIEST_DEITIES,
  PROFILES,
  WEAPONS,
  equipmentData,
  getArmorById,
  getDeityByDomainPathId,
  getDeityByName,
  getPathById,
  getPeopleById,
  getProfileById,
  getWeaponById,
  isDomainPath,
  tablesData,
} from "./compendium";
import {
  canUseVoieDuMage,
  getProfileAllPoolPathIds,
  hasMageCreationBonus,
  resolveExternalGrants,
} from "./pathHelpers";

export function isWeaponEligibleForFilter(
  weapon: WeaponItem | CharacterWeaponInstance,
  filter?: WeaponFilterCategory,
): boolean {
  if (!filter || filter === "any") return true;

  const weaponRefId = "weaponRefId" in weapon ? weapon.weaponRefId : weapon.id;
  const baseW =
    getWeaponById(weaponRefId) ||
    ("category" in weapon ? (weapon as WeaponItem) : undefined);
  const tags = baseW?.tags || [];

  switch (filter) {
    case "bareHands":
      return tags.includes("mains-nues") || weaponRefId === "mains-nues";

    case "lightWeapons":
      return tags.includes("legere");

    case "sabres":
      return tags.includes("sabre");

    case "duellisteWeapons":
      return tags.includes("duelliste");

    case "danseurWeapons":
      return tags.includes("danseur");

    case "projectiles":
      return (
        baseW?.category === "distance" &&
        !tags.includes("poudre") &&
        (tags.includes("arc") ||
          tags.includes("arbalete") ||
          weaponRefId === "fronde")
      );

    case "oneHanded":
      return baseW ? baseW.hands === 1 : true;

    default:
      return false;
  }
}

export function doesWeaponMatchModifierRule(
  weapon: WeaponItem | CharacterWeaponInstance,
  rule: WeaponModifierRule,
): boolean {
  const weaponRefId = "weaponRefId" in weapon ? weapon.weaponRefId : weapon.id;
  const baseW =
    getWeaponById(weaponRefId) ||
    ("tags" in weapon ? (weapon as WeaponItem) : undefined);

  if (rule.category && (baseW?.category || weapon.category) !== rule.category) {
    return false;
  }
  const hasWeaponIds = Boolean(rule.weaponIds && rule.weaponIds.length > 0);
  const hasTags = Boolean(rule.tags && rule.tags.length > 0);
  if (!hasWeaponIds && !hasTags) {
    return Boolean(rule.category);
  }
  if (hasWeaponIds && rule.weaponIds!.includes(weaponRefId)) {
    return true;
  }
  if (hasTags && baseW?.tags?.some((t) => rule.tags!.includes(t))) {
    return true;
  }
  return false;
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
  peopleId?: string,
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
  return ARMORS.filter((a) => {
    if (a.type !== "armor") return false;
    if (a.restrictedToPeopleIds && a.restrictedToPeopleIds.length > 0) {
      if (!peopleId || !a.restrictedToPeopleIds.includes(peopleId)) {
        return false;
      }
    }
    const tierId = a.equivalentArmorId || a.id;
    return allowedIds.includes(tierId);
  });
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
  peopleId?: string,
): boolean {
  if (!armorId) return true;
  const allowed = getAllowedArmors(profileId, secondaryProfileId, peopleId);
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
  sacredWeaponOrDeity: string | PriestDeity,
): boolean {
  if (typeof sacredWeaponOrDeity === "object" && sacredWeaponOrDeity !== null) {
    if (sacredWeaponOrDeity.sacredWeaponIds?.length > 0) {
      return sacredWeaponOrDeity.sacredWeaponIds.includes(weaponId);
    }
    return matchesSacredWeapon(weaponId, sacredWeaponOrDeity.sacredWeapon);
  }

  const matchedDeity = PRIEST_DEITIES.find(
    (d) =>
      d.sacredWeapon.toLowerCase() === sacredWeaponOrDeity.toLowerCase() &&
      d.sacredWeaponIds.length > 0,
  );
  if (matchedDeity) {
    return matchedDeity.sacredWeaponIds.includes(weaponId);
  }

  const desc = sacredWeaponOrDeity.toLowerCase();
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
  if (wRules.forbidPowder && weapon.tags.includes("poudre")) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} refuse les armes à poudre.`,
    };
  }
  if (wRules.forbidCrossbows && weapon.tags.includes("arbalete")) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} refuse les arbalètes.`,
    };
  }
  if (
    wRules.forbiddenTags &&
    weapon.tags.some((t) => wRules.forbiddenTags!.includes(t))
  ) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} refuse ce type d'arme.`,
    };
  }
  if (wRules.forbidImprovedCrit && weapon.critMin < 20) {
    return {
      allowed: false,
      reason: `${profile?.name || "Ce profil"} ne maîtrise pas les armes à critique étendu (${weapon.critMin}-20).`,
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
  acquiredAbilities?: Array<{ pathId: string; rank: number }>,
): WeaponProficiencyCheck {
  const weapon = getWeaponById(weaponId);
  if (!weapon) return { allowed: false, reason: "Arme inconnue" };

  // Sacred weapon exception for Priests (Règles COF2 / Compagnon):
  if (
    (profileId === "pretre" || secondaryProfileId === "pretre") &&
    deityOrDomainPathId
  ) {
    const deity =
      getDeityByDomainPathId(deityOrDomainPathId) ||
      getDeityByName(deityOrDomainPathId);
    if (deity && matchesSacredWeapon(weaponId, deity)) {
      return { allowed: true, requiresTwoHands: weapon.hands === 2 };
    }
  }

  // Check if any acquired path ability explicitly grants proficiency for this weapon (e.g. Nain R2, Artilleur R1)
  const hasPathWeaponProficiency = Boolean(
    acquiredAbilities?.some((acq) => {
      const pth = getPathById(acq.pathId);
      const rData = pth?.ranks.find((r) => r.rank === acq.rank);
      return rData?.modifiers?.weaponModifiers?.some(
        (wm) => wm.grantProficiency && doesWeaponMatchModifierRule(weapon, wm),
      );
    }),
  );

  // Check profile declarative rules (either profileId, secondaryProfileId, or path proficiency can grant proficiency)
  const rule1 = checkProfileWeaponRule(weapon, profileId);
  let profileAllowed = rule1.allowed || hasPathWeaponProficiency;
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
        reason: `Taille ${people?.name || "raciale"} : armes supérieures à 1d${pRules.maxDamageDice} DM interdites.`,
      };
    }
    if (
      (pRules.twoHandedWeaponIds &&
        pRules.twoHandedWeaponIds.includes(weapon.id)) ||
      (pRules.twoHandedMinDamageDice &&
        (weapon.maxDamageDice || 0) >= pRules.twoHandedMinDamageDice &&
        (weapon.maxDamageDice || 0) <= 10) ||
      (pRules.maxOneHandedDamageDice &&
        (weapon.maxDamageDice || 0) > pRules.maxOneHandedDamageDice)
    ) {
      requiresTwoHands = true;
      if (
        wRules?.maxHands === 1 &&
        !secondaryProfileId &&
        !hasPathWeaponProficiency
      ) {
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
  acquiredAbilities?: Array<{ pathId: string; rank: number }>,
): Array<WeaponItem & { requiresTwoHands?: boolean }> {
  const result: Array<WeaponItem & { requiresTwoHands?: boolean }> = [];
  (WEAPONS as WeaponItem[]).forEach((w) => {
    const check = checkWeaponProficiency(
      w.id,
      profileId,
      peopleId,
      undefined,
      secondaryProfileId,
      acquiredAbilities,
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

// 4. Data-driven default equipment resolution from profiles.json & equipment.json
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

  let armorId = def?.armorId || undefined;
  const shieldId = def?.shieldId || undefined;

  const preferredArmorId = people?.equipmentRules?.preferredArmorId;
  if (
    preferredArmorId &&
    armorId &&
    isArmorAllowed(preferredArmorId, profileId, undefined, peopleId)
  ) {
    armorId = preferredArmorId;
  }

  let targetWeaponIds = def?.defaultWeaponIds
    ? [...def.defaultWeaponIds]
    : ["epee-courte"];

  // Smart resolution for small races using declarative smallRaceReplacementId on weapons
  const isSmallRace = Boolean(people?.equipmentRules?.maxDamageDice);
  if (isSmallRace) {
    targetWeaponIds = targetWeaponIds.map((wid) => {
      if (wid === "epee-longue" && profile.id === "barde") return "epee-courte";
      const baseW = getWeaponById(wid);
      if (baseW?.smallRaceReplacementId) {
        return baseW.smallRaceReplacementId;
      }
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
          bonusAttack: 0,
          bonusDamage: 0,
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
  const allowedArmors = getAllowedArmors(
    char.profileId,
    char.secondaryProfileId,
    char.peopleId,
  );
  const allowedShields = getAllowedShields(
    char.profileId,
    char.secondaryProfileId,
  );

  let equippedArmorId = char.equippedArmorId;
  if (equippedArmorId && !allowedArmors.some((a) => a.id === equippedArmorId)) {
    const defaultArmorId = getDefaultEquipmentForProfile(
      char.profileId,
      char.peopleId,
    ).armorId;
    if (defaultArmorId && allowedArmors.some((a) => a.id === defaultArmorId)) {
      equippedArmorId = defaultArmorId;
    } else {
      equippedArmorId =
        allowedArmors.length > 0
          ? allowedArmors[allowedArmors.length - 1].id
          : undefined;
    }
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
      char.secondaryProfileId,
      char.acquiredAbilities,
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

