import { useReducer, useCallback, useEffect } from 'react';
import { CharacterSheet } from '../types/cof2';

const MAX_HISTORY = 30;

export interface HistoryState {
  past: CharacterSheet[];
  present: CharacterSheet;
  future: CharacterSheet[];
}

export type HistoryAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET'; payload: CharacterSheet; record?: boolean }
  | { type: 'RESET'; payload: CharacterSheet };

export function characterHistoryReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };
    }
    case 'SET': {
      if (action.payload === state.present) return state;
      if (action.record === false) {
        return {
          ...state,
          present: action.payload,
        };
      }
      return {
        past: [...state.past.slice(-MAX_HISTORY), state.present],
        present: action.payload,
        future: [],
      };
    }
    case 'RESET': {
      return {
        past: [],
        present: action.payload,
        future: [],
      };
    }
    default:
      return state;
  }
}

export function useCharacterHistory(initialCharacter: CharacterSheet) {
  const [state, dispatch] = useReducer(characterHistoryReducer, {
    past: [],
    present: initialCharacter,
    future: [],
  });

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const setCharacter = useCallback((updated: CharacterSheet, record = true) => {
    dispatch({ type: 'SET', payload: updated, record });
  }, []);
  const resetCharacter = useCallback((fresh: CharacterSheet) => {
    dispatch({ type: 'RESET', payload: fresh });
  }, []);

  // Keyboard shortcut listener (Cmd+Z / Ctrl+Z / Cmd+Shift+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA';

      // Let native input undo work when typing inside text controls
      if (isInputFocused) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (modifier && e.key.toLowerCase() === 'y' && !isMac) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    character: state.present,
    setCharacter,
    resetCharacter,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    historyDepth: state.past.length,
  };
}
