import React from 'react';
import { CharacterSheet, PeopleData } from '../../../types/cof2';
import { User, Sparkles, Dices } from 'lucide-react';

interface Step2IdentityProps {
  character: CharacterSheet;
  update: (partial: Partial<CharacterSheet>) => void;
  selectedPeople: PeopleData;
  suggestRandomName: () => void;
  rollIdealAndFlaw: () => void;
}

export const Step2Identity: React.FC<Step2IdentityProps> = ({
  character,
  update,
  selectedPeople,
  suggestRandomName,
  rollIdealAndFlaw,
}) => {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="flex items-center space-x-3 border-b border-stone-800 pb-4">
        <User className="w-6 h-6 text-amber-400" />
        <div>
          <h3 className="font-serif font-bold text-lg text-amber-200">
            Étape 2 : Identité & Apparence du Héros ({selectedPeople.name})
          </h3>
          <p className="text-xs text-stone-400">
            Nommez votre héros et définissez ses mensurations en accord avec son peuple ({selectedPeople.name}).
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
      </div>

      {/* Physical Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">Nom du Joueur</label>
          <input
            type="text"
            value={character.playerName}
            onChange={e => update({ playerName: e.target.value })}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
            placeholder="Votre nom"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">Sexe / Genre</label>
          <select
            value={character.sex || 'Masculin'}
            onChange={e => update({ sex: e.target.value })}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
          >
            <option value="Masculin">Masculin</option>
            <option value="Féminin">Féminin</option>
            <option value="Autre">Autre</option>
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
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">Taille</label>
          <input
            type="text"
            value={character.height || selectedPeople.heightRange}
            onChange={e => update({ height: e.target.value })}
            placeholder={selectedPeople.heightRange}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">Poids</label>
          <input
            type="text"
            value={character.weight || selectedPeople.weightRange}
            onChange={e => update({ weight: e.target.value })}
            placeholder={selectedPeople.weightRange}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">
            Langues maîtrisées (selon peuple et INT)
          </label>
          <input
            type="text"
            value={character.languages || selectedPeople.defaultLanguages}
            onChange={e => update({ languages: e.target.value })}
            className="w-full bg-stone-950 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-100"
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
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm text-amber-200">
            Idéal Héroïque & Travers (Règles COF2 p.15)
          </span>
          <button
            type="button"
            onClick={rollIdealAndFlaw}
            className="flex items-center space-x-1 bg-amber-700 hover:bg-amber-600 text-stone-100 px-2.5 py-1 rounded text-xs font-medium transition"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>Tirer au hasard (1d20)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-stone-400 mb-1">Idéal héroïque</label>
            <input
              type="text"
              value={character.ideal || ''}
              onChange={e => update({ ideal: e.target.value })}
              placeholder="Ex: Justice, Courage, Compassion, Clémence..."
              className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200"
            />
          </div>
          <div>
            <label className="block text-xs text-stone-400 mb-1">Travers / Défaut</label>
            <input
              type="text"
              value={character.flaw || ''}
              onChange={e => update({ flaw: e.target.value })}
              placeholder="Ex: Impulsif, Cupide, Distrait, Superstitieux..."
              className="w-full bg-stone-900 border border-stone-700 rounded px-3 py-1.5 text-xs text-stone-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
