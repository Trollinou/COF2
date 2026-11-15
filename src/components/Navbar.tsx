import React from 'react';
import {
  FileDown,
  FolderOpen,
  PlusCircle,
  TrendingUp,
  Printer,
  Sparkles,
  BookOpen,
  Undo2,
  Redo2,
} from 'lucide-react';
import { CharacterSheet } from '../types/cof2';
import appLogo from '../assets/icon.png';

interface NavbarProps {
  character: CharacterSheet;
  activeTab: 'wizard' | 'sheet' | 'pdf';
  setActiveTab: (tab: 'wizard' | 'sheet' | 'pdf') => void;
  onNewCharacter: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportPdf?: () => void;
  onOpenLevelUp: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  isCreationCompleted?: boolean;
  isDirty?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  character,
  activeTab,
  setActiveTab,
  onNewCharacter,
  onSave,
  onLoad,
  onOpenLevelUp,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  isCreationCompleted = true,
  isDirty = false,
}) => {
  return (
    <header className="no-print bg-stone-950/95 backdrop-blur border-b border-stone-800/80 sticky top-0 z-50 select-none">
      <div className="max-w-[1800px] mx-auto px-3 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2 lg:gap-4">
          {/* 1. Logo & Brand */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <img
              src={appLogo}
              alt="Le Grimoire d'Osgild"
              className="w-8 h-8 rounded-lg object-cover shadow-md border border-amber-500/40"
            />
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
              <span className="font-serif font-bold text-base text-stone-100 tracking-wide">
                Le Grimoire d'Osgild
              </span>
              <span className="hidden xl:inline-flex ml-1 text-[10px] bg-amber-950 text-amber-400/90 border border-amber-800/50 px-1.5 py-0.5 rounded font-mono font-medium">
                v{__APP_VERSION__}
              </span>
            </div>
          </div>

          {/* 2. Creation & Progression + 3. Undo / Redo + 4. Views */}
          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {/* Creation & Level-Up Group */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={() => setActiveTab('wizard')}
                title="Assistant de Création"
                className={`flex items-center justify-center space-x-1.5 h-8 w-[100px] xl:w-28 px-2 rounded-md text-xs whitespace-nowrap transition-all ${
                  activeTab === 'wizard'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-sm border border-indigo-400/70'
                    : 'bg-indigo-950/70 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/60 shadow-sm font-semibold'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'wizard' ? 'text-white' : 'text-indigo-400'}`} />
                <span>Assistant</span>
              </button>

              <button
                onClick={onOpenLevelUp}
                disabled={!isCreationCompleted}
                title={
                  isCreationCompleted
                    ? 'Faire progresser le personnage au niveau supérieur'
                    : "Validez l'étape 7 (Bilan) de l'Assistant pour débloquer la montée de niveau"
                }
                className="flex items-center justify-center space-x-1.5 h-8 w-[100px] xl:w-28 px-2 rounded-md text-xs font-semibold whitespace-nowrap bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-950/70 transition"
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>Niveau +</span>
                <span className="text-[10px] bg-emerald-900/90 text-emerald-200 px-1 rounded font-mono font-bold">
                  {character.level}
                </span>
              </button>
            </div>

            <div className="h-4 w-px bg-stone-800" />

            {/* Undo / Redo Group */}
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title="Annuler (Ctrl+Z / Cmd+Z)"
                className="flex items-center justify-center w-8 h-8 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title="Rétablir (Ctrl+Y / Cmd+Shift+Z)"
                className="flex items-center justify-center w-8 h-8 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-4 w-px bg-stone-800" />

            {/* Sheet & Printable View Switcher */}
            <nav className="inline-flex items-center bg-stone-900/90 p-1 rounded-lg border border-stone-800/80 shadow-inner whitespace-nowrap shrink-0">
              <button
                onClick={() => isCreationCompleted && setActiveTab('sheet')}
                disabled={!isCreationCompleted}
                title={
                  isCreationCompleted
                    ? 'Fiche de Personnage'
                    : "Validez l'étape 7 (Bilan) de l'Assistant pour accéder à la fiche"
                }
                className={`flex items-center justify-center space-x-1.5 h-7 w-[100px] xl:w-28 px-2 rounded-md text-xs whitespace-nowrap transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === 'sheet'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 font-medium'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Fiche</span>
              </button>

              <button
                onClick={() => isCreationCompleted && setActiveTab('pdf')}
                disabled={!isCreationCompleted}
                title={
                  isCreationCompleted
                    ? 'Fiche Imprimable / Export PDF (Cmd/Ctrl+P)'
                    : "Validez l'étape 7 (Bilan) de l'Assistant pour accéder à l'aperçu PDF"
                }
                className={`flex items-center justify-center space-x-1.5 h-7 w-[100px] xl:w-28 px-2 rounded-md text-xs whitespace-nowrap transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeTab === 'pdf'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 font-medium'
                }`}
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>Aperçu PDF</span>
              </button>
            </nav>
          </div>

          {/* 5. File Operations */}
          <div className="flex items-center space-x-1.5 lg:space-x-2 shrink-0">
            <button
              onClick={onNewCharacter}
              title="Créer un nouveau personnage (Cmd/Ctrl+N)"
              className="flex items-center justify-center space-x-1.5 h-8 w-[100px] xl:w-28 px-2 rounded-md text-xs font-medium whitespace-nowrap bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 hover:border-stone-700 transition"
            >
              <PlusCircle className="w-3.5 h-3.5 shrink-0 text-stone-400" />
              <span>Nouveau</span>
            </button>

            <button
              onClick={onLoad}
              title="Ouvrir un fichier .cof2 existant (Cmd/Ctrl+O)"
              className="flex items-center justify-center space-x-1.5 h-8 w-[100px] xl:w-28 px-2 rounded-md text-xs font-medium whitespace-nowrap bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 hover:border-stone-700 transition"
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-stone-400" />
              <span>Ouvrir</span>
            </button>

            <button
              onClick={onSave}
              title={
                isDirty
                  ? 'Modifications non sauvegardées — Sauvegarder (.cof2) (Cmd/Ctrl+S)'
                  : 'Sauvegarder le personnage (.cof2) (Cmd/Ctrl+S)'
              }
              className={`relative flex items-center justify-center space-x-1.5 h-8 w-[100px] xl:w-28 px-2 rounded-md text-xs whitespace-nowrap transition ${
                isDirty
                  ? 'font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 border border-amber-500/60 shadow-sm'
                  : 'font-medium bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 hover:border-stone-700'
              }`}
            >
              <FileDown
                className={`w-3.5 h-3.5 shrink-0 ${isDirty ? 'text-stone-950' : 'text-stone-400'}`}
              />
              <span>Sauver</span>
              {isDirty && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-amber-100 ring-2 ring-amber-900/60"
                  aria-label="Modifications non sauvegardées"
                />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
