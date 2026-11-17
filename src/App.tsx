import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { listen } from '@tauri-apps/api/event';
import { commands } from './bindings';
import { CharacterSheet } from './types/cof2';
import { useCharacterHistory } from './utils/useCharacterHistory';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { CharacterSheetView } from './components/sheet/CharacterSheetView';
import { UnsavedChangesModal } from './components/modals/UnsavedChangesModal';
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

function serializeComparable(c: CharacterSheet): string {
  return JSON.stringify({ ...c, updatedAt: '' });
}

const PLACEHOLDER_CHARACTER: CharacterSheet = {
  id: 'init',
  version: '1.0.0',
  updatedAt: '',
  creationCompleted: true,
  name: '',
  playerName: '',
  sex: '',
  age: '',
  height: '',
  weight: '',
  physicalTraits: '',
  languages: [],
  secondaryTalents: [],
  background: '',
  ideal: '',
  flaw: '',
  notes: '',
  peopleId: 'humain',
  profileId: 'arquebusier',
  level: 1,
  baseStats: { FOR: 0, AGI: 0, CON: 0, PER: 0, INT: 0, VOL: 0, CHA: 0 },
  racialStatChoices: [],
  racialStatModifiers: { FOR: 0, AGI: 0, CON: 0, PER: 0, INT: 0, VOL: 0, CHA: 0 },
  manualStatBonuses: { FOR: 0, AGI: 0, CON: 0, PER: 0, INT: 0, VOL: 0, CHA: 0 },
  selectedPathIds: [],
  acquiredAbilities: [],
  pathRankChoices: {},
  externalAbilityChoices: {},
  progressionHistory: [],
  currentHp: 0,
  maxHpBonus: 0,
  levelUpHpGains: [],
  currentDr: 0,
  currentPc: 0,
  currentPm: 0,
  weapons: [],
  inventory: [],
  coins: { pa: 0, pc: 0, po: 0 },
};

export function App() {
  const {
    character,
    setCharacter,
    resetCharacter,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCharacterHistory(PLACEHOLDER_CHARACTER);

  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'sheet' | 'wizard' | 'pdf'>('sheet');
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [pendingAction, setPendingAction] = useState<'new' | 'load' | null>(null);
  const [isLevelUpOpen, setIsLevelUpOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      let initial: CharacterSheet | null = null;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const res = await commands.validateCharacter(saved);
          if (res.status === 'ok') {
            initial = res.data.character;
          }
        }
      } catch {
        // fallback below
      }
      if (!initial) {
        initial = await commands.createDefaultCharacter();
      }
      if (!cancelled && initial) {
        resetCharacter(initial);
        setSavedSnapshot(serializeComparable(initial));
        setActiveTab(initial.creationCompleted === false ? 'wizard' : 'sheet');
        setIsHydrated(true);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, [resetCharacter]);

  const isCreationCompleted = character.creationCompleted !== false;
  const comparableCharacter = useMemo(() => serializeComparable(character), [character]);
  const isDirty = comparableCharacter !== savedSnapshot;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced auto-save to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(character));
      } catch (e) {
        console.warn('LocalStorage save failed', e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [isHydrated, character]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimerRef.current !== null) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const executeNewCharacter = async () => {
    const fresh = await commands.createBlankWizardCharacter();
    resetCharacter(fresh);
    setSavedSnapshot(serializeComparable(fresh));
    setActiveTab('wizard');
    showToast('Nouveau personnage initialisé dans l\'Assistant !');
  };

  const executeLoad = async () => {
    const res = await loadCharacterFile();
    if (res.character) {
      resetCharacter(res.character);
      setSavedSnapshot(serializeComparable(res.character));
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
      setSavedSnapshot(serializeComparable(character));
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

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-300 flex items-center justify-center font-sans">
        Chargement du Grimoire d'Osgild...
      </div>
    );
  }

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

