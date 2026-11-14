import type { CharacterSheet, LanguageSummary, LiteracyStatus, PeopleData } from '../types/cof2';

export const OFFICIAL_LANGUAGES: readonly string[] = [
  'Commun',
  'Sylvestre',
  'Runique',
  'Noir parlé',
  'Draconique',
  'Abyssal',
  'Célestien',
  'Argotien',
  'Profond',
  'Aquarien',
  'Ophidien',
];

export const SECONDARY_TALENT_EXAMPLES: readonly string[] = [
  'Instrument de musique',
  'Échecs / Cartes',
  'Calligraphie',
  'Cuisine',
];

export function extractNativeLanguages(defaultLanguages: string | undefined): string[] {
  if (!defaultLanguages) return [];
  return defaultLanguages
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && s.toLowerCase() !== 'commun');
}

export function computeLanguagesInfo(
  char: Pick<CharacterSheet, 'profileId' | 'secondaryProfileId' | 'acquiredAbilities' | 'languages' | 'secondaryTalents'>,
  people: Pick<PeopleData, 'defaultLanguages'> | undefined,
  intStat: number,
): LanguageSummary {
  const abilities = char.acquiredAbilities || [];
  const hasAssassinR1 = abilities.some(a => a.pathId === 'voie-de-l-assassin' && a.rank === 1);
  const hasNoblesseR1 = abilities.some(a => a.pathId === 'voie-de-la-noblesse' && a.rank === 1);
  const diplomateMaxRank = abilities
    .filter(a => a.pathId === 'voie-du-diplomate')
    .reduce((max, a) => Math.max(max, a.rank), 0);
  const polyglotteBonus = diplomateMaxRank >= 2 ? diplomateMaxRank - 1 : 0;

  const isVoleurOrBarde =
    char.profileId === 'voleur' ||
    char.profileId === 'barde' ||
    char.secondaryProfileId === 'voleur' ||
    char.secondaryProfileId === 'barde';

  const argotienSlotCost = isVoleurOrBarde || hasAssassinR1 ? 1 : 2;

  const automaticLanguages: string[] = [];
  if (intStat > -2) {
    automaticLanguages.push('Commun');
  }

  for (const nativeLang of extractNativeLanguages(people?.defaultLanguages)) {
    if (!automaticLanguages.some(l => l.toLowerCase() === nativeLang.toLowerCase())) {
      automaticLanguages.push(nativeLang);
    }
  }

  if (hasAssassinR1 && !automaticLanguages.some(l => l.toLowerCase() === 'argotien')) {
    automaticLanguages.push('Argotien');
  }

  const bonusLanguageSlots = Math.max(0, intStat) + (hasNoblesseR1 ? 1 : 0) + polyglotteBonus;

  const bonusLangs = (char.languages || []).filter(
    lang => !automaticLanguages.some(auto => auto.toLowerCase() === lang.toLowerCase()),
  );
  const langSlotsUsed = bonusLangs.reduce(
    (sum, lang) => sum + (lang.toLowerCase() === 'argotien' ? argotienSlotCost : 1),
    0,
  );
  const usedBonusSlots = langSlotsUsed + (char.secondaryTalents?.length || 0);

  const literacy: LiteracyStatus =
    intStat > 0 || hasNoblesseR1 ? 'literate' : intStat === 0 ? 'hesitant' : 'illiterate';

  const intNote =
    intStat <= -2
      ? 'INT -2 : ne parle que sa langue natale (et quelques mots de Commun).'
      : null;

  return {
    automaticLanguages,
    bonusLanguageSlots,
    usedBonusSlots,
    argotienSlotCost,
    literacy,
    intNote,
  };
}

export function getAllKnownLanguages(
  char: Pick<CharacterSheet, 'languages'>,
  languagesInfo: LanguageSummary,
): string[] {
  const result = [...languagesInfo.automaticLanguages];
  for (const lang of char.languages || []) {
    if (!result.some(existing => existing.toLowerCase() === lang.toLowerCase())) {
      result.push(lang);
    }
  }
  return result;
}

export function getLiteracyLabel(status: LiteracyStatus): string {
  switch (status) {
    case 'literate':
      return 'Sait lire et écrire';
    case 'hesitant':
      return 'Déchiffre avec hésitation';
    case 'illiterate':
      return 'Ne sait pas lire';
  }
}
