import React from 'react';
import {
  Shield,
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
}) => {
  return (
    <header className="no-print bg-stone-950/95 backdrop-blur border-b border-stone-800/80 sticky top-0 z-50 select-none">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Logo & Brand - Single line, no wrapping, no redundant hero stats */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <img
              src={appLogo}
              alt="COF2 Logo"
              className="w-8 h-8 rounded-lg object-cover shadow-md border border-amber-500/40"
            />
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
              <span className="font-bold text-sm tracking-wider text-amber-400 font-sans">
                COF2
              </span>
              <span className="font-serif font-bold text-base text-stone-100 tracking-wide">
                Compagnon
              </span>
              <span className="ml-1 text-[10px] bg-amber-950 text-amber-400/90 border border-amber-800/50 px-1.5 py-0.5 rounded font-mono font-medium">
                v{__APP_VERSION__}
              </span>
            </div>
          </div>

          {/* Central View Switcher - Harmonious pill tabs with uniform height */}
          <nav className="inline-flex items-center bg-stone-900/90 p-1 rounded-lg border border-stone-800/80 shadow-inner">
            <button
              onClick={() => setActiveTab('sheet')}
              className={`flex items-center space-x-1.5 h-8 px-3.5 rounded-md text-xs transition-all ${
                activeTab === 'sheet'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 font-medium'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Fiche de Personnage</span>
            </button>

            <button
              onClick={() => setActiveTab('wizard')}
              className={`flex items-center space-x-1.5 h-8 px-3.5 rounded-md text-xs transition-all ${
                activeTab === 'wizard'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 font-medium'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Assistant Création</span>
            </button>

            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center space-x-1.5 h-8 px-3.5 rounded-md text-xs transition-all ${
                activeTab === 'pdf'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-stone-100 hover:bg-stone-800/60 font-medium'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Fiche Imprimable / PDF</span>
            </button>
          </nav>

          {/* Global Actions - Unified height h-8 and clear visual hierarchy */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Undo / Redo */}
            <div className="flex items-center space-x-1 mr-1">
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

            <div className="h-4 w-px bg-stone-800 mx-0.5" />

            {/* Level-Up Modal Trigger */}
            <button
              onClick={onOpenLevelUp}
              title="Faire progresser le personnage au niveau supérieur"
              className="flex items-center space-x-1.5 h-8 px-2.5 rounded-md text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-700/60 shadow-sm transition"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Niveau +</span>
              <span className="text-[10px] bg-emerald-900/90 text-emerald-200 px-1 rounded font-mono font-bold">
                {character.level}
              </span>
            </button>

            <div className="h-4 w-px bg-stone-800 mx-0.5" />

            {/* File Operations */}
            <button
              onClick={onNewCharacter}
              title="Créer un nouveau personnage"
              className="flex items-center space-x-1.5 h-8 px-2.5 rounded-md text-xs font-medium bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 hover:border-stone-700 transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-stone-400" />
              <span>Nouveau</span>
            </button>

            <button
              onClick={onLoad}
              title="Ouvrir un fichier .cof2 existant"
              className="flex items-center space-x-1.5 h-8 px-2.5 rounded-md text-xs font-medium bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-stone-100 border border-stone-800 hover:border-stone-700 transition"
            >
              <FolderOpen className="w-3.5 h-3.5 text-stone-400" />
              <span>Ouvrir</span>
            </button>

            <button
              onClick={onSave}
              title="Sauvegarder le personnage (.cof2)"
              className="flex items-center space-x-1.5 h-8 px-3 rounded-md text-xs font-bold bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 border border-amber-500/50 shadow-sm transition"
            >
              <FileDown className="w-3.5 h-3.5 text-stone-950" />
              <span>Sauver</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
