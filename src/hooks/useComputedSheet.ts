import { useEffect, useMemo, useRef, useState } from "react";
import { computeSheetAsync } from "../engine/rustBridge";
import type { CharacterSheet, ComputedCharacterStats } from "../types/cof2";

function getMechanicalFingerprint(c: CharacterSheet): string {
  return JSON.stringify({
    peopleId: c.peopleId,
    profileId: c.profileId,
    profileFamily: c.profileFamily,
    isHybrid: c.isHybrid,
    secondaryProfileId: c.secondaryProfileId,
    level: c.level,
    baseStats: c.baseStats,
    statArrayPreset: c.statArrayPreset,
    racialStatChoices: c.racialStatChoices,
    racialStatModifiers: c.racialStatModifiers,
    manualStatBonuses: c.manualStatBonuses,
    selectedPathIds: c.selectedPathIds,
    acquiredAbilities: c.acquiredAbilities,
    pathRankChoices: c.pathRankChoices,
    externalAbilityChoices: c.externalAbilityChoices,
    humanDiversity: c.humanDiversity,
    maxHpBonus: c.maxHpBonus,
    levelUpHpGains: c.levelUpHpGains,
    halfHpPending: c.halfHpPending,
    equippedArmorId: c.equippedArmorId,
    equippedShieldId: c.equippedShieldId,
    weapons: c.weapons,
    languages: c.languages,
    secondaryTalents: c.secondaryTalents,
    deity: c.deity,
  });
}

/**
 * Hook React calculant les statistiques dérivées exclusivement via le moteur Rust (`cof2-core`).
 * Ne déclenche un appel IPC que lorsque les champs mécaniques du personnage changent.
 */
export function useComputedSheet(
  character: CharacterSheet,
): ComputedCharacterStats | null {
  const [rustStats, setRustStats] = useState<ComputedCharacterStats | null>(
    null,
  );
  const latestCharacterRef = useRef(character);
  latestCharacterRef.current = character;

  const mechanicalKey = useMemo(
    () => getMechanicalFingerprint(character),
    [character],
  );

  useEffect(() => {
    void mechanicalKey;
    let cancelled = false;
    computeSheetAsync(latestCharacterRef.current)
      .then((computed) => {
        if (!cancelled) {
          setRustStats(computed);
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.error("[useComputedSheet] computeSheetAsync error:", err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mechanicalKey]);

  return useMemo(
    () =>
      rustStats
        ? {
            ...rustStats,
            record: {
              ...character,
              weapons: rustStats.record.weapons,
            },
          }
        : null,
    [rustStats, character],
  );
}
