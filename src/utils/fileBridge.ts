import { CharacterSheet } from '../types/cof2';
import { validateAndMigrateCharacter } from './characterValidation';

declare global {
  interface Window {
    electronAPI?: {
      saveCharacter: (charData: CharacterSheet, defaultFilename?: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      loadCharacter: () => Promise<{ success: boolean; data?: CharacterSheet; filePath?: string; canceled?: boolean; error?: string }>;
      exportPdf: (defaultFilename?: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
      onMenuSave?: (callback: () => void) => () => void;
      onMenuLoad?: (callback: () => void) => () => void;
      onMenuPdf?: (callback: () => void) => () => void;
      isElectron?: boolean;
    };
  }
}

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export async function saveCharacterFile(char: CharacterSheet): Promise<{ success: boolean; message?: string }> {
  const filename = `${(char.name || 'personnage').replace(/[^a-zA-Z0-9_-]/g, '_')}_niv${char.level || 1}.cof2`;

  if (isElectron && window.electronAPI) {
    const res = await window.electronAPI.saveCharacter(char, filename);
    if (res.canceled) return { success: false, message: 'Annulé' };
    if (!res.success) return { success: false, message: res.error || 'Erreur lors de la sauvegarde' };
    return { success: true, message: `Sauvegardé avec succès dans ${res.filePath}` };
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
    return { success: false, message: err.message || 'Erreur de téléchargement' };
  }
}

export async function loadCharacterFile(): Promise<{ success: boolean; character?: CharacterSheet; message?: string }> {
  if (isElectron && window.electronAPI) {
    const res = await window.electronAPI.loadCharacter();
    if (res.canceled) return { success: false, message: 'Annulé' };
    if (!res.success || !res.data) return { success: false, message: res.error || 'Erreur lors du chargement' };
    const validated = validateAndMigrateCharacter(res.data);
    return { success: true, character: validated.character };
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
      } catch (err: any) {
        resolve({ success: false, message: 'Fichier invalide ou corrompu' });
      }
    };
    input.click();
  });
}

export async function triggerPrintOrExportPdf(char: CharacterSheet): Promise<{ success: boolean; message?: string }> {
  const filename = `Fiche_${(char.name || 'personnage').replace(/[^a-zA-Z0-9_-]/g, '_')}_Niv${char.level || 1}.pdf`;

  if (isElectron && window.electronAPI) {
    const res = await window.electronAPI.exportPdf(filename);
    if (res.canceled) return { success: false, message: 'Export annulé' };
    if (!res.success) return { success: false, message: res.error || 'Erreur lors de l\'export PDF' };
    return { success: true, message: `PDF exporté avec succès dans ${res.filePath}` };
  }

  // Browser standard print
  window.print();
  return { success: true, message: 'Impression lancée' };
}

