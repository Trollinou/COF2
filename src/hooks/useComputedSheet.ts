import { useEffect, useState } from "react";
import { computeSheetAsync } from "../engine/rustBridge";
import type { CharacterSheet, ComputedCharacterStats } from "../types/cof2";

/**
 * Hook React calculant les statistiques dérivées exclusivement via le moteur Rust (`cof2-core`).
 * Conserve le dernier état calculé pendant les rafraîchissements IPC pour éviter tout clignotement.
 */
export function useComputedSheet(
  character: CharacterSheet,
): ComputedCharacterStats | null {
  const [rustStats, setRustStats] = useState<ComputedCharacterStats | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    computeSheetAsync(character)
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
  }, [character]);

  return rustStats;
}
