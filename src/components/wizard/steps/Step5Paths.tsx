import React, { useState } from 'react';
import { Shuffle } from 'lucide-react';
import {
  canUseVoieDuMage,
  getDeityByDomainPathId,
  getDomainPathForDeity,
  getPathById,
  getProfileAllPoolPathIds,
  getProfileById,
  getRacialPathId,
  hasMageCreationBonus,
  isDomainPath,
} from '../../../engine/compendium';
import type {
  CharacterSheet,
  ComputedCharacterStats,
  HumanDiversityChoice,
  PeopleData,
  ProfileData,
} from '../../../types/cof2';
import { MageBonusRank2Panel } from './MageBonusRank2Panel';
import { Step5ReplacementSection } from './Step5ReplacementSection';
import { WizardProfilePathCard } from './WizardProfilePathCard';

interface Step5PathsProps {
  character: CharacterSheet;
  computed?: ComputedCharacterStats | null;
  onChange: (updated: CharacterSheet) => void;
  selectedProfile: ProfileData;
  selectedPeople: PeopleData;
  expandedPaths: Record<string, boolean>;
  togglePathPreview: (pathId: string) => void;
  toggleProfilePath: (pathId: string) => void;
}

export const Step5Paths: React.FC<Step5PathsProps> = ({
  character,
  computed,
  onChange,
  selectedProfile,
  selectedPeople,
  expandedPaths,
  togglePathPreview,
  toggleProfilePath,
}) => {
  const secondaryProfile =
    character.isHybrid && character.secondaryProfileId
      ? getProfileById(character.secondaryProfileId)
      : undefined;
  const isHybrid = Boolean(character.isHybrid && secondaryProfile);
  const allProfilePathIds =
    isHybrid && secondaryProfile
      ? [
          ...getProfileAllPoolPathIds(selectedProfile),
          ...getProfileAllPoolPathIds(secondaryProfile),
        ]
      : getProfileAllPoolPathIds(selectedProfile);

  const selectedProfilePaths = character.selectedPathIds.filter((id) =>
    allProfilePathIds.includes(id),
  );
  const isPriest =
    selectedProfile.id === 'pretre' || secondaryProfile?.id === 'pretre';
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

  const explicitThirdPathId =
    character.selectedPathIds.find((id) => !allProfilePathIds.includes(id)) ||
    '';
  const currentThirdPathId = explicitThirdPathId;
  const isDomainActive = isDomainPath(currentThirdPathId);
  const isVoieDuMageActive = currentThirdPathId === 'voie-du-mage';
  const isRacialActive = Boolean(
    currentThirdPathId && !isDomainActive && !isVoieDuMageActive,
  );
  const isReplacementActive = isDomainActive || isVoieDuMageActive;
  const currentThirdPath = currentThirdPathId
    ? getPathById(currentThirdPathId)
    : undefined;
  const currentDeityInfo = currentThirdPathId
    ? getDeityByDomainPathId(currentThirdPathId)
    : undefined;

  const [domainPending, setDomainPending] = useState(false);

  const handleSelectDomain = (deityName: string) => {
    if (!deityName) return;
    const dPath = getDomainPathForDeity(deityName);
    if (!dPath) return;

    const nextSelected = [...selectedProfilePaths, dPath.id];
    const nextAcquired = character.acquiredAbilities.filter(
      (a) =>
        selectedProfilePaths.includes(a.pathId) ||
        a.pathId === defaultRacialPathId,
    );
    if (
      defaultRacialPathId &&
      !nextAcquired.some(
        (a) => a.pathId === defaultRacialPathId && a.rank === 1,
      )
    ) {
      nextAcquired.push({ pathId: defaultRacialPathId, rank: 1 });
    }
    if (!nextAcquired.some((a) => a.pathId === dPath.id && a.rank === 1)) {
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
      (a) =>
        selectedProfilePaths.includes(a.pathId) ||
        a.pathId === defaultRacialPathId,
    );
    if (
      defaultRacialPathId &&
      !nextAcquired.some(
        (a) => a.pathId === defaultRacialPathId && a.rank === 1,
      )
    ) {
      nextAcquired.push({ pathId: defaultRacialPathId, rank: 1 });
    }
    if (
      !nextAcquired.some((a) => a.pathId === 'voie-du-mage' && a.rank === 1)
    ) {
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
      (a) => selectedProfilePaths.includes(a.pathId) || a.pathId === rId,
    );
    if (!nextAcquired.some((a) => a.pathId === rId && a.rank === 1)) {
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

  const renderPathCard = (
    pathId: string,
    options?: { isOptional?: boolean; variant?: 'amber' | 'purple' },
  ) => {
    const pathData = getPathById(pathId);
    if (!pathData) return null;

    return (
      <WizardProfilePathCard
        key={pathId}
        pathData={pathData}
        character={character}
        externalGrants={computed?.externalGrants}
        isSelected={selectedProfilePaths.includes(pathId)}
        isExpanded={expandedPaths[pathId] ?? false}
        isOptional={options?.isOptional}
        variant={options?.variant}
        togglePathPreview={togglePathPreview}
        toggleProfilePath={toggleProfilePath}
        handleUpdatePartial={handleUpdatePartial}
        handleRankChoice={handleRankChoice}
      />
    );
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow space-y-6">
      <div className="border-b border-stone-800 pb-4">
        <h3 className="font-serif font-bold text-lg text-amber-200">
          Étape 4 : Voies & Capacités de Départ (Niveau 1)
        </h3>
        <p className="text-xs text-stone-400">
          Consultez le contenu détaillé des 5 voies de votre profil et choisissez les{' '}
          <strong>2 voies de départ</strong> pour votre héros. Le rang 1 de chaque voie choisie ainsi que votre voie de peuple sont immédiatement acquis !
        </p>
      </div>

      {/* Counter Bar */}
      <div className="flex items-center justify-between bg-stone-950 p-3.5 rounded-xl border border-stone-800">
        <div className="flex items-center space-x-3 text-xs text-stone-300">
          <span>Voies de profil sélectionnées :</span>
          <strong
            className={`font-mono text-sm px-2 py-0.5 rounded ${
              selectedProfilePaths.length === 2
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                : 'bg-stone-800 text-stone-300 border border-stone-700'
            }`}
          >
            {selectedProfilePaths.length} / 2
          </strong>
          {selectedProfilePaths.length < 2 && (
            <span className="text-amber-400 font-medium">
              (Choisissez encore {2 - selectedProfilePaths.length} voie
              {2 - selectedProfilePaths.length > 1 ? 's' : ''})
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
            {isHybrid
              ? `Voies du profil principal (${selectedProfile.name}) :`
              : `Les 5 Voies du profil ${selectedProfile.name} :`}
          </h4>
          {isHybrid && (
            <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800 uppercase font-semibold">
              Profil Principal
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {selectedProfile.paths.map((pathId) => renderPathCard(pathId))}
        </div>

        {selectedProfile.optionalPaths &&
          selectedProfile.optionalPaths.length > 0 && (
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
                {selectedProfile.optionalPaths.map((pathId) =>
                  renderPathCard(pathId, { isOptional: true }),
                )}
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
            {getProfileAllPoolPathIds(secondaryProfile).map((pathId) =>
              renderPathCard(pathId, { variant: 'purple' }),
            )}
          </div>
        </div>
      )}

      {/* Racial / Domain Path Section */}
      <Step5ReplacementSection
        character={character}
        externalGrants={computed?.externalGrants}
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
