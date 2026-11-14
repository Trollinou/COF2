import React from 'react';
import { CharacterSheet, ComputedCharacterStats } from '../../../types/cof2';
import { CheckCircle2 } from 'lucide-react';
import { LanguageSelectorPanel } from '../../shared/LanguageSelectorPanel';

interface Step7SummaryProps {
  character: CharacterSheet;
  computed: ComputedCharacterStats;
  update: (patch: Partial<CharacterSheet>) => void;
  handleFinishWizard: () => void;
}

export const Step7Summary: React.FC<Step7SummaryProps> = ({
  character,
  computed,
  update,
  handleFinishWizard,
}) => {
  const { languagesInfo } = computed;
  const currentLanguages = character.languages || [];
  const currentTalents = character.secondaryTalents || [];

  const handleAddLanguage = (lang: string) => {
    if (currentLanguages.some(l => l.toLowerCase() === lang.toLowerCase())) return;
    if (languagesInfo.automaticLanguages.some(l => l.toLowerCase() === lang.toLowerCase())) return;
    update({ languages: [...currentLanguages, lang] });
  };

  const handleRemoveLanguage = (lang: string) => {
    update({ languages: currentLanguages.filter(l => l !== lang) });
  };

  const handleAddTalent = (talent: string) => {
    if (currentTalents.some(t => t.toLowerCase() === talent.toLowerCase())) return;
    update({ secondaryTalents: [...currentTalents, talent] });
  };

  const handleRemoveTalent = (talent: string) => {
    update({ secondaryTalents: currentTalents.filter(t => t !== talent) });
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h3 className="font-serif font-bold text-lg text-amber-200">
          Étape 7 : Bilan & Finalisation du Héros
        </h3>
        <p className="text-xs text-stone-400">
          Vérifiez les statistiques de votre personnage de Niveau 1 et choisissez ses langues bonus avant de commencer à jouer.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-stone-950 p-3 rounded-lg border border-red-900/40 text-center">
          <div className="text-xs text-red-400 font-semibold">Points de Vigueur</div>
          <div className="text-2xl font-bold font-mono text-red-200">{computed.maxHp} PV</div>
        </div>
        <div className="bg-stone-950 p-3 rounded-lg border border-blue-900/40 text-center">
          <div className="text-xs text-blue-400 font-semibold">Dés de Récupération</div>
          <div className="text-2xl font-bold font-mono text-blue-200">{computed.maxDr} {computed.drDice}</div>
        </div>
        <div className="bg-stone-950 p-3 rounded-lg border border-amber-900/40 text-center">
          <div className="text-xs text-amber-400 font-semibold">Points de Chance</div>
          <div className="text-2xl font-bold font-mono text-amber-200">{computed.maxPc} PC</div>
        </div>
        <div className="bg-stone-950 p-3 rounded-lg border border-stone-700 text-center">
          <div className="text-xs text-amber-300 font-semibold">Défense</div>
          <div className="text-2xl font-bold font-mono text-stone-200">{computed.defense}</div>
        </div>
      </div>

      <LanguageSelectorPanel
        automaticLanguages={languagesInfo.automaticLanguages}
        selectedLanguages={currentLanguages}
        secondaryTalents={currentTalents}
        bonusLanguageSlots={languagesInfo.bonusLanguageSlots}
        usedBonusSlots={languagesInfo.usedBonusSlots}
        argotienSlotCost={languagesInfo.argotienSlotCost}
        literacy={languagesInfo.literacy}
        intNote={languagesInfo.intNote}
        onAddLanguage={handleAddLanguage}
        onRemoveLanguage={handleRemoveLanguage}
        onAddSecondaryTalent={handleAddTalent}
        onRemoveSecondaryTalent={handleRemoveTalent}
      />

      <div className="flex justify-center pt-4">
        <button
          onClick={handleFinishWizard}
          className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold px-6 py-3 rounded-xl shadow-lg transition text-base"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Terminer la création et ouvrir la Fiche</span>
        </button>
      </div>
    </div>
  );
};
