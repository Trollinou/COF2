import React from 'react';
import type { CharacterSheet, HumanDiversityChoice, PeopleData, PathData } from '../../../types/cof2';
import { applyRacialDefaults, getPathById } from '../../../engine/rulesEngine';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ActionBadges } from '../../sheet/ActionBadges';
import { CompanionCard } from '../../sheet/CompanionCard';
import { ExternalAbilitySelector } from '../../shared/ExternalAbilitySelector';
import { RankChoiceSelector } from '../../shared/RankChoiceSelector';
import { HumanDiversitySelector } from '../../shared/HumanDiversitySelector';

interface Step5RacialSectionProps {
  character: CharacterSheet;
  onChange: (updated: CharacterSheet) => void;
  selectedPeople: PeopleData;
  currentThirdPath?: PathData;
  currentThirdPathId: string;
  expandedPaths: Record<string, boolean>;
  togglePathPreview: (pathId: string) => void;
  handleSelectRacial: (targetRacialId?: string) => void;
  handleRankChoice: (choiceKey: string, optionId: string) => void;
  handleHumanDiversityChange: (choice: HumanDiversityChoice) => void;
  handleUpdatePartial: (partial: Partial<CharacterSheet>) => void;
}

export const Step5RacialSection: React.FC<Step5RacialSectionProps> = ({
  character,
  onChange,
  selectedPeople,
  currentThirdPath,
  currentThirdPathId,
  expandedPaths,
  togglePathPreview,
  handleSelectRacial,
  handleRankChoice,
  handleHumanDiversityChange,
  handleUpdatePartial,
}) => {
  return (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <h4 className="font-serif font-semibold text-sm text-amber-300 uppercase tracking-wider">
                  Voie de Peuple ({selectedPeople.name}) :
                </h4>
                <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800 uppercase font-semibold">
                  {selectedPeople.selectableRacialPaths ? 'Héritage au choix' : 'Acquis au Niv. 1'}
                </span>
              </div>
              {selectedPeople.selectableRacialPaths ? (
                <span className="text-xs text-stone-400">
                  En tant que demi-elfe, vous pouvez choisir parmi 4 héritages culturels ci-dessous :
                </span>
              ) : (
                <span className="text-xs text-stone-400">
                  Votre voie de peuple est automatiquement acquise au rang 1 dès la création.
                </span>
              )}
            </div>

            {/* Demi-elfe: 4 selectable heritage path buttons in 4 columns */}
            {selectedPeople.selectableRacialPaths && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedPeople.selectableRacialPaths.map(pid => {
                  const pth = getPathById(pid);
                  const isChosen = currentThirdPathId === pid;
                  const heritageLabel = pid.includes('humain')
                    ? 'Héritage humain'
                    : pid.includes('haut')
                    ? 'Héritage elfe haut'
                    : pid.includes('sylvain')
                    ? 'Héritage elfe sylvain'
                    : 'Voie du demi-elfe (métis)';

                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => {
                        const updated = applyRacialDefaults(character, 'demi-elfe', pid);
                        onChange(updated);
                      }}
                      className={`p-3.5 rounded-xl border text-left text-xs transition relative flex flex-col justify-between ${
                        isChosen
                          ? 'bg-amber-950/70 border-amber-500 shadow-md ring-1 ring-amber-500'
                          : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 hover:bg-stone-900/60'
                      }`}
                    >
                      <div>
                        <div className="font-serif font-bold text-stone-100 text-sm">{pth?.name}</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">{heritageLabel}</div>
                      </div>
                      <div className="mt-2.5">
                        {isChosen ? (
                          <span className="inline-flex items-center text-[10px] bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded shadow">
                            Voie Active ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-500 hover:text-stone-300">
                            Cliquer pour choisir
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Preview of the racial path with ALL 5 RANKS previewable */}
            {currentThirdPath && (
              <div className="bg-stone-950/80 rounded-xl border border-stone-800 overflow-hidden shadow">
                {/* Header with expand/collapse toggle */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-3 bg-stone-900/40 border-b border-stone-800/80">
                  <div className="flex items-center space-x-3">
                    <span className="text-amber-400 font-serif font-black text-lg">■</span>
                    <div>
                      <div className="font-serif font-bold text-base text-stone-100 flex items-center space-x-2">
                        <span>{currentThirdPath.name}</span>
                        <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800 uppercase font-semibold">
                          Rang 1 acquis immédiatement
                        </span>
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        Voie raciale ({selectedPeople.name}) • 5 rangs disponibles au fil des niveaux
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePathPreview(currentThirdPath.id)}
                    className="flex items-center space-x-1.5 text-xs text-stone-300 hover:text-amber-200 px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 hover:border-amber-500/50 transition"
                  >
                    {expandedPaths[currentThirdPath.id] ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-amber-400" />
                        <span>Masquer les rangs 2 à 5</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-amber-400" />
                        <span>Voir tous les rangs (1 à 5)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Content: Rank 1 always visible */}
                <div className="p-4 space-y-3">
                  <div className="p-3 rounded-lg bg-stone-900/70 border border-stone-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-xs font-mono font-bold flex items-center justify-center">
                          1
                        </span>
                        <span className="font-semibold text-stone-200 text-xs">
                          {currentThirdPath.ranks[0]?.title}
                        </span>
                        {currentThirdPath.ranks[0] && <ActionBadges rank={currentThirdPath.ranks[0]} />}
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold">
                        Acquis au Niv. 1
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 pl-7 leading-relaxed">
                      {currentThirdPath.ranks[0]?.description}
                    </p>
                    {currentThirdPath.ranks[0] && (
                      <>
                        <ExternalAbilitySelector
                          character={character}
                          pathId={currentThirdPath.id}
                          rank={currentThirdPath.ranks[0]}
                          updateCharacter={handleUpdatePartial}
                        />
                        <RankChoiceSelector
                          character={character}
                          pathId={currentThirdPath.id}
                          rank={currentThirdPath.ranks[0]}
                          onChangeChoice={handleRankChoice}
                          requireExplicitChoice
                        />
                        <HumanDiversitySelector
                          character={character}
                          pathId={currentThirdPath.id}
                          rankNumber={1}
                          onChange={handleHumanDiversityChange}
                        />
                      </>
                    )}
                  </div>

                  {/* Extended Ranks 2-5 when expanded */}
                  {expandedPaths[currentThirdPath.id] && (
                    <div className="space-y-2 pt-2 border-t border-stone-800/60">
                      <div className="text-xs text-stone-400 font-medium">
                        Rangs suivants (accessibles lors des montées de niveau) :
                      </div>
                      {currentThirdPath.ranks.slice(1).map(r => (
                        <div key={r.rank} className="p-2.5 rounded bg-stone-900/40 border border-stone-800/60 text-xs">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 text-xs font-mono font-bold flex items-center justify-center">
                              {r.rank}
                            </span>
                            <span className="font-semibold text-stone-200">
                              {r.title}
                            </span>
                            <ActionBadges rank={r} />
                          </div>
                          <p className="text-stone-400 pl-7 leading-relaxed">
                            {r.description}
                          </p>
                          {r.companions && r.companions.length > 0 && (
                            <div className="pl-7 space-y-2 mt-2">
                              {r.companions.map((comp, cIdx) => (
                                <CompanionCard key={cIdx} companion={comp} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
  );
};
