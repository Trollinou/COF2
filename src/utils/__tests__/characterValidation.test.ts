import { describe, it, expect } from 'vitest';
import { validateAndMigrateCharacter } from '../characterValidation';

describe('Character Validation & Migration', () => {
  it('handles null, undefined or non-object safely', () => {
    const resNull = validateAndMigrateCharacter(null);
    expect(resNull.isValid).toBe(false);
    expect(resNull.character).toBeDefined();
    expect(resNull.character.level).toBe(1);

    const resStr = validateAndMigrateCharacter('not-an-object');
    expect(resStr.isValid).toBe(false);
    expect(resStr.character).toBeDefined();
  });

  it('repairs missing stats and fields', () => {
    const incomplete = {
      name: 'Ragnar',
      level: 3,
      baseStats: {
        FOR: 3,
        // Missing other stats
      },
      // Missing selectedPathIds, weapons, etc.
    };

    const res = validateAndMigrateCharacter(incomplete);
    expect(res.character.name).toBe('Ragnar');
    expect(res.character.level).toBe(3);
    expect(res.character.baseStats.FOR).toBe(3);
    expect(res.character.baseStats.AGI).toBeDefined();
    expect(Array.isArray(res.character.selectedPathIds)).toBe(true);
    expect(Array.isArray(res.character.weapons)).toBe(true);
    expect(res.character.coins).toBeDefined();
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('validates a correct character with no warnings', () => {
    const valid = validateAndMigrateCharacter({
      id: 'char_123',
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      name: 'Valros',
      playerName: 'Joueur',
      peopleId: 'humain',
      profileId: 'guerrier',
      level: 1,
      baseStats: {
        FOR: 2,
        AGI: 1,
        CON: 1,
        PER: 0,
        INT: 0,
        VOL: 0,
        CHA: 0,
      },
      selectedPathIds: ['voie-du-combat', 'voie-du-soldat'],
      acquiredAbilities: [{ pathId: 'voie-du-combat', rank: 1 }],
      currentHp: 12,
      maxHpBonus: 0,
      currentDr: 3,
      currentPc: 2,
      currentPm: 0,
      weapons: [],
      inventory: [],
      coins: { pa: 10, pc: 0, po: 0 },
    });

    expect(valid.isValid).toBe(true);
    expect(valid.warnings).toHaveLength(0);
    expect(valid.character.name).toBe('Valros');
  });

  it('preserves valid IDs, pathRankChoices, and externalAbilityChoices', () => {
    const charData = {
      name: 'Legolas',
      profileId: 'rodeur',
      secondaryProfileId: 'pretre',
      selectedPathIds: ['voie-de-la-seduction', 'voie-du-deplacement'],
      acquiredAbilities: [
        { pathId: 'voie-de-la-seduction', rank: 1 },
        { pathId: 'voie-du-deplacement', rank: 2 },
      ],
      pathRankChoices: {
        'voie-de-la-seduction_1': 'opt_1',
      },
      externalAbilityChoices: {
        ext_1: { pathId: 'voie-du-deplacement', rank: 1 },
      },
    };

    const res = validateAndMigrateCharacter(charData);
    expect(res.character.profileId).toBe('rodeur');
    expect(res.character.secondaryProfileId).toBe('pretre');
    expect(res.character.selectedPathIds).toEqual(['voie-de-la-seduction', 'voie-du-deplacement']);
    expect(res.character.acquiredAbilities).toEqual([
      { pathId: 'voie-de-la-seduction', rank: 1 },
      { pathId: 'voie-du-deplacement', rank: 2 },
    ]);
    expect(res.character.pathRankChoices?.['voie-de-la-seduction_1']).toBe('opt_1');
    expect(res.character.externalAbilityChoices?.ext_1).toEqual({
      pathId: 'voie-du-deplacement',
      rank: 1,
    });
  });

  it('preserves statArrayPreset through validation and migration', () => {
    const res = validateAndMigrateCharacter({
      name: 'Gimli',
      statArrayPreset: 'specialiste',
    });
    expect(res.character.statArrayPreset).toBe('specialiste');
  });

  it('sanitizes malicious payload against prototype pollution and non-finite numbers', () => {
    const maliciousPayload = {
      name: 'Hacker',
      manualStatBonuses: {
        __proto__: { polluted: true },
        constructor: { evil: true },
        FOR: 2,
        INVALID_STAT: 99,
        AGI: 'not-a-number',
      },
      pathRankChoices: {
        __proto__: 'exploit',
        'safe_path_1': 'choice_a',
      },
      externalAbilityChoices: {
        __proto__: { pathId: 'hack', rank: 1 },
        safe_ext: { pathId: 'voie-du-combat', rank: 2 },
      },
      racialStatChoices: ['FOR', 'MALICIOUS_KEY', 123, null],
      currentHp: NaN,
      maxHpBonus: Infinity,
      coins: { pa: NaN, pc: 5, po: -Infinity },
    };

    const res = validateAndMigrateCharacter(maliciousPayload);

    // Verifies prototype pollution keys are ignored
    expect((res.character.manualStatBonuses as any)?.__proto__?.polluted).toBeUndefined();
    expect((res.character.manualStatBonuses as any)?.INVALID_STAT).toBeUndefined();
    expect(res.character.manualStatBonuses?.FOR).toBe(2);
    expect(res.character.manualStatBonuses?.AGI).toBeUndefined();

    // Verifies path choices sanitization
    expect(res.character.pathRankChoices?.safe_path_1).toBe('choice_a');
    expect((res.character.pathRankChoices as any)?.__proto__).not.toBe('exploit');

    // Verifies racial stat choices filtering
    expect(res.character.racialStatChoices).toEqual(['FOR']);

    // Verifies finite numbers fallback
    expect(Number.isFinite(res.character.currentHp)).toBe(true);
    expect(res.character.maxHpBonus).toBe(0);
    expect(res.character.coins.pa).toBe(0);
    expect(res.character.coins.pc).toBe(5);
    expect(res.character.coins.po).toBe(0);
  });
});

