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
});

