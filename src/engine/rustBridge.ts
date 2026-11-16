import {
  commands,
  type CharacterRecord,
  type ComputedCharacterSheet,
  type IpcError,
  type LevelProgressionStep as BindingLevelProgressionStep,
  type StatCode as BindingStatCode,
} from "../bindings";
import type {
  CharacterSheet,
  ComputedCharacterStats,
  LevelProgressionStep,
  ProfileFamily,
  StatCode,
  WeaponModifierRule,
} from "../types/cof2";

/**
 * Formate une erreur IPC structurée (`IpcError`) en message lisible.
 */
export function formatIpcError(err: IpcError): string {
  if (err.kind === "Cancelled") {
    return "Annulé";
  }
  return err.message;
}

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

function toManualBonusRecord(
  partial: Partial<{ [key in BindingStatCode]: number }> | undefined,
): Partial<Record<StatCode, number>> {
  const out: Partial<Record<StatCode, number>> = {};
  if (!partial) return out;
  for (const code of ALL_STATS) {
    const val = partial[code];
    if (typeof val === "number" && val !== 0) {
      out[code] = val;
    }
  }
  return out;
}

/**
 * Reconvertit un `CharacterRecord` validé par Rust en `CharacterSheet` frontend.
 */
export function fromCharacterRecord(record: CharacterRecord): CharacterSheet {
  return {
    id: record.id,
    version: record.version ?? "1.0.0",
    updatedAt: record.updatedAt ?? "",
    creationCompleted: record.creationCompleted ?? true,
    name: record.name,
    playerName: record.playerName ?? "",
    sex: record.sex ?? "",
    age: record.age ?? "",
    height: record.height ?? "",
    weight: record.weight ?? "",
    physicalTraits: record.physicalTraits ?? "",
    languages: record.languages ?? [],
    secondaryTalents: record.secondaryTalents ?? [],
    background: record.background ?? "",
    ideal: record.ideal ?? "",
    flaw: record.flaw ?? "",
    notes: record.notes ?? "",
    deity: record.deity ?? undefined,
    peopleId: record.peopleId,
    profileId: record.profileId,
    profileFamily: (record.profileFamily ?? undefined) as ProfileFamily | undefined,
    isHybrid: record.isHybrid ?? undefined,
    secondaryProfileId: record.secondaryProfileId ?? undefined,
    level: record.level,
    baseStats: toFullStatRecord(record.baseStats),
    statArrayPreset: record.statArrayPreset ?? undefined,
    racialStatChoices: (record.racialStatChoices ?? []) as StatCode[],
    racialStatModifiers: toFullStatRecord(record.racialStatModifiers),
    manualStatBonuses: toManualBonusRecord(record.manualStatBonuses),
    selectedPathIds: record.selectedPathIds ?? [],
    acquiredAbilities: record.acquiredAbilities ?? [],
    pathRankChoices: Object.fromEntries(
      Object.entries(record.pathRankChoices ?? {}).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    externalAbilityChoices: Object.fromEntries(
      Object.entries(record.externalAbilityChoices ?? {}).filter(
        (entry): entry is [string, { pathId: string; rank: number }] =>
          Boolean(entry[1]),
      ),
    ),
    humanDiversity: record.humanDiversity
      ? {
          originId: record.humanDiversity.originId,
          customOriginName: record.humanDiversity.customOriginName ?? undefined,
          customDomain1: record.humanDiversity.customDomain1 ?? undefined,
          customDomain2: record.humanDiversity.customDomain2 ?? undefined,
          replacedDomainIndex:
            record.humanDiversity.replacedDomainIndex === 0 ||
            record.humanDiversity.replacedDomainIndex === 1
              ? record.humanDiversity.replacedDomainIndex
              : undefined,
          replacementTrade: record.humanDiversity.replacementTrade ?? undefined,
        }
      : undefined,
    progressionHistory: (record.progressionHistory ?? []).map((step) => ({
      level: step.level,
      hpGain: step.hpGain,
      abilitiesLearned: step.abilitiesLearned ?? [],
      selectedPathIds: step.selectedPathIds ?? [],
      pathRankChoices: Object.fromEntries(
        Object.entries(step.pathRankChoices ?? {}).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      ),
      manualStatBonuses: toManualBonusRecord(step.manualStatBonuses),
      languagesLearned: step.languagesLearned ?? [],
      secondaryTalentsLearned: step.secondaryTalentsLearned ?? [],
      timestamp: step.timestamp ?? "",
    })),
    currentHp: record.currentHp,
    maxHpBonus: record.maxHpBonus ?? 0,
    levelUpHpGains: record.levelUpHpGains ?? [],
    halfHpPending: record.halfHpPending ?? undefined,
    currentDr: record.currentDr,
    currentPc: record.currentPc,
    currentPm: record.currentPm,
    equippedArmorId: record.equippedArmorId ?? undefined,
    equippedShieldId: record.equippedShieldId ?? undefined,
    weapons: (record.weapons ?? []).map((w) => ({
      id: w.id,
      weaponRefId: w.weaponRefId,
      name: w.name,
      damage: w.damage,
      range: w.range,
      category: w.category === "distance" ? "distance" : "contact",
      bonusAttack: w.bonusAttack ?? 0,
      bonusDamage: w.bonusDamage ?? 0,
      requiresTwoHands: w.requiresTwoHands ?? false,
      attackStatUsed: w.attackStatUsed ?? undefined,
      attackStatSource: w.attackStatSource ?? undefined,
    })),
    inventory: (record.inventory ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      notes: item.notes ?? undefined,
    })),
    coins: record.coins ?? { pa: 0, pc: 0, po: 0 },
  };
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
    companions: sheet.companions ?? [],
    computedWeapons: sheet.computedWeapons ?? [],
  };
}

/**
 * Calcule les statistiques dérivées exclusivement via le moteur Rust (`cof2-core`).
 */
export async function computeSheetAsync(
  char: CharacterSheet,
): Promise<ComputedCharacterStats> {
  const res = await commands.computeCharacter(toCharacterRecord(char));
  if (res.status === "ok") {
    return fromComputedSheet(res.data);
  }
  throw new Error(formatIpcError(res.error));
}

/**
 * Applique une montée de niveau via le moteur Rust (`cof2-core`).
 */
export async function applyLevelUpAsync(
  char: CharacterSheet,
  step: LevelProgressionStep,
): Promise<CharacterSheet> {
  const res = await commands.applyLevelUpCharacter(
    toCharacterRecord(char),
    step as BindingLevelProgressionStep,
  );
  if (res.status === "ok") {
    return fromCharacterRecord(res.data.record);
  }
  throw new Error(formatIpcError(res.error));
}

/**
 * Rétrograde un personnage à un niveau antérieur via le moteur Rust (`cof2-core`).
 */
export async function rollbackLevelAsync(
  char: CharacterSheet,
  targetLevel: number,
): Promise<CharacterSheet> {
  const res = await commands.rollbackCharacterLevel(
    toCharacterRecord(char),
    targetLevel,
  );
  if (res.status === "ok") {
    return fromCharacterRecord(res.data.record);
  }
  throw new Error(formatIpcError(res.error));
}
