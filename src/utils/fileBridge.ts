import { commands, type IpcError } from "../bindings";
import { fromCharacterRecord, toCharacterRecord } from "../engine/rustBridge";
import type { CharacterSheet } from "../types/cof2";

function formatIpcError(error: IpcError, fallback: string): string {
  if (error.kind === "Cancelled") {
    return "Annulé";
  }
  return error.message || fallback;
}

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Supprime les accents d'une chaîne sans remplacer les lettres accentuées par des caractères spéciaux.
 * Ex: "Éléonore" -> "Eleonore"
 */
export function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Nettoie une chaîne pour l'utiliser comme nom de fichier valide,
 * tout en conservant scrupuleusement les caractères accentués UTF-8,
 * les espaces, tirets et apostrophes.
 */
export function sanitizeFilename(
  name?: string,
  fallback = "personnage",
): string {
  if (!name || !name.trim()) return fallback;

  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/_+/g, "_")
    .replace(/[. ]+$/, "");

  return cleaned || fallback;
}

export async function saveCharacterFile(
  char: CharacterSheet,
): Promise<{ success: boolean; message?: string }> {
  const cleanName = sanitizeFilename(char.name, "personnage");
  const filename = `${cleanName}_niv${char.level || 1}.cof2`;

  try {
    const res = await commands.saveCharacterFile(
      toCharacterRecord(char),
      filename,
    );
    if (res.status === "error") {
      return {
        success: false,
        message: formatIpcError(res.error, "Erreur lors de la sauvegarde"),
      };
    }
    return {
      success: true,
      message: `Sauvegardé avec succès dans ${res.data}`,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: getErrorMessage(err, "Erreur lors de la sauvegarde"),
    };
  }
}

export async function loadCharacterFile(): Promise<{
  success: boolean;
  character?: CharacterSheet;
  message?: string;
}> {
  try {
    const res = await commands.loadCharacterFile();
    if (res.status === "error") {
      return {
        success: false,
        message: formatIpcError(res.error, "Erreur lors du chargement"),
      };
    }
    return { success: true, character: fromCharacterRecord(res.data.record) };
  } catch (err: unknown) {
    return {
      success: false,
      message: getErrorMessage(err, "Erreur lors du chargement"),
    };
  }
}

export async function triggerPrintOrExportPdf(
  _char: CharacterSheet,
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await commands.printCharacterSheet();
    if (res.status === "error") {
      window.print();
    }
    return {
      success: true,
      message: "Boîte de dialogue d'impression ouverte",
    };
  } catch {
    window.print();
    return { success: true, message: "Impression lancée" };
  }
}
