import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CharacterSheet } from "../../types/cof2";
import {
  formatIpcError,
  fromCharacterRecord,
  toCharacterRecord,
} from "../rustBridge";

function makeMinimalCharacter(): CharacterSheet {
  return {
    id: "char_test_1",
    version: "1.0.0",
    updatedAt: "2026-01-01T00:00:00.000Z",
    creationCompleted: true,
    name: "Aldric",
    playerName: "Etienne",
    sex: "Masculin",
    age: "25",
    height: "1m80",
    weight: "75kg",
    physicalTraits: "",
    languages: [],
    secondaryTalents: [],
    background: "",
    ideal: "Courage",
    flaw: "Impulsif",
    notes: "",
    peopleId: "humain",
    profileId: "guerrier",
    level: 1,
    baseStats: { FOR: 2, AGI: 1, CON: 1, PER: 0, INT: 0, VOL: 0, CHA: -1 },
    racialStatChoices: ["FOR"],
    racialStatModifiers: { FOR: 1, AGI: 0, CON: 0, PER: 0, INT: 0, VOL: 0, CHA: 0 },
    manualStatBonuses: {},
    selectedPathIds: ["voie-du-combat", "voie-du-bouclier", "voie-de-l-humain"],
    acquiredAbilities: [
      { pathId: "voie-du-combat", rank: 1 },
      { pathId: "voie-du-bouclier", rank: 1 },
      { pathId: "voie-de-l-humain", rank: 1 },
    ],
    currentHp: 12,
    maxHpBonus: 0,
    currentDr: 3,
    currentPc: 1,
    currentPm: 0,
    weapons: [],
    inventory: [],
    coins: { pa: 0, pc: 0, po: 0 },
  };
}

describe("rustBridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("toCharacterRecord converts undefined optional fields to null for Rust IPC", () => {
    const char = makeMinimalCharacter();
    const record = toCharacterRecord(char);

    expect(record.id).toBe(char.id);
    expect(record.peopleId).toBe(char.peopleId);
    expect(record.profileId).toBe(char.profileId);
    expect(record.deity).toBeNull();
    expect(record.equippedShieldId).toBeNull();
    expect(record.secondaryProfileId).toBeNull();
  });

  it("fromCharacterRecord restores a CharacterSheet from a CharacterRecord", () => {
    const char = makeMinimalCharacter();
    char.level = 3;

    const record = toCharacterRecord(char);
    const restored = fromCharacterRecord(record);

    expect(restored.name).toBe("Aldric");
    expect(restored.level).toBe(3);
    expect(restored.deity).toBeUndefined();
  });

  it("formatIpcError formats Cancelled and message errors cleanly", () => {
    expect(formatIpcError({ kind: "Cancelled" })).toBe("Annulé");
    expect(formatIpcError({ kind: "Rules", message: "Niveau invalide" })).toBe(
      "Niveau invalide",
    );
  });
});
