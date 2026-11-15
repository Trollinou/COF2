import React, { useState, useMemo } from 'react';
import {
  CharacterSheet,
  StatCode,
  ProfileFamily,
  CharacterWeaponInstance,
} from '../../types/cof2';
import {
  PEOPLES,
  PROFILES,
  WEAPONS,
  applyRacialDefaults,
  getRacialPathId,
  isDomainPath,
  canUseVoieDuMage,
  hasMageCreationBonus,
  isRacialReplacementPath,
  checkWeaponProficiency,
  getDefaultEquipmentForProfile,
  sanitizeCharacterEquipment,
  detectCharacteristicArrayPreset,
  getProfileAllPoolPathIds,
} from '../../engine/rulesEngine';
import { computeSheetAsync } from '../../engine/rustBridge';
import { useComputedSheet } from '../../hooks/useComputedSheet';
import tablesData from '../../data/tables.json';
import { ChevronRight, ChevronLeft, CheckCircle2, Lock } from 'lucide-react';

import { Step1Peoples } from './steps/Step1Peoples';
import { Step2Identity } from './steps/Step2Identity';
import { Step3Profiles } from './steps/Step3Profiles';
import { Step4Stats } from './steps/Step4Stats';
import { Step5Paths } from './steps/Step5Paths';
import { Step6Equipment } from './steps/Step6Equipment';
import { Step7Summary } from './steps/Step7Summary';
import {
  WIZARD_STEPS,
  validateWizardStep,
  getMaxUnlockedWizardStep,
} from './wizardValidation';

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
  const [currentStep, setCurrentStep] = useState<number>(() =>
    character.creationCompleted === false ? Math.min(6, getMaxUnlockedWizardStep(character)) : 1
  );
  const totalSteps = 7;

  // Selected array mode in Step 3 ('polyvalent' | 'expert' | 'specialiste' | 'achat' | '')
  const initialPreset = useMemo(() => {
    if (character.statArrayPreset === undefined || character.statArrayPreset === '') {
      return '';
    }
    return character.statArrayPreset === 'libre' ? 'achat' : character.statArrayPreset;
  }, [character.statArrayPreset]);

  const [arrayPreset, setArrayPreset] = useState<string>(initialPreset);

  React.useEffect(() => {
    if (character.statArrayPreset === undefined || character.statArrayPreset === '') {
      setArrayPreset('');
      return;
    }
    const rawPreset = character.statArrayPreset === 'libre' ? 'achat' : character.statArrayPreset;
    setArrayPreset(rawPreset || detectCharacteristicArrayPreset(character.baseStats));
  }, [character.statArrayPreset, character.baseStats]);

  // Track expanded path previews in Step 5
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});

  // Step 1: Filter & Search for peoples
  const [peopleFilter, setPeopleFilter] = useState<'all' | 'base' | 'compagnon'>('all');
  const [peopleSearch, setPeopleSearch] = useState<string>('');

  // Step 3: Filter & Search for profiles
  const [profileFamilyFilter, setProfileFamilyFilter] = useState<ProfileFamily | 'all'>('all');
  const [profileSearch, setProfileSearch] = useState<string>('');

  const isCompagnonPeople = (id: string) => {
    const p = PEOPLES.find(item => item.id === id);
    return p?.source === 'compagnon';
  };

  const filteredPeoples = useMemo(() => {
    return PEOPLES.filter(p => {
      if (peopleFilter === 'base' && isCompagnonPeople(p.id)) return false;
      if (peopleFilter === 'compagnon' && !isCompagnonPeople(p.id)) return false;
      if (peopleSearch.trim()) {
        const q = peopleSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [peopleFilter, peopleSearch]);

  const filteredProfiles = useMemo(() => {
    return PROFILES.filter(p => {
      if (profileFamilyFilter !== 'all') {
        if (!p.isFamilySelectable && p.family !== profileFamilyFilter) return false;
      }
      if (profileSearch.trim()) {
        const q = profileSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q);
      }
      return true;
    });
  }, [profileFamilyFilter, profileSearch]);

  const togglePathPreview = (pathId: string) => {
    setExpandedPaths(prev => ({ ...prev, [pathId]: !prev[pathId] }));
  };

  const update = (partial: Partial<CharacterSheet>) => {
    onChange({
      ...character,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  };

  const selectedPeople = useMemo(() => {
    return PEOPLES.find(p => p.id === character.peopleId);
  }, [character.peopleId]);

  const selectedProfile = useMemo(() => {
    return PROFILES.find(p => p.id === character.profileId);
  }, [character.profileId]);

  const computed = useComputedSheet(character);

  // Suggest random name based on people and gender
  const suggestRandomName = () => {
    if (!selectedPeople?.names) return;
    const isFem = (character.sex || '').toLowerCase().includes('f');
    const pool = isFem && selectedPeople.names.feminine.length > 0
      ? selectedPeople.names.feminine
      : selectedPeople.names.masculine;

    if (pool && pool.length > 0) {
      const randomName = pool[Math.floor(Math.random() * pool.length)];
      update({ name: randomName });
    }
  };

  // Roll d20 independently for ideal or flaw
  const rollIdeal = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const entry = tablesData.idealsAndFlaws.find(i => i.roll === roll);
    if (entry) {
      update({ ideal: entry.ideal });
    }
  };

  const rollFlaw = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const entry = tablesData.idealsAndFlaws.find(i => i.roll === roll);
    if (entry) {
      update({ flaw: entry.flaw });
    }
  };

  // Roll starting purse: 2d6 pa
  const rollPurse = () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    update({ coins: { ...character.coins, pa: d1 + d2 } });
  };

  // Ensure character.selectedPathIds stays coherent with people/profile,
  // without auto-selecting a 3rd path when Priest or Mage options are available.
  React.useEffect(() => {
    if (!selectedProfile || !selectedPeople) return;

    const secProf = character.isHybrid && character.secondaryProfileId
      ? PROFILES.find(p => p.id === character.secondaryProfileId)
      : undefined;
    const allProfilePaths = [...selectedProfile.paths, ...(secProf ? secProf.paths : [])];

    const hasIneligibleRank2 = !hasMageCreationBonus(character) && character.acquiredAbilities.some(a => a.rank === 2);
    const existingThirdPath = character.selectedPathIds.find(id => !allProfilePaths.includes(id));
    const isPriest = character.profileId === 'pretre' || character.secondaryProfileId === 'pretre';
    const isMage = canUseVoieDuMage(character);
    const isValidReplacement = Boolean(
      existingThirdPath && (
        (isDomainPath(existingThirdPath) && isPriest) ||
        (existingThirdPath === 'voie-du-mage' && isMage)
      )
    );

    if (isValidReplacement && !hasIneligibleRank2) {
      return;
    }

    let updated = character;

    // Only auto-apply racial path if no Priest/Mage replacement choice is pending
    // and the people doesn't have selectable cultural paths left unchosen.
    const hasSelectableCultural = Boolean(selectedPeople.selectableRacialPaths?.length);
    if (!existingThirdPath && !isPriest && !isMage && !hasSelectableCultural) {
      const expectedRacial = getRacialPathId(character.peopleId);
      if (expectedRacial) {
        updated = {
          ...updated,
          selectedPathIds: [...updated.selectedPathIds, expectedRacial],
          acquiredAbilities: updated.acquiredAbilities.some(a => a.pathId === expectedRacial && a.rank === 1)
            ? updated.acquiredAbilities
            : [...updated.acquiredAbilities, { pathId: expectedRacial, rank: 1 }],
        };
      }
    } else if (existingThirdPath && !isValidReplacement && (isDomainPath(existingThirdPath) || existingThirdPath === 'voie-du-mage')) {
      // Remove invalid replacement path
      const keptPaths = updated.selectedPathIds.filter(id => id !== existingThirdPath);
      updated = {
        ...updated,
        deity: isDomainPath(existingThirdPath) ? undefined : updated.deity,
        selectedPathIds: keptPaths,
        acquiredAbilities: updated.acquiredAbilities.filter(a => a.pathId !== existingThirdPath),
      };
    }

    if (!hasMageCreationBonus(updated) && updated.acquiredAbilities.some(a => a.rank === 2)) {
      updated = {
        ...updated,
        acquiredAbilities: updated.acquiredAbilities.filter(a => a.rank !== 2),
      };
    }
    if (updated !== character) {
      onChange(updated);
    }
  }, [character.peopleId, character.profileId, character.profileFamily, character.secondaryProfileId, character.isHybrid, selectedProfile, selectedPeople]);

  // Handle Profile Selection (without pre-selecting profile paths or Psionique family)
  const handleSelectProfile = async (profileId: string) => {
    const prof = PROFILES.find(p => p.id === profileId);
    if (!prof) return;

    const secProf = character.isHybrid && character.secondaryProfileId
      ? PROFILES.find(p => p.id === character.secondaryProfileId)
      : undefined;
    const allProfilePathIds = [...prof.paths, ...(secProf ? secProf.paths : [])];

    const existingThird = character.selectedPathIds.find(id => !allProfilePathIds.includes(id));
    const isPriest = profileId === 'pretre' || character.secondaryProfileId === 'pretre';
    const tempChar: CharacterSheet = {
      ...character,
      profileId,
      profileFamily: undefined,
    };
    const isMage = canUseVoieDuMage(tempChar);

    // Keep racial path only if not Priest/Mage, or if already explicitly chosen
    let nextSelectedPaths: string[] = [];
    let nextAcquired: CharacterSheet['acquiredAbilities'] = [];

    if (!isPriest && !isMage) {
      const hasSelectableCultural = Boolean(selectedPeople?.selectableRacialPaths?.length);
      const racialPathId = existingThird || (!hasSelectableCultural && character.peopleId ? getRacialPathId(character.peopleId) : '');
      if (racialPathId) {
        nextSelectedPaths = [racialPathId];
        nextAcquired = [{ pathId: racialPathId, rank: 1 }];
      }
    }

    // Equip default starting equipment matching new profile & race
    const defaultEq = getDefaultEquipmentForProfile(profileId, character.peopleId || 'humain');

    const updatedChar: CharacterSheet = {
      ...character,
      profileId,
      profileFamily: undefined,
      deity: undefined,
      selectedPathIds: nextSelectedPaths,
      acquiredAbilities: nextAcquired,
      pathRankChoices: {},
      equippedArmorId: defaultEq.armorId,
      equippedShieldId: defaultEq.shieldId,
      weapons: defaultEq.weapons,
    };

    const sanitized = sanitizeCharacterEquipment(updatedChar);
    const computedStats = await computeSheetAsync(sanitized);
    sanitized.currentHp = computedStats.maxHp;
    sanitized.currentDr = computedStats.maxDr;
    sanitized.currentPc = computedStats.maxPc;
    sanitized.currentPm = computedStats.maxPm;
    update(sanitized);
  };

  const handleFinishWizard = async () => {
    const finalComputed = await computeSheetAsync(character);
    const finalizedChar: CharacterSheet = {
      ...character,
      creationCompleted: true,
      currentHp: finalComputed.maxHp,
      currentDr: finalComputed.maxDr,
      currentPc: finalComputed.maxPc,
      currentPm: finalComputed.maxPm,
      updatedAt: new Date().toISOString(),
    };
    onChange(finalizedChar);
    onFinish();
  };

  const handleAddWeapon = (weaponRefId: string) => {
    const w = WEAPONS.find(item => item.id === weaponRefId);
    if (!w) return;
    const check = checkWeaponProficiency(w.id, character.profileId, character.peopleId);
    if (!check.allowed) return;

    const newWeapon: CharacterWeaponInstance = {
      id: 'w_' + Date.now(),
      weaponRefId: w.id,
      name: w.name,
      damage: w.damage,
      range: w.range,
      category: w.category,
      bonusAttack: 0,
      bonusDamage: 0,
      requiresTwoHands: check.requiresTwoHands,
    };

    update({
      weapons: [...character.weapons, newWeapon],
    });
  };

  const handleRemoveWeapon = (weaponId: string) => {
    update({
      weapons: character.weapons.filter(w => w.id !== weaponId),
    });
  };

  // Handle People Selection without pre-selecting stat choices or Demi-elfe cultural path
  const handleSelectPeople = (peopleId: string) => {
    const updated = applyRacialDefaults(character, peopleId, undefined, {
      preserveEmptyChoices: true,
    });
    onChange(updated);
  };

  const createZeroStats = (): Record<StatCode, number> => ({
    FOR: 0,
    AGI: 0,
    CON: 0,
    PER: 0,
    INT: 0,
    VOL: 0,
    CHA: 0,
  });

  // Auto assign characteristics based on array preset & profile's primary stats
  const handleAutoAssignStats = (presetId: string = arrayPreset) => {
    if (!presetId) return;
    const primary = selectedProfile?.primaryStats || ['FOR', 'AGI', 'CON'];
    const allStats: StatCode[] = ['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'];

    if (presetId === 'achat') {
      // Distribute 7 points optimally across primary stats: +3 (4 pts), +2 (2 pts), +1 (1 pt), rest 0
      const newBase = createZeroStats();
      const pointBuySpread = [3, 2, 1];
      primary.forEach((stat, idx) => {
        if (idx < pointBuySpread.length) {
          newBase[stat] = pointBuySpread[idx];
        }
      });
      setArrayPreset('achat');
      update({ baseStats: newBase, statArrayPreset: 'achat' });
      return;
    }

    const arr = tablesData.characteristicArrays.find(a => a.id === presetId);
    if (!arr) return;

    const sortedValues = [...arr.values].sort((a, b) => b - a);
    const secondary = allStats.filter(s => !primary.includes(s));

    const newBase: Record<StatCode, number> = { ...character.baseStats };

    primary.forEach((stat, idx) => {
      newBase[stat] = sortedValues[idx];
    });

    secondary.forEach((stat, idx) => {
      newBase[stat] = sortedValues[primary.length + idx];
    });

    setArrayPreset(presetId);
    update({ baseStats: newBase, statArrayPreset: presetId });
  };

  const handleSelectArrayPreset = (presetId: string) => {
    setArrayPreset(presetId);
    if (presetId === 'achat') {
      update({ baseStats: createZeroStats(), statArrayPreset: 'achat' });
    } else {
      handleAutoAssignStats(presetId);
    }
  };

  const handleResetPointBuy = () => {
    setArrayPreset('achat');
    update({ baseStats: createZeroStats(), statArrayPreset: 'achat' });
  };

  // Swap / set stat value strictly respecting the chosen pool
  const handleSetStatValue = (targetStat: StatCode, newValue: number) => {
    if (arrayPreset === 'achat' || arrayPreset === 'libre') {
      update({
        baseStats: {
          ...character.baseStats,
          [targetStat]: newValue,
        },
        statArrayPreset: 'achat',
      });
      return;
    }

    const currentStats = { ...character.baseStats };
    const oldValue = currentStats[targetStat];
    if (oldValue === newValue) return;

    // Find another stat that currently holds newValue, and swap with it
    const allStats: StatCode[] = ['FOR', 'AGI', 'CON', 'PER', 'INT', 'VOL', 'CHA'];
    const swapStat = allStats.find(s => s !== targetStat && currentStats[s] === newValue);

    if (swapStat) {
      currentStats[swapStat] = oldValue;
    }
    currentStats[targetStat] = newValue;

    update({
      baseStats: currentStats,
      statArrayPreset: arrayPreset,
    });
  };

  // Toggle selection of a profile path in Step 4
  const toggleProfilePath = (pathId: string) => {
    if (!selectedProfile) return;
    const secProf = character.isHybrid && character.secondaryProfileId
      ? PROFILES.find(p => p.id === character.secondaryProfileId)
      : undefined;
    const allProfilePathIds = [
      ...getProfileAllPoolPathIds(selectedProfile),
      ...getProfileAllPoolPathIds(secProf),
    ];

    const currentProfilePaths = character.selectedPathIds.filter(id => allProfilePathIds.includes(id));
    const existingThirdPath = character.selectedPathIds.find(id => !allProfilePathIds.includes(id)) || '';
    const isSpecialThird = existingThirdPath ? isRacialReplacementPath(existingThirdPath) : false;
    const racialPath = getRacialPathId(character.peopleId);
    const thirdPath = existingThirdPath
      ? (isSpecialThird ? existingThirdPath : getRacialPathId(character.peopleId, existingThirdPath))
      : '';

    let newProfilePaths: string[];
    if (currentProfilePaths.includes(pathId)) {
      newProfilePaths = currentProfilePaths.filter(id => id !== pathId);
    } else {
      if (currentProfilePaths.length >= 2) {
        newProfilePaths = [currentProfilePaths[0], pathId];
      } else {
        newProfilePaths = [...currentProfilePaths, pathId];
      }
    }

    const nextSelected = thirdPath ? [...newProfilePaths, thirdPath] : [...newProfilePaths];
    const nextAcquired = character.acquiredAbilities.filter(
      a =>
        (thirdPath && (a.pathId === thirdPath || (isSpecialThird && a.pathId === racialPath))) ||
        newProfilePaths.includes(a.pathId)
    );
    newProfilePaths.forEach(pid => {
      if (!nextAcquired.some(a => a.pathId === pid && a.rank === 1)) {
        nextAcquired.push({ pathId: pid, rank: 1 });
      }
    });
    if (thirdPath && !nextAcquired.some(a => a.pathId === thirdPath && a.rank === 1)) {
      nextAcquired.push({ pathId: thirdPath, rank: 1 });
    }
    if (isSpecialThird && racialPath && !nextAcquired.some(a => a.pathId === racialPath && a.rank === 1)) {
      nextAcquired.push({ pathId: racialPath, rank: 1 });
    }

    update({
      selectedPathIds: nextSelected,
      acquiredAbilities: nextAcquired,
    });
  };

  const maxUnlockedStep = useMemo(() => getMaxUnlockedWizardStep(character), [character]);
  const currentStepValidation = useMemo(
    () => validateWizardStep(currentStep, character),
    [currentStep, character],
  );

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
      {currentStep === 3 && selectedPeople && selectedProfile && (
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
          update={update}
          selectedProfile={selectedProfile}
          selectedPeople={selectedPeople}
          handleAddWeapon={handleAddWeapon}
          handleRemoveWeapon={handleRemoveWeapon}
          rollPurse={rollPurse}
        />
      )}

      {/* Step 6: Identity & Languages */}
      {currentStep === 6 && selectedPeople && (
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
      {currentStep === 7 && (
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
              title={currentStepValidation.reason}
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
