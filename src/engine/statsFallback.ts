import { computeLanguagesInfo } from "../utils/languageUtils";
import { formatHumanDiversityNote, hasHumanDiversityRank1 } from "../utils/humanDiversity";
import type {
  ActionRank,
  CharacterSheet,
  CharacterWeaponInstance,
  CompanionFormula,
  CompanionStatBlock,
  ComputedCharacterStats,
  ProfileFamily,
  RankModifiers,
  ScalingBonusRule,
  StatCode,
  StatSubstitutionRule,
  WeaponModifierRule,
} from "../types/cof2";
import {
  ALL_STAT_CODES,
  PROFILES,
  PROFILES_MAP,
  getArmorById,
  getPathById,
  getPeopleById,
  getProfileById,
  getWeaponById,
  isDomainPath,
} from "./compendium";
import {
  getProfileAllPoolPathIds,
  getReplacedRacialPath,
  hasMageCreationBonus,
  isPathInProfilePool,
  isRacialReplacementPath,
  resolveExternalGrants,
} from "./pathHelpers";
import {
  ARMOR_HIERARCHY,
  checkWeaponProficiency,
  doesWeaponMatchModifierRule,
  isWeaponEligibleForFilter,
} from "./equipmentRules";

export function createEmptyStatRecord(): Record<StatCode, number> {
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

/**
 * Calcule unitairement les modificateurs raciaux pour les 7 caractéristiques à partir du peuple
 * et des choix raciaux du joueur, avec repli optionnel sur des modificateurs stockés.
 */
export function computeRacialStatModifiers(
  peopleId: string,
  racialStatChoices?: StatCode[],
  fallbackModifiers?: Partial<Record<StatCode, number>>,
): Record<StatCode, number> {
  const result = createEmptyStatRecord();
  const people = getPeopleById(peopleId);

  if (!people) {
    if (fallbackModifiers) {
      for (const code of ALL_STAT_CODES) {
        const val = fallbackModifiers[code];
        if (typeof val === "number" && Number.isFinite(val)) {
          result[code] = val;
        }
      }
    }
    return result;
  }

  if (people.stats) {
    for (const [key, val] of Object.entries(people.stats)) {
      if (val && result[key as StatCode] !== undefined) {
        result[key as StatCode] += val;
      }
    }
  }

  if (people.statChoices) {
    people.statChoices.forEach((choice, idx) => {
      const hasExplicitChoicesArray = Array.isArray(racialStatChoices);
      const chosen = racialStatChoices?.[idx];
      const isAny = choice.options.includes("ANY_LOWEST");
      let targetStat: StatCode | undefined;
      if (chosen && (isAny || choice.options.includes(chosen))) {
        targetStat = chosen;
      } else if (!hasExplicitChoicesArray) {
        if (!isAny && choice.options.length > 0) {
          targetStat = choice.options[0] as StatCode;
        } else if (isAny) {
          targetStat = "FOR";
        }
      }
      if (targetStat && result[targetStat] !== undefined) {
        result[targetStat] += choice.value;
      }
    });
  }

  return result;
}

export function computeCharacterStats(
  char: CharacterSheet,
): ComputedCharacterStats {
  const profile = getProfileById(char.profileId) || PROFILES[0];
  const people = getPeopleById(char.peopleId);

  const baseStats = createEmptyStatRecord();
  for (const code of ALL_STAT_CODES) {
    const val = char.baseStats?.[code];
    baseStats[code] = typeof val === "number" && Number.isFinite(val) ? val : 0;
  }

  const racialBonusStats = computeRacialStatModifiers(
    char.peopleId,
    char.racialStatChoices,
    char.racialStatModifiers,
  );

  const manualBonusStats = createEmptyStatRecord();
  if (char.manualStatBonuses) {
    for (const code of ALL_STAT_CODES) {
      const val = char.manualStatBonuses[code];
      if (typeof val === "number" && Number.isFinite(val)) {
        manualBonusStats[code] = val;
      }
    }
  }

  // Build effective list of active abilities (acquired + borrowed via grantExternalAbility)
  const effectiveAbilities: Array<{
    pathId: string;
    rank: number;
    isBorrowed?: boolean;
  }> = [...char.acquiredAbilities];

  resolveExternalGrants(char).forEach((grant) => {
    if (grant.ability) {
      effectiveAbilities.push({ ...grant.ability, isBorrowed: true });
    }
  });

  // Aggregate passive path modifiers from all effective abilities (V2 unified engine)
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
  let pathBonusInitiative = 0;
  let pathBonusHp = 0;
  const pathBonusAttacks = {
    contact: 0,
    distance: 0,
    magique: 0,
  };
  const pathBonusDamage = {
    contact: 0,
    distance: 0,
    magique: 0,
  };
  let pathCritRangeBonus = 0;
  let pathBonusPc = 0;
  let pathBonusDr = 0;
  let pathBonusPm = 0;
  let hasDirectStatPmBonus = false;
  let pathLuckStatReplacement: StatCode | undefined;
  let pathManaStatReplacement: StatCode | undefined;
  const pathSituationalNotes: string[] = [];
  const allStatSubstitutions: Array<
    StatSubstitutionRule & { _pathId?: string; _rank?: number }
  > = [];
  const activeWeaponModifiers: WeaponModifierRule[] = [];
  const collectedBonuses: Array<{
    pathId: string;
    rank: number;
    bonus: ScalingBonusRule;
  }> = [];

  // Apply racial size bonuses & notes (e.g. Farfadet, Fée)
  if (people?.equipmentRules?.sizeDefenseBonus) {
    pathBonusDefense += people.equipmentRules.sizeDefenseBonus;
  }
  if (people?.equipmentRules?.sizeNotes) {
    people.equipmentRules.sizeNotes.forEach((n) => {
      if (!pathSituationalNotes.includes(n)) pathSituationalNotes.push(n);
    });
  }

  if (hasHumanDiversityRank1(char)) {
    const diversityNote =
      formatHumanDiversityNote(char.humanDiversity) ||
      'Diversité : +1 PC et +3 dans deux domaines d\'origine';
    if (!pathSituationalNotes.includes(diversityNote)) {
      pathSituationalNotes.push(diversityNote);
    }
  }

  const collectModifiersFromBlock = (
    mod: RankModifiers,
    pathId: string,
    rank: number,
  ) => {
    // 1. Resolve choiceOptions recursively if present
    if (mod.choiceOptions && mod.choiceOptions.length > 0) {
      const choiceKey = `${pathId}_${rank}`;
      const chosenId = char.pathRankChoices?.[choiceKey];
      const selectedOption =
        mod.choiceOptions.find((o) => o.id === chosenId) ||
        mod.choiceOptions[0];
      if (selectedOption && selectedOption.modifiers) {
        collectModifiersFromBlock(selectedOption.modifiers, pathId, rank);
      }
    }

    // 2. Direct characteristic bonuses
    if (mod.stats) {
      for (const [s, val] of Object.entries(mod.stats)) {
        if (val) pathBonusStats[s as StatCode] += val;
      }
    }

    // 3. Collect scaling & flat bonuses for Pass 2 (after finalStats are known)
    if (mod.bonuses) {
      mod.bonuses.forEach((b) => {
        collectedBonuses.push({ pathId, rank, bonus: b });
      });
    }

    // 4. Stat substitutions
    if (mod.statSubstitutions) {
      mod.statSubstitutions.forEach((sub) => {
        allStatSubstitutions.push({ ...sub, _pathId: pathId, _rank: rank });
      });
    }

    // 5. Weapon modifiers
    if (mod.weaponModifiers) {
      activeWeaponModifiers.push(...mod.weaponModifiers);
    }

    // 6. Resource stat replacements
    if (mod.luckStatReplacement) {
      pathLuckStatReplacement = mod.luckStatReplacement;
    }
    if (mod.manaStatReplacement) {
      pathManaStatReplacement = mod.manaStatReplacement;
    }

    // 7. Situational notes
    if (mod.situationalNotes) {
      mod.situationalNotes.forEach((n) => {
        if (!pathSituationalNotes.includes(n)) pathSituationalNotes.push(n);
      });
    }
  };

  // Pass 1: Collect modifiers and apply characteristic bonuses
  effectiveAbilities.forEach((acq) => {
    const pth = getPathById(acq.pathId);
    if (!pth) return;
    const rankData = pth.ranks.find((r) => r.rank === acq.rank);
    if (!rankData || !rankData.modifiers) return;
    collectModifiersFromBlock(rankData.modifiers, acq.pathId, acq.rank);
  });

  // Compute otherBonusStats (path bonuses + manual bonuses) and reconstruct final stats from unit components
  const otherBonusStats = createEmptyStatRecord();
  const stats = createEmptyStatRecord();
  for (const code of ALL_STAT_CODES) {
    otherBonusStats[code] = pathBonusStats[code] + manualBonusStats[code];
    stats[code] = baseStats[code] + racialBonusStats[code] + otherBonusStats[code];
  }

  const level = Math.max(1, char.level || 1);
  const bab = Math.min(level, 10);

  // Armor & Shield lookup
  const armor = char.equippedArmorId
    ? getArmorById(char.equippedArmorId)
    : undefined;
  const shield = char.equippedShieldId
    ? getArmorById(char.equippedShieldId)
    : undefined;

  const nonStackingBest = new Map<string, number>();

  // Helper to evaluate a ScalingBonusRule now that finalStats, level, armor, and shield are known
  const evaluateBonusRule = (
    b: ScalingBonusRule,
    pathId: string,
    rank: number,
  ) => {
    if (b.condition === "noArmor" && armor && armor.def > 0) return;
    if (b.condition === "noShield" && shield) return;
    if (b.condition === "lightArmor" && armor && armor.def > 3) return;

    const pthObj = getPathById(pathId);
    const isPrestige = pthObj?.type === "prestige";
    const ranksForPath = effectiveAbilities
      .filter((a) => a.pathId === pathId)
      .map((a) => a.rank);
    const maxRankInPath =
      ranksForPath.length > 0 ? Math.max(...ranksForPath) : rank;
    const countInPath = ranksForPath.length || 1;
    const effectiveRankCount = isPrestige ? countInPath : maxRankInPath;

    let val = b.flat || 0;

    if (b.atRank) {
      const thresholds = Object.keys(b.atRank)
        .map(Number)
        .filter((t) => !isNaN(t) && t <= maxRankInPath)
        .sort((a, z) => z - a);
      if (thresholds.length > 0) {
        val = b.atRank[String(thresholds[0])];
      }
    }

    if (b.atLevel) {
      const thresholds = Object.keys(b.atLevel)
        .map(Number)
        .filter((t) => !isNaN(t) && t <= level)
        .sort((a, z) => z - a);
      if (thresholds.length > 0) {
        val = b.atLevel[String(thresholds[0])];
      }
    }

    if (b.perRank) {
      val += b.perRank * effectiveRankCount;
    }

    if (b.perLevel) {
      val += b.perLevel * level;
    }

    if (b.stat) {
      const statVal = stats[b.stat] ?? 0;
      val += b.target === "defense" ? Math.max(0, statVal) : statVal;
    }

    if (b.cap !== undefined) {
      if (b.cap === "rank") {
        val = Math.min(val, effectiveRankCount);
      } else if (typeof b.cap === "number") {
        val = Math.min(val, b.cap);
      }
    }

    if (b.nonStackingGroup) {
      const groupKey = `${b.target}:${b.nonStackingGroup}`;
      const prev = nonStackingBest.get(groupKey);
      if (prev !== undefined) {
        if (val <= prev) return;
        nonStackingBest.set(groupKey, val);
        val -= prev;
      } else {
        nonStackingBest.set(groupKey, val);
      }
    }

    switch (b.target) {
      case "defense":
        pathBonusDefense += val;
        break;
      case "hp":
        pathBonusHp += val;
        break;
      case "initiative":
        pathBonusInitiative += val;
        break;
      case "pc":
        pathBonusPc += val;
        break;
      case "dr":
        pathBonusDr += val;
        break;
      case "pm":
        pathBonusPm += val;
        if (b.stat) hasDirectStatPmBonus = true;
        break;
      case "damageReduction": {
        if (val > 0) {
          const rdNote = `RD ${val}${b.note ? ` (${b.note})` : ""}`;
          if (!pathSituationalNotes.includes(rdNote)) {
            pathSituationalNotes.push(rdNote);
          }
        }
        break;
      }
      case "atkContact":
        pathBonusAttacks.contact += val;
        break;
      case "atkDistance":
        pathBonusAttacks.distance += val;
        break;
      case "atkMagic":
        pathBonusAttacks.magique += val;
        break;
      case "dmContact":
        pathBonusDamage.contact += val;
        break;
      case "dmDistance":
        pathBonusDamage.distance += val;
        break;
      case "dmMagic":
        pathBonusDamage.magique += val;
        break;
      case "critRange":
        pathCritRangeBonus += val;
        break;
    }
  };

  // Pass 2: Evaluate all collected bonus rules
  collectedBonuses.forEach(({ pathId, rank, bonus }) => {
    evaluateBonusRule(bonus, pathId, rank);
  });

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

  // Evaluate declarative fallbackDefenseBonus when the substitution stat was NOT used (e.g. Voie du pagne R2 Peau de pierre)
  for (const sub of defSubstitutions) {
    if (sub.fallbackDefenseBonus && defenseStat !== sub.replacementStat) {
      evaluateBonusRule(
        {
          target: "defense",
          flat: sub.fallbackDefenseBonus.flat,
          atRank: sub.fallbackDefenseBonus.atRank,
        },
        sub._pathId || "",
        sub._rank || 1,
      );
    }
  }

  const armorDefense = armor ? armor.def : 0;
  const shieldDefense = shield ? shield.def : 0;
  const defense =
    10 + effectiveStatMod + armorDefense + shieldDefense + pathBonusDefense;
  const effectiveAgi = effectiveStatMod;

  if (armor?.notes) {
    const armorNote = `${armor.name} : ${armor.notes}`;
    if (!pathSituationalNotes.includes(armorNote)) {
      pathSituationalNotes.push(armorNote);
    }
  }

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
      const baseW = getWeaponById(w.weaponRefId);
      const isContact = w.category === "contact";
      const defaultStat: StatCode =
        baseW?.attackStat ?? (isContact ? "FOR" : "AGI");
      let bestStat: StatCode = defaultStat;
      let bestSource: string | undefined = baseW?.attackStat
        ? baseW.name
        : undefined;
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

  // Initiative: 10 + PER + pathBonusInitiative
  const initiative = 10 + stats.PER + pathBonusInitiative;

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

  const maxHp = Math.max(
    1,
    baseHp + level * stats.CON + (char.maxHpBonus || 0) + pathBonusHp,
  );

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
  effectiveAbilities.forEach((acq) => {
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
  const maxPm =
    spellCount > 0
      ? Math.max(0, manaBaseStat + spellCount + pathBonusPm)
      : hasDirectStatPmBonus
        ? Math.max(0, pathBonusPm)
        : 0;

  const energyType: "PM" | "PE" = char.profileId === "psionique" ? "PE" : "PM";

  const isHybrid = Boolean(
    char.isHybrid ||
    (char.secondaryProfileId && char.secondaryProfileId !== char.profileId) ||
    char.acquiredAbilities.some((a) => {
      const pth = getPathById(a.pathId);
      return pth && pth.type === "profile" && !isPathInProfilePool(profile, a.pathId);
    }),
  );
  const secProfile = char.secondaryProfileId
    ? getProfileById(char.secondaryProfileId)
    : undefined;
  const secondaryProfileName = secProfile?.name;
  const languagesInfo = computeLanguagesInfo(char, people, stats.INT);

  return {
    baseStats,
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
    activeWeaponModifiers,
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
    racialBonusStats,
    pathBonusStats,
    manualBonusStats,
    otherBonusStats,
    pathBonusDefense,
    pathBonusInitiative,
    pathBonusHp,
    pathBonusAttacks,
    pathBonusDamage,
    pathCritRangeBonus,
    pathBonusPc,
    pathBonusDr,
    pathBonusPm,
    pathSituationalNotes,
    languagesInfo,
  };
}

export interface WeaponAttackInfo {
  atkBonus: number;
  statUsed: StatCode;
  sourceName?: string;
  isSubstituted: boolean;
  dmBonus: string;
  critMin: number;
  critRange: string;
}

export function getWeaponAttackInfo(
  w: CharacterWeaponInstance,
  stats: ComputedCharacterStats,
): WeaponAttackInfo {
  const baseW = getWeaponById(w.weaponRefId);
  const isContact = w.category === "contact";
  const defaultStat: StatCode = isContact ? "FOR" : "AGI";
  const statUsed = w.attackStatUsed || baseW?.attackStat || defaultStat;
  const isSubstituted = statUsed !== defaultStat;
  const sourceName = w.attackStatSource || (baseW?.attackStat ? baseW.name : undefined);

  const matchingRules = (stats.activeWeaponModifiers || []).filter((rule) =>
    doesWeaponMatchModifierRule(w, rule),
  );
  const weaponAtkBonus = matchingRules.reduce(
    (acc, r) => acc + (r.attackBonus || 0),
    0,
  );
  const weaponDmBonus = matchingRules.reduce(
    (acc, r) =>
      acc +
      (r.damageBonus || 0) +
      (r.damageStatBonus ? (stats.finalStats[r.damageStatBonus] ?? 0) : 0),
    0,
  );
  const weaponCritBonus = matchingRules.reduce(
    (acc, r) => acc + (r.critRangeBonus || 0),
    0,
  );

  const statMod = stats.finalStats[statUsed] ?? 0;
  const pathBonus = isContact
    ? stats.pathBonusAttacks.contact
    : stats.pathBonusAttacks.distance;
  const customBonus = w.bonusAttack || 0;
  const atkBonus =
    stats.bab + statMod + pathBonus + customBonus + weaponAtkBonus;

  // Damage bonus
  const pathDmBonus = isContact
    ? stats.pathBonusDamage?.contact || 0
    : stats.pathBonusDamage?.distance || 0;
  const extraDm = (w.bonusDamage || 0) + weaponDmBonus + pathDmBonus;
  let baseDmStatMod = 0;
  if (baseW?.damageStat !== undefined) {
    baseDmStatMod = baseW.damageStat
      ? (stats.finalStats[baseW.damageStat] ?? 0)
      : 0;
  } else if (isContact) {
    baseDmStatMod = stats.finalStats.FOR ?? 0;
  }
  const totalDmMod = baseDmStatMod + extraDm;

  let dmBonus = "";
  if (totalDmMod > 0) {
    dmBonus = `+ ${totalDmMod}`;
  } else if (totalDmMod < 0) {
    dmBonus = `- ${Math.abs(totalDmMod)}`;
  }

  // Critical range calculation
  const baseCritMin = baseW?.critMin ?? 20;
  const critMin = Math.max(
    2,
    baseCritMin - (stats.pathCritRangeBonus || 0) - weaponCritBonus,
  );
  const critRange = critMin < 20 ? `${critMin}-20` : "20";

  return {
    atkBonus,
    statUsed,
    sourceName,
    isSubstituted,
    dmBonus,
    critMin,
    critRange,
  };
}

export function evaluateCompanionFormula(
  formula: CompanionFormula | undefined,
  level: number,
  maxRankInPath: number,
  stats: ComputedCharacterStats,
  profileRank5Count = 1,
): number | null {
  if (!formula) return null;
  let total = formula.base || 0;
  if (formula.perRank) total += formula.perRank * maxRankInPath;
  if (formula.perLevel) total += formula.perLevel * level;
  if (formula.perProfileRank5) total += formula.perProfileRank5 * profileRank5Count;
  if (formula.stat && stats.finalStats[formula.stat] !== undefined) {
    total += stats.finalStats[formula.stat];
  }
  if (formula.heroStatRef) {
    if (formula.heroStatRef === "initiative") total += stats.initiative;
    else if (formula.heroStatRef === "magicAttack")
      total += stats.attacks.magique;
    else if (formula.heroStatRef === "contactAttack")
      total += stats.attacks.contact;
    else if (formula.heroStatRef === "distanceAttack")
      total += stats.attacks.distance;
    else if (formula.heroStatRef === "defense") total += stats.defense;
  }
  if (formula.offset) total += formula.offset;
  return total;
}

export interface ResolvedCompanionStats {
  defense?: string;
  hp?: string;
  initiative?: string;
  attacks: Array<{
    name: string;
    attackBonus?: string;
    damage: string;
  }>;
}

export function resolveCompanionStats(
  companion: CompanionStatBlock,
  char: CharacterSheet,
  stats: ComputedCharacterStats,
  pathId?: string,
): ResolvedCompanionStats {
  const level = Math.max(1, char.level || 1);
  const ranksInPath = pathId
    ? char.acquiredAbilities
        .filter((a) => a.pathId === pathId)
        .map((a) => a.rank)
    : [];
  const maxRankInPath = ranksInPath.length > 0 ? Math.max(...ranksInPath) : 1;

  const ownerProfile =
    (pathId
      ? Array.from(PROFILES_MAP.values()).find((p) => p.paths.includes(pathId))
      : undefined) || getProfileById(char.profileId);
  const profilePaths = ownerProfile?.paths || [];
  const profileRank5Count = Math.max(
    1,
    profilePaths.filter((pid) =>
      char.acquiredAbilities.some((a) => a.pathId === pid && a.rank >= 5),
    ).length,
  );

  const defVal = evaluateCompanionFormula(
    companion.defenseFormula,
    level,
    maxRankInPath,
    stats,
    profileRank5Count,
  );
  const hpVal = evaluateCompanionFormula(
    companion.hpFormula,
    level,
    maxRankInPath,
    stats,
    profileRank5Count,
  );
  const initVal = evaluateCompanionFormula(
    companion.initiativeFormula,
    level,
    maxRankInPath,
    stats,
    profileRank5Count,
  );

  return {
    defense: defVal !== null ? String(defVal) : companion.defense,
    hp: hpVal !== null ? String(hpVal) : companion.hp,
    initiative: initVal !== null ? String(initVal) : companion.initiative,
    attacks: (companion.attacks || []).map((atk) => {
      const atkVal = evaluateCompanionFormula(
        atk.attackFormula,
        level,
        maxRankInPath,
        stats,
        profileRank5Count,
      );
      return {
        name: atk.name,
        attackBonus:
          atkVal !== null
            ? atkVal >= 0
              ? `+${atkVal}`
              : String(atkVal)
            : atk.attackBonus,
        damage: atk.damage,
      };
    }),
  };
}

/**
 * Returns the exact racial path ID for a given race.
 * For Halfelin, Nain, Elfe, Gnome, Demi-orc, Humain, etc.: always their dedicated racialPathId.
 * For Demi-elfe: returns the chosen cultural path among the 3 options.
 */
