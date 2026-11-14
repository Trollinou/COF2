import React from 'react';
import { CharacterSheet, PeopleData, ComputedCharacterStats } from '../../../types/cof2';
import { User, Sparkles, Dices } from 'lucide-react';
import { LanguageSelectorPanel } from '../../shared/LanguageSelectorPanel';

interface Step2IdentityProps {
  character: CharacterSheet;
  computed: ComputedCharacterStats;
  update: (partial: Partial<CharacterSheet>) => void;
  selectedPeople: PeopleData;
  suggestRandomName: () => void;
  rollIdeal: () => void;
  rollFlaw: () => void;
}

export const Step2Identity: React.FC<Step2IdentityProps> = ({
  character,
  computed,
  update,
  selectedPeople,
  suggestRandomName,
  rollIdeal,
  rollFlaw,
}) => {
  const isFarfadet = character.peopleId === 'farfadet';
  const isFee = character.peopleId === 'fee';
  const isSexLocked = isFarfadet || isFee;
  const effectiveSex = isFarfadet ? 'Masculin' : isFee ? 'Féminin' : character.sex || '';

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
      <div className="flex items-center space-x-3 border-b border-stone-800 pb-4">
        <User className="w-6 h-6 text-amber-400" />
        <div>
          <h3 className="font-serif font-bold text-lg text-amber-200">
            Étape 6 : Identité, Apparence & Langues ({selectedPeople.name})
          </h3>
          <p className="text-xs text-stone-400">
            Nommez votre héros, définissez ses mensurations en accord avec son peuple ({selectedPeople.name}) et choisissez ses langues bonus.
          </p>
        </div>
      </div>

      {/* Name & Generator */}
      <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-stone-200">
            Nom du Personnage *
          </label>
          <button
            type="button"
            onClick={suggestRandomName}
            className="flex items-center space-x-1.5 bg-amber-700 hover:bg-amber-600 text-stone-100 px-2.5 py-1 rounded text-xs font-medium transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Suggérer un nom de {selectedPeople.name}</span>
          </button>
        </div>

        <input
          type="text"
          value={character.name}
          onChange={e => update({ name: e.target.value })}
          className="w-full bg-stone-900 border border-stone-700 rounded-md px-3 py-2 text-sm text-stone-100 focus:border-amber-500 focus:outline-none font-semibold"
          placeholder={`Ex: ${selectedPeople.names?.masculine?.[0] || 'Nom du héros'}`}
        />
        {selectedPeople.names?.namingTip && (
          <div className="text-[11px] text-stone-400 italic">
            Conseil pour les noms de {selectedPeople.name} : {selectedPeople.names.namingTip}
          </div>
        )}
        {selectedPeople.names && (
          <div className="pt-2 border-t border-stone-800/80 space-y-1.5">
            <span className="text-[11px] font-semibold text-stone-300 block">
              Suggestions de noms typiques pour {selectedPeople.name} :
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[...(selectedPeople.names.masculine || []).slice(0, 5), ...(selectedPeople.names.feminine || []).slice(0, 5)].map((sampleName) => (
                <button
                  key={sampleName}
                  type="button"
                  onClick={() => update({ name: sampleName })}
                  className="text-[11px] bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-300 px-2 py-0.5 rounded transition"
                  title="Cliquer pour adopter ce nom"
                >
                  {sampleName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Physical Stats Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
          Mensurations & Apparence
        </span>
      </div>

      {/* Physical Stats Grid — Line 1: Player, Sex, Age */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">
            Nom du Joueur *
          </label>
          <input
            type="text"
            value={character.playerName}
            onChange={e => update({ playerName: e.target.value })}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
            placeholder="Votre nom"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-stone-300">Sexe / Genre *</label>
            {isSexLocked && (
              <span className="text-[10px] text-amber-400 font-mono">Imposé ({selectedPeople.name})</span>
            )}
          </div>
          <select
            value={effectiveSex}
            disabled={isSexLocked}
            onChange={e => update({ sex: e.target.value })}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {!isSexLocked && <option value="">— Choisir —</option>}
            <option value="Masculin">Masculin</option>
            <option value="Féminin">Féminin</option>
            {!isSexLocked && <option value="Autre">Autre</option>}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-stone-300">Âge</label>
            <span className="text-[10px] text-amber-400 font-mono">Défaut: {selectedPeople.startingAge}</span>
          </div>
          <input
            type="text"
            value={character.age || selectedPeople.startingAge}
            onChange={e => update({ age: e.target.value })}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Physical Stats Grid — Line 2: Height & Weight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-stone-300">Taille *</label>
            <span className="text-[10px] text-amber-400 font-mono">Défaut: {selectedPeople.heightRange}</span>
          </div>
          <input
            type="text"
            value={character.height || ''}
            onChange={e => update({ height: e.target.value })}
            placeholder={selectedPeople.heightRange}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-stone-300">Poids *</label>
            <span className="text-[10px] text-amber-400 font-mono">Défaut: {selectedPeople.weightRange}</span>
          </div>
          <input
            type="text"
            value={character.weight || ''}
            onChange={e => update({ weight: e.target.value })}
            placeholder={selectedPeople.weightRange}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Physical traits description */}
      <div>
        <label className="block text-xs font-semibold text-stone-300 mb-1">
          Description physique & Signes distinctifs
        </label>
        <textarea
          rows={2}
          value={character.physicalTraits || selectedPeople.physicalTraits}
          onChange={e => update({ physicalTraits: e.target.value })}
          className="w-full bg-stone-950 border border-stone-700 rounded p-2.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
          placeholder="Cicatrice, couleur des cheveux, des yeux, allure..."
        />
      </div>

      {/* Ideals and Flaws */}
      <div className="bg-stone-950/70 p-4 rounded-lg border border-stone-800 space-y-3">
        <span className="font-semibold text-sm text-amber-200 block">
          Idéal Héroïque & Travers (Règles COF2 p.15)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Idéal héroïque</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={character.ideal || ''}
                onChange={e => update({ ideal: e.target.value })}
                placeholder="Ex: Justice, Courage, Compassion, Clémence..."
                className="flex-1 bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={rollIdeal}
                className="flex items-center space-x-1 bg-amber-700 hover:bg-amber-600 text-stone-100 px-2.5 py-1.5 rounded text-xs font-medium transition shrink-0"
                title="Tirer un idéal héroïque au hasard (1d20)"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>1d20</span>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Travers / Défaut</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={character.flaw || ''}
                onChange={e => update({ flaw: e.target.value })}
                placeholder="Ex: Impulsif, Cupide, Distrait, Superstitieux..."
                className="flex-1 bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={rollFlaw}
                className="flex items-center space-x-1 bg-amber-700 hover:bg-amber-600 text-stone-100 px-2.5 py-1.5 rounded text-xs font-medium transition shrink-0"
                title="Tirer un travers au hasard (1d20)"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>1d20</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Languages & Secondary Talents */}
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
        enforceSlotLimit
      />
    </div>
  );
};
