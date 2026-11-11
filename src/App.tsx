import React, { useState, useEffect, lazy, Suspense } from 'react';
import { CharacterSheet } from './types/cof2';
import { createDefaultCharacter } from './engine/rulesEngine';
import { validateAndMigrateCharacter } from './utils/characterValidation';
import { useCharacterHistory } from './utils/useCharacterHistory';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { CharacterSheetView } from './components/sheet/CharacterSheetView';
import {
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

  const [activeTab, setActiveTab] = useState<'sheet' | 'wizard' | 'pdf'>('sheet');
  const [isLevelUpOpen, setIsLevelUpOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const handleNewCharacter = () => {
    if (window.confirm('Voulez-vous créer un nouveau personnage ? Les données actuelles non sauvegardées sur fichier seront remplacées.')) {
      const fresh = createDefaultCharacter();
      resetCharacter(fresh);
      setActiveTab('wizard');
      showToast('Nouveau personnage initialisé dans l\'Assistant !');
    }
  };

  const handleSave = async () => {
    const res = await saveCharacterFile(character);
    if (res.message) showToast(res.message);
  };

  const handleLoad = async () => {
    const res = await loadCharacterFile();
    if (res.character) {
      resetCharacter(res.character);
      setActiveTab('sheet');
      showToast(`Personnage "${res.character.name}" chargé avec succès !`);
    } else if (res.message && res.message !== 'Annulé') {
      showToast(res.message);
    }
  };

  const handleExportPdf = async () => {
    // Switch to PDF tab preview if not already, then trigger print/export
    setActiveTab('pdf');
    setTimeout(async () => {
      const res = await triggerPrintOrExportPdf(character);
      if (res.message) showToast(res.message);
    }, 150);
  };

  // Register keyboard shortcuts (Cmd/Ctrl + S, O, P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'o' || e.key === 'O') {
          e.preventDefault();
          handleLoad();
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handleExportPdf();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [character]);

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
          setActiveTab={setActiveTab}
          onNewCharacter={handleNewCharacter}
          onSave={handleSave}
          onLoad={handleLoad}
          onExportPdf={handleExportPdf}
          onOpenLevelUp={() => setIsLevelUpOpen(true)}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
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
                onOpenLevelUp={() => setIsLevelUpOpen(true)}
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
      </div>
    </ErrorBoundary>
  );
}
export default App;

