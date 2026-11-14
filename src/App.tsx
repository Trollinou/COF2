import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { listen } from '@tauri-apps/api/event';
import { CharacterSheet } from './types/cof2';
import { createDefaultCharacter, createBlankWizardCharacter } from './engine/rulesEngine';
import { validateAndMigrateCharacter } from './utils/characterValidation';
import { useCharacterHistory } from './utils/useCharacterHistory';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { CharacterSheetView } from './components/sheet/CharacterSheetView';
import { UnsavedChangesModal } from './components/modals/UnsavedChangesModal';
import {
  isTauri,
  saveCharacterFile,
  loadCharacterFile,
  triggerPrintOrExportPdf,
} from './utils/fileBridge';

const CharacterWizard = lazy(() =>
  import('./components/wizard/CharacterWizard').then(m => ({ default: m.CharacterWizard }))
);
const PrintableCharacterSheet = lazy(() =>
  import('./components/pdf/PrintableCharacterSheet').then(m => ({ default: m.PrintableCharacterSheet }))
);
const LevelUpModal = lazy(() =>
  import('./components/modals/LevelUpModal').then(m => ({ default: m.LevelUpModal }))
);

const STORAGE_KEY = 'cof2_active_character';

function getInitialCharacter(): CharacterSheet {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const validated = validateAndMigrateCharacter(parsed);
      return validated.character;
    }
  } catch {
    // fallback
  }
  return createDefaultCharacter();
}

export function App() {
  const {
    character,
    setCharacter,
    resetCharacter,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCharacterHistory(getInitialCharacter());

  const [activeTab, setActiveTab] = useState<'sheet' | 'wizard' | 'pdf'>(() =>
    character.creationCompleted === false ? 'wizard' : 'sheet'
  );
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() => JSON.stringify(character));
  const [pendingAction, setPendingAction] = useState<'new' | 'load' | null>(null);
  const [isLevelUpOpen, setIsLevelUpOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isCreationCompleted = character.creationCompleted !== false;
  const isDirty = JSON.stringify(character) !== savedSnapshot;

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [character]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const executeNewCharacter = () => {
    const fresh = createBlankWizardCharacter();
    resetCharacter(fresh);
    setSavedSnapshot(JSON.stringify(fresh));
    setActiveTab('wizard');
    showToast('Nouveau personnage initialisé dans l\'Assistant !');
  };

  const executeLoad = async () => {
    const res = await loadCharacterFile();
    if (res.character) {
      resetCharacter(res.character);
      setSavedSnapshot(JSON.stringify(res.character));
      if (res.character.creationCompleted === false) {
        setActiveTab('wizard');
        showToast(`Personnage "${res.character.name || 'Sans nom'}" repris dans l'Assistant !`);
      } else {
        setActiveTab('sheet');
        showToast(`Personnage "${res.character.name}" chargé avec succès !`);
      }
    } else if (res.message && res.message !== 'Annulé') {
      showToast(res.message);
    }
  };

  const handleNewCharacter = () => {
    if (isDirty) {
      setPendingAction('new');
      return;
    }
    executeNewCharacter();
  };

  const handleSave = async (): Promise<boolean> => {
    const res = await saveCharacterFile(character);
    if (res.success) {
      setSavedSnapshot(JSON.stringify(character));
    }
    if (res.message) showToast(res.message);
    return res.success;
  };

  const handleLoad = async () => {
    if (isDirty) {
      setPendingAction('load');
      return;
    }
    await executeLoad();
  };

  const handleOpenLevelUp = () => {
    if (!isCreationCompleted) {
      showToast("Validez l'étape 7 (Bilan) de l'Assistant pour débloquer la montée de niveau.");
      return;
    }
    setIsLevelUpOpen(true);
  };

  const handleExportPdf = async () => {
    if (!isCreationCompleted) {
      showToast("Validez l'étape 7 (Bilan) de l'Assistant pour accéder à l'impression PDF.");
      return;
    }
    // Switch to PDF tab preview if not already, then trigger print/export
    setActiveTab('pdf');
    setTimeout(async () => {
      const res = await triggerPrintOrExportPdf(character);
      if (res.message) showToast(res.message);
    }, 150);
  };

  const menuHandlersRef = useRef({
    new: handleNewCharacter,
    load: handleLoad,
    save: handleSave,
    print: handleExportPdf,
  });
  menuHandlersRef.current = {
    new: handleNewCharacter,
    load: handleLoad,
    save: handleSave,
    print: handleExportPdf,
  };

  // Listen to native Tauri menu bar events (Nouveau, Charger, Sauvegarder, Imprimer)
  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | undefined;
    let disposed = false;

    listen<'new' | 'load' | 'save' | 'print'>('menu-action', (event) => {
      const handler = menuHandlersRef.current[event.payload];
      if (handler) handler();
    }).then((fn) => {
      if (disposed) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      disposed = true;
      if (unlisten) unlisten();
    };
  }, []);

  // Register keyboard shortcuts in Web mode (Tauri uses native menu accelerators)
  useEffect(() => {
    if (isTauri) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          menuHandlersRef.current.new();
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          menuHandlersRef.current.save();
        } else if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          menuHandlersRef.current.load();
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          menuHandlersRef.current.print();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="no-print fixed bottom-5 right-5 z-50 bg-amber-500 text-stone-950 font-semibold px-4 py-2.5 rounded-lg shadow-xl border border-amber-400 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {toastMessage}
          </div>
        )}

        {/* Navigation Header */}
        <Navbar
          character={character}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (!isCreationCompleted && tab !== 'wizard') {
              showToast("Validez l'étape 7 (Bilan) de l'Assistant pour accéder à la fiche.");
              return;
            }
            setActiveTab(tab);
          }}
          onNewCharacter={handleNewCharacter}
          onSave={handleSave}
          onLoad={handleLoad}
          onExportPdf={handleExportPdf}
          onOpenLevelUp={handleOpenLevelUp}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          isCreationCompleted={isCreationCompleted}
          isDirty={isDirty}
        />

        {/* Main View Area */}
        <main className="flex-1 pb-16">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24 text-stone-400 text-sm font-sans animate-pulse">
                Chargement du module...
              </div>
            }
          >
            {activeTab === 'sheet' && (
              <CharacterSheetView
                character={character}
                onChange={setCharacter}
              />
            )}

            {activeTab === 'wizard' && (
              <CharacterWizard
                key={character.id}
                character={character}
                onChange={setCharacter}
                onFinish={() => {
                  setActiveTab('sheet');
                  showToast('Personnage créé avec succès ! Fiche de jeu prête.');
                }}
              />
            )}

            {activeTab === 'pdf' && (
              <PrintableCharacterSheet
                character={character}
                onPrint={() => triggerPrintOrExportPdf(character)}
              />
            )}
          </Suspense>
        </main>

        {/* Level Up Progression Modal */}
        {isLevelUpOpen && (
          <Suspense fallback={null}>
            <LevelUpModal
              character={character}
              isOpen={isLevelUpOpen}
              onClose={() => setIsLevelUpOpen(false)}
              onApply={(updated) => {
                setCharacter(updated);
                showToast(`Félicitations ! Vous êtes désormais Niveau ${updated.level} !`);
              }}
            />
          </Suspense>
        )}
        {/* Unsaved Changes Confirmation Modal */}
        <UnsavedChangesModal
          isOpen={pendingAction !== null}
          characterName={character.name}
          pendingAction={pendingAction}
          onCancel={() => setPendingAction(null)}
          onDiscardAndContinue={async () => {
            const action = pendingAction;
            setPendingAction(null);
            if (action === 'new') executeNewCharacter();
            if (action === 'load') await executeLoad();
          }}
          onSaveAndContinue={async () => {
            const action = pendingAction;
            const saved = await handleSave();
            if (!saved) return;
            setPendingAction(null);
            if (action === 'new') executeNewCharacter();
            if (action === 'load') await executeLoad();
          }}
        />
      </div>
    </ErrorBoundary>
  );
}
export default App;

