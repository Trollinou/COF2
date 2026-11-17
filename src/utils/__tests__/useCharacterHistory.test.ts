import { describe, it, expect } from 'vitest';
import { characterHistoryReducer, HistoryState } from '../useCharacterHistory';
import type { CharacterSheet } from '../../types/cof2';

function createDefaultCharacter(): CharacterSheet {
  return {
    id: 'char_hist_1',
    version: '1.0.0',
    updatedAt: '2026-01-01T00:00:00.000Z',
    creationCompleted: true,
    name: 'Nouveau Héros',
    playerName: '',
    sex: 'Masculin',
    age: '25',
    height: '1m75',
    weight: '70kg',
    physicalTraits: '',
    languages: [],
    secondaryTalents: [],
    background: '',
    ideal: 'Courage',
    flaw: 'Impulsif',
    notes: '',
    peopleId: 'humain',
    profileId: 'guerrier',
    level: 1,
    baseStats: { FOR: 2, AGI: 1, CON: 1, PER: 0, INT: 0, VOL: 0, CHA: -1 },
    racialStatChoices: ['FOR'],
    racialStatModifiers: { FOR: 1, AGI: 0, CON: 0, PER: 0, INT: 0, VOL: 0, CHA: 0 },
    manualStatBonuses: { FOR: 0, AGI: 0, CON: 0, PER: 0, INT: 0, VOL: 0, CHA: 0 },
    selectedPathIds: [],
    acquiredAbilities: [],
    pathRankChoices: {},
    externalAbilityChoices: {},
    progressionHistory: [],
    currentHp: 10,
    maxHpBonus: 0,
    levelUpHpGains: [],
    currentDr: 3,
    currentPc: 2,
    currentPm: 0,
    weapons: [],
    inventory: [],
    coins: { pa: 0, pc: 0, po: 0 },
  };
}

describe('characterHistoryReducer', () => {
  it('applies SET action and adds previous state to past', () => {
    const char1 = createDefaultCharacter();
    const char2 = { ...char1, name: 'Gimli' };

    const initialState: HistoryState = {
      past: [],
      present: char1,
      future: [],
    };

    const state1 = characterHistoryReducer(initialState, { type: 'SET', payload: char2 });
    expect(state1.present.name).toBe('Gimli');
    expect(state1.past).toHaveLength(1);
    expect(state1.past[0].name).toBe(char1.name);
    expect(state1.future).toHaveLength(0);
  });

  it('undoes previous action correctly', () => {
    const char1 = createDefaultCharacter();
    const char2 = { ...char1, name: 'Legolas' };

    const stateWithHistory: HistoryState = {
      past: [char1],
      present: char2,
      future: [],
    };

    const undone = characterHistoryReducer(stateWithHistory, { type: 'UNDO' });
    expect(undone.present.name).toBe(char1.name);
    expect(undone.past).toHaveLength(0);
    expect(undone.future).toHaveLength(1);
    expect(undone.future[0].name).toBe('Legolas');
  });

  it('redoes previously undone action', () => {
    const char1 = createDefaultCharacter();
    const char2 = { ...char1, name: 'Legolas' };

    const stateUndone: HistoryState = {
      past: [],
      present: char1,
      future: [char2],
    };

    const redone = characterHistoryReducer(stateUndone, { type: 'REDO' });
    expect(redone.present.name).toBe('Legolas');
    expect(redone.past).toHaveLength(1);
    expect(redone.past[0].name).toBe(char1.name);
    expect(redone.future).toHaveLength(0);
  });

  it('clears past and future on RESET', () => {
    const char1 = createDefaultCharacter();
    const fresh = { ...char1, name: 'Gandalf' };

    const state: HistoryState = {
      past: [char1],
      present: char1,
      future: [char1],
    };

    const resetState = characterHistoryReducer(state, { type: 'RESET', payload: fresh });
    expect(resetState.present.name).toBe('Gandalf');
    expect(resetState.past).toHaveLength(0);
    expect(resetState.future).toHaveLength(0);
  });
});
