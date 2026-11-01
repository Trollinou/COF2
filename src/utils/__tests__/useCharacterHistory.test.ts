import { describe, it, expect } from 'vitest';
import { characterHistoryReducer, HistoryState } from '../useCharacterHistory';
import { createDefaultCharacter } from '../../engine/rulesEngine';

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
