import { CharacterSheet, HumanDiversityChoice } from '../types/cof2';

export interface HumanOriginOption {
  id: string;
  label: string;
  domains: [string, string];
}

export const HUMAN_DIVERSITY_PATH_ID = 'voie-de-l-humain';

export const HUMAN_ORIGINS: HumanOriginOption[] = [
  {
    id: 'montagnard',
    label: 'Montagnard',
    domains: ['Escalade', 'Résistance au froid'],
  },
  {
    id: 'citadin',
    label: 'Citadin',
    domains: ['Commerce', 'Résistance aux maladies'],
  },
  {
    id: 'campagnard',
    label: 'Campagnard',
    domains: ['Météorologie', 'Équitation'],
  },
  {
    id: 'riverain',
    label: 'Riverain',
    domains: ['Natation', 'Navigation'],
  },
  {
    id: 'sauvage',
    label: 'Sauvage',
    domains: ['Chasser', 'Pister'],
  },
  {
    id: 'nomade',
    label: 'Nomade',
    domains: ['Orientation', 'Résistance à la chaleur ou au froid'],
  },
];

export const HUMAN_TRADE_SUGGESTIONS: string[] = [
  'Serrurier',
  'Forgeron',
  'Scribe',
  'Maçon',
  'Chasseur',
  'Cuisinier',
  'Acrobate',
  'Pickpocket',
  'Bibliothécaire',
  'Étudiant',
];

export interface ResolvedHumanDiversity {
  originId: string;
  originLabel: string;
  baseDomains: [string, string];
  effectiveDomains: [string, string];
  replacedDomainIndex?: 0 | 1;
  replacementTrade?: string;
}

/**
 * Indique si le personnage possède la capacité « Diversité » (Voie de l'humain, Rang 1),
 * soit directement via ses capacités acquises, soit conservée en capacité de peuple
 * lorsque la voie raciale est remplacée (Prêtre / Mage).
 */
export function hasHumanDiversityRank1(
  character: Pick<CharacterSheet, 'peopleId' | 'acquiredAbilities'>,
): boolean {
  if (
    character.acquiredAbilities.some(
      a => a.pathId === HUMAN_DIVERSITY_PATH_ID && a.rank === 1,
    )
  ) {
    return true;
  }
  return character.peopleId === 'humain';
}

/**
 * Résout l'origine et les deux domaines effectifs (+3) pour « Diversité ».
 */
export function resolveHumanDiversity(
  choice: HumanDiversityChoice | null | undefined,
): ResolvedHumanDiversity | null {
  if (!choice || !choice.originId) return null;

  let originLabel: string;
  let baseDomains: [string, string];

  if (choice.originId === 'custom') {
    originLabel = choice.customOriginName?.trim() || 'Origine personnalisée';
    baseDomains = [
      choice.customDomain1?.trim() || '',
      choice.customDomain2?.trim() || '',
    ];
  } else {
    const preset = HUMAN_ORIGINS.find(o => o.id === choice.originId);
    if (!preset) return null;
    originLabel = preset.label;
    baseDomains = [...preset.domains] as [string, string];
  }

  const trade = choice.replacementTrade?.trim();
  const replacedIdx =
    choice.replacedDomainIndex === 0 || choice.replacedDomainIndex === 1
      ? choice.replacedDomainIndex
      : undefined;

  const effectiveDomains: [string, string] = [...baseDomains] as [string, string];
  if (replacedIdx !== undefined && trade) {
    effectiveDomains[replacedIdx] = trade;
  }

  return {
    originId: choice.originId,
    originLabel,
    baseDomains,
    effectiveDomains,
    replacedDomainIndex: replacedIdx !== undefined && trade ? replacedIdx : undefined,
    replacementTrade: replacedIdx !== undefined && trade ? trade : undefined,
  };
}

/**
 * Vérifie que le choix de Diversité est complet et valide.
 */
export function isHumanDiversityValid(
  choice: HumanDiversityChoice | null | undefined,
): boolean {
  if (!choice || !choice.originId) return false;

  if (choice.originId === 'custom') {
    if (!choice.customOriginName?.trim()) return false;
    const d1Ok =
      choice.replacedDomainIndex === 0
        ? Boolean(choice.replacementTrade?.trim())
        : Boolean(choice.customDomain1?.trim());
    const d2Ok =
      choice.replacedDomainIndex === 1
        ? Boolean(choice.replacementTrade?.trim())
        : Boolean(choice.customDomain2?.trim());
    return d1Ok && d2Ok;
  }

  const preset = HUMAN_ORIGINS.find(o => o.id === choice.originId);
  if (!preset) return false;

  if (
    choice.replacedDomainIndex === 0 ||
    choice.replacedDomainIndex === 1
  ) {
    return Boolean(choice.replacementTrade?.trim());
  }

  return true;
}

/**
 * Formate la note situationnelle associée au choix de Diversité.
 */
export function formatHumanDiversityNote(
  choice: HumanDiversityChoice | null | undefined,
): string | null {
  const resolved = resolveHumanDiversity(choice);
  if (!resolved) return null;

  const formattedDomains = resolved.effectiveDomains
    .map((d, idx) =>
      d && resolved.replacedDomainIndex === idx ? `${d} (gagne-pain)` : d,
    )
    .filter(Boolean);

  if (formattedDomains.length === 0) return null;

  return `Diversité (${resolved.originLabel}) : +3 aux tests de ${formattedDomains.join(' et ')}`;
}
