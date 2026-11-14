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
  computeCharacterStats,
  applyRacialDefaults,
  getRacialPathId,
  isDomainPath,
  isMageProfile,
  isRacialReplacementPath,
  getReplacedRacialPath,
  checkWeaponProficiency,
  getDefaultEquipmentForProfile,
  sanitizeCharacterEquipment,
  detectCharacteristicArrayPreset,
} from '../../engine/rulesEngine';
import tablesData from '../../data/tables.json';
import { ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';

import { Step1Peoples } from './steps/Step1Peoples';
import { Step2Identity } from './steps/Step2Identity';
import { Step3Profiles } from './steps/Step3Profiles';
import { Step4Stats } from './steps/Step4Stats';
import { Step5Paths } from './steps/Step5Paths';
import { Step6Equipment } from './steps/Step6Equipment';
import { Step7Summary } from './steps/Step7Summary';

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
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 7;

  // Selected array mode in Step 4 ('polyvalent' | 'expert' | 'specialiste' | 'achat')
  const initialPreset = useMemo(() => {
    if (character.statArrayPreset) {
      return character.statArrayPreset === 'libre' ? 'achat' : character.statArrayPreset;
    }
    return detectCharacteristicArrayPreset(character.baseStats);
  }, [character.statArrayPreset, character.baseStats]);

  const [arrayPreset, setArrayPreset] = useState<string>(initialPreset);

  React.useEffect(() => {
    const rawPreset = character.statArrayPreset === 'libre' ? 'achat' : character.statArrayPreset;
    const currentPreset = rawPreset || detectCharacteristicArrayPreset(character.baseStats);
    setArrayPreset(currentPreset);
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
    return PEOPLES.find(p => p.id === character.peopleId) || PEOPLES[0];
  }, [character.peopleId]);

  const selectedProfile = useMemo(() => {
    return PROFILES.find(p => p.id === character.profileId) || PROFILES[0];
  }, [character.profileId]);

  const computed = useMemo(() => {
    return computeCharacterStats(character);
  }, [character]);

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

  // Roll d20 for ideal & flaw
  const rollIdealAndFlaw = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    const entry = tablesData.idealsAndFlaws.find(i => i.roll === roll);
    if (entry) {
      update({ ideal: entry.ideal, flaw: entry.flaw });
    }
  };

  // Roll starting purse: 2d6 pa
  const rollPurse = () => {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    update({ coins: { ...character.coins, pa: d1 + d2 } });
  };

  // Ensure character.selectedPathIds contains the exact racial, domain or mage path
  React.useEffect(() => {
    const secProf = character.isHybrid && character.secondaryProfileId
      ? PROFILES.find(p => p.id === character.secondaryProfileId)
      : undefined;
    const allProfilePaths = [...selectedProfile.paths, ...(secProf ? secProf.paths : [])];

    const existingThirdPath = character.selectedPathIds.find(id => !allProfilePaths.includes(id));
    if (existingThirdPath && (
      (isDomainPath(existingThirdPath) && (character.profileId === 'pretre' || character.secondaryProfileId === 'pretre')) ||
      (existingThirdPath === 'voie-du-mage' && (isMageProfile(character.profileId) || (character.secondaryProfileId ? isMageProfile(character.secondaryProfileId) : false)))
    )) {
      return;
    }
    const expectedRacial = getRacialPathId(character.peopleId, existingThirdPath);
    if (existingThirdPath !== expectedRacial) {
      const updated = applyRacialDefaults(character, character.peopleId, expectedRacial);
      onChange(updated);
    }
  }, [character.peopleId, character.profileId, character.secondaryProfileId, character.isHybrid, selectedProfile]);

  // Handle Profile Selection
  const handleSelectProfile = (profileId: string) => {
    const prof = PROFILES.find(p => p.id === profileId);
    if (!prof) return;

    const secProf = character.isHybrid && character.secondaryProfileId
      ? PROFILES.find(p => p.id === character.secondaryProfileId)
      : undefined;

    // Pick first two profile paths by default (or 1 from each profile if hybrid)
    const p1 = prof.paths[0];
    const p2 = secProf ? secProf.paths[0] : prof.paths[1];
    const allProfilePathIds = [...prof.paths, ...(secProf ? secProf.paths : [])];

    const existingRacial = character.selectedPathIds.find(id => !allProfilePathIds.includes(id));
    const racialPathId = getRacialPathId(character.peopleId, existingRacial);

    const newAcquired = [
      { pathId: p1, rank: 1 },
      { pathId: p2, rank: 1 },
      { pathId: racialPathId, rank: 1 },
    ];

    // Equip default starting equipment matching new profile & race
    const defaultEq = getDefaultEquipmentForProfile(profileId, character.peopleId);

    const updatedChar: CharacterSheet = {
      ...character,
      profileId,
      profileFamily: prof.isFamilySelectable
        ? (character.profileFamily || (profileFamilyFilter !== 'all' ? (profileFamilyFilter as ProfileFamily) : 'Mystiques'))
        : undefined,
      selectedPathIds: [p1, p2, racialPathId],
      acquiredAbilities: newAcquired,
      equippedArmorId: defaultEq.armorId,
      equippedShieldId: defaultEq.shieldId,
      weapons: defaultEq.weapons,
    };

    const sanitized = sanitizeCharacterEquipment(updatedChar);
    const computedStats = computeCharacterStats(sanitized);
    sanitized.currentHp = computedStats.maxHp;
    sanitized.currentDr = computedStats.maxDr;
    sanitized.currentPc = computedStats.maxPc;
    sanitized.currentPm = computedStats.maxPm;
    update(sanitized);
  };

  const handleFinishWizard = () => {
    const finalComputed = computeCharacterStats(character);
    const finalizedChar: CharacterSheet = {
      ...character,
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

  // Handle People Selection with full racial baseline synchronization
  const handleSelectPeople = (peopleId: string) => {
    const updated = applyRacialDefaults(character, peopleId);
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
    const primary = selectedProfile.primaryStats || ['FOR', 'AGI', 'CON'];
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

  // Toggle selection of a profile path in Step 5
  const toggleProfilePath = (pathId: string) => {
    const secProf = character.isHybrid && character.secondaryProfileId
      ? PROFILES.find(p => p.id === character.secondaryProfileId)
      : undefined;
    const allProfilePathIds = [...selectedProfile.paths, ...(secProf ? secProf.paths : [])];

    const currentProfilePaths = character.selectedPathIds.filter(id => allProfilePathIds.includes(id));
    const existingThirdPath = character.selectedPathIds.find(id => !allProfilePathIds.includes(id))
      || getRacialPathId(character.peopleId);
    const isSpecialThird = isRacialReplacementPath(existingThirdPath);
    const racialPath = getRacialPathId(character.peopleId);
    const thirdPath = isSpecialThird ? existingThirdPath : getRacialPathId(character.peopleId, existingThirdPath);

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

    const nextSelected = [...newProfilePaths, thirdPath];
    const nextAcquired = character.acquiredAbilities.filter(
      a => a.pathId === thirdPath || a.pathId === racialPath || newProfilePaths.includes(a.pathId)
    );
    newProfilePaths.forEach(pid => {
      if (!nextAcquired.some(a => a.pathId === pid && a.rank === 1)) {
        nextAcquired.push({ pathId: pid, rank: 1 });
      }
    });
    if (!nextAcquired.some(a => a.pathId === thirdPath && a.rank === 1)) {
      nextAcquired.push({ pathId: thirdPath, rank: 1 });
    }
    if (isSpecialThird && !nextAcquired.some(a => a.pathId === racialPath && a.rank === 1)) {
      nextAcquired.push({ pathId: racialPath, rank: 1 });
    }

    update({
      selectedPathIds: nextSelected,
      acquiredAbilities: nextAcquired,
    });
  };

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
          {[
            { step: 1, label: 'Peuple' },
            { step: 2, label: 'Identité' },
            { step: 3, label: 'Profil' },
            { step: 4, label: 'Caracs' },
            { step: 5, label: 'Voies' },
            { step: 6, label: 'Équipement' },
            { step: 7, label: 'Bilan' },
          ].map(s => (
            <button
              key={s.step}
              onClick={() => setCurrentStep(s.step)}
              className={`py-1.5 px-2 rounded text-center text-xs font-medium transition flex flex-col items-center ${
                currentStep === s.step
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : currentStep > s.step
                  ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                  : 'bg-stone-950 text-stone-500 border border-stone-800'
              }`}
            >
              <span>{s.step}. {s.label}</span>
            </button>
          ))}
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

      {/* Step 2: Identity */}
      {currentStep === 2 && (
        <Step2Identity
          character={character}
          update={update}
          selectedPeople={selectedPeople}
          suggestRandomName={suggestRandomName}
          rollIdealAndFlaw={rollIdealAndFlaw}
        />
      )}

      {/* Step 3: Profiles */}
      {currentStep === 3 && (
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

      {/* Step 4: Stats */}
      {currentStep === 4 && (
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

      {/* Step 5: Paths */}
      {currentStep === 5 && (
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

      {/* Step 6: Equipment */}
      {currentStep === 6 && (
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

      {/* Step 7: Summary */}
      {currentStep === 7 && (
        <Step7Summary
          character={character}
          computed={computed}
          update={update}
          handleFinishWizard={handleFinishWizard}
        />
      )}

      {/* Stepper Navigation Buttons */}
      <div className="flex justify-between items-center pt-2">
        <button
          disabled={currentStep === 1}
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          className="flex items-center space-x-1 bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-stone-300 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Précédent</span>
        </button>

        {currentStep < totalSteps ? (() => {
          const secProf = character.isHybrid && character.secondaryProfileId
            ? PROFILES.find(p => p.id === character.secondaryProfileId)
            : undefined;
          const allProfilePaths = [...selectedProfile.paths, ...(secProf ? secProf.paths : [])];
          const isStep5Incomplete = currentStep === 5 && character.selectedPathIds.filter(id => allProfilePaths.includes(id)).length < 2;
          return (
            <button
              disabled={isStep5Incomplete}
              onClick={() => setCurrentStep(prev => Math.min(totalSteps, prev + 1))}
              className="flex items-center space-x-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 px-4 py-2 rounded-lg text-sm font-bold transition shadow"
              title={isStep5Incomplete ? "Veuillez choisir 2 voies de profil pour continuer" : undefined}
            >
              <span>Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          );
        })() : (
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
  );
};
