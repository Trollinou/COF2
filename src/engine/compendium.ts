import type {
  ArmorItem,
  PathData,
  PeopleData,
  PriestDeity,
  ProfileData,
  StatCode,
  WeaponItem,
} from "../types/cof2";

import peoplesData from "../data/peoples.json";
import profilesData from "../data/profiles.json";
import pathsData from "../data/paths.json";
import equipmentData from "../data/equipment.json";
import tablesData from "../data/tables.json";

export { equipmentData, tablesData };

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
    sacredWeaponIds: p.sacredWeaponIds || [],
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


export const STAT_NAMES: Record<StatCode, string> = {
  FOR: "Force",
  AGI: "Agilité",
  CON: "Constitution",
  PER: "Perception",
  INT: "Intelligence",
  VOL: "Volonté",
  CHA: "Charisme",
};

export const ALL_STAT_CODES: StatCode[] = [
  "FOR",
  "AGI",
  "CON",
  "PER",
  "INT",
  "VOL",
  "CHA",
];

export function getRacialPathId(
  peopleId: string,
  chosenPathId?: string,
): string {
  if (chosenPathId) return chosenPathId;
  const people = getPeopleById(peopleId);
  if (people?.racialPathId) return people.racialPathId;
  if (people?.selectableRacialPaths && people.selectableRacialPaths.length > 0) {
    return people.selectableRacialPaths[0];
  }
  return peopleId === "humain" ? "voie-de-l-humain" : `voie-du-${peopleId}`;
}

export function isRacialReplacementPath(pathId: string): boolean {
  return isDomainPath(pathId) || pathId === "voie-du-mage";
}

export function getReplacedRacialPath(char: {
  peopleId: string;
  selectedPathIds?: string[];
  acquiredAbilities?: Array<{ pathId: string; rank: number }>;
}) {
  const replacementPathId = char.selectedPathIds?.find((id) =>
    isRacialReplacementPath(id),
  );
  if (!replacementPathId) return null;

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

export function getProfileAllPoolPathIds(profile?: ProfileData): string[] {
  if (!profile) return [];
  return Array.from(
    new Set([...profile.paths, ...(profile.optionalPaths || [])]),
  );
}

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

export function isMageProfile(profileId: string): boolean {
  return ["ensorceleur", "forgesort", "magicien", "sorcier"].includes(profileId);
}

export function hasMageCreationBonus(char: {
  profileId: string;
  isHybrid?: boolean | null;
  secondaryProfileId?: string | null;
  profileFamily?: string | null;
}): boolean {
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

export function canUseVoieDuMage(char: {
  profileId: string;
  isHybrid?: boolean | null;
  secondaryProfileId?: string | null;
  profileFamily?: string | null;
}): boolean {
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

export function getMageCreationRank2Ability(char: {
  profileId: string;
  isHybrid?: boolean | null;
  secondaryProfileId?: string | null;
  profileFamily?: string | null;
  selectedPathIds?: string[];
  acquiredAbilities?: Array<{ pathId: string; rank: number }>;
}): { pathId: string; rank: number } | null {
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

function createEmptyStatRecord(): Record<StatCode, number> {
  return {
    FOR: 0,
    AGI: 0,
    CON: 0,
    PER: 0,
    INT: 0,
    VOL: 0,
    CHA: 0,
  };
}

