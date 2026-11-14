import React, { useState } from 'react';
import { BookOpen, Plus, X, Sparkles } from 'lucide-react';
import type { LiteracyStatus } from '../../types/cof2';
import {
  OFFICIAL_LANGUAGES,
  SECONDARY_TALENT_EXAMPLES,
  getLiteracyLabel,
} from '../../utils/languageUtils';

interface LanguageSelectorPanelProps {
  automaticLanguages: string[];
  selectedLanguages: string[];
  secondaryTalents: string[];
  bonusLanguageSlots: number;
  usedBonusSlots: number;
  argotienSlotCost: number;
  literacy: LiteracyStatus;
  intNote?: string | null;
  onAddLanguage: (lang: string) => void;
  onRemoveLanguage: (lang: string) => void;
  onAddSecondaryTalent: (talent: string) => void;
  onRemoveSecondaryTalent: (talent: string) => void;
  compact?: boolean;
}

export const LanguageSelectorPanel: React.FC<LanguageSelectorPanelProps> = ({
  automaticLanguages,
  selectedLanguages,
  secondaryTalents,
  bonusLanguageSlots,
  usedBonusSlots,
  argotienSlotCost,
  literacy,
  intNote,
  onAddLanguage,
  onRemoveLanguage,
  onAddSecondaryTalent,
  onRemoveSecondaryTalent,
  compact = false,
}) => {
  const [customLang, setCustomLang] = useState('');
  const [customTalent, setCustomTalent] = useState('');

  const remainingSlots = bonusLanguageSlots - usedBonusSlots;
  const isOverLimit = remainingSlots < 0;

  const literacyBadgeClass =
    literacy === 'literate'
      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/70'
      : literacy === 'hesitant'
        ? 'bg-amber-950/60 text-amber-300 border-amber-800/70'
        : 'bg-red-950/60 text-red-300 border-red-800/70';

  const handleAddCustomLang = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customLang.trim();
    if (!trimmed) return;
    onAddLanguage(trimmed);
    setCustomLang('');
  };

  const handleAddCustomTalent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customTalent.trim();
    if (!trimmed) return;
    onAddSecondaryTalent(trimmed);
    setCustomTalent('');
  };

  return (
    <div className={`bg-stone-950/70 rounded-lg border border-stone-800 ${compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-stone-200">
            Langues maîtrisées & Alphabétisation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[11px] border ${literacyBadgeClass}`}>
            {getLiteracyLabel(literacy)}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
              isOverLimit
                ? 'bg-red-950/60 text-red-300 border-red-800/70'
                : remainingSlots > 0
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/70'
                  : 'bg-stone-900 text-stone-300 border-stone-700'
            }`}
          >
            Bonus : {usedBonusSlots} / {bonusLanguageSlots}
          </span>
        </div>
      </div>

      {intNote && (
        <p className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-900/40 rounded px-2.5 py-1.5">
          {intNote}
        </p>
      )}

      {/* Automatic languages */}
      <div className="space-y-1">
        <div className="text-[11px] text-stone-400">Langues de départ (automatiques) :</div>
        <div className="flex flex-wrap gap-1.5">
          {automaticLanguages.map(lang => (
            <span
              key={lang}
              className="px-2.5 py-0.5 rounded text-[11px] bg-stone-800 text-amber-200 border border-stone-700"
            >
              {lang}
            </span>
          ))}
        </div>
      </div>

      {/* Selected bonus languages */}
      {selectedLanguages.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] text-stone-400">Langues supplémentaires choisies :</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedLanguages.map(lang => (
              <span
                key={lang}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] bg-amber-950/50 text-amber-200 border border-amber-800/70"
              >
                <span>{lang}</span>
                {lang.toLowerCase() === 'argotien' && argotienSlotCost === 2 && (
                  <span className="text-[10px] text-amber-400">(2 empl.)</span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveLanguage(lang)}
                  className="text-amber-400 hover:text-red-300 transition"
                  title={`Retirer ${lang}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick-add official languages */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-stone-400">
          Ajouter une langue {argotienSlotCost === 2 ? '(Argotien = 2 emplacements hors Voleur/Barde)' : ''} :
        </div>
        <div className="flex flex-wrap gap-1.5">
          {OFFICIAL_LANGUAGES.map(lang => {
            const isAuto = automaticLanguages.some(l => l.toLowerCase() === lang.toLowerCase());
            const isSelected = selectedLanguages.some(l => l.toLowerCase() === lang.toLowerCase());
            const disabled = isAuto || isSelected;
            return (
              <button
                key={lang}
                type="button"
                disabled={disabled}
                onClick={() => onAddLanguage(lang)}
                className={`px-2 py-0.5 rounded text-[11px] transition border ${
                  disabled
                    ? 'bg-stone-900 text-stone-500 border-stone-800 cursor-default opacity-60'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
                }`}
              >
                {lang}
                {lang === 'Argotien' && !isAuto && ` (${argotienSlotCost})`}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleAddCustomLang} className="flex gap-2 pt-1">
          <input
            type="text"
            value={customLang}
            onChange={e => setCustomLang(e.target.value)}
            placeholder="Autre langue (dialecte, langue ancienne...)"
            className="flex-1 bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter</span>
          </button>
        </form>
      </div>

      {/* Optional secondary talents */}
      <div className="pt-2 border-t border-stone-800/80 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-400/80" />
          <span>Talents secondaires (option MJ : 1 langue bonus = 1 talent, +3 aux tests) :</span>
        </div>

        {secondaryTalents.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {secondaryTalents.map(talent => (
              <span
                key={talent}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] bg-indigo-950/50 text-indigo-200 border border-indigo-800/70"
              >
                <span>{talent} (+3)</span>
                <button
                  type="button"
                  onClick={() => onRemoveSecondaryTalent(talent)}
                  className="text-indigo-300 hover:text-red-300 transition"
                  title={`Retirer ${talent}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {SECONDARY_TALENT_EXAMPLES.map(example => {
            const exists = secondaryTalents.some(t => t.toLowerCase() === example.toLowerCase());
            return (
              <button
                key={example}
                type="button"
                disabled={exists}
                onClick={() => onAddSecondaryTalent(example)}
                className={`px-2 py-0.5 rounded text-[10px] transition border ${
                  exists
                    ? 'bg-stone-900 text-stone-500 border-stone-800 cursor-default opacity-60'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-700'
                }`}
              >
                + {example}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleAddCustomTalent} className="flex gap-2">
          <input
            type="text"
            value={customTalent}
            onChange={e => setCustomTalent(e.target.value)}
            placeholder="Autre talent secondaire / loisir..."
            className="flex-1 bg-stone-900 border border-stone-700 rounded px-2.5 py-1 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Talent</span>
          </button>
        </form>
      </div>
    </div>
  );
};
