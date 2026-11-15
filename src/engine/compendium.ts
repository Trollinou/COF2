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

