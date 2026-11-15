import React from 'react';
import type { CharacterSheet, HumanDiversityChoice, PathData, PeopleData, PriestDeity } from '../../../types/cof2';
import { PRIEST_DEITIES } from '../../../engine/rulesEngine';
import { ChevronDown, ChevronUp, Sparkles, Shield, BookOpen, Shuffle } from 'lucide-react';
import { ActionBadges } from '../../sheet/ActionBadges';
import { CompanionCard } from '../../sheet/CompanionCard';
import { ExternalAbilitySelector } from '../../shared/ExternalAbilitySelector';
import { RankChoiceSelector } from '../../shared/RankChoiceSelector';
import { HumanDiversitySelector } from '../../shared/HumanDiversitySelector';
import { Step5RacialSection } from './Step5RacialSection';

interface Step5ReplacementSectionProps {
  character: CharacterSheet;
  onChange: (updated: CharacterSheet) => void;
  selectedPeople: PeopleData;
  isPriest: boolean;
  isMage: boolean;
  isRacialActive: boolean;
  isDomainActive: boolean;
  isVoieDuMageActive: boolean;
  isReplacementActive: boolean;
  domainPending: boolean;
  setDomainPending: (pending: boolean) => void;
  domainFilter: string;
  setDomainFilter: (filter: string) => void;
  currentThirdPath?: PathData;
  currentThirdPathId: string;
  defaultRacialPath?: PathData;
  currentDeityInfo?: PriestDeity;
  expandedPaths: Record<string, boolean>;
  togglePathPreview: (pathId: string) => void;
  handleSelectRacial: (targetRacialId?: string) => void;
  handleSelectDomain: (deityName: string) => void;
  handleSelectVoieDuMage: () => void;
  handleRankChoice: (choiceKey: string, optionId: string) => void;
  handleHumanDiversityChange: (choice: HumanDiversityChoice) => void;
  selectedProfilePaths: string[];
  handleUpdatePartial: (partial: Partial<CharacterSheet>) => void;
}

export const Step5ReplacementSection: React.FC<Step5ReplacementSectionProps> = ({
  character,
  onChange,
  selectedPeople,
  isPriest,
  isMage,
  isRacialActive,
  isDomainActive,
  isVoieDuMageActive,
  isReplacementActive,
  domainPending,
  setDomainPending,
  domainFilter,
  setDomainFilter,
  currentThirdPath,
  currentThirdPathId,
  defaultRacialPath,
  currentDeityInfo,
  expandedPaths,
  togglePathPreview,
  handleSelectRacial,
  handleSelectDomain,
  handleSelectVoieDuMage,
  handleRankChoice,
  handleHumanDiversityChange,
  selectedProfilePaths,
  handleUpdatePartial,
}) => {
  return (
      <div className="pt-4 border-t border-stone-800 space-y-4">
        {isPriest && (
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-serif font-bold text-xs text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Option Compagnon : Voie de Domaine de Prêtre</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Un prêtre peut choisir de consacrer son sacerdoce à une divinité tutélaire et remplacer sa voie de peuple par sa Voie de Domaine.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSelectRacial()}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  isRacialActive && !domainPending
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                }`}
              >
                Voie de Peuple ({selectedPeople.name})
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isDomainActive) {
                    if (character.deity) {
                      handleSelectDomain(character.deity);
                    } else {
                      setDomainPending(true);
                      if (currentThirdPathId) {
                        onChange({
                          ...character,
                          selectedPathIds: selectedProfilePaths,
                          acquiredAbilities: character.acquiredAbilities.filter(a =>
                            selectedProfilePaths.includes(a.pathId),
                          ),
                        });
                      }
                    }
                  }
                }}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center space-x-1 ${
                  isDomainActive || domainPending
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                }`}
              >
                <span>Voie de Domaine</span>
                <span className="text-[10px] bg-stone-800/80 px-1 rounded ml-1 text-amber-300 border border-stone-700">
                  {PRIEST_DEITIES.length} dieux
                </span>
              </button>
            </div>
          </div>
        )}

        {isMage && (
          <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-serif font-bold text-xs text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Option Mage : Voie du Mage</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Un profil de la famille des mages peut choisir d'obtenir la Voie du Mage en remplacement de sa voie de peuple.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSelectRacial()}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  isRacialActive
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                }`}
              >
                Voie de Peuple ({selectedPeople.name})
              </button>
              <button
                type="button"
                onClick={() => handleSelectVoieDuMage()}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center space-x-1 ${
                  isVoieDuMageActive
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700'
                }`}
              >
                <span>Voie du Mage</span>
              </button>
            </div>
          </div>
        )}

        {(isPriest || isMage) && !currentThirdPathId && !domainPending && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-700/60 text-xs text-amber-200 text-center">
            Veuillez choisir ci-dessus votre 3e voie : <strong>Voie de Peuple ({selectedPeople.name})</strong>
            {isPriest ? ' ou Voie de Domaine' : ''}
            {isMage ? ' ou Voie du Mage' : ''}.
          </div>
        )}

        {domainPending && !isDomainActive && (
          <div className="bg-stone-950/70 p-4 rounded-xl border border-amber-800/70 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-amber-200 font-semibold">
              Sélectionnez votre divinité tutélaire pour activer sa Voie de Domaine :
            </div>
            <select
              value=""
              onChange={e => handleSelectDomain(e.target.value)}
              className="bg-stone-900 border border-amber-600 rounded-lg px-3 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
            >
              <option value="">— Choisir une divinité —</option>
              {PRIEST_DEITIES.map(d => (
                <option key={d.domainPathId} value={d.name}>
                  {d.name} — {d.domainTitle} ({d.sacredWeapon})
                </option>
              ))}
            </select>
          </div>
        )}

        {isReplacementActive ? (
          /* Replacement Path Active View (Domain or Voie du Mage) */
          <div className="space-y-4 bg-stone-950/70 p-4 rounded-xl border border-amber-800/70">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-800">
              <div>
                <h4 className="font-serif font-bold text-sm text-amber-200 flex items-center space-x-2">
                  <span>
                    {isDomainActive ? 'Voie de Domaine active' : 'Voie de Mage active'} : {currentThirdPath?.name}
                  </span>
                  <span className="text-[10px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                    {isDomainActive ? 'Compagnon' : 'Mage'}
                  </span>
                </h4>
                {isDomainActive && currentDeityInfo && (
                  <div className="text-xs text-stone-400 mt-1">
                    Divinité : <strong className="text-stone-200">{currentDeityInfo?.name}</strong> ({currentDeityInfo?.domainTitle})
                    {' • '}Arme sacrée : <strong className="text-amber-300">{currentDeityInfo?.sacredWeapon}</strong>
                    {' • '}Symbole : <span className="italic text-stone-300">{currentDeityInfo?.symbolDesc}</span>
                  </div>
                )}
                {isVoieDuMageActive && (
                  <div className="text-xs text-stone-400 mt-1">
                    Remplacement de voie de peuple pour la famille des mages • Érudition et puissance magique
                  </div>
                )}
              </div>

              {/* Deity selector for Priest */}
              {isDomainActive && (
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-stone-400">Changer de divinité :</label>
                  <select
                    value={currentDeityInfo?.name || ''}
                    onChange={e => handleSelectDomain(e.target.value)}
                    className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">— Choisir une divinité —</option>
                    {PRIEST_DEITIES.map(d => (
                      <option key={d.domainPathId} value={d.name}>
                        {d.name} — {d.domainTitle} ({d.sacredWeapon})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Explanatory Rule Banner */}
            <div className="text-xs bg-amber-950/40 p-3 rounded-lg border border-amber-900/60 text-amber-200/90 leading-relaxed">
              <strong>Règle officielle COF2 :</strong>{' '}
              {isDomainActive
                ? 'La voie de domaine remplace la voie de peuple pour la progression sacerdotale.'
                : 'La voie du mage remplace la voie de peuple pour se consacrer aux arts occultes.'}{' '}
              Votre héros <strong>conserve la capacité originale de son peuple</strong> ({defaultRacialPath?.name} : <em>« {defaultRacialPath?.ranks[0]?.title} »</em>) et ajoute dès le rang 1{' '}
              {isDomainActive ? 'le bonus de compétence spécifique de sa divinité' : "l'Occultisme"} !
            </div>

            {/* Path Card */}
            {currentThirdPath && (
              <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow">
                <div className="p-3.5 bg-stone-950/80 flex items-center justify-between border-b border-stone-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-400 font-serif font-black">■</span>
                    <span className="font-serif font-bold text-stone-200 text-sm">
                      {currentThirdPath.name}
                    </span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-mono">
                      Rang 1 acquis gratuitement
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePathPreview(currentThirdPath.id)}
                    className="flex items-center space-x-1 text-xs bg-stone-900 hover:bg-stone-800 text-stone-300 px-3 py-1 rounded border border-stone-700 transition"
                  >
                    <span>{expandedPaths[currentThirdPath.id] ? 'Réduire' : 'Voir les 5 rangs'}</span>
                    {expandedPaths[currentThirdPath.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="p-3.5 space-y-2.5">
                  {/* Rank 1 highlight */}
                  <div className="p-3 rounded-lg bg-stone-950/70 border border-amber-900/50 space-y-2">
                    <div className="flex items-center justify-between">
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
                    <p className="text-xs text-stone-400 pl-7 leading-relaxed">
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

                    {/* Prominent Reminder for the retained racial ability */}
                    <div className="mt-2.5 ml-7 p-3 rounded-lg bg-emerald-950/40 border border-emerald-700/50 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-300">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Rappel : Capacité originale de peuple conservée ({defaultRacialPath?.name} • Rang 1)</span>
                      </div>
                      <div className="font-semibold text-stone-100 text-xs flex items-center space-x-2">
                        <span>{defaultRacialPath?.ranks[0]?.title}</span>
                        {defaultRacialPath?.ranks[0] && <ActionBadges rank={defaultRacialPath.ranks[0]} />}
                      </div>
                      <p className="text-xs text-stone-300 pl-2 border-l border-emerald-800/60 leading-relaxed">
                        {defaultRacialPath?.ranks[0]?.description}
                      </p>
                      {defaultRacialPath?.ranks[0] && (
                        <>
                          <RankChoiceSelector
                            character={character}
                            pathId={defaultRacialPath.id}
                            rank={defaultRacialPath.ranks[0]}
                            onChangeChoice={handleRankChoice}
                            requireExplicitChoice
                            variant="emerald"
                          />
                          <HumanDiversitySelector
                            character={character}
                            pathId={defaultRacialPath.id}
                            rankNumber={1}
                            onChange={handleHumanDiversityChange}
                            variant="emerald"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Extended ranks 2-5 if expanded */}
                  {expandedPaths[currentThirdPath.id] && (
                    <div className="space-y-2 pt-2 border-t border-stone-800/60">
                      {currentThirdPath.ranks.slice(1).map(r => (
                        <div key={r.rank} className="p-2.5 rounded bg-stone-950/40 border border-stone-800/60 text-xs">
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
        ) : (
          <Step5RacialSection
            character={character}
            onChange={onChange}
            selectedPeople={selectedPeople}
            currentThirdPath={currentThirdPath}
            currentThirdPathId={currentThirdPathId}
            expandedPaths={expandedPaths}
            togglePathPreview={togglePathPreview}
            handleSelectRacial={handleSelectRacial}
            handleRankChoice={handleRankChoice}
            handleHumanDiversityChange={handleHumanDiversityChange}
            handleUpdatePartial={handleUpdatePartial}
          />
        )}
      </div>
  );
};
