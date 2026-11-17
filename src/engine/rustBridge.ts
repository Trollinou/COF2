import {
  commands,
  type CharacterRecord,
  type ComputedCharacterSheet,
  type IpcError,
  type LevelProgressionStep,
} from "../bindings";

/**
 * Formate une erreur IPC structurée (`IpcError`) en message lisible.
 */
export function formatIpcError(err: IpcError): string {
  if (err.kind === "Cancelled") {
    return "Annulé";
  }
  return err.message;
}

/**
 * Calcule les statistiques dérivées exclusivement via le moteur Rust (`cof2-core`).
 */
export async function computeSheetAsync(
  char: CharacterRecord,
): Promise<ComputedCharacterSheet> {
  const res = await commands.computeCharacter(char);
  if (res.status === "ok") {
    return res.data;
  }
  throw new Error(formatIpcError(res.error));
}

/**
 * Applique une montée de niveau via le moteur Rust (`cof2-core`).
 */
export async function applyLevelUpAsync(
  char: CharacterRecord,
  step: LevelProgressionStep,
): Promise<CharacterRecord> {
  const res = await commands.applyLevelUpCharacter(char, step);
  if (res.status === "ok") {
    return res.data.record;
  }
  throw new Error(formatIpcError(res.error));
}

/**
 * Rétrograde un personnage à un niveau antérieur via le moteur Rust (`cof2-core`).
 */
export async function rollbackLevelAsync(
  char: CharacterRecord,
  targetLevel: number,
): Promise<CharacterRecord> {
  const res = await commands.rollbackCharacterLevel(char, targetLevel);
  if (res.status === "ok") {
    return res.data.record;
  }
  throw new Error(formatIpcError(res.error));
}
