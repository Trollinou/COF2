import React from 'react';
import { CheckCircle2, ChevronRight, Search } from 'lucide-react';
import { PEOPLES } from '../../../engine/compendium';
import type { CharacterSheet, PeopleData } from '../../../types/cof2';
import { Step1PeopleDetailPanel } from './Step1PeopleDetailPanel';

interface Step1PeoplesProps {
  character: CharacterSheet;
  update: (partial: Partial<CharacterSheet>) => void;
  onChange: (updated: CharacterSheet) => void;
  selectedPeople?: PeopleData;
  handleSelectPeople: (peopleId: string) => void;
  isCompagnonPeople: (id: string) => boolean;
  peopleFilter: 'all' | 'base' | 'compagnon';
  setPeopleFilter: (filter: 'all' | 'base' | 'compagnon') => void;
  peopleSearch: string;
  setPeopleSearch: (search: string) => void;
  filteredPeoples: PeopleData[];
}

export function getPeopleModifierBadges(p: PeopleData): {
  bonuses: string[];
  maluses: string[];
} {
  const bonuses: string[] = [];
  const maluses: string[] = [];

  Object.entries(p.stats || {}).forEach(([code, val]) => {
    if (!val) return;
    if (val > 0) bonuses.push(`+${code}`);
    else if (val < 0) maluses.push(`-${code}`);
  });

  (p.statChoices || []).forEach((choice) => {
    const isAny = choice.options.includes('ANY_LOWEST');
    const label = isAny ? 'Choix' : choice.options.join('/');
    if (choice.value > 0) bonuses.push(`+${label}`);
    else if (choice.value < 0) maluses.push(`-${label}`);
  });

  return { bonuses, maluses };
}

export const Step1Peoples: React.FC<Step1PeoplesProps> = ({
  character,
  update,
  onChange,
  selectedPeople,
  handleSelectPeople,
  isCompagnonPeople,
  peopleFilter,
  setPeopleFilter,
  peopleSearch,
  setPeopleSearch,
  filteredPeoples,
}) => {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow space-y-5">
      <div className="border-b border-stone-800 pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-serif font-bold text-lg text-amber-200">
            Étape 1 : Choix du Peuple
          </h3>
          <p className="text-xs text-stone-400">
            Sélectionnez votre peuple dans la liste à gauche. Sa description et ses détails s'affichent instantanément à droite.
          </p>
        </div>
        <div className="text-xs font-mono text-stone-400">
          {filteredPeoples.length} peuple{filteredPeoples.length > 1 ? 's' : ''}{' '}
          disponible{filteredPeoples.length > 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* GAUCHE : LISTE DES PEUPLES */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-2.5">
          {/* Filtres & Recherche */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-xs">
              <button
                type="button"
                onClick={() => setPeopleFilter('all')}
                className={`py-1 rounded text-center font-medium transition ${
                  peopleFilter === 'all'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Tous ({PEOPLES.length})
              </button>
              <button
                type="button"
                onClick={() => setPeopleFilter('base')}
                className={`py-1 rounded text-center font-medium transition ${
                  peopleFilter === 'base'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Base (8)
              </button>
              <button
                type="button"
                onClick={() => setPeopleFilter('compagnon')}
                className={`py-1 rounded text-center font-medium transition ${
                  peopleFilter === 'compagnon'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Comp. (17)
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                placeholder="Filtrer les peuples..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:border-amber-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Liste défilante des peuples */}
          <div className="max-h-[620px] overflow-y-auto space-y-1.5 pr-1.5">
            {filteredPeoples.map((p) => {
              const isSelected = p.id === character.peopleId;
              const isCompagnon = isCompagnonPeople(p.id);
              const { bonuses, maluses } = getPeopleModifierBadges(p);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPeople(p.id)}
                  className={`w-full p-2.5 rounded-lg border text-left transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-amber-950/60 border-amber-500 shadow-md ring-1 ring-amber-500'
                      : 'bg-stone-950/70 border-stone-800/80 hover:border-stone-700 hover:bg-stone-900/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-serif font-bold text-sm truncate ${
                          isSelected ? 'text-amber-200' : 'text-stone-200'
                        }`}
                      >
                        {p.name}
                      </span>
                      {isCompagnon && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-900/50 text-amber-300 border border-amber-700/60 font-mono shrink-0">
                          Compagnon
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                      Âge: {p.startingAge} • max ~{p.lifeExpectancy}
                    </div>
                    {(bonuses.length > 0 || maluses.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {bonuses.map((b, idx) => (
                          <span
                            key={`b_${idx}`}
                            className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/70"
                          >
                            {b}
                          </span>
                        ))}
                        {maluses.map((m, idx) => (
                          <span
                            key={`m_${idx}`}
                            className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/70"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
                  )}
                </button>
              );
            })}

            {filteredPeoples.length === 0 && (
              <div className="text-center py-8 text-xs text-stone-500 italic">
                Aucun peuple ne correspond à votre recherche.
              </div>
            )}
          </div>
        </div>

        <Step1PeopleDetailPanel
          character={character}
          selectedPeople={selectedPeople}
          isCompagnonPeople={isCompagnonPeople}
          update={update}
          onChange={onChange}
        />
      </div>
    </div>
  );
};
