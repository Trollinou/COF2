import { describe, it, expect } from 'vitest';
import {
  computeLanguagesInfo,
  getAllKnownLanguages,
  getLiteracyLabel,
} from '../languageUtils';

describe('languageUtils', () => {
  it('handles INT -2 by keeping only native language and marking illiterate', () => {
    const info = computeLanguagesInfo(
      { profileId: 'guerrier', acquiredAbilities: [], languages: [], secondaryTalents: [] },
      { defaultLanguages: 'Commun, Sylvestre' },
      -2,
    );
    expect(info.automaticLanguages).toEqual(['Sylvestre']);
    expect(info.bonusLanguageSlots).toBe(0);
    expect(info.literacy).toBe('illiterate');
    expect(info.intNote).toBeTruthy();
    expect(getLiteracyLabel(info.literacy)).toBe('Ne sait pas lire');
  });

  it('handles INT 0 with hesitant literacy and INT +2 with 2 bonus slots', () => {
    const info0 = computeLanguagesInfo(
      { profileId: 'guerrier', acquiredAbilities: [], languages: [], secondaryTalents: [] },
      { defaultLanguages: 'Commun' },
      0,
    );
    expect(info0.literacy).toBe('hesitant');
    expect(info0.bonusLanguageSlots).toBe(0);

    const info2 = computeLanguagesInfo(
      { profileId: 'guerrier', acquiredAbilities: [], languages: ['Argotien'], secondaryTalents: [] },
      { defaultLanguages: 'Commun' },
      2,
    );
    expect(info2.literacy).toBe('literate');
    expect(info2.argotienSlotCost).toBe(2);
    expect(info2.bonusLanguageSlots).toBe(2);
    expect(info2.usedBonusSlots).toBe(2);
    expect(getAllKnownLanguages({ languages: ['Argotien'] }, info2)).toEqual(['Commun', 'Argotien']);
  });

  it('grants Argotien for Voleur R1 and +1 slot + literacy for Chevalier R1 and Polyglotte', () => {
    const info = computeLanguagesInfo(
      {
        profileId: 'chevalier',
        secondaryProfileId: 'caravanier',
        acquiredAbilities: [
          { pathId: 'voie-de-la-noblesse', rank: 1 },
          { pathId: 'voie-du-diplomate', rank: 3 },
        ],
        languages: ['Runique'],
        secondaryTalents: ['Calligraphie'],
      },
      { defaultLanguages: 'Commun' },
      -1,
    );
    expect(info.literacy).toBe('literate');
    expect(info.bonusLanguageSlots).toBe(3); // +1 Noblesse R1 + 2 Polyglotte (R2 & R3)
    expect(info.usedBonusSlots).toBe(2);
  });
});
