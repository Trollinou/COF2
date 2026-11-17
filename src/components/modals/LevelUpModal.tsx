import React from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Heart,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  getPathById,
  getReplacedRacialPath,
  isPathInProfilePool,
  isRacialReplacementPath,
} from '../../engine/compendium';
import { useLevelUpState } from '../../hooks/useLevelUpState';
import type { CharacterSheet } from '../../types/cof2';
import { LanguageSelectorPanel } from '../shared/LanguageSelectorPanel';
import { LevelUpHybridSection } from './LevelUpHybridSection';
import { LevelUpPathCard } from './LevelUpPathCard';
import { PrestigePathSelector } from './PrestigePathSelector';

interface LevelUpModalProps {
  character: CharacterSheet;
  isOpen: boolean;
  onClose: () => void;
  onApply: (updated: CharacterSheet) => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  character,
  isOpen,
  onClose,
  onApply,
}) => {
  const {
    profile,
    newLevel,
    acquired,
    draftCharacter,
    projectedStats,
    showLanguageSection,
    modalPathIds,
    selectedPrestigeId,
    setSelectedPrestigeId,
    selectedHybridProfileId,
    setSelectedHybridProfileId,
    selectedHybridPathId,
    setSelectedHybridPathId,
    expandedPaths,
    pointsToSpend,
    effectiveFamily,
    hasPrestige,
    levelUpHpResult,
    hybridEligibility,
    nonRacialCount,
    languagesLearned,
    talentsLearned,
    allExpanded,
    availableHybridPaths,
    setDraftPathRankChoices,
    setDraftExternalChoices,
    toggleExpand,
    handleToggleExpandAll,
    handleAddPrestigePath,
    handleRemovePrestigePath,
    handleAddHybridPath,
    handleRemoveHybridPath,
    toggleAbility,
    handleConfirm,
    handleRollback,
    handleAddLanguage,
    handleRemoveLanguage,
    handleAddTalent,
    handleRemoveTalent,
  } = useLevelUpState({ character, isOpen, onClose, onApply });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-amber-800/80 rounded-2xl max-w-4xl xl:max-w-5xl 2xl:max-w-6xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 p-5 border-b border-amber-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-stone-950 shadow-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-xl text-amber-200 flex items-center space-x-2">
                <span>Progression : Passage au Niveau {newLevel}</span>
                {character.isHybrid && (
                  <span className="text-[10px] bg-indigo-900/80 text-indigo-200 border border-indigo-700 px-2 py-0.5 rounded font-mono uppercase">
                    Profil Hybride
                  </span>
                )}
              </h3>
              <p className="text-xs text-stone-400">
                {character.name} ({profile.name} • {effectiveFamily})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Gains Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-950 p-4 rounded-xl border border-red-900/40 flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-red-950/60 text-red-400 border border-red-800/50">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-400">Gain de Vigueur</div>
                <div className="font-mono font-bold text-lg text-red-200">
                  +{levelUpHpResult.hpGain} PV
                </div>
                <div className="text-[11px] text-stone-400">
                  {levelUpHpResult.details}
                </div>
              </div>
            </div>

            <div className="bg-stone-950 p-4 rounded-xl border border-amber-900/40 flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/50">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-400">Points de Capacité</div>
                <div className="font-mono font-bold text-lg text-amber-300">
                  {pointsToSpend} point(s) à dépenser
                </div>
              </div>
            </div>
          </div>

          {newLevel >= 3 && !hasPrestige && (
            <PrestigePathSelector
              character={character}
              newLevel={newLevel}
              acquired={acquired}
              selectedPrestigeId={selectedPrestigeId}
              onPrestigeIdChange={setSelectedPrestigeId}
              onAdoptPrestigePath={handleAddPrestigePath}
            />
          )}

          <LevelUpHybridSection
            character={character}
            nonRacialCount={nonRacialCount}
            hybridEligibility={hybridEligibility}
            selectedHybridProfileId={selectedHybridProfileId}
            setSelectedHybridProfileId={setSelectedHybridProfileId}
            selectedHybridPathId={selectedHybridPathId}
            setSelectedHybridPathId={setSelectedHybridPathId}
            availableHybridPaths={availableHybridPaths}
            handleAddHybridPath={handleAddHybridPath}
          />

          {/* Paths & Rank Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif font-semibold text-sm text-amber-200">
                  Voies & Capacités accessibles :
                </h4>
                <p className="text-xs text-stone-400">
                  Vous pouvez investir vos points dans vos voies habituelles ou nouvelles voies hybrides ouvertes.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleExpandAll}
                className="flex items-center space-x-1 text-xs text-stone-300 hover:text-amber-200 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 hover:border-stone-700 transition"
              >
                {allExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Réduire tous les détails</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Afficher tous les détails</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {modalPathIds.map(pathId => {
                const pathData = getPathById(pathId);
                if (!pathData) return null;

                const isPrestige = pathData.type === 'prestige';
                const canRemovePrestige =
                  isPrestige &&
                  !character.selectedPathIds.includes(pathId) &&
                  !acquired.some(a => a.pathId === pathId);

                const isHybrid = pathData.type === 'profile' && !isPathInProfilePool(profile, pathId);
                const canRemoveHybrid =
                  isHybrid &&
                  !character.selectedPathIds.includes(pathId) &&
                  !acquired.some(a => a.pathId === pathId);

                const replacedRacial = isRacialReplacementPath(pathId)
                  ? getReplacedRacialPath(character)
                  : null;

                return (
                  <LevelUpPathCard
                    key={pathId}
                    pathData={pathData}
                    character={character}
                    draftCharacter={draftCharacter}
                    externalGrants={projectedStats?.externalGrants}
                    acquired={acquired}
                    newLevel={newLevel}
                    pointsToSpend={pointsToSpend}
                    onToggleAbility={toggleAbility}
                    onChangeRankChoice={(choiceKey, optionId) =>
                      setDraftPathRankChoices(prev => ({ ...prev, [choiceKey]: optionId }))
                    }
                    onUpdateExternalChoices={partial => {
                      if (partial.externalAbilityChoices !== undefined) {
                        setDraftExternalChoices(partial.externalAbilityChoices);
                      }
                    }}
                    isPrestige={isPrestige}
                    onRemovePrestige={handleRemovePrestigePath}
                    canRemovePrestige={canRemovePrestige}
                    isHybrid={isHybrid}
                    onRemoveHybrid={handleRemoveHybridPath}
                    canRemoveHybrid={canRemoveHybrid}
                    replacedRacial={replacedRacial}
                    expanded={Boolean(expandedPaths[pathId])}
                    onToggleExpand={() => toggleExpand(pathId)}
                  />
                );
              })}
            </div>
          </div>

          {showLanguageSection && projectedStats && (
            <LanguageSelectorPanel
              compact
              automaticLanguages={projectedStats.languagesInfo.automaticLanguages}
              selectedLanguages={[...(character.languages || []), ...languagesLearned]}
              secondaryTalents={[...(character.secondaryTalents || []), ...talentsLearned]}
              bonusLanguageSlots={projectedStats.languagesInfo.bonusLanguageSlots}
              usedBonusSlots={projectedStats.languagesInfo.usedBonusSlots}
              argotienSlotCost={projectedStats.languagesInfo.argotienSlotCost}
              literacy={projectedStats.languagesInfo.literacy}
              intNote={projectedStats.languagesInfo.intNote}
              onAddLanguage={handleAddLanguage}
              onRemoveLanguage={handleRemoveLanguage}
              onAddSecondaryTalent={handleAddTalent}
              onRemoveSecondaryTalent={handleRemoveTalent}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <div className="text-xs text-stone-400">
            {pointsToSpend > 0 ? (
              <span className="text-amber-400">
                Il vous reste {pointsToSpend} point(s) de capacité à allouer.
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">
                Tous les points ont été alloués avec succès !
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {character.level > 1 && (
              <button
                type="button"
                onClick={handleRollback}
                className="px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 text-xs font-semibold transition mr-2"
                title="Annule les apprentissages du niveau actuel et rétrograde le héros au niveau précédent"
              >
                Rétrograder au Niv. {character.level - 1}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Valider le Niveau {newLevel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
