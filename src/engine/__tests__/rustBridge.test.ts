import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDefaultCharacter } from '../rulesEngine';
import {
  applyLevelUpAsync,
  computeSheetAsync,
  formatIpcError,
  fromCharacterRecord,
  rollbackLevelAsync,
  toCharacterRecord,
} from '../rustBridge';

describe('rustBridge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('toCharacterRecord converts undefined optional fields to null for Rust IPC', () => {
    const char = createDefaultCharacter();
    const record = toCharacterRecord(char);

    expect(record.id).toBe(char.id);
    expect(record.peopleId).toBe(char.peopleId);
    expect(record.profileId).toBe(char.profileId);
    expect(record.deity).toBeNull();
    expect(record.equippedShieldId).toBeNull();
    expect(record.secondaryProfileId).toBeNull();
  });

  it('fromCharacterRecord restores a valid CharacterSheet from a CharacterRecord', () => {
    const char = createDefaultCharacter();
    char.name = 'Aldric';
    char.level = 3;

    const record = toCharacterRecord(char);
    const restored = fromCharacterRecord(record);

    expect(restored.name).toBe('Aldric');
    expect(restored.level).toBe(3);
    expect(restored.deity).toBeUndefined();
  });

  it('formatIpcError formats Cancelled and message errors cleanly', () => {
    expect(formatIpcError({ kind: 'Cancelled' })).toBe('Annulé');
    expect(formatIpcError({ kind: 'Rules', message: 'Niveau invalide' })).toBe('Niveau invalide');
  });

  it('computeSheetAsync uses TS fallback in non-Tauri Web mode', async () => {
    const char = createDefaultCharacter();
    const stats = await computeSheetAsync(char);

    expect(stats.maxHp).toBeGreaterThan(0);
    expect(stats.defense).toBeGreaterThan(0);
  });

  it('applyLevelUpAsync and rollbackLevelAsync delegate to fallback in non-Tauri Web mode', async () => {
    const char = createDefaultCharacter();
    const step = {
      level: 2,
      hpGain: 6,
      abilitiesLearned: [],
      selectedPathIds: char.selectedPathIds,
      timestamp: new Date().toISOString(),
    };

    const leveled = await applyLevelUpAsync(char, step, async () => ({
      ...char,
      level: 2,
    }));
    expect(leveled.level).toBe(2);

    const rolledBack = await rollbackLevelAsync(leveled, 1, () => ({
      ...leveled,
      level: 1,
    }));
    expect(rolledBack.level).toBe(1);
  });
});
