import { useEffect, useMemo, useState } from "react";
import { computeCharacterStats } from "../engine/rulesEngine";
import { computeSheetAsync } from "../engine/rustBridge";
import type { CharacterSheet, ComputedCharacterStats } from "../types/cof2";
import { isTauri } from "../utils/fileBridge";

/**
 * Hook React calculant les statistiques dérivées via le moteur Rust (`cof2-core`) sous Tauri,
 * avec initialisation synchrone pour éviter tout clignotement de rendu.
 */
export function useComputedSheet(
  character: CharacterSheet,
): ComputedCharacterStats {
  const fallbackStats = useMemo(
    () => computeCharacterStats(character),
    [character],
  );
  const [rustStats, setRustStats] = useState<ComputedCharacterStats | null>(
    null,
  );

  useEffect(() => {
    if (!isTauri) {
      return;
    }

    let cancelled = false;
    computeSheetAsync(character).then((computed) => {
      if (!cancelled) {
        setRustStats(computed);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [character]);

  return isTauri && rustStats ? rustStats : fallbackStats;
}
