import { useEffect, useMemo, useState } from 'react';
import type {
  CharacterSheet,
  CharacterWeaponInstance,
  ProfileFamily,
  StatCode,
} from '../types/cof2';
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
} from '../engine/rulesEngine';
import { computeSheetAsync } from '../engine/rustBridge';
import { useComputedSheet } from './useComputedSheet';
import tablesData from '../data/tables.json';
import {
  validateWizardStep,
  getMaxUnlockedWizardStep,
} from '../components/wizard/wizardValidation';

export function useWizardState(
  character: CharacterSheet,
  onChange: (updated: CharacterSheet) => void,
  onFinish: () => void,
) {
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

  useEffect(() => {
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
  useEffect(() => {
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


  return {
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
  };
}
