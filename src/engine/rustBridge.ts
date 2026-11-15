import {
  commands,
  type CharacterRecord,
  type ComputedCharacterSheet,
  type StatCode as BindingStatCode,
} from "../bindings";
import type {
  CharacterSheet,
  ComputedCharacterStats,
  StatCode,
  WeaponModifierRule,
} from "../types/cof2";
import { isTauri } from "../utils/fileBridge";
import { computeCharacterStats } from "./rulesEngine";

const ALL_STATS: StatCode[] = ["FOR", "AGI", "CON", "PER", "INT", "VOL", "CHA"];

function toFullStatRecord(
  partial: Partial<{ [key in BindingStatCode]: number }> | undefined,
): Record<StatCode, number> {
  const out = {} as Record<StatCode, number>;
  for (const code of ALL_STATS) {
    out[code] = partial?.[code] ?? 0;
  }
  return out;
}

/**
 * Convertit une fiche frontend `CharacterSheet` en `CharacterRecord` compatible IPC Rust.
 */
export function toCharacterRecord(char: CharacterSheet): CharacterRecord {
  return {
    id: char.id,
    version: char.version,
    updatedAt: char.updatedAt,
    creationCompleted: char.creationCompleted ?? null,
    name: char.name,
    playerName: char.playerName,
    sex: char.sex,
    age: char.age,
    height: char.height,
    weight: char.weight,
    physicalTraits: char.physicalTraits,
    languages: char.languages,
    secondaryTalents: char.secondaryTalents,
    background: char.background,
    ideal: char.ideal,
    flaw: char.flaw,
    notes: char.notes,
    deity: char.deity ?? null,
    peopleId: char.peopleId,
    profileId: char.profileId,
    profileFamily: char.profileFamily ?? null,
    isHybrid: char.isHybrid ?? null,
    secondaryProfileId: char.secondaryProfileId ?? null,
    level: char.level,
    baseStats: char.baseStats,
    statArrayPreset: char.statArrayPreset ?? null,
    racialStatChoices: char.racialStatChoices,
    racialStatModifiers: char.racialStatModifiers,
    manualStatBonuses: char.manualStatBonuses,
    selectedPathIds: char.selectedPathIds,
    acquiredAbilities: char.acquiredAbilities,
    pathRankChoices: char.pathRankChoices,
    externalAbilityChoices: char.externalAbilityChoices,
    humanDiversity: char.humanDiversity ?? null,
    progressionHistory: char.progressionHistory ?? [],
    currentHp: char.currentHp,
    maxHpBonus: char.maxHpBonus,
    levelUpHpGains: char.levelUpHpGains,
    halfHpPending: char.halfHpPending ?? null,
    currentDr: char.currentDr,
    currentPc: char.currentPc,
    currentPm: char.currentPm,
    equippedArmorId: char.equippedArmorId ?? null,
    equippedShieldId: char.equippedShieldId ?? null,
    weapons: char.weapons.map((w) => ({
      ...w,
      attackStatUsed: w.attackStatUsed ?? null,
      attackStatSource: w.attackStatSource ?? null,
    })),
    inventory: char.inventory.map((item) => ({
      ...item,
      notes: item.notes ?? null,
    })),
    coins: char.coins,
  };
}

/**
 * Adapte le résultat `ComputedCharacterSheet` retourné par `cof2-core` vers `ComputedCharacterStats`.
 */
export function fromComputedSheet(
  sheet: ComputedCharacterSheet,
): ComputedCharacterStats {
  return {
    baseStats: toFullStatRecord(sheet.baseStats),
    finalStats: toFullStatRecord(sheet.finalStats),
    bab: sheet.bab,
    attacks: sheet.attacks,
    initiative: sheet.initiative,
    maxHp: sheet.maxHp,
    maxDr: sheet.maxDr,
    drDice: sheet.drDice,
    maxPc: sheet.maxPc,
    maxPm: sheet.maxPm,
    energyType: sheet.energyType === "PE" ? "PE" : "PM",
    effectiveFamily: sheet.effectiveFamily,
    isHybrid: sheet.isHybrid,
    secondaryProfileName: sheet.secondaryProfileName ?? undefined,
    defense: sheet.defense,
    armorDefense: sheet.armorDefense,
    shieldDefense: sheet.shieldDefense,
    effectiveAgi: sheet.effectiveAgi,
    contactAttackStat: sheet.contactAttackStat,
    contactAttackStatSource: sheet.contactAttackStatSource ?? undefined,
    distanceAttackStat: sheet.distanceAttackStat,
    distanceAttackStatSource: sheet.distanceAttackStatSource ?? undefined,
    defenseStat: sheet.defenseStat,
    defenseStatSource: sheet.defenseStatSource ?? undefined,
    activeWeaponModifiers: sheet.activeWeaponModifiers.map(
      (wm) =>
        ({
          tags: wm.tags ?? undefined,
          weaponIds: wm.weaponIds ?? undefined,
          category:
            wm.category === "contact" || wm.category === "distance"
              ? wm.category
              : undefined,
          grantProficiency: wm.grantProficiency ?? undefined,
          attackBonus: wm.attackBonus ?? undefined,
          damageBonus: wm.damageBonus ?? undefined,
          damageStatBonus: wm.damageStatBonus ?? undefined,
          critRangeBonus: wm.critRangeBonus ?? undefined,
          sourceName: wm.sourceName ?? undefined,
          note: wm.note ?? undefined,
        }) as WeaponModifierRule,
    ),
    racialBonusStats: toFullStatRecord(sheet.racialBonusStats),
    pathBonusStats: toFullStatRecord(sheet.pathBonusStats),
    manualBonusStats: toFullStatRecord(sheet.manualBonusStats),
    otherBonusStats: toFullStatRecord(sheet.otherBonusStats),
    pathBonusDefense: sheet.pathBonusDefense,
    pathBonusInitiative: sheet.pathBonusInitiative,
    pathBonusHp: sheet.pathBonusHp,
    pathBonusAttacks: sheet.pathBonusAttacks,
    pathBonusDamage: sheet.pathBonusDamage,
    pathCritRangeBonus: sheet.pathCritRangeBonus,
    pathBonusPc: sheet.pathBonusPc,
    pathBonusDr: sheet.pathBonusDr,
    pathBonusPm: sheet.pathBonusPm,
    pathSituationalNotes: sheet.situationalNotes,
    languagesInfo: sheet.languagesInfo,
  };
}

/**
 * Calcule les statistiques dérivées via le moteur Rust sous Tauri,
 * avec repli synchrone TypeScript en mode Web autonome.
 */
export async function computeSheetAsync(
  char: CharacterSheet,
): Promise<ComputedCharacterStats> {
  if (!isTauri) {
    return computeCharacterStats(char);
  }

  try {
    const res = await commands.computeCharacter(toCharacterRecord(char));
    if (res.status === "ok") {
      return fromComputedSheet(res.data);
    }
  } catch {
    // Repli silencieux sur le moteur TS si l'IPC n'est pas disponible
  }

  return computeCharacterStats(char);
}
