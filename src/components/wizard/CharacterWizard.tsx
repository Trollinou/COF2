import React from 'react';
import type { CharacterSheet } from '../../types/cof2';
import { ChevronRight, ChevronLeft, CheckCircle2, Lock } from 'lucide-react';
import { useWizardState } from '../../hooks/useWizardState';
import { Step1Peoples } from './steps/Step1Peoples';
import { Step2Identity } from './steps/Step2Identity';
import { Step3Profiles } from './steps/Step3Profiles';
import { Step4Stats } from './steps/Step4Stats';
import { Step5Paths } from './steps/Step5Paths';
import { Step6Equipment } from './steps/Step6Equipment';
import { Step7Summary } from './steps/Step7Summary';
import { WIZARD_STEPS } from '../../utils/uiConstants';

interface CharacterWizardProps {
  character: CharacterSheet;
  onChange: (updated: CharacterSheet) => void;
  onFinish: () => void;
}

export const CharacterWizard: React.FC<CharacterWizardProps> = ({
  character,
  onChange,
  onFinish,
}) => {
  const {
    currentStep,
    setCurrentStep,
    totalSteps,
    arrayPreset,
    setArrayPreset,
    expandedPaths,
    togglePathPreview,
    peopleFilter,
    setPeopleFilter,
    peopleSearch,
    setPeopleSearch,
    profileFamilyFilter,
    setProfileFamilyFilter,
    profileSearch,
    setProfileSearch,
    isCompagnonPeople,
    filteredPeoples,
    filteredProfiles,
    selectedPeople,
    selectedProfile,
    computed,
    update,
    handleSelectPeople,
    handleSelectProfile,
    handleAutoAssignStats,
    handleSetStatValue,
    handleSelectArrayPreset,
    handleResetPointBuy,
    handleAddWeapon,
    handleRemoveWeapon,
    rollPurse,
    suggestRandomName,
    rollIdeal,
    rollFlaw,
    handleFinishWizard,
    toggleProfilePath,
    maxUnlockedStep,
    currentStepValidation,
  } = useWizardState(character, onChange, onFinish);

  return (
    <div className="max-w-6xl xl:max-w-7xl 2xl:max-w-[1800px] mx-auto px-4 py-8 space-y-6">
      {/* Wizard Progress Stepper */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow">
        <div className="flex items-center justify-between mb-3">
          <span className="font-serif font-bold text-amber-200 text-sm">
            Assistant de Création de Héros (COF2)
          </span>
          <span className="text-xs font-mono text-stone-400">
            Étape {currentStep} sur {totalSteps}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {WIZARD_STEPS.map(s => {
            const isLocked = s.step > maxUnlockedStep;
            return (
              <button
                key={s.step}
                type="button"
                disabled={isLocked}
                onClick={() => {
                  if (!isLocked) setCurrentStep(s.step);
                }}
                title={isLocked ? 'Complétez les étapes précédentes pour débloquer' : undefined}
                className={`py-1.5 px-2 rounded text-center text-xs font-medium transition flex items-center justify-center gap-1 ${
                  currentStep === s.step
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : isLocked
                    ? 'bg-stone-950 text-stone-600 border border-stone-800/70 opacity-50 cursor-not-allowed'
                    : currentStep > s.step
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40 hover:bg-amber-950/60'
                    : 'bg-stone-950 text-stone-300 border border-stone-700 hover:border-amber-600/60'
                }`}
              >
                {isLocked && <Lock className="w-3 h-3 shrink-0" />}
                <span>{s.step}. {s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 1: Peoples */}
      {currentStep === 1 && (
        <Step1Peoples
          character={character}
          update={update}
          onChange={onChange}
          selectedPeople={selectedPeople}
          handleSelectPeople={handleSelectPeople}
          isCompagnonPeople={isCompagnonPeople}
          peopleFilter={peopleFilter}
          setPeopleFilter={setPeopleFilter}
          peopleSearch={peopleSearch}
          setPeopleSearch={setPeopleSearch}
          filteredPeoples={filteredPeoples}
        />
      )}

      {/* Step 2: Profiles */}
      {currentStep === 2 && (
        <Step3Profiles
          character={character}
          update={update}
          selectedProfile={selectedProfile}
          handleSelectProfile={handleSelectProfile}
          profileFamilyFilter={profileFamilyFilter}
          setProfileFamilyFilter={setProfileFamilyFilter}
          profileSearch={profileSearch}
          setProfileSearch={setProfileSearch}
          filteredProfiles={filteredProfiles}
        />
      )}

      {/* Step 3: Stats */}
      {currentStep === 3 && selectedPeople && selectedProfile && computed && (
        <Step4Stats
          character={character}
          selectedProfile={selectedProfile}
          selectedPeople={selectedPeople}
          computed={computed}
          arrayPreset={arrayPreset}
          setArrayPreset={setArrayPreset}
          handleAutoAssignStats={handleAutoAssignStats}
          handleSetStatValue={handleSetStatValue}
          handleSelectArrayPreset={handleSelectArrayPreset}
          handleResetPointBuy={handleResetPointBuy}
        />
      )}

      {/* Step 4: Paths */}
      {currentStep === 4 && selectedPeople && selectedProfile && (
        <Step5Paths
          character={character}
          computed={computed}
          onChange={onChange}
          selectedProfile={selectedProfile}
          selectedPeople={selectedPeople}
          expandedPaths={expandedPaths}
          togglePathPreview={togglePathPreview}
          toggleProfilePath={toggleProfilePath}
        />
      )}

      {/* Step 5: Equipment */}
      {currentStep === 5 && selectedPeople && selectedProfile && (
        <Step6Equipment
          character={character}
          computed={computed}
          update={update}
          selectedProfile={selectedProfile}
          selectedPeople={selectedPeople}
          handleAddWeapon={handleAddWeapon}
          handleRemoveWeapon={handleRemoveWeapon}
          rollPurse={rollPurse}
        />
      )}

      {/* Step 6: Identity & Languages */}
      {currentStep === 6 && selectedPeople && computed && (
        <Step2Identity
          character={character}
          computed={computed}
          update={update}
          selectedPeople={selectedPeople}
          suggestRandomName={suggestRandomName}
          rollIdeal={rollIdeal}
          rollFlaw={rollFlaw}
        />
      )}

      {/* Step 7: Summary (Read-only) */}
      {currentStep === 7 && computed && (
        <Step7Summary
          character={character}
          computed={computed}
          selectedPeople={selectedPeople}
          selectedProfile={selectedProfile}
          handleFinishWizard={handleFinishWizard}
        />
      )}

      {/* Stepper Navigation Buttons */}
      <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
        <button
          disabled={currentStep === 1}
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          className="flex items-center space-x-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Précédent</span>
        </button>

        <div className="flex items-center gap-3">
          {currentStep < totalSteps && !currentStepValidation.valid && currentStepValidation.reason && (
            <span className="text-xs text-amber-300 bg-amber-950/50 border border-amber-800/60 px-3 py-1.5 rounded-lg">
              {currentStepValidation.reason}
            </span>
          )}

          {currentStep < totalSteps ? (
            <button
              disabled={!currentStepValidation.valid}
              onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
              className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 px-4 py-2 rounded-lg text-sm font-bold transition shadow"
              title={currentStepValidation.reason ?? undefined}
            >
              <span>Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinishWizard}
              className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow"
            >
              <span>Ouvrir la Fiche</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
