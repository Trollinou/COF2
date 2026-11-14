import React from 'react';
import { AlertTriangle, FileDown, Trash2, X } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  characterName: string;
  pendingAction: 'new' | 'load' | null;
  onSaveAndContinue: () => void;
  onDiscardAndContinue: () => void;
  onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  characterName,
  pendingAction,
  onSaveAndContinue,
  onDiscardAndContinue,
  onCancel,
}) => {
  if (!isOpen || !pendingAction) return null;

  const displayName = characterName.trim() || 'Personnage sans nom';
  const actionLabel =
    pendingAction === 'new'
      ? 'créer un nouveau personnage'
      : 'charger un autre personnage';

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-stone-900 border border-stone-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-stone-950/80 border-b border-stone-800">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="font-serif font-bold text-base text-stone-100">
              Modifications non sauvegardées
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-200 p-1 rounded-md hover:bg-stone-800 transition"
            title="Annuler"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-2 text-sm text-stone-300">
          <p>
            Le personnage{' '}
            <span className="font-semibold text-amber-300">{displayName}</span>{' '}
            contient des modifications non sauvegardées sur fichier.
          </p>
          <p className="text-stone-400 text-xs">
            Voulez-vous les sauvegarder avant de {actionLabel} ?
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-3.5 bg-stone-950/60 border-t border-stone-800">
          <button
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
          >
            Annuler
          </button>
          <button
            onClick={onDiscardAndContinue}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-red-950/70 hover:bg-red-900/90 text-red-200 border border-red-800/60 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Ne pas sauvegarder</span>
          </button>
          <button
            onClick={onSaveAndContinue}
            className="flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 shadow transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Sauvegarder</span>
          </button>
        </div>
      </div>
    </div>
  );
};
