import type { CharacterSheet, PathData, ProfileFamily } from "../types/cof2";
import {
  PATHS,
  PATHS_MAP,
  PROFILES,
  getArmorById,
  getPathById,
  getPeopleById,
  getProfileById,
  isDomainPath,
  tablesData,
} from "./compendium";
import {
  getProfileAllPoolPathIds,
  getRacialPathId,
  hasMageCreationBonus,
  isPathInProfilePool,
  isRacialReplacementPath,
} from "./pathHelpers";
import { ARMOR_HIERARCHY } from "./equipmentRules";
import { computeCharacterStats } from "./statsFallback";

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

  const mageCreationBonus = hasMageCreationBonus(char) ? 1 : 0;
  const baseFreePoints = (hasDomainR1 && hasRacialR1 ? 4 : 3) + mageCreationBonus;
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

  const prereq = path.prerequisites;

  // Level requirement check
  const minLevel =
    prereq?.minLevel ?? (pathId === "voie-du-familier-fantastique" ? 3 : 5);
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

  if (prereq?.allowedFamilies) {
    if (
      Array.isArray(prereq.allowedFamilies) &&
      prereq.allowedFamilies.length > 0 &&
      !prereq.allowedFamilies.includes(effectiveFamily)
    ) {
      return {
        eligible: false,
        reason: `Réservé à la famille ${prereq.allowedFamilies.join(" / ")} (vous êtes ${effectiveFamily}).`,
      };
    }
  } else {
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
  }

  // Declarative profile path rank prerequisites (e.g. Voie de l'expert, Voie du spécialiste)
  if (prereq?.minProfilePathsAtRank) {
    const { count, rank: minRank } = prereq.minProfilePathsAtRank;
    const profilePathIds = profile ? profile.paths : [];
    const matchingPathsCount = profilePathIds.filter((pid) =>
      currentAcquired.some((a) => a.pathId === pid && a.rank >= minRank),
    ).length;

    if (matchingPathsCount < count) {
      if (count === 1) {
        return {
          eligible: false,
          reason: `Prérequis : avoir acquis au moins le rang ${minRank} dans une voie de votre profil principal.`,
        };
      }
      return {
        eligible: false,
        reason: `Prérequis : avoir acquis au moins le rang ${minRank} dans ${count} voies de votre profil principal (${matchingPathsCount}/${count} actuellement).`,
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

  // Inclure les voies supplémentaires (Atlas) du profil si le joueur n'a pas encore atteint le plafond de 5 voies de profil
  if (profile?.optionalPaths?.length) {
    const pool = getProfileAllPoolPathIds(profile);
    const investedCount = pool.filter(
      (pid) =>
        char.acquiredAbilities.some((a) => a.pathId === pid) ||
        char.selectedPathIds.includes(pid),
    ).length;

    if (investedCount < profile.paths.length) {
      profile.optionalPaths.forEach((id) => {
        if (!orderedIds.includes(id)) {
          orderedIds.push(id);
        }
      });
    }
  }

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

  // 1. Règle des 5 voies du profil principal (incluant les voies supplémentaires Atlas)
  const profilePool = getProfileAllPoolPathIds(profile);
  const profilePathsInvested = profilePool.filter((pathId) =>
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

  if (pth.type === "domain") return 0;

  const owningProfile = PROFILES.find((p) => p.paths.includes(pathId));
  if (owningProfile?.equipmentRules) {
    const maxDef = owningProfile.equipmentRules.maxSpellcastingArmorDef;
    if (maxDef === null) return 0;
    if (typeof maxDef === "number") {
      return Math.max(0, armor.def - maxDef);
    }
  }

  return armor.def;
}
