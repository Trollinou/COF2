import React from 'react';
import { CharacterSheet, StatCode, PeopleData } from '../../../types/cof2';
import { PEOPLES, STAT_NAMES, getPathById, applyRacialDefaults, computeRacialStatModifiers } from '../../../engine/rulesEngine';
import { Search, CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';

interface Step1PeoplesProps {
  character: CharacterSheet;
  update: (partial: Partial<CharacterSheet>) => void;
  onChange: (updated: CharacterSheet) => void;
  selectedPeople: PeopleData;
  handleSelectPeople: (peopleId: string) => void;
  isCompagnonPeople: (id: string) => boolean;
  peopleFilter: 'all' | 'base' | 'compagnon';
  setPeopleFilter: (filter: 'all' | 'base' | 'compagnon') => void;
  peopleSearch: string;
  setPeopleSearch: (search: string) => void;
  filteredPeoples: PeopleData[];
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
          {filteredPeoples.length} peuple{filteredPeoples.length > 1 ? 's' : ''} disponible{filteredPeoples.length > 1 ? 's' : ''}
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
                onChange={e => setPeopleSearch(e.target.value)}
                placeholder="Filtrer les peuples..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500 focus:border-amber-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Liste défilante des peuples */}
          <div className="max-h-[620px] overflow-y-auto space-y-1.5 pr-1.5">
            {filteredPeoples.map(p => {
              const isSelected = p.id === character.peopleId;
              const isCompagnon = isCompagnonPeople(p.id);

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
                      <span className={`font-serif font-bold text-sm truncate ${isSelected ? 'text-amber-200' : 'text-stone-200'}`}>
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

        {/* DROITE : DÉTAIL DU PEUPLE SÉLECTIONNÉ */}
        {selectedPeople && (
          <div className="lg:col-span-8 xl:col-span-8 space-y-4">
            {/* PARTIE DROITE SUPÉRIEURE : DESCRIPTION & LORE */}
            <div className="bg-stone-950 p-4 sm:p-5 rounded-xl border border-stone-800 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-serif font-bold text-amber-200 text-base">
                    {selectedPeople.name}
                  </h4>
                  {isCompagnonPeople(selectedPeople.id) ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800/60 font-mono">
                      Extension Compagnon
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                      Livre des Règles
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-400 font-mono">
                  Espérance de vie : <strong className="text-amber-200">{selectedPeople.lifeExpectancy}</strong>
                </span>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                {selectedPeople.description}
              </p>

              {selectedPeople.interpretationTip && (
                <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-300 block mb-0.5">Conseils d'interprétation :</strong>
                  {selectedPeople.interpretationTip}
                </div>
              )}

              <div>
                <span className="text-[11px] font-semibold text-stone-400 block mb-1">
                  Traits physiques distinctifs :
                </span>
                <p className="text-xs text-stone-300 italic bg-stone-900/50 p-2.5 rounded border border-stone-800">
                  « {selectedPeople.physicalTraits} »
                </p>
              </div>
            </div>

            {/* PARTIE DROITE INFÉRIEURE : REPÈRES, DÉTAILS & OPTIONS MÉCANIQUES */}
            <div className="bg-stone-950 p-4 sm:p-5 rounded-xl border border-stone-800 space-y-4 shadow-sm">
              {/* Repères métriques */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-900/60 p-3 rounded-lg border border-stone-800/80">
                <div>
                  <span className="text-stone-400 block font-semibold text-[10px] uppercase">Âge de départ</span>
                  <span className="text-stone-200 font-medium">{selectedPeople.startingAge}</span>
                </div>
                <div>
                  <span className="text-stone-400 block font-semibold text-[10px] uppercase">Taille typique</span>
                  <span className="text-stone-200 font-medium">{selectedPeople.heightRange}</span>
                </div>
                <div>
                  <span className="text-stone-400 block font-semibold text-[10px] uppercase">Poids typique</span>
                  <span className="text-stone-200 font-medium">{selectedPeople.weightRange}</span>
                </div>
                <div>
                  <span className="text-stone-400 block font-semibold text-[10px] uppercase">Langue(s)</span>
                  <span className="text-amber-200 font-medium truncate block" title={selectedPeople.defaultLanguages}>
                    {selectedPeople.defaultLanguages}
                  </span>
                </div>
              </div>

              {/* Voie culturelle Demi-elfe */}
              {selectedPeople.selectableRacialPaths && (
                <div className="bg-amber-950/30 p-3.5 rounded-lg border border-amber-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-amber-200 text-xs">
                      Héritage culturel du Demi-elfe (Voie de Peuple) :
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Règles COF2 & Compagnon
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedPeople.selectableRacialPaths.map(pathId => {
                      const pth = getPathById(pathId);
                      const isChosen = character.selectedPathIds.includes(pathId);
                      return (
                        <button
                          key={pathId}
                          type="button"
                          onClick={() => {
                            const updated = applyRacialDefaults(character, 'demi-elfe', pathId);
                            onChange(updated);
                          }}
                          className={`p-2.5 rounded text-left border text-xs transition flex flex-col justify-between ${
                            isChosen
                              ? 'bg-amber-600 text-stone-950 font-bold border-amber-500 shadow'
                              : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-amber-600'
                          }`}
                        >
                          <div className="font-serif">{pth?.name || pathId}</div>
                          <div className="text-[10px] opacity-80 font-normal mt-0.5">
                            {pathId.includes('humain')
                              ? 'Culture & éducation humaine'
                              : pathId.includes('haut')
                              ? 'Culture des Elfes hauts'
                              : pathId.includes('sylvain')
                              ? 'Culture des Elfes sylvains'
                              : 'Voie propre du Demi-elfe (Compagnon)'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modificateurs raciaux (Bonus & Malus) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-800">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-emerald-400">
                    Bonus raciaux
                  </div>

                  {/* Render choice bonus slots */}
                  {(selectedPeople.statChoices || []).map((choice, cIdx) => {
                    if (choice.value <= 0) return null;
                    const isAny = choice.options.includes('ANY_LOWEST');
                    const defaultStat = (!isAny && choice.options[0] ? choice.options[0] : 'FOR') as StatCode;
                    const currentVal = character.racialStatChoices?.[cIdx] || defaultStat;
                    const signStr = `+${choice.value}`;

                    return (
                      <div key={`b_choice_${cIdx}`}>
                        <label className="block text-xs font-medium text-stone-300 mb-1">
                          {isAny ? `Bonus racial au choix (${signStr}) :` : `Choix du bonus (${signStr}) :`}
                        </label>
                        <select
                          value={currentVal}
                          onChange={e => {
                            const nextChoices = (selectedPeople.statChoices || []).map((c, idx) => {
                              if (idx === cIdx) return e.target.value as StatCode;
                              return (
                                character.racialStatChoices?.[idx] ||
                                ((c.options[0] !== 'ANY_LOWEST' ? c.options[0] : 'FOR') as StatCode)
                              );
                            });
                            update({
                              racialStatChoices: nextChoices,
                              racialStatModifiers: computeRacialStatModifiers(selectedPeople.id, nextChoices),
                            });
                          }}
                          className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-200"
                        >
                          {(isAny
                            ? (['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'] as StatCode[])
                            : (choice.options as StatCode[])
                          ).map(code => (
                            <option key={code} value={code}>
                              {signStr} en {STAT_NAMES[code]} ({code})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}

                  {/* Render fixed bonus slots */}
                  {Object.entries(selectedPeople.stats || {})
                    .filter(([, val]) => (val || 0) > 0)
                    .map(([code, val]) => (
                      <div key={`b_fixed_${code}`}>
                        <label className="block text-xs font-medium text-stone-300 mb-1">
                          Bonus racial (Fixe) :
                        </label>
                        <div className="w-full bg-stone-900/60 border border-stone-800 rounded px-2.5 py-1.5 text-xs text-emerald-300 font-medium">
                          +{val} en {STAT_NAMES[code as StatCode]} ({code})
                        </div>
                      </div>
                    ))}
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-red-400">
                    Malus raciaux
                  </div>

                  {/* Render choice malus slots */}
                  {(selectedPeople.statChoices || []).map((choice, cIdx) => {
                    if (choice.value >= 0) return null;
                    const defaultStat = (choice.options[0] !== 'ANY_LOWEST' ? choice.options[0] : 'FOR') as StatCode;
                    const currentVal = character.racialStatChoices?.[cIdx] || defaultStat;

                    return (
                      <div key={`m_choice_${cIdx}`}>
                        <label className="block text-xs font-medium text-stone-300 mb-1">
                          Choix du malus ({choice.value}) :
                        </label>
                        <select
                          value={currentVal}
                          onChange={e => {
                            const nextChoices = (selectedPeople.statChoices || []).map((c, idx) => {
                              if (idx === cIdx) return e.target.value as StatCode;
                              return (
                                character.racialStatChoices?.[idx] ||
                                ((c.options[0] !== 'ANY_LOWEST' ? c.options[0] : 'FOR') as StatCode)
                              );
                            });
                            update({
                              racialStatChoices: nextChoices,
                              racialStatModifiers: computeRacialStatModifiers(selectedPeople.id, nextChoices),
                            });
                          }}
                          className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-stone-200"
                        >
                          {(choice.options as StatCode[]).map(opt => (
                            <option key={opt} value={opt}>
                              {choice.value} en {STAT_NAMES[opt]} ({opt})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}

                  {/* Render fixed malus slots */}
                  {(() => {
                    const fixedMaluses = Object.entries(selectedPeople.stats || {}).filter(
                      ([, val]) => (val || 0) < 0
                    );
                    const hasChoiceMalus = (selectedPeople.statChoices || []).some(c => c.value < 0);

                    if (fixedMaluses.length === 0 && !hasChoiceMalus) {
                      return (
                        <div className="text-xs text-stone-500 italic">
                          Aucun malus racial pour ce peuple.
                        </div>
                      );
                    }

                    return fixedMaluses.map(([code, val]) => (
                      <div key={`m_fixed_${code}`}>
                        <label className="block text-xs font-medium text-stone-300 mb-1">
                          Malus racial (Fixe) :
                        </label>
                        <div className="w-full bg-stone-900/60 border border-stone-800 rounded px-2.5 py-1.5 text-xs text-red-300 font-medium">
                          {val} en {STAT_NAMES[code as StatCode]} ({code})
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Rappel des limitations morphologiques */}
              {selectedPeople.equipmentRules?.summary && (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/50 flex items-start space-x-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 block mb-0.5">Règles morphologiques ({selectedPeople.name}) :</strong>
                    <p className="text-stone-300 text-[11px] leading-relaxed">
                      {selectedPeople.equipmentRules.summary}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
