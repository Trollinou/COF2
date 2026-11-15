import type { CharacterSheet, StatCode } from "../types/cof2";
import {
  ADVENTURER_KIT,
  PEOPLES,
  PROFILES,
  getPathById,
  getPeopleById,
  getProfileById,
  tablesData,
} from "./compendium";
import {
  getDefaultEquipmentForProfile,
  isArmorAllowed,
  sanitizeCharacterEquipment,
} from "./equipmentRules";
import { getRacialPathId } from "./pathHelpers";
import {
  computeCharacterStats,
  computeRacialStatModifiers,
  createEmptyStatRecord,
} from "./statsFallback";

/**
 * Applies racial baseline attributes (traits, age, height, weight, languages, racial path)
 * when a player chooses or switches their race.
 */
export function applyRacialDefaults(
  char: CharacterSheet,
  peopleId: string,
  chosenRacialPathId?: string,
  options?: { preserveEmptyChoices?: boolean },
): CharacterSheet {
  const p = getPeopleById(peopleId);
  if (!p) return char;

  const preserveEmpty = Boolean(options?.preserveEmptyChoices);

  const racialStatChoices: StatCode[] = preserveEmpty
    ? []
    : (p.statChoices || []).map((c) =>
        c.options[0] && c.options[0] !== "ANY_LOWEST"
          ? (c.options[0] as StatCode)
          : "FOR",
      );

  const hasSelectableRacial = Boolean(
    p.selectableRacialPaths && p.selectableRacialPaths.length > 0,
  );
  const racialPathId =
    preserveEmpty && hasSelectableRacial && !chosenRacialPathId
      ? ""
      : getRacialPathId(peopleId, chosenRacialPathId);

  // Keep existing profile paths if any (do not auto-select profile paths when preserveEmpty is true)
  const profile = getProfileById(char.profileId);
  const secProfile =
    char.isHybrid && char.secondaryProfileId
      ? getProfileById(char.secondaryProfileId)
      : undefined;
  const allProfilePaths = profile
    ? [...profile.paths, ...(secProfile ? secProfile.paths : [])]
    : [];

  const currentProfilePaths = char.selectedPathIds.filter((id) =>
    allProfilePaths.includes(id),
  );

  let updatedPaths: string[];
  let updatedAcquired: CharacterSheet["acquiredAbilities"];

  if (preserveEmpty) {
    updatedPaths = racialPathId
      ? [...currentProfilePaths, racialPathId]
      : [...currentProfilePaths];
    updatedAcquired = [
      ...char.acquiredAbilities.filter((a) =>
        currentProfilePaths.includes(a.pathId),
      ),
      ...(racialPathId ? [{ pathId: racialPathId, rank: 1 }] : []),
    ];
  } else {
    const fallbackProfile = profile || PROFILES[0];
    const p1 = currentProfilePaths[0] || fallbackProfile.paths[0];
    const p2 =
      currentProfilePaths[1] ||
      (secProfile
        ? secProfile.paths[0]
        : fallbackProfile.paths.find((id) => id !== p1) ||
          fallbackProfile.paths[1]);
    updatedPaths = [p1, p2, racialPathId];
    updatedAcquired = [
      ...char.acquiredAbilities.filter((a) => a.pathId === p1 || a.pathId === p2),
      { pathId: racialPathId, rank: 1 },
    ];
  }

  let nextArmorId = char.equippedArmorId;
  const preferredArmorId = p.equipmentRules?.preferredArmorId;
  if (
    preferredArmorId &&
    nextArmorId &&
    isArmorAllowed(
      preferredArmorId,
      char.profileId,
      char.secondaryProfileId,
      peopleId,
    )
  ) {
    nextArmorId = preferredArmorId;
  }

  // Sex lock for Lutins (farfadet -> Masculin, fee -> Féminin)
  let nextSex = char.sex;
  if (peopleId === "farfadet") {
    nextSex = "Masculin";
  } else if (peopleId === "fee") {
    nextSex = "Féminin";
  } else if (preserveEmpty && (char.peopleId === "farfadet" || char.peopleId === "fee")) {
    nextSex = "";
  }

  const updatedChar: CharacterSheet = {
    ...char,
    peopleId,
    sex: nextSex,
    equippedArmorId: nextArmorId,
    age: p.startingAge,
    height: preserveEmpty ? "" : p.heightRange,
    weight: preserveEmpty ? "" : p.weightRange,
    physicalTraits: p.physicalTraits,
    languages: [],
    secondaryTalents: [],
    racialStatChoices,
    racialStatModifiers: computeRacialStatModifiers(peopleId, racialStatChoices),
    selectedPathIds: updatedPaths,
    acquiredAbilities: updatedAcquired,
    updatedAt: new Date().toISOString(),
  };

  const sanitized = char.profileId
    ? sanitizeCharacterEquipment(updatedChar)
    : updatedChar;
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
    creationCompleted: true,
    name: "Nouveau Héros",
    playerName: "",
    sex: "Masculin",
    age: defaultPeople.startingAge,
    height: defaultPeople.heightRange,
    weight: defaultPeople.weightRange,
    physicalTraits: defaultPeople.physicalTraits,
    languages: [],
    secondaryTalents: [],
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
    statArrayPreset: "polyvalent",
    racialStatChoices: ["FOR"],
    racialStatModifiers: computeRacialStatModifiers(defaultPeople.id, ["FOR"]),
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
 * Creates a blank character for the creation wizard with no pre-selected choices.
 */
export function createBlankWizardCharacter(): CharacterSheet {
  return {
    id: "char_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
    version: "1.0.0",
    updatedAt: new Date().toISOString(),
    creationCompleted: false,
    name: "",
    playerName: "",
    sex: "",
    age: "",
    height: "",
    weight: "",
    physicalTraits: "",
    languages: [],
    secondaryTalents: [],
    background: "",
    ideal: "",
    flaw: "",
    notes: "",
    peopleId: "",
    profileId: "",
    profileFamily: undefined,
    level: 1,
    baseStats: {
      FOR: 0,
      AGI: 0,
      CON: 0,
      PER: 0,
      INT: 0,
      VOL: 0,
      CHA: 0,
    },
    statArrayPreset: "",
    racialStatChoices: [],
    racialStatModifiers: createEmptyStatRecord(),
    manualStatBonuses: {},
    selectedPathIds: [],
    acquiredAbilities: [],
    deity: undefined,
    pathRankChoices: {},
    currentHp: 0,
    maxHpBonus: 0,
    currentDr: 0,
    currentPc: 0,
    currentPm: 0,
    equippedArmorId: undefined,
    equippedShieldId: undefined,
    weapons: [],
    inventory: ADVENTURER_KIT.map((item, idx) => ({
      id: "inv_" + idx,
      name: item,
      quantity: 1,
    })),
    coins: {
      pa: 0,
      pc: 0,
      po: 0,
    },
  };
}

export const POINT_BUY_BASE_BUDGET = 7;
export const POINT_BUY_MAX_WEAK_STATS = 2;
export const POINT_BUY_MIN_VALUE = -1;
export const POINT_BUY_MAX_VALUE = 4;

export const POINT_BUY_COSTS: Record<number, number> = {
  [-1]: 0,
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 6,
};

export interface PointBuyEvaluation {
  baseBudget: number;
  weakCount: number;
  bonusBudget: number;
  totalBudget: number;
  spent: number;
  remaining: number;
  tooManyWeakStats: boolean;
  hasOutOfRangeValues: boolean;
  isValid: boolean;
  isComplete: boolean;
}

/**
 * Evaluates a set of base stats against the Atlas "Méthode par achat" rules:
 * - Start at 0, base budget = 7 points
 * - Costs: +1 -> 1, +2 -> 2, +3 -> 4, +4 -> 6
 * - Up to 2 weak stats at -1, each granting +1 point to the budget
 */
export function evaluatePointBuyStats(
  baseStats: Record<StatCode, number>,
): PointBuyEvaluation {
  const codes: StatCode[] = ["FOR", "AGI", "CON", "PER", "INT", "VOL", "CHA"];
  let weakCount = 0;
  let spent = 0;
  let hasOutOfRangeValues = false;

  for (const code of codes) {
    const val = typeof baseStats?.[code] === "number" ? baseStats[code] : 0;
    if (val < POINT_BUY_MIN_VALUE || val > POINT_BUY_MAX_VALUE || !Number.isInteger(val)) {
      hasOutOfRangeValues = true;
    } else if (val === -1) {
      weakCount += 1;
    } else {
      spent += POINT_BUY_COSTS[val] ?? 0;
    }
  }

  const tooManyWeakStats = weakCount > POINT_BUY_MAX_WEAK_STATS;
  const bonusBudget = Math.min(weakCount, POINT_BUY_MAX_WEAK_STATS);
  const totalBudget = POINT_BUY_BASE_BUDGET + bonusBudget;
  const remaining = totalBudget - spent;
  const isValid = !hasOutOfRangeValues && !tooManyWeakStats && remaining >= 0;
  const isComplete = isValid && remaining === 0;

  return {
    baseBudget: POINT_BUY_BASE_BUDGET,
    weakCount,
    bonusBudget,
    totalBudget,
    spent,
    remaining,
    tooManyWeakStats,
    hasOutOfRangeValues,
    isValid,
    isComplete,
  };
}

/**
 * Detects which characteristic array preset matches the given base stats,
 * or returns 'achat' if no exact match is found.
 */
export function detectCharacteristicArrayPreset(
  baseStats: Record<StatCode, number>,
): string {
  if (!baseStats) return "polyvalent";
  const currentValues = (["FOR", "AGI", "CON", "PER", "INT", "VOL", "CHA"] as StatCode[])
    .map((s) => (typeof baseStats[s] === "number" ? baseStats[s] : 0))
    .sort((a, b) => b - a);

  for (const arr of tablesData.characteristicArrays) {
    const presetValues = [...arr.values].sort((a, b) => b - a);
    if (
      currentValues.length === presetValues.length &&
      currentValues.every((val, idx) => val === presetValues[idx])
    ) {
      return arr.id;
    }
  }
  return "achat";
}

/**
 * Calculates capability points budget and spending for a character.
 */
