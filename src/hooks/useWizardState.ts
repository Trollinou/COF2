import { useEffect, useMemo, useState } from 'react';
import { commands, type StepValidationResult } from '../bindings';
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
} from '../engine/compendium';
import {
  computeSheetAsync,
} from '../engine/rustBridge';
import { useComputedSheet } from './useComputedSheet';
import tablesData from '../data/tables.json';

export function useWizardState(
  character: CharacterSheet,
  onChange: (updated: CharacterSheet) => void,
  onFinish: () => void,
) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 7;

  useEffect(() => {
    if (character.creationCompleted === false) {
      commands.validateWizardStateCharacter(character, 1).then((res) => {
        setCurrentStep(Math.min(6, res.maxUnlockedStep));
      });
    }
  }, []);

  // Selected array mode in Step 3 ('polyvalent' | 'expert' | 'specialiste' | 'achat' | '')
  const initialPreset = useMemo(() => {
    if (!character.statArrayPreset) {
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
    if (rawPreset) {
      setArrayPreset(rawPreset);
      return;
    }
    let cancelled = false;
    commands.detectStatArrayPreset(character.baseStats).then((detected) => {
      if (!cancelled) setArrayPreset(detected);
    });
    return () => {
      cancelled = true;
    };
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

  // Maintain coherence of paths & rank-2 abilities via Rust engine
  useEffect(() => {
    if (!selectedProfile || !selectedPeople) return;
    let cancelled = false;
    commands.sanitizeWizardPathsCharacter(character).then((sanitized) => {
      if (cancelled) return;
      const changed =
        JSON.stringify(sanitized.selectedPathIds) !== JSON.stringify(character.selectedPathIds) ||
        JSON.stringify(sanitized.acquiredAbilities) !== JSON.stringify(character.acquiredAbilities) ||
        sanitized.deity !== character.deity;
      if (changed) {
        onChange(sanitized);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [character.peopleId, character.profileId, character.profileFamily, character.secondaryProfileId, character.isHybrid, selectedProfile, selectedPeople]);

  // Handle Profile Selection via Rust engine
  const handleSelectProfile = async (profileId: string) => {
    const updated = await commands.selectProfileWithDefaultsCharacter(character, profileId);
    onChange(updated);
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

  const handleAddWeapon = async (weaponRefId: string) => {
    const w = WEAPONS.find(item => item.id === weaponRefId);
    if (!w) return;
    const eqOpts = await commands.getEquipmentOptionsCharacter(character);
    const allowedOption = eqOpts.allowedWeapons.find(item => item.weaponId === w.id);
    if (!allowedOption) return;

    const newWeapon: CharacterWeaponInstance = {
      id: 'w_' + Date.now(),
      weaponRefId: w.id,
      name: w.name,
      damage: w.damage,
      range: w.range,
      category: w.category,
      bonusAttack: 0,
      bonusDamage: 0,
      requiresTwoHands: allowedOption.requiresTwoHands,
    };

    update({
      weapons: [...(character.weapons ?? []), newWeapon],
    });
  };

  const handleRemoveWeapon = (weaponId: string) => {
    update({
      weapons: (character.weapons ?? []).filter(w => w.id !== weaponId),
    });
  };

  // Handle People Selection without pre-selecting stat choices or Demi-elfe cultural path
  const handleSelectPeople = async (peopleId: string) => {
    const updatedRecord = await commands.applyRacialDefaultsCharacter(
      character,
      peopleId,
      null,
      true,
    );
    onChange(updatedRecord);
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

  // Auto assign characteristics based on array preset & profile's primary stats via Rust engine
  const handleAutoAssignStats = async (presetId: string = arrayPreset) => {
    if (!presetId) return;
    setArrayPreset(presetId);
    const updated = await commands.autoAssignStatArrayCharacter(character, presetId);
    onChange(updated);
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

  // Toggle selection of a profile path via Rust engine
  const toggleProfilePath = async (pathId: string) => {
    const updated = await commands.toggleWizardProfilePathCharacter(character, pathId);
    onChange(updated);
  };

  const [maxUnlockedStep, setMaxUnlockedStep] = useState<number>(1);
  const [currentStepValidation, setCurrentStepValidation] = useState<StepValidationResult>({
    valid: false,
    reason: null,
  });

  useEffect(() => {
    let cancelled = false;
    commands
      .validateWizardStateCharacter(character, currentStep)
      .then((res) => {
        if (!cancelled) {
          setMaxUnlockedStep(res.maxUnlockedStep);
          setCurrentStepValidation(res.stepResult);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [character, currentStep]);


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
