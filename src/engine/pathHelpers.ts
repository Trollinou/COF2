import type {
  AbilityRef,
  ActionRank,
  CharacterSheet,
  ExternalAbilityGrantRule,
  PathData,
  ProfileData,
} from "../types/cof2";
import { PATHS_MAP, PROFILES, getPathById, getPeopleById, getProfileById, isDomainPath } from "./compendium";

export function getRacialPathId(
  peopleId: string,
  currentRacialPathId?: string,
): string {
  const p = getPeopleById(peopleId);
  if (!p) return "voie-de-l-humain";

  // Dedicated racial path
  if (p.racialPathId) {
    return p.racialPathId;
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

export interface ResolvedExternalGrant {
  // Key `${pathId}_${rank}` of the rank granting the external ability.
  sourceKey: string;
  rule: ExternalAbilityGrantRule;
  // "free": player always picks the ability. "default": rank grants its default ability.
  // "replacement": default ability already owned, the player must pick a replacement.
  mode: "free" | "default" | "replacement";
  // Ability effectively granted (undefined while a required choice is pending).
  ability?: AbilityRef;
  // Candidate replacements (replacement mode only).
  options: AbilityRef[];
  // True when the player still has to make a (valid) choice.
  needsChoice: boolean;
}

const abilityKey = (a: AbilityRef): string => `${a.pathId}_${a.rank}`;

/**
 * Lists every ability that can be chosen as replacement for a grant rule
 * (explicit list, or rank <= maxRank of the allowed profiles' paths), minus owned ones.
 */
function listReplacementOptions(
  rule: ExternalAbilityGrantRule,
  owned: Set<string>,
): AbilityRef[] {
  let candidates: AbilityRef[] = [];
  if (rule.replacementAbilities) {
    candidates = rule.replacementAbilities;
  } else {
    const profiles =
      rule.allowedProfiles === "any"
        ? PROFILES
        : PROFILES.filter((p) =>
            (rule.allowedProfiles as string[]).includes(p.id),
          );
    const pathIds = Array.from(new Set(profiles.flatMap((p) => p.paths)));
    for (const pid of pathIds) {
      const path = PATHS_MAP.get(pid);
      path?.ranks.forEach((r) => {
        if (r.rank <= rule.maxRank) candidates.push({ pathId: pid, rank: r.rank });
      });
    }
  }
  return candidates.filter(
    (c) => PATHS_MAP.has(c.pathId) && !owned.has(abilityKey(c)),
  );
}

/**
 * Resolves the abilities borrowed through `grantExternalAbility` ranks.
 * Handles "if you already own it" replacement rules (e.g. Farfadet R2 / R3).
 */
export function resolveExternalGrants(
  char: Pick<CharacterSheet, "acquiredAbilities" | "externalAbilityChoices">,
): ResolvedExternalGrant[] {
  const owned = new Set<string>(char.acquiredAbilities.map(abilityKey));
  const results: ResolvedExternalGrant[] = [];

  for (const acq of char.acquiredAbilities) {
    const rule = PATHS_MAP.get(acq.pathId)?.ranks.find(
      (r) => r.rank === acq.rank,
    )?.modifiers?.grantExternalAbility;
    if (!rule) continue;

    const sourceKey = abilityKey(acq);
    const choice = char.externalAbilityChoices?.[sourceKey];

    if (!rule.defaultAbility) {
      const ability =
        choice && choice.pathId && choice.rank
          ? { pathId: choice.pathId, rank: choice.rank }
          : undefined;
      if (ability) owned.add(abilityKey(ability));
      results.push({
        sourceKey,
        rule,
        mode: "free",
        ability,
        options: [],
        needsChoice: !ability,
      });
      continue;
    }

    const defKey = abilityKey(rule.defaultAbility);
    if (!owned.has(defKey)) {
      owned.add(defKey);
      results.push({
        sourceKey,
        rule,
        mode: "default",
        ability: rule.defaultAbility,
        options: [],
        needsChoice: false,
      });
      continue;
    }

    const options = listReplacementOptions(rule, owned);
    const valid =
      choice && options.some((o) => abilityKey(o) === abilityKey(choice));
    const ability = valid ? { pathId: choice.pathId, rank: choice.rank } : undefined;
    if (ability) owned.add(abilityKey(ability));
    results.push({
      sourceKey,
      rule,
      mode: "replacement",
      ability,
      options,
      needsChoice: !ability,
    });
  }
  return results;
}


export function isMageProfile(profileId: string): boolean {
  return ["ensorceleur", "forgesort", "magicien", "sorcier"].includes(
    profileId,
  );
}

/**
 * Returns true if the character belongs to the Mages family for the level-1
 * bonus rank-2 capability (profiles with `hasMageBonus: true`, or a Psionique
 * who chose the Mages family, including in hybrid mode).
 */
export function hasMageCreationBonus(char: CharacterSheet): boolean {
  const profile = getProfileById(char.profileId);
  const secondaryProfile =
    char.isHybrid && char.secondaryProfileId
      ? getProfileById(char.secondaryProfileId)
      : undefined;
  const isPsionicMage =
    (char.profileId === "psionique" ||
      (Boolean(char.isHybrid) && char.secondaryProfileId === "psionique")) &&
    char.profileFamily === "Mages";
  return Boolean(
    profile?.hasMageBonus || secondaryProfile?.hasMageBonus || isPsionicMage,
  );
}

/**
 * Returns true if the character can replace their racial path with Voie du Mage
 * (classic Mage profiles or a Psionique who chose the Mages family).
 */
export function canUseVoieDuMage(char: CharacterSheet): boolean {
  const isPsionicMage =
    (char.profileId === "psionique" ||
      (Boolean(char.isHybrid) && char.secondaryProfileId === "psionique")) &&
    char.profileFamily === "Mages";
  return (
    isMageProfile(char.profileId) ||
    Boolean(
      char.isHybrid &&
        char.secondaryProfileId &&
        isMageProfile(char.secondaryProfileId),
    ) ||
    isPsionicMage
  );
}

/**
 * Returns all path IDs accessible as profile paths (the 5 standard paths + any optional Atlas paths).
 */
export function getProfileAllPoolPathIds(profile?: ProfileData): string[] {
  if (!profile) return [];
  return Array.from(
    new Set([...profile.paths, ...(profile.optionalPaths || [])]),
  );
}

/**
 * Checks whether a path ID belongs to the profile's standard or optional paths pool.
 */
export function isPathInProfilePool(
  profile: ProfileData | undefined,
  pathId: string,
): boolean {
  if (!profile) return false;
  return (
    profile.paths.includes(pathId) ||
    Boolean(profile.optionalPaths?.includes(pathId))
  );
}

/**
 * Returns the eligible rank-2 capability chosen at level 1 for a Mage-family
 * character (either in one of the 2 selected profile paths or in Voie du Mage),
 * or null if none is currently selected.
 */
export function getMageCreationRank2Ability(
  char: CharacterSheet,
): { pathId: string; rank: number } | null {
  if (!hasMageCreationBonus(char)) return null;
  const profile = getProfileById(char.profileId);
  const secondaryProfile =
    char.isHybrid && char.secondaryProfileId
      ? getProfileById(char.secondaryProfileId)
      : undefined;
  const allProfilePathIds = [
    ...getProfileAllPoolPathIds(profile),
    ...getProfileAllPoolPathIds(secondaryProfile),
  ];
  const eligiblePathIds = new Set(
    (char.selectedPathIds || []).filter(
      (id) =>
        allProfilePathIds.includes(id) ||
        (id === "voie-du-mage" && canUseVoieDuMage(char)),
    ),
  );
  return (
    (char.acquiredAbilities || []).find(
      (a) => a.rank === 2 && eligiblePathIds.has(a.pathId),
    ) || null
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

