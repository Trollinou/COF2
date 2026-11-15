import React, { useState } from 'react';
import { CharacterSheet, HumanDiversityChoice, ProfileData, PeopleData } from '../../../types/cof2';
import {
  getPathById,
  getRacialPathId,
  applyRacialDefaults,
  PRIEST_DEITIES,
  isDomainPath,
  canUseVoieDuMage,
  hasMageCreationBonus,
  isRacialReplacementPath,
  getDomainPathForDeity,
  getDeityByDomainPathId,
  getProfileById,
  getProfileAllPoolPathIds,
} from '../../../engine/rulesEngine';
import { ChevronDown, ChevronUp, Sparkles, Shield, BookOpen, Shuffle } from 'lucide-react';
import { ActionBadges } from '../../sheet/ActionBadges';
import { CompanionCard } from '../../sheet/CompanionCard';
import { MageBonusRank2Panel } from './MageBonusRank2Panel';
import { ExternalAbilitySelector } from '../../shared/ExternalAbilitySelector';
import { RankChoiceSelector } from '../../shared/RankChoiceSelector';
import { HumanDiversitySelector } from '../../shared/HumanDiversitySelector';
import { Step5ReplacementSection } from './Step5ReplacementSection';

interface Step5PathsProps {
  character: CharacterSheet;
  onChange: (updated: CharacterSheet) => void;
  selectedProfile: ProfileData;
  selectedPeople: PeopleData;
  expandedPaths: Record<string, boolean>;
  togglePathPreview: (pathId: string) => void;
  toggleProfilePath: (pathId: string) => void;
}

export const Step5Paths: React.FC<Step5PathsProps> = ({
  character,
  onChange,
  selectedProfile,
  selectedPeople,
  expandedPaths,
  togglePathPreview,
  toggleProfilePath,
}) => {
  const secondaryProfile = character.isHybrid && character.secondaryProfileId
    ? getProfileById(character.secondaryProfileId)
    : undefined;
  const isHybrid = Boolean(character.isHybrid && secondaryProfile);
  const allProfilePathIds = isHybrid && secondaryProfile
    ? [...getProfileAllPoolPathIds(selectedProfile), ...getProfileAllPoolPathIds(secondaryProfile)]
    : getProfileAllPoolPathIds(selectedProfile);

  const selectedProfilePaths = character.selectedPathIds.filter(id => allProfilePathIds.includes(id));
  const isPriest = selectedProfile.id === 'pretre' || secondaryProfile?.id === 'pretre';
  const isMage = canUseVoieDuMage(character);
  const hasMageBonus = hasMageCreationBonus(character);
  const defaultRacialPathId = getRacialPathId(character.peopleId);
  const defaultRacialPath = getPathById(defaultRacialPathId);

  const handleUpdatePartial = (partial: Partial<CharacterSheet>) => {
    onChange({ ...character, ...partial });
  };

  const handleRankChoice = (choiceKey: string, optionId: string) => {
    handleUpdatePartial({
      pathRankChoices: {
        ...character.pathRankChoices,
        [choiceKey]: optionId,
      },
    });
  };

  const handleHumanDiversityChange = (humanDiversity: HumanDiversityChoice) => {
    handleUpdatePartial({ humanDiversity });
  };

  const explicitThirdPathId = character.selectedPathIds.find(id => !allProfilePathIds.includes(id)) || '';
  const currentThirdPathId = explicitThirdPathId;
  const isDomainActive = isDomainPath(currentThirdPathId);
  const isVoieDuMageActive = currentThirdPathId === 'voie-du-mage';
  const isRacialActive = Boolean(currentThirdPathId && !isDomainActive && !isVoieDuMageActive);
  const isReplacementActive = isDomainActive || isVoieDuMageActive;
  const currentThirdPath = currentThirdPathId ? getPathById(currentThirdPathId) : undefined;
  const currentDeityInfo = currentThirdPathId ? getDeityByDomainPathId(currentThirdPathId) : undefined;

  const [domainFilter, setDomainFilter] = useState('');
  const [domainPending, setDomainPending] = useState(false);

  const handleSelectDomain = (deityName: string) => {
    if (!deityName) return;
    const dPath = getDomainPathForDeity(deityName);
    if (!dPath) return;

    const nextSelected = [...selectedProfilePaths, dPath.id];
    const nextAcquired = character.acquiredAbilities.filter(
      a => selectedProfilePaths.includes(a.pathId) || a.pathId === defaultRacialPathId
    );
    if (defaultRacialPathId && !nextAcquired.some(a => a.pathId === defaultRacialPathId && a.rank === 1)) {
      nextAcquired.push({ pathId: defaultRacialPathId, rank: 1 });
    }
    if (!nextAcquired.some(a => a.pathId === dPath.id && a.rank === 1)) {
      nextAcquired.push({ pathId: dPath.id, rank: 1 });
    }

    setDomainPending(false);
    onChange({
      ...character,
      deity: deityName,
      selectedPathIds: nextSelected,
      acquiredAbilities: nextAcquired,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectVoieDuMage = () => {
    setDomainPending(false);
    const nextSelected = [...selectedProfilePaths, 'voie-du-mage'];
    const nextAcquired = character.acquiredAbilities.filter(
      a => selectedProfilePaths.includes(a.pathId) || a.pathId === defaultRacialPathId
    );
    if (defaultRacialPathId && !nextAcquired.some(a => a.pathId === defaultRacialPathId && a.rank === 1)) {
      nextAcquired.push({ pathId: defaultRacialPathId, rank: 1 });
    }
    if (!nextAcquired.some(a => a.pathId === 'voie-du-mage' && a.rank === 1)) {
      nextAcquired.push({ pathId: 'voie-du-mage', rank: 1 });
    }

    onChange({
      ...character,
      selectedPathIds: nextSelected,
      acquiredAbilities: nextAcquired,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectRacial = (targetRacialId?: string) => {
    setDomainPending(false);
    const rId = targetRacialId || defaultRacialPathId;
    if (!rId) return;

    const nextSelected = [...selectedProfilePaths, rId];
    const nextAcquired = character.acquiredAbilities.filter(
      a => selectedProfilePaths.includes(a.pathId) || a.pathId === rId
    );
    if (!nextAcquired.some(a => a.pathId === rId && a.rank === 1)) {
      nextAcquired.push({ pathId: rId, rank: 1 });
    }

    onChange({
      ...character,
      deity: undefined,
      selectedPathIds: nextSelected,
      acquiredAbilities: nextAcquired,
      updatedAt: new Date().toISOString(),
    });
  };

  const renderPrimaryPathCard = (pathId: string, isOptional = false) => {
    const pathData = getPathById(pathId);
    if (!pathData) return null;

    const isSelected = selectedProfilePaths.includes(pathId);
    const isExpanded = expandedPaths[pathId] ?? false;

    return (
      <div
        key={pathId}
        className={`rounded-xl border transition overflow-hidden shadow ${
          isSelected
            ? 'bg-stone-950 border-amber-500 ring-1 ring-amber-500'
            : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
        }`}
      >
        {/* Path Card Header */}
        <div className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-amber-400 font-serif font-black text-lg">{pathData.symbol || '▲'}</span>
            <div>
              <div className="font-serif font-bold text-base text-stone-100 flex items-center flex-wrap gap-2">
                <span>{pathData.name}</span>
                {isOptional && (
                  <span className="text-[10px] bg-sky-950/90 text-sky-300 border border-sky-800 px-2 py-0.5 rounded font-semibold uppercase tracking-wide">
                    Atlas
                  </span>
                )}
                {isSelected && (
                  <span className="text-[10px] bg-amber-500 text-stone-950 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                    Choisie ✓
                  </span>
                )}
              </div>
              <div className="text-xs text-stone-400">
                Rang 1 initial : <strong className="text-amber-200">{pathData.ranks[0]?.title}</strong> ({pathData.ranks[0]?.actionType})
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => togglePathPreview(pathId)}
              className="flex items-center space-x-1 text-xs bg-stone-900 hover:bg-stone-800 text-stone-300 px-3 py-1.5 rounded border border-stone-700 transition"
            >
              <span>{isExpanded ? 'Réduire' : 'Voir les 5 rangs'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => toggleProfilePath(pathId)}
              className={`px-4 py-1.5 rounded text-xs font-bold transition shadow ${
                isSelected
                  ? 'bg-amber-600 text-stone-950 hover:bg-amber-500'
                  : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-600'
              }`}
            >
              {isSelected ? 'Voie Choisie ✓' : 'Choisir cette voie'}
            </button>
          </div>
        </div>

        {/* Preview of Rank 1 always visible, ranks 2-5 when expanded */}
        <div className="px-4 pb-4 pt-1 border-t border-stone-800/80 space-y-2 bg-stone-900/30">
          {/* Rank 1 highlight */}
          <div className="p-2.5 rounded bg-stone-900/70 border border-stone-800">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 text-xs font-mono font-bold flex items-center justify-center">
                  1
                </span>
                <span className="font-semibold text-stone-200 text-xs">
                  {pathData.ranks[0]?.title}
                </span>
                {pathData.ranks[0] && <ActionBadges rank={pathData.ranks[0]} />}
              </div>
              <span className="text-[10px] text-amber-400 font-semibold">
                {isSelected ? 'Acquis au Niv. 1' : 'Disponible au Niv. 1'}
              </span>
            </div>
            <p className="text-xs text-stone-400 pl-7 leading-relaxed">
              {pathData.ranks[0]?.description}
            </p>
            {isSelected && pathData.ranks[0] && (
              <>
                <ExternalAbilitySelector
                  character={character}
                  pathId={pathData.id}
                  rank={pathData.ranks[0]}
                  updateCharacter={handleUpdatePartial}
                />
                <RankChoiceSelector
                  character={character}
                  pathId={pathData.id}
                  rank={pathData.ranks[0]}
                  onChangeChoice={handleRankChoice}
                  requireExplicitChoice
                />
              </>
            )}
          </div>

          {/* Extended Ranks 2-5 when expanded */}
          {isExpanded && (
            <div className="space-y-2 pt-2 border-t border-stone-800/60">
              {pathData.ranks.slice(1).map(r => (
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
    );
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h3 className="font-serif font-bold text-lg text-amber-200">
          Étape 4 : Voies & Capacités de Départ (Niveau 1)
        </h3>
        <p className="text-xs text-stone-400">
          Consultez le contenu détaillé des 5 voies de votre profil et choisissez les <strong>2 voies de départ</strong> pour votre héros. Le rang 1 de chaque voie choisie ainsi que votre voie de peuple sont immédiatement acquis !
        </p>
      </div>

      {/* Counter Bar */}
      <div className="flex items-center justify-between bg-stone-950 p-3.5 rounded-xl border border-stone-800">
        <div className="flex items-center space-x-3 text-xs text-stone-300">
          <span>Voies de profil sélectionnées :</span>
          <strong className={`font-mono text-sm px-2 py-0.5 rounded ${
            selectedProfilePaths.length === 2
              ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
              : 'bg-stone-800 text-stone-300 border border-stone-700'
          }`}>
            {selectedProfilePaths.length} / 2
          </strong>
          {selectedProfilePaths.length < 2 && (
            <span className="text-amber-400 font-medium">
              (Choisissez encore {2 - selectedProfilePaths.length} voie{2 - selectedProfilePaths.length > 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div className="text-xs text-stone-400">
          Cliquez sur une carte pour lire tous ses rangs et faire votre choix.
        </div>
      </div>

      {/* The 5 Profile Paths as Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-serif font-semibold text-sm text-amber-300 uppercase tracking-wider">
            {isHybrid ? `Voies du profil principal (${selectedProfile.name}) :` : `Les 5 Voies du profil ${selectedProfile.name} :`}
          </h4>
          {isHybrid && (
            <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800 uppercase font-semibold">
              Profil Principal
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {selectedProfile.paths.map(pathId => renderPrimaryPathCard(pathId, false))}
        </div>

        {selectedProfile.optionalPaths && selectedProfile.optionalPaths.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-stone-800/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-serif font-semibold text-sm text-sky-300 uppercase tracking-wider">
                Voies supplémentaires (Atlas) — {selectedProfile.name} :
              </h4>
              <span className="text-[11px] text-stone-400">
                {selectedProfile.id === 'pretre'
                  ? 'Prêtre maléfique : remplace la Voie des soins dès le niveau 1.'
                  : 'Peut remplacer une des 5 voies habituelles dès le niveau 1.'}
              </span>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {selectedProfile.optionalPaths.map(pathId => renderPrimaryPathCard(pathId, true))}
            </div>
          </div>
        )}
      </div>

      {/* Secondary Profile Paths for Hybrid Characters */}
      {isHybrid && secondaryProfile && (
        <div className="space-y-4 pt-4 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <h4 className="font-serif font-semibold text-sm text-purple-300 uppercase tracking-wider flex items-center space-x-2">
              <Shuffle className="w-4 h-4 text-purple-400" />
              <span>Voies du profil secondaire ({secondaryProfile.name}) :</span>
            </h4>
            <span className="text-[10px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800 uppercase font-semibold">
              Profil Secondaire
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {getProfileAllPoolPathIds(secondaryProfile).map(pathId => {
              const pathData = getPathById(pathId);
              if (!pathData) return null;

              const isSelected = selectedProfilePaths.includes(pathId);
              const isExpanded = expandedPaths[pathId] ?? false;

              return (
                <div
                  key={pathId}
                  className={`rounded-xl border transition overflow-hidden shadow ${
                    isSelected
                      ? 'bg-stone-950 border-purple-500 ring-1 ring-purple-500'
                      : 'bg-stone-950/60 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {/* Path Card Header */}
                  <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-purple-400 font-serif font-black text-lg">▲</span>
                      <div>
                        <div className="font-serif font-bold text-base text-stone-100 flex items-center space-x-2">
                          <span>{pathData.name}</span>
                          {isSelected && (
                            <span className="text-[10px] bg-purple-600 text-stone-950 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                              Choisie ✓
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400">
                          Rang 1 initial : <strong className="text-purple-200">{pathData.ranks[0]?.title}</strong> ({pathData.ranks[0]?.actionType})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => togglePathPreview(pathId)}
                        className="flex items-center space-x-1 text-xs bg-stone-900 hover:bg-stone-800 text-stone-300 px-3 py-1.5 rounded border border-stone-700 transition"
                      >
                        <span>{isExpanded ? 'Réduire' : 'Voir les 5 rangs'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleProfilePath(pathId)}
                        className={`px-4 py-1.5 rounded text-xs font-bold transition shadow ${
                          isSelected
                            ? 'bg-purple-600 text-stone-950 hover:bg-purple-500'
                            : 'bg-stone-800 text-stone-200 hover:bg-stone-700 border border-stone-600'
                        }`}
                      >
                        {isSelected ? 'Voie Choisie ✓' : 'Choisir cette voie'}
                      </button>
                    </div>
                  </div>

                  {/* Preview of Rank 1 always visible, ranks 2-5 when expanded */}
                  <div className="px-4 pb-4 pt-1 border-t border-stone-800/80 space-y-2 bg-stone-900/30">
                    <div className="p-2.5 rounded bg-stone-900/70 border border-stone-800">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-purple-500 text-stone-950 text-xs font-mono font-bold flex items-center justify-center">
                            1
                          </span>
                          <span className="font-semibold text-stone-200 text-xs">
                            {pathData.ranks[0]?.title}
                          </span>
                          {pathData.ranks[0] && <ActionBadges rank={pathData.ranks[0]} />}
                        </div>
                        <span className="text-[10px] text-purple-400 font-semibold">
                          {isSelected ? 'Acquis au Niv. 1' : 'Disponible au Niv. 1'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 pl-7 leading-relaxed">
                        {pathData.ranks[0]?.description}
                      </p>
                      {isSelected && pathData.ranks[0] && (
                        <>
                          <ExternalAbilitySelector
                            character={character}
                            pathId={pathData.id}
                            rank={pathData.ranks[0]}
                            updateCharacter={handleUpdatePartial}
                          />
                          <RankChoiceSelector
                            character={character}
                            pathId={pathData.id}
                            rank={pathData.ranks[0]}
                            onChangeChoice={handleRankChoice}
                          requireExplicitChoice
                          />
                        </>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="space-y-2 pt-2 border-t border-stone-800/60">
                        {pathData.ranks.slice(1).map(r => (
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
              );
            })}
          </div>
        </div>
      )}


      {/* Racial / Domain Path Section */}
      <Step5ReplacementSection
        character={character}
        onChange={onChange}
        selectedPeople={selectedPeople}
        isPriest={isPriest}
        isMage={isMage}
        isRacialActive={isRacialActive}
        isDomainActive={isDomainActive}
        isVoieDuMageActive={isVoieDuMageActive}
        isReplacementActive={isReplacementActive}
        domainPending={domainPending}
        setDomainPending={setDomainPending}
        domainFilter={domainFilter}
        setDomainFilter={setDomainFilter}
        currentThirdPath={currentThirdPath}
        currentThirdPathId={currentThirdPathId}
        defaultRacialPath={defaultRacialPath}
        currentDeityInfo={currentDeityInfo}
        expandedPaths={expandedPaths}
        togglePathPreview={togglePathPreview}
        handleSelectRacial={handleSelectRacial}
        handleSelectDomain={handleSelectDomain}
        handleSelectVoieDuMage={handleSelectVoieDuMage}
        handleRankChoice={handleRankChoice}
        handleHumanDiversityChange={handleHumanDiversityChange}
        selectedProfilePaths={selectedProfilePaths}
        handleUpdatePartial={handleUpdatePartial}
      />

      {/* Mage Family Bonus Rank 2 Capability at Level 1 */}
      {hasMageBonus && (
        <MageBonusRank2Panel
          character={character}
          onChange={onChange}
          selectedProfilePaths={selectedProfilePaths}
          isVoieDuMageActive={isVoieDuMageActive}
        />
      )}
    </div>
  );
};
