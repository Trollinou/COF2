import { CharacterSheet, StatCode } from '../../types/cof2';
import {
  ALL_STAT_CODES,
  getPeopleById,
  getProfileById,
  getPathById,
  evaluatePointBuyStats,
  isDomainPath,
  hasMageCreationBonus,
  getMageCreationRank2Ability,
  resolveExternalGrants,
  computeCharacterStats,
  getProfileAllPoolPathIds,
} from '../../engine/rulesEngine';
import tablesData from '../../data/tables.json';
import { hasHumanDiversityRank1, isHumanDiversityValid } from '../../utils/humanDiversity';

export interface StepValidationResult {
  valid: boolean;
  reason?: string;
}

export const WIZARD_STEPS = [
  { step: 1, label: 'Peuple' },
  { step: 2, label: 'Profil' },
  { step: 3, label: 'Caracs' },
  { step: 4, label: 'Voies' },
  { step: 5, label: 'Équipement' },
  { step: 6, label: 'Identité' },
  { step: 7, label: 'Bilan' },
] as const;

export function validateWizardStep(
  step: number,
  character: CharacterSheet,
): StepValidationResult {
  switch (step) {
    case 1: {
      const people = getPeopleById(character.peopleId);
      if (!people) {
        return { valid: false, reason: 'Veuillez sélectionner un peuple pour continuer.' };
      }

      const choices = people.statChoices || [];
      for (let i = 0; i < choices.length; i++) {
        const chosen = character.racialStatChoices?.[i];
        const isAny = choices[i].options.includes('ANY_LOWEST');
        const isValidChoice =
          Boolean(chosen) &&
          (isAny
            ? ALL_STAT_CODES.includes(chosen as StatCode)
            : choices[i].options.includes(chosen as StatCode));
        if (!isValidChoice) {
          return {
            valid: false,
            reason: 'Veuillez choisir tous les modificateurs de caractéristiques de votre peuple.',
          };
        }
      }

      if (people.selectableRacialPaths && people.selectableRacialPaths.length > 0) {
        const hasHeritage = people.selectableRacialPaths.some(pid =>
          character.selectedPathIds.includes(pid),
        );
        if (!hasHeritage) {
          return {
            valid: false,
            reason: `Veuillez choisir l'héritage culturel de votre ${people.name}.`,
          };
        }
      }

      return { valid: true };
    }

    case 2: {
      const profile = getProfileById(character.profileId);
      if (!profile) {
        return { valid: false, reason: 'Veuillez sélectionner un profil pour continuer.' };
      }

      if (profile.isFamilySelectable && !character.profileFamily) {
        return {
          valid: false,
          reason: `Veuillez choisir une famille pour le profil ${profile.name}.`,
        };
      }

      if (character.isHybrid) {
        const secProfile = character.secondaryProfileId
          ? getProfileById(character.secondaryProfileId)
          : undefined;
        if (!secProfile || secProfile.id === profile.id) {
          return {
            valid: false,
            reason: 'Veuillez choisir un profil secondaire différent du profil principal.',
          };
        }
      }

      return { valid: true };
    }

    case 3: {
      const rawPreset = character.statArrayPreset === 'libre' ? 'achat' : character.statArrayPreset;
      if (!rawPreset) {
        return {
          valid: false,
          reason: "Veuillez choisir une méthode d'attribution des caractéristiques.",
        };
      }

      if (rawPreset === 'achat') {
        const pb = evaluatePointBuyStats(character.baseStats);
        if (!pb.isValid || pb.remaining !== 0) {
          return {
            valid: false,
            reason:
              pb.remaining > 0
                ? `Il reste ${pb.remaining} point(s) de caractéristique à répartir.`
                : 'La répartition par achat dépasse les limites autorisées.',
          };
        }
        return { valid: true };
      }

      const arr = tablesData.characteristicArrays.find(a => a.id === rawPreset);
      if (!arr) {
        return {
          valid: false,
          reason: "Veuillez choisir une méthode d'attribution des caractéristiques.",
        };
      }

      const currentSorted = ALL_STAT_CODES.map(code => character.baseStats?.[code] ?? 0).sort(
        (a, b) => b - a,
      );
      const targetSorted = [...arr.values].sort((a, b) => b - a);
      const matches =
        currentSorted.length === targetSorted.length &&
        currentSorted.every((val, idx) => val === targetSorted[idx]);

      if (!matches) {
        return {
          valid: false,
          reason: 'Veuillez répartir toutes les valeurs de la série sélectionnée.',
        };
      }

      return { valid: true };
    }

    case 4: {
      const profile = getProfileById(character.profileId);
      if (!profile) {
        return { valid: false, reason: 'Veuillez sélectionner un profil avant de choisir vos voies.' };
      }
      const secProfile =
        character.isHybrid && character.secondaryProfileId
          ? getProfileById(character.secondaryProfileId)
          : undefined;
      const allProfilePaths = [
        ...getProfileAllPoolPathIds(profile),
        ...getProfileAllPoolPathIds(secProfile),
      ];

      const selectedProfilePaths = character.selectedPathIds.filter(id =>
        allProfilePaths.includes(id),
      );
      if (selectedProfilePaths.length < 2) {
        return {
          valid: false,
          reason: 'Veuillez choisir 2 voies de profil pour continuer.',
        };
      }

      const thirdPath = character.selectedPathIds.find(id => !allProfilePaths.includes(id));
      if (!thirdPath) {
        return {
          valid: false,
          reason: 'Veuillez choisir votre 3e voie (Peuple, Domaine ou Voie du Mage).',
        };
      }

      if (isDomainPath(thirdPath) && !character.deity) {
        return {
          valid: false,
          reason: 'Veuillez choisir votre divinité pour la voie de Domaine.',
        };
      }

      if (hasMageCreationBonus(character) && !getMageCreationRank2Ability(character)) {
        return {
          valid: false,
          reason: 'Veuillez choisir votre capacité de rang 2 bonus (Famille des Mages).',
        };
      }

      const externalGrants = resolveExternalGrants(character);
      for (const acq of character.acquiredAbilities) {
        const pth = getPathById(acq.pathId);
        const rankObj = pth?.ranks.find(r => r.rank === acq.rank);
        if (!rankObj) continue;

        const choiceOptions = rankObj.modifiers?.choiceOptions;
        if (choiceOptions && choiceOptions.length > 0) {
          const choiceKey = `${acq.pathId}_${acq.rank}`;
          const chosen = character.pathRankChoices?.[choiceKey];
          if (!chosen || !choiceOptions.some(opt => opt.id === chosen)) {
            return {
              valid: false,
              reason: `Veuillez sélectionner l'option du rang ${acq.rank} (${rankObj.title}).`,
            };
          }
        }

        if (rankObj.modifiers?.grantExternalAbility) {
          const sourceKey = `${acq.pathId}_${acq.rank}`;
          const resolved = externalGrants.find(g => g.sourceKey === sourceKey);
          if (!resolved || !resolved.ability) {
            return {
              valid: false,
              reason: `Veuillez sélectionner la capacité accordée par ${rankObj.title}.`,
            };
          }
        }
      }

      if (hasHumanDiversityRank1(character) && !isHumanDiversityValid(character.humanDiversity)) {
        return {
          valid: false,
          reason: "Veuillez choisir l'origine (et, si remplacé, le gagne-pain) pour la capacité Diversité.",
        };
      }

      return { valid: true };
    }

    case 5:
      return { valid: true };

    case 6: {
      if (!character.name?.trim()) {
        return { valid: false, reason: 'Veuillez saisir le nom du personnage.' };
      }
      if (!character.playerName?.trim()) {
        return { valid: false, reason: 'Veuillez saisir le nom du joueur.' };
      }
      if (!character.sex?.trim()) {
        return { valid: false, reason: 'Veuillez sélectionner le sexe / genre du personnage.' };
      }
      if (!character.height?.trim()) {
        return { valid: false, reason: 'Veuillez saisir la taille du personnage.' };
      }
      if (!character.weight?.trim()) {
        return { valid: false, reason: 'Veuillez saisir le poids du personnage.' };
      }

      const computed = computeCharacterStats(character);
      const remaining =
        computed.languagesInfo.bonusLanguageSlots - computed.languagesInfo.usedBonusSlots;
      if (remaining > 0) {
        return {
          valid: false,
          reason: `Il reste ${remaining} point(s) de langue / talent bonus à répartir.`,
        };
      }
      if (remaining < 0) {
        return {
          valid: false,
          reason: 'Vous avez utilisé plus de points de langues / talents que votre maximum autorisé.',
        };
      }

      return { valid: true };
    }

    case 7:
    default:
      return { valid: true };
  }
}

export function getMaxUnlockedWizardStep(character: CharacterSheet): number {
  for (const s of WIZARD_STEPS) {
    if (s.step === WIZARD_STEPS.length) return s.step;
    if (!validateWizardStep(s.step, character).valid) {
      return s.step;
    }
  }
  return WIZARD_STEPS.length;
}
