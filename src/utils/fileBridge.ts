import { CharacterSheet } from '../types/cof2';
import { validateAndMigrateCharacter } from './characterValidation';
import { commands, CharacterRecord } from '../bindings';
import { save, open } from '@tauri-apps/plugin-dialog';

export const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

/**
 * Supprime les accents d'une chaîne sans remplacer les lettres accentuées par des caractères spéciaux.
 * Ex: "Éléonore" -> "Eleonore"
 */
export function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Nettoie une chaîne pour l'utiliser comme nom de fichier valide,
 * tout en conservant scrupuleusement les caractères accentués UTF-8,
 * les espaces, tirets et apostrophes.
 * Ne remplace que les caractères strictement interdits par les systèmes de fichiers (Windows / macOS / Linux).
 */
export function sanitizeFilename(name?: string, fallback = 'personnage'): string {
  if (!name || !name.trim()) return fallback;

  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/_+/g, '_')
    .replace(/[. ]+$/, '');

  return cleaned || fallback;
}

export async function saveCharacterFile(char: CharacterSheet): Promise<{ success: boolean; message?: string }> {
  const cleanName = sanitizeFilename(char.name, 'personnage');
  const filename = `${cleanName}_niv${char.level || 1}.cof2`;

  if (isTauri) {
    try {
      const selectedPath = await save({
        title: 'Sauvegarder le personnage COF2',
        defaultPath: filename,
        filters: [{ name: 'Personnage COF2 (*.cof2, *.json)', extensions: ['cof2', 'json'] }],
      });

      if (!selectedPath) {
        return { success: false, message: 'Annulé' };
      }

      const res = await commands.saveCharacterFile(char as unknown as CharacterRecord, selectedPath);
      if (res.status === 'error') {
        return { success: false, message: res.error || 'Erreur lors de la sauvegarde' };
      }
      return { success: true, message: `Sauvegardé avec succès dans ${selectedPath}` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erreur de dialogue Tauri' };
    }
  }

  // Web Browser fallback
  try {
    const blob = new Blob([JSON.stringify(char, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true, message: `Fichier ${filename} téléchargé` };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Erreur de téléchargement' };
  }
}

export async function loadCharacterFile(): Promise<{ success: boolean; character?: CharacterSheet; message?: string }> {
  if (isTauri) {
    try {
      const selectedPath = await open({
        title: 'Ouvrir un personnage COF2',
        filters: [{ name: 'Personnage COF2 (*.cof2, *.json)', extensions: ['cof2', 'json'] }],
        multiple: false,
        directory: false,
      });

      if (!selectedPath) {
        return { success: false, message: 'Annulé' };
      }

      const filePath = Array.isArray(selectedPath) ? selectedPath[0] : selectedPath;
      const res = await commands.loadCharacterFile(filePath);
      if (res.status === 'error') {
        return { success: false, message: res.error || 'Erreur lors du chargement' };
      }
      const validated = validateAndMigrateCharacter(res.data.record);
      return { success: true, character: validated.character };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erreur lors du chargement' };
    }
  }

  // Web Browser fallback
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.cof2,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve({ success: false, message: 'Aucun fichier sélectionné' });
        return;
      }
      try {
        const text = await file.text();
        const raw = JSON.parse(text);
        const validated = validateAndMigrateCharacter(raw);
        resolve({ success: true, character: validated.character });
      } catch {
        resolve({ success: false, message: 'Fichier invalide ou corrompu' });
      }
    };
    input.click();
  });
}

export async function triggerPrintOrExportPdf(_char: CharacterSheet): Promise<{ success: boolean; message?: string }> {
  if (isTauri) {
    try {
      const res = await commands.printCharacterSheet();
      if (res.status === 'error') {
        console.error('Erreur printCharacterSheet Tauri :', res.error);
        window.print();
      }
      return { success: true, message: 'Boîte de dialogue d\'impression ouverte' };
    } catch (err) {
      console.warn('Fallback vers window.print() :', err);
      window.print();
      return { success: true, message: 'Impression lancée' };
    }
  }

  // Navigateur standard
  window.print();
  return { success: true, message: 'Impression lancée' };
}
