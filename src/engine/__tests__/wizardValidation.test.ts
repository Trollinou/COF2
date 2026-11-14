import { describe, it, expect } from 'vitest';
import {
  createBlankWizardCharacter,
  applyRacialDefaults,
  computeRacialStatModifiers,
  createDefaultCharacter,
  getProfileById,
  PRIEST_DEITIES,
} from '../rulesEngine';
import {
  validateWizardStep,
  getMaxUnlockedWizardStep,
} from '../../components/wizard/wizardValidation';

describe('Wizard Initialization & Step Validation', () => {
  it('createBlankWizardCharacter starts with no pre-selected choices', () => {
    const blank = createBlankWizardCharacter();
    expect(blank.peopleId).toBe('');
    expect(blank.profileId).toBe('');
    expect(blank.profileFamily).toBeUndefined();
    expect(blank.statArrayPreset).toBe('');
    expect(blank.selectedPathIds).toEqual([]);
    expect(blank.acquiredAbilities).toEqual([]);
    expect(blank.sex).toBe('');
    expect(blank.name).toBe('');
    expect(blank.playerName).toBe('');
    expect(blank.height).toBe('');
    expect(blank.weight).toBe('');

    expect(validateWizardStep(1, blank).valid).toBe(false);
    expect(getMaxUnlockedWizardStep(blank)).toBe(1);
  });

  it('Step 1 (Peuple) requires people, racial stat choices, and Demi-elfe heritage', () => {
    const blank = createBlankWizardCharacter();

    // Humain has 1 statChoice (+1 ANY_LOWEST) -> must not be pre-selected
    const human = applyRacialDefaults(blank, 'humain', undefined, {
      preserveEmptyChoices: true,
    });
    expect(human.racialStatChoices).toEqual([]);
    expect(validateWizardStep(1, human).valid).toBe(false);

    // Once statChoice is picked, Step 1 is valid
    human.racialStatChoices = ['CHA'];
    human.racialStatModifiers = computeRacialStatModifiers('humain', ['CHA']);
    expect(validateWizardStep(1, human).valid).toBe(true);

    // Demi-elfe requires choosing cultural heritage path
    const halfElf = applyRacialDefaults(blank, 'demi-elfe', undefined, {
      preserveEmptyChoices: true,
    });
    expect(halfElf.selectedPathIds).toEqual([]);
    expect(validateWizardStep(1, halfElf).valid).toBe(false);

    const halfElfChosen = applyRacialDefaults(blank, 'demi-elfe', 'voie-des-elfes-hauts', {
      preserveEmptyChoices: true,
    });
    halfElfChosen.racialStatChoices = ['CHA', 'FOR'];
    expect(validateWizardStep(1, halfElfChosen).valid).toBe(true);
  });

  it('Lutins automatically lock sex to Masculin (Farfadet) or Féminin (Fée)', () => {
    const blank = createBlankWizardCharacter();
    const farfadet = applyRacialDefaults(blank, 'farfadet', undefined, {
      preserveEmptyChoices: true,
    });
    expect(farfadet.sex).toBe('Masculin');

    const fee = applyRacialDefaults(blank, 'fee', undefined, {
      preserveEmptyChoices: true,
    });
    expect(fee.sex).toBe('Féminin');
  });

  it('Step 2 (Profil) requires profile and Psionique family when applicable', () => {
    const char = createBlankWizardCharacter();
    expect(validateWizardStep(2, char).valid).toBe(false);

    char.profileId = 'psionique';
    expect(validateWizardStep(2, char).valid).toBe(false);

    char.profileFamily = 'Mages';
    expect(validateWizardStep(2, char).valid).toBe(true);
  });

  it('Step 3 (Caracs) requires a method and full point-buy allocation in achat mode', () => {
    const char = createBlankWizardCharacter();
    expect(validateWizardStep(3, char).valid).toBe(false);

    char.statArrayPreset = 'achat';
    expect(validateWizardStep(3, char).valid).toBe(false);

    char.baseStats = { FOR: 3, AGI: 2, CON: 1, PER: 0, INT: 0, VOL: 0, CHA: 0 };
    expect(validateWizardStep(3, char).valid).toBe(true);
  });

  it('Step 4 (Voies) enforces 2 profile paths, 3rd path, deity for Priest, and rank choices', () => {
    const char = createDefaultCharacter();
    const priest = getProfileById('pretre')!;
    const deity = PRIEST_DEITIES[0];
    char.profileId = 'pretre';
    char.selectedPathIds = [priest.paths[0], priest.paths[1]];
    char.acquiredAbilities = [
      { pathId: priest.paths[0], rank: 1 },
      { pathId: priest.paths[1], rank: 1 },
    ];
    // Missing 3rd path
    expect(validateWizardStep(4, char).valid).toBe(false);

    // Domain path without deity
    char.selectedPathIds.push(deity.domainPathId);
    char.acquiredAbilities.push({ pathId: deity.domainPathId, rank: 1 });
    expect(validateWizardStep(4, char).valid).toBe(false);

    char.deity = deity.name;
    expect(validateWizardStep(4, char).valid).toBe(true);
  });

  it('Step 6 (Identité) requires name, playerName, sex, height, weight and all bonus language slots used', () => {
    const char = createDefaultCharacter();
    char.name = 'Aldric';
    char.playerName = 'Etienne';
    char.sex = 'Masculin';
    char.height = '1m75';
    char.weight = '72 kg';
    char.baseStats.INT = 2; // 2 bonus language slots
    char.languages = ['Elfique']; // 1 of 2 used
    expect(validateWizardStep(6, char).valid).toBe(false);

    char.languages = ['Elfique', 'Nain'];
    expect(validateWizardStep(6, char).valid).toBe(true);
  });
});
