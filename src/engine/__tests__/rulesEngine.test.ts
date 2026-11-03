import { describe, it, expect } from 'vitest';
import {
  createDefaultCharacter,
  computeCharacterStats,
  checkWeaponProficiency,
  getAllowedArmors,
  getAllowedShields,
  getAllowedWeapons,
  calculateCapabilityPoints,
  applyRacialDefaults,
  getPeopleById,
  getProfileById,
  getPathById,
  PRIEST_DEITIES,
  isDomainPath,
  isMageProfile,
  isRacialReplacementPath,
  getReplacedRacialPath,
  getDomainPathForDeity,
  getDeityByDomainPathId,
  isPrestigePath,
  getRankLevelRequirement,
  getRankPointCost,
  checkPrestigePathPrerequisites,
  getAccessiblePathsForLevelUp,
  canCharacterAdoptHybridPath,
  getNonRacialActivePathsCount,
  calculateLevelUpHpGain,
  getCharacterMasteredProfileIds,
  calculateArmorSpellManaCost,
  getWeaponAttackInfo,
  resolveCompanionStats,
  getDefaultEquipmentForProfile,
} from '../rulesEngine';
import { CharacterSheet } from '../../types/cof2';

describe('COF2 Rules Engine', () => {
  describe('Lookups and Reference Data', () => {
    it('finds peoples by ID', () => {
      const humain = getPeopleById('humain');
      expect(humain).toBeDefined();
      expect(humain?.name).toBe('Humain');

      const elfe = getPeopleById('elfe-haut');
      expect(elfe).toBeDefined();
      expect(elfe?.name).toBe('Elfe haut');
    });

    it('finds profiles by ID', () => {
      const guerrier = getProfileById('guerrier');
      expect(guerrier).toBeDefined();
      expect(guerrier?.family).toBe('Combattants');

      const magicien = getProfileById('magicien');
      expect(magicien).toBeDefined();
      expect(magicien?.family).toBe('Mages');
    });

    it('finds paths by ID', () => {
      const voie = getPathById('voie-du-bouclier');
      expect(voie).toBeDefined();
      expect(voie?.name.toLowerCase()).toBe('voie du bouclier');
      expect(voie?.ranks).toHaveLength(5);
    });

    it('ensures all path rank titles are clean and action booleans are well-formed', () => {
      const allPaths = [getPathById('voie-du-bouclier'), getPathById('voie-du-mage-de-guerre'), getPathById('voie-de-la-magie-universelle')];
      allPaths.forEach(pth => {
        expect(pth).toBeDefined();
        pth?.ranks.forEach(r => {
          expect(r.title).not.toContain('\\');
          expect(typeof r.isSpell).toBe('boolean');
          expect(typeof r.isLimited).toBe('boolean');
          expect(typeof r.isAttack).toBe('boolean');
          expect(typeof r.isMovement).toBe('boolean');
          expect(typeof r.isFreeAction).toBe('boolean');
          expect(typeof r.isPassive).toBe('boolean');
        });
      });

      const coupAuBut = getPathById('voie-du-mage-de-guerre')?.ranks.find(r => r.rank === 4);
      expect(coupAuBut?.title).toBe('Coup au but');
      expect(coupAuBut?.isFreeAction).toBe(true);
      expect(coupAuBut?.isMovement).toBe(true);
      expect(coupAuBut?.isSpell).toBe(true);

      const invisibilite = getPathById('voie-de-la-magie-universelle')?.ranks.find(r => r.rank === 3);
      expect(invisibilite?.title).toBe('Invisibilité');
      expect(invisibilite?.isLimited).toBe(true);
      expect(invisibilite?.isAttack).toBe(true);
      expect(invisibilite?.isSpell).toBe(true);
    });
  });

  describe('Default Character Initialization', () => {
    it('creates a valid level 1 default character', () => {
      const char = createDefaultCharacter();
      expect(char).toBeDefined();
      expect(char.level).toBe(1);
      expect(char.peopleId).toBe('humain');
      expect(char.baseStats).toBeDefined();
      expect(char.acquiredAbilities).toHaveLength(3);

      const stats = computeCharacterStats(char);
      expect(stats.maxHp).toBeGreaterThan(0);
      expect(stats.defense).toBeGreaterThanOrEqual(10);
      expect(stats.initiative).toBe(10 + stats.finalStats.PER);
    });
  });

  describe('Character Stats Calculations', () => {
    it('calculates HP, DR, PC, PM, and Initiative correctly according to COF2 formulas', () => {
      const char: CharacterSheet = {
        ...createDefaultCharacter(),
        level: 1,
        profileId: 'guerrier', // hpPerLevel = 5, hd = 'd10'
        peopleId: 'humain',
        baseStats: {
          FOR: 3,
          AGI: 1,
          CON: 2,
          PER: 1,
          INT: 0,
          VOL: 0,
          CHA: -1,
        },
        racialStatChoices: ['FOR'],
        manualStatBonuses: {},
        acquiredAbilities: [],
        equippedArmorId: 'cuir-simple', // DEF +2, maxDex 4
        equippedShieldId: 'grand-bouclier', // DEF +2
      };

      const stats = computeCharacterStats(char);

      // Final stats: FOR = 3 + 1 (racial) = 4, CON = 2
      expect(stats.finalStats.FOR).toBe(4);
      expect(stats.finalStats.CON).toBe(2);

      // HP = ((level + 1) * hpPerLevel) + (level * CON) = (2 * 5) + 2 = 12
      expect(stats.maxHp).toBe(12);

      // DR = 2 + CON = 2 + 2 = 4 (Combattants non mystique)
      expect(stats.maxDr).toBe(4);
      expect(stats.drDice).toBe('d10');

      // PC = 2 + CHA = 2 + (-1) = 1 (Combattants non aventurier)
      expect(stats.maxPc).toBe(1);

      // Initiative = 10 + PER = 10 + 1 = 11
      expect(stats.initiative).toBe(11);

      // Defense = 10 + min(AGI=1, maxDex=4) + Armor(2) + Shield(2) = 10 + 1 + 2 + 2 = 15
      expect(stats.defense).toBe(15);
    });

    it('applies Mystic and Adventurer bonuses to DR and PC', () => {
      // Mystique family gets bonusDR = 1
      const pretre: CharacterSheet = {
        ...createDefaultCharacter(),
        profileId: 'pretre', // Mystiques
        baseStats: { FOR: 0, AGI: 0, CON: 1, PER: 1, INT: 0, VOL: 2, CHA: 1 },
      };
      const pretreStats = computeCharacterStats(pretre);
      // DR: 2 + 1 + 1 (bonusDR mystique) = 4
      expect(pretreStats.maxDr).toBe(4);

      // Aventuriers family gets bonusPC = 1
      const voleur: CharacterSheet = {
        ...createDefaultCharacter(),
        profileId: 'voleur', // Aventuriers
        baseStats: { FOR: 0, AGI: 2, CON: 0, PER: 1, INT: 1, VOL: 0, CHA: 2 },
        acquiredAbilities: [],
      };
      const voleurStats = computeCharacterStats(voleur);
      // PC: 2 + 2 + 1 (bonusPC aventurier) = 5
      expect(voleurStats.maxPc).toBe(5);

      // With Voie de l'humain R1 (Diversité: +1 PC), total becomes 6
      voleur.acquiredAbilities = [{ pathId: 'voie-de-l-humain', rank: 1 }];
      expect(computeCharacterStats(voleur).maxPc).toBe(6);
    });

    it('retroactively scales HP with level and Constitution', () => {
      const char = createDefaultCharacter();
      char.profileId = 'guerrier'; // hpPerLevel = 5
      char.baseStats.CON = 2;
      char.racialStatChoices = ['CON']; // Final CON = 3
      char.level = 3;

      const stats = computeCharacterStats(char);
      // Level 3: ((3 + 1) * 5) + (3 * 3) = 20 + 9 = 29
      expect(stats.maxHp).toBe(29);
    });
  });

  describe('Equipment and Weapons Proficiency Rules', () => {
    it('restricts armor according to profile permissions', () => {
      // Magicien: no armor permitted
      const mageArmors = getAllowedArmors('magicien');
      expect(mageArmors).toHaveLength(0);

      // Voleur: cuir simple maximum
      const voleurArmors = getAllowedArmors('voleur');
      expect(voleurArmors.some(a => a.id === 'tissus')).toBe(true);
      expect(voleurArmors.some(a => a.id === 'cuir-simple')).toBe(true);
      expect(voleurArmors.some(a => a.id === 'plaque-complete')).toBe(false);

      // Chevalier: up to heavy armors
      const chevalierArmors = getAllowedArmors('chevalier');
      expect(chevalierArmors.some(a => a.id === 'plaques')).toBe(true);
    });

    it('forbids shields to profiles that do not permit them', () => {
      const voleurShields = getAllowedShields('voleur');
      expect(voleurShields).toHaveLength(0);

      const guerrierShields = getAllowedShields('guerrier');
      expect(guerrierShields.length).toBeGreaterThan(0);
    });

    it('imposes two-handed wielding or prohibition on small sized races', () => {
      // Halfelin (small size) wielding an épée longue (DM 1d8)
      const epeeCheck = checkWeaponProficiency('epee-longue', 'guerrier', 'halfelin');
      expect(epeeCheck.allowed).toBe(true);
      expect(epeeCheck.requiresTwoHands).toBe(true);

      // Weapons with damage > 1d10 or specific forbidden weapons (arc-long) are forbidden
      const grandArcCheck = checkWeaponProficiency('arc-long', 'rodeur', 'halfelin');
      expect(grandArcCheck.allowed).toBe(false);
    });

    it('enforces profile weapon restrictions', () => {
      // Druide: has explicitAllowedWeaponIds, sword is not in it
      const druideSwordCheck = checkWeaponProficiency('epee-longue', 'druide', 'humain');
      expect(druideSwordCheck.allowed).toBe(false);

      // Druide: bâton or dague allowed
      const druideBatonCheck = checkWeaponProficiency('baton', 'druide', 'humain');
      expect(druideBatonCheck.allowed).toBe(true);
    });
  });

  describe('Capability Points Budget (Level Progression)', () => {
    it('calculates capability budget for level 1 character', () => {
      const char = createDefaultCharacter();
      const budget = calculateCapabilityPoints(char);

      // Level 1: 0 level-up points earned
      expect(budget.totalEarned).toBe(0);
      // Starting package: 3 rank-1 abilities are free
      expect(budget.spent).toBe(0);
      expect(budget.available).toBe(0);
    });

    it('awards 2 points per level-up and calculates costs', () => {
      const char = createDefaultCharacter();
      char.level = 2; // +2 points earned
      const budget = calculateCapabilityPoints(char);
      expect(budget.totalEarned).toBe(2);
      expect(budget.available).toBe(2);

      // Adding rank 2 ability costs 1 pt
      char.acquiredAbilities.push({ pathId: char.selectedPathIds[0], rank: 2 });
      const budgetAfterRank2 = calculateCapabilityPoints(char);
      expect(budgetAfterRank2.spent).toBe(1);
      expect(budgetAfterRank2.available).toBe(1);
    });
  });

  describe('COF2 Compagnon - Priest Domain Paths (Voies de Domaine)', () => {
    it('loads all 32 priest deities and domain paths with 5 ranks each', () => {
      expect(PRIEST_DEITIES.length).toBe(32);

      PRIEST_DEITIES.forEach(deity => {
        expect(deity.name).toBeTruthy();
        expect(deity.domainTitle).toBeTruthy();
        expect(deity.sacredWeapon).toBeTruthy();
        expect(deity.domainPathId).toMatch(/^voie-du-domaine-/);

        const pth = getPathById(deity.domainPathId);
        expect(pth).toBeDefined();
        expect(pth?.type).toBe('domain');
        expect(pth?.owner).toBe('Prêtre');
        expect(pth?.ranks.length).toBe(5);
        expect(isDomainPath(deity.domainPathId)).toBe(true);

        // Rank 1 must start with "Capacité de peuple +"
        expect(pth?.ranks[0].title).toMatch(/^Capacité de peuple \+/);
      });
    });

    it('correctly maps deities by name and domain path id', () => {
      const arcannaPath = getDomainPathForDeity('Arcanna');
      expect(arcannaPath).toBeDefined();
      expect(arcannaPath?.id).toBe('voie-du-domaine-arcanna');

      const axenderDeity = getDeityByDomainPathId('voie-du-domaine-axender');
      expect(axenderDeity).toBeDefined();
      expect(axenderDeity?.name).toBe('Axënder');
      expect(axenderDeity?.sacredWeapon).toBe('épée longue');
    });

    it('handles capability budget for a priest with a domain path retaining racial rank 1', () => {
      const char = createDefaultCharacter();
      char.profileId = 'pretre';
      char.deity = 'Arcanna';

      const arcannaPathId = 'voie-du-domaine-arcanna';
      const racialPathId = 'voie-de-l-humain';

      // 2 priest profile paths + 1 domain path
      char.selectedPathIds = ['voie-de-la-foi', 'voie-des-soins', arcannaPathId];
      // 4 rank-1 abilities: 2 profile + 1 racial R1 + 1 domain R1
      char.acquiredAbilities = [
        { pathId: 'voie-de-la-foi', rank: 1 },
        { pathId: 'voie-des-soins', rank: 1 },
        { pathId: racialPathId, rank: 1 },
        { pathId: arcannaPathId, rank: 1 },
      ];

      const budget = calculateCapabilityPoints(char);
      expect(budget.totalEarned).toBe(0);
      expect(budget.spent).toBe(0); // All 4 starting rank-1 abilities are free
      expect(budget.available).toBe(0);

      // Level 2: +2 points
      char.level = 2;
      const budgetL2 = calculateCapabilityPoints(char);
      expect(budgetL2.totalEarned).toBe(2);
      expect(budgetL2.available).toBe(2);

      // Acquiring domain rank 2 costs 1 point
      char.acquiredAbilities.push({ pathId: arcannaPathId, rank: 2 });
      const budgetAfterRank2 = calculateCapabilityPoints(char);
      expect(budgetAfterRank2.spent).toBe(1);
      expect(budgetAfterRank2.available).toBe(1);
    });

    it('applies PM bonus from Arcanna Rank 3 (Tour de magie)', () => {
      const char = createDefaultCharacter();
      char.profileId = 'pretre';
      char.baseStats.VOL = 2;
      char.acquiredAbilities = [
        { pathId: 'voie-du-domaine-arcanna', rank: 2 }, // Spell (Maîtrise de la magie)
        { pathId: 'voie-du-domaine-arcanna', rank: 3 }, // Spell + 2 bonus PM (Tour de magie)
      ];

      const stats = computeCharacterStats(char);
      // Base: VOL (2) + 2 spells = 4 PM.
      // Arcanna Rank 3 grants +2 bonus PM: total 6 PM.
      expect(stats.maxPm).toBe(6);
    });

    it('applies heroic stat modifier from Forthur Rank 4 (+1 FOR)', () => {
      const char = createDefaultCharacter();
      char.profileId = 'pretre';
      char.baseStats.FOR = 1;
      char.racialStatChoices = ['AGI']; // avoid racial bonus on FOR
      char.acquiredAbilities = [
        { pathId: 'voie-du-domaine-forthur', rank: 4 },
      ];

      const stats = computeCharacterStats(char);
      // Base FOR (1) + Forthur Rank 4 (+1 FOR) = 2
      expect(stats.finalStats.FOR).toBe(2);
      expect(stats.pathSituationalNotes).toContain('Dé bonus aux tests de FOR');
    });

    it('allows sacred weapon for a priest of Axënder (épée longue)', () => {
      // Standard priest without domain / deity context cannot use épée longue (blood ban)
      const standardCheck = checkWeaponProficiency('epee-longue', 'pretre', 'humain');
      expect(standardCheck.allowed).toBe(false);

      // Priest of Axënder has sacred exception for épée longue
      const axenderCheck = checkWeaponProficiency('epee-longue', 'pretre', 'humain', 'voie-du-domaine-axender');
      expect(axenderCheck.allowed).toBe(true);

      const axenderByNameCheck = checkWeaponProficiency('epee-longue', 'pretre', 'humain', 'Axënder');
      expect(axenderByNameCheck.allowed).toBe(true);
    });
  });

  describe('Voie du Mage & Racial Replacement Paths', () => {
    it('defines Voie du Mage with all 5 ranks and valid properties', () => {
      const voieDuMage = getPathById('voie-du-mage');
      expect(voieDuMage).toBeDefined();
      expect(voieDuMage?.name).toBe('VOIE DU MAGE');
      expect(voieDuMage?.ranks).toHaveLength(5);
      expect(voieDuMage?.ranks[0].title).toBe('Capacité de peuple + occultisme');
      expect(voieDuMage?.ranks[1].title).toBe('Maîtrise de la magie');
      expect(voieDuMage?.ranks[2].title).toBe('Tour de magie');
      expect(voieDuMage?.ranks[3].title).toBe('Esprit supérieur');
      expect(voieDuMage?.ranks[4].title).toBe('Tempête de mana');
    });

    it('identifies mage profiles correctly and distinguishes from primaliste', () => {
      expect(isMageProfile('magicien')).toBe(true);
      expect(isMageProfile('ensorceleur')).toBe(true);
      expect(isMageProfile('forgesort')).toBe(true);
      expect(isMageProfile('sorcier')).toBe(true);
      expect(isMageProfile('primaliste')).toBe(false);
      expect(isMageProfile('guerrier')).toBe(false);
    });

    it('identifies racial replacement paths correctly', () => {
      expect(isRacialReplacementPath('voie-du-mage')).toBe(true);
      expect(isRacialReplacementPath('voie-du-domaine-arcanna')).toBe(true);
      expect(isRacialReplacementPath('voie-de-l-humain')).toBe(false);
      expect(isRacialReplacementPath('voie-de-l-air')).toBe(false);
    });

    it('extracts replaced racial path and rank 1 correctly', () => {
      const char = createDefaultCharacter();
      char.profileId = 'magicien';
      char.peopleId = 'humain';
      char.selectedPathIds = ['voie-de-la-magie-des-arcanes', 'voie-de-la-magie-protectrice', 'voie-du-mage'];
      char.acquiredAbilities = [
        { pathId: 'voie-de-la-magie-des-arcanes', rank: 1 },
        { pathId: 'voie-de-la-magie-protectrice', rank: 1 },
        { pathId: 'voie-de-l-humain', rank: 1 },
        { pathId: 'voie-du-mage', rank: 1 },
      ];

      const replaced = getReplacedRacialPath(char);
      expect(replaced).toBeDefined();
      expect(replaced?.path.id).toBe('voie-de-l-humain');
      expect(replaced?.rank1.title).toBe('Diversité');
    });

    it('calculates capability budget for a mage with Voie du Mage retaining racial rank 1', () => {
      const char = createDefaultCharacter();
      char.profileId = 'magicien';
      char.peopleId = 'nain';
      char.selectedPathIds = ['voie-de-la-magie-destructrice', 'voie-de-la-magie-elementaire', 'voie-du-mage'];
      char.acquiredAbilities = [
        { pathId: 'voie-de-la-magie-destructrice', rank: 1 },
        { pathId: 'voie-de-la-magie-elementaire', rank: 1 },
        { pathId: 'voie-du-nain', rank: 1 },
        { pathId: 'voie-du-mage', rank: 1 },
      ];

      const budget = calculateCapabilityPoints(char);
      expect(budget.totalEarned).toBe(0);
      expect(budget.spent).toBe(0); // All 4 starting rank-1 abilities are free
      expect(budget.available).toBe(0);

      // Level 2 gives 2 points
      char.level = 2;
      const budgetL2 = calculateCapabilityPoints(char);
      expect(budgetL2.available).toBe(2);

      // Rank 2 of Voie du Mage costs 1 point
      char.acquiredAbilities.push({ pathId: 'voie-du-mage', rank: 2 });
      const budgetWithR2 = calculateCapabilityPoints(char);
      expect(budgetWithR2.spent).toBe(1);
      expect(budgetWithR2.available).toBe(1);
    });
  });

  describe('Level Up & Prestige Paths', () => {
    it('identifies prestige paths and their rank level requirements correctly', () => {
      expect(isPrestigePath('voie-du-colosse')).toBe(true);
      expect(isPrestigePath('voie-du-combat')).toBe(false);

      // Standard prestige: ranks 4..8 require levels 5, 7, 9, 11, 13
      expect(getRankLevelRequirement(true, 4)).toBe(5);
      expect(getRankLevelRequirement(true, 5)).toBe(7);
      expect(getRankLevelRequirement(true, 6)).toBe(9);
      expect(getRankLevelRequirement(true, 7)).toBe(11);
      expect(getRankLevelRequirement(true, 8)).toBe(13);

      // Familier fantastique exception: ranks 3..7
      expect(getRankLevelRequirement(true, 3, 'voie-du-familier-fantastique')).toBe(3);
      expect(getRankLevelRequirement(true, 4, 'voie-du-familier-fantastique')).toBe(5);

      // Standard paths: ranks 1..5
      expect(getRankLevelRequirement(false, 1)).toBe(1);
      expect(getRankLevelRequirement(false, 2)).toBe(1);
      expect(getRankLevelRequirement(false, 3)).toBe(3);
      expect(getRankLevelRequirement(false, 4)).toBe(5);
      expect(getRankLevelRequirement(false, 5)).toBe(7);

      // Rank point costs
      expect(getRankPointCost(1)).toBe(1);
      expect(getRankPointCost(2)).toBe(1);
      expect(getRankPointCost(3)).toBe(2);
      expect(getRankPointCost(4)).toBe(2);
    });

    it('returns all 5 profile paths plus racial path in getAccessiblePathsForLevelUp', () => {
      const char = createDefaultCharacter();
      char.profileId = 'guerrier';
      char.selectedPathIds = ['voie-du-bouclier', 'voie-du-combat', 'voie-de-l-humain'];

      const accessible = getAccessiblePathsForLevelUp(char);
      expect(accessible.length).toBe(6); // 5 guerrier paths + 1 racial path
      const ids = accessible.map(p => p.id);
      expect(ids).toContain('voie-du-bouclier');
      expect(ids).toContain('voie-du-combat');
      expect(ids).toContain('voie-du-maitre-d-armes');
      expect(ids).toContain('voie-de-la-resistance');
      expect(ids).toContain('voie-du-soldat');
      expect(ids).toContain('voie-de-l-humain');
    });

    it('validates prestige path prerequisites correctly', () => {
      const char = createDefaultCharacter();
      char.profileId = 'guerrier'; // Family: Combattants
      char.level = 4;

      // Below level 5: cannot choose standard prestige path
      const checkL4 = checkPrestigePathPrerequisites(char, 'voie-du-colosse', 4);
      expect(checkL4.eligible).toBe(false);
      expect(checkL4.reason).toContain('Niveau 5 requis');

      // Familier fantastique is accessible at level 3
      const checkFamL4 = checkPrestigePathPrerequisites(char, 'voie-du-familier-fantastique', 4);
      expect(checkFamL4.eligible).toBe(true);

      // At level 5: Combattants can choose Voie du Colosse (Combattants)
      const checkColosse = checkPrestigePathPrerequisites(char, 'voie-du-colosse', 5);
      expect(checkColosse.eligible).toBe(true);

      // But cannot choose a Mage-only prestige path
      const checkArchimage = checkPrestigePathPrerequisites(char, 'voie-de-l-archimage', 5);
      expect(checkArchimage.eligible).toBe(false);
      expect(checkArchimage.reason).toContain('Réservé à la famille Mages');

      // Cannot choose a second prestige path if already having one
      char.selectedPathIds.push('voie-du-colosse');
      const checkSecond = checkPrestigePathPrerequisites(char, 'voie-du-tueur-de-geants', 5);
      expect(checkSecond.eligible).toBe(false);
      expect(checkSecond.reason).toContain('possédez déjà une voie de prestige');

      // Test Voie du spécialiste prerequisite (requires rank 4 in a profile path)
      const specChar = createDefaultCharacter();
      specChar.profileId = 'guerrier';
      const checkSpecFail = checkPrestigePathPrerequisites(specChar, 'voie-du-specialiste', 5);
      expect(checkSpecFail.eligible).toBe(false);
      expect(checkSpecFail.reason).toContain('rang 4');

      // Now add rank 4 in a guerrier path
      specChar.acquiredAbilities.push({ pathId: 'voie-du-combat', rank: 4 });
      const checkSpecOk = checkPrestigePathPrerequisites(specChar, 'voie-du-specialiste', 5, specChar.acquiredAbilities);
      expect(checkSpecOk.eligible).toBe(true);
    });
  });

  describe('COF2 Hybrid Profiles (Profils Hybrides)', () => {
    it('calculates Level 1 HP correctly for a hybrid character (Profile A HP + Profile B HP + CON)', () => {
      const char = createDefaultCharacter();
      char.profileId = 'barbare'; // Combattants (5 PV)
      char.isHybrid = true;
      char.secondaryProfileId = 'druide'; // Mystiques (4 PV)
      char.baseStats.CON = 2; // +2 CON

      const stats = computeCharacterStats(char);
      // Expected HP: 5 (barbare) + 4 (druide) + 2 (CON) = 11 PV
      expect(stats.maxHp).toBe(11);
      expect(stats.drDice).toBe('d10'); // Main profile is Barbare (Combattant -> d10)
      expect(stats.isHybrid).toBe(true);
      expect(stats.secondaryProfileName).toBe('Druide');
    });

    it('enforces hybrid eligibility: allowed when < 5 paths invested, blocked when 5 paths invested', () => {
      const char = createDefaultCharacter();
      char.profileId = 'guerrier'; // paths: voie-du-bouclier, voie-du-combat, voie-du-maitre-d-armes, voie-de-la-resistance, voie-du-soldat
      char.acquiredAbilities = [
        { pathId: 'voie-du-bouclier', rank: 1 },
        { pathId: 'voie-du-combat', rank: 1 },
      ];

      // With only 2 paths invested out of 5: eligible!
      const check1 = canCharacterAdoptHybridPath(char);
      expect(check1.eligible).toBe(true);

      // Now invest in all 5 paths of the profile
      char.acquiredAbilities.push(
        { pathId: 'voie-du-maitre-d-armes', rank: 1 },
        { pathId: 'voie-de-la-resistance', rank: 1 },
        { pathId: 'voie-du-soldat', rank: 1 }
      );

      // Now all 5 paths have at least 1 rank: cannot adopt hybrid anymore!
      const check2 = canCharacterAdoptHybridPath(char);
      expect(check2.eligible).toBe(false);
      expect(check2.reason).toContain('5 voies de votre profil principal');
    });

    it('enforces the strict 6-path maximum limit (plus racial path)', () => {
      const char = createDefaultCharacter();
      char.peopleId = 'humain';
      char.profileId = 'guerrier';

      // Racial path does not count towards the 6-path limit
      char.acquiredAbilities = [
        { pathId: 'voie-de-l-humain', rank: 1 }, // racial
        { pathId: 'voie-du-bouclier', rank: 1 },
        { pathId: 'voie-du-combat', rank: 1 },
        { pathId: 'voie-du-maitre-d-armes', rank: 1 },
        { pathId: 'voie-de-la-resistance', rank: 1 }, // 4 non-racial paths
      ];

      expect(getNonRacialActivePathsCount(char)).toBe(4);
      expect(canCharacterAdoptHybridPath(char, 'voie-du-vagabond').eligible).toBe(true);

      // Add a 5th and 6th non-racial path
      char.acquiredAbilities.push(
        { pathId: 'voie-du-vagabond', rank: 1 }, // 5th non-racial
        { pathId: 'voie-du-pistolero', rank: 1 } // 6th non-racial
      );

      expect(getNonRacialActivePathsCount(char)).toBe(6);

      // Attempting to adopt a 7th non-racial path must be blocked!
      const check7th = canCharacterAdoptHybridPath(char, 'voie-du-roublard');
      expect(check7th.eligible).toBe(false);
      expect(check7th.reason).toContain('plus de 6 voies au total');
    });

    it('calculates level-up HP gains correctly across multiple families and handles half-HP rounding', () => {
      const char = createDefaultCharacter();
      char.profileId = 'guerrier'; // 5 PV per level
      char.baseStats.CON = 1;

      // 1. Same family abilities: Combattant (5) -> 5 + 1 = 6 PV
      const resSame = calculateLevelUpHpGain(char, [
        { pathId: 'voie-du-combat', rank: 2 },
        { pathId: 'voie-du-bouclier', rank: 2 },
      ]);
      expect(resSame.hpGain).toBe(6);
      expect(resSame.baseHp).toBe(5);
      expect(resSame.newHalfHpPending).toBe(false);

      // 2. Different families with even average: Combattant (5) + Mage (3) = 8 / 2 = 4 -> 4 + 1 = 5 PV
      const resEven = calculateLevelUpHpGain(char, [
        { pathId: 'voie-du-combat', rank: 2 }, // Combattant (5)
        { pathId: 'voie-de-la-magie-des-arcanes', rank: 1 }, // Mage (3)
      ]);
      expect(resEven.hpGain).toBe(5);
      expect(resEven.baseHp).toBe(4);
      expect(resEven.newHalfHpPending).toBe(false);

      // 3. Different families with half-HP: Mage (3) + Aventurier (4) = 7 / 2 = 3.5
      // Round 1 (without pending half-point): floor(3.5) = 3 + 1 = 4 PV, pending = true
      const resHalf1 = calculateLevelUpHpGain(
        char,
        [
          { pathId: 'voie-de-la-magie-des-arcanes', rank: 1 }, // Mage (3)
          { pathId: 'voie-du-roublard', rank: 1 }, // Aventurier (4)
        ],
        false
      );
      expect(resHalf1.baseHp).toBe(3);
      expect(resHalf1.hpGain).toBe(4);
      expect(resHalf1.newHalfHpPending).toBe(true);

      // Round 2 (with pending half-point from previous level): ceil(3.5) = 4 + 1 = 5 PV, pending = false
      const resHalf2 = calculateLevelUpHpGain(
        char,
        [
          { pathId: 'voie-de-la-magie-des-arcanes', rank: 2 }, // Mage (3)
          { pathId: 'voie-du-roublard', rank: 2 }, // Aventurier (4)
        ],
        true
      );
      expect(resHalf2.baseHp).toBe(4);
      expect(resHalf2.hpGain).toBe(5);
      expect(resHalf2.newHalfHpPending).toBe(false);

      // Total base HP across both levels: 3 + 4 = 7 PV (exactly 3 + 4)!
      expect(resHalf1.baseHp + resHalf2.baseHp).toBe(7);
    });

    it('grants weapon and armor proficiencies for secondary profiles at level 1 and after 2 ranks in play', () => {
      const char = createDefaultCharacter();
      char.profileId = 'barbare'; // Cuir renforcé max, pas d'armure lourde
      char.isHybrid = true;
      char.secondaryProfileId = 'guerrier'; // Cotte de mailles max, tous boucliers

      // Hybrid Barbare/Guerrier can wear cotte-mailles and use shields
      const allowedArmors = getAllowedArmors(char.profileId, char.secondaryProfileId);
      expect(allowedArmors.some(a => a.id === 'cotte-mailles')).toBe(true);

      const allowedShields = getAllowedShields(char.profileId, char.secondaryProfileId);
      expect(allowedShields.some(s => s.id === 'grand-bouclier')).toBe(true);

      // Mastered profile IDs: includes barbare and guerrier
      const mastered = getCharacterMasteredProfileIds(char);
      expect(mastered).toContain('barbare');
      expect(mastered).toContain('guerrier');

      // Test progressive mastery: character without secondaryProfileId acquiring 2 ranks in another profile
      const nonHybrid = createDefaultCharacter();
      nonHybrid.profileId = 'voleur';
      expect(getCharacterMasteredProfileIds(nonHybrid)).not.toContain('guerrier');

      nonHybrid.acquiredAbilities = [
        { pathId: 'voie-du-combat', rank: 1 },
        { pathId: 'voie-du-combat', rank: 2 },
      ];
      expect(getCharacterMasteredProfileIds(nonHybrid)).toContain('guerrier');
    });

    it('calculates extra mana cost for spells cast in heavy armor', () => {
      const char = createDefaultCharacter();
      char.profileId = 'magicien';
      char.equippedArmorId = 'cuir-simple'; // DEF +2

      // Magicien spell (voie-de-la-magie-des-arcanes R1: Projectile magique)
      const extraMagicien = calculateArmorSpellManaCost(char, 'voie-de-la-magie-des-arcanes', 1);
      expect(extraMagicien).toBe(2); // Magicien max armor is 0, so DEF 2 penalty = 2 extra PM

      // Druide spell (voie-des-animaux R3: Nuée d'insectes) in cuir-simple (DEF +2): Druide allows cuir simple -> 0 extra PM
      const extraDruideCuir = calculateArmorSpellManaCost(char, 'voie-des-animaux', 3);
      expect(extraDruideCuir).toBe(0);

      // Druide spell in chemise-mailles (DEF +4): 4 - 2 = 2 extra PM
      char.equippedArmorId = 'chemise-mailles';
      const extraDruideMaille = calculateArmorSpellManaCost(char, 'voie-des-animaux', 3);
      expect(extraDruideMaille).toBe(2);

      // Priest spell in cotte-mailles: Priests can cast in ANY armor without penalty
      char.equippedArmorId = 'cotte-mailles';
      const extraPriest = calculateArmorSpellManaCost(char, 'voie-des-soins', 1);
      expect(extraPriest).toBe(0);
    });

    it('preserves hybrid path selection (1 primary profile path + 1 secondary profile path) during racial defaults synchronization', () => {
      const char = createDefaultCharacter();
      char.profileId = 'barbare';
      char.isHybrid = true;
      char.secondaryProfileId = 'druide';

      // Player selected 1 path from barbare and 1 path from druide + racial path
      char.selectedPathIds = ['voie-du-pagne', 'voie-des-animaux', 'voie-de-l-humain'];
      char.acquiredAbilities = [
        { pathId: 'voie-du-pagne', rank: 1 },
        { pathId: 'voie-des-animaux', rank: 1 },
        { pathId: 'voie-de-l-humain', rank: 1 },
      ];

      // Switch race to nain
      const updated = applyRacialDefaults(char, 'nain');
      expect(updated.selectedPathIds).toContain('voie-du-pagne');
      expect(updated.selectedPathIds).toContain('voie-des-animaux');
      expect(updated.selectedPathIds).toContain('voie-du-nain');
      expect(updated.acquiredAbilities.some(a => a.pathId === 'voie-du-pagne')).toBe(true);
      expect(updated.acquiredAbilities.some(a => a.pathId === 'voie-des-animaux')).toBe(true);
      expect(updated.acquiredAbilities.some(a => a.pathId === 'voie-du-nain')).toBe(true);
    });

    it('correctly configures and applies Voie de la Séduction (ranks 1 to 5, Dentelles et rapière DEF bonus, and Charisme héroïque PM stat replacement)', () => {
      const pth = getPathById('voie-de-la-seduction');
      expect(pth).toBeDefined();
      expect(pth?.ranks.length).toBe(5);
      expect(pth?.ranks.map(r => r.rank)).toEqual([1, 2, 3, 4, 5]);
      expect(pth?.ranks[0].title).toBe('Charmant');
      expect(pth?.ranks[1].title).toBe('Dentelles et rapière');
      expect(pth?.ranks[1].modifiers).toBeDefined();
      expect(pth?.ranks[1].modifiers?.bonuses).toEqual([
        { target: 'defense', stat: 'CHA', condition: 'noArmor', cap: 'rank' },
      ]);
      expect(pth?.ranks[2].title).toBe('Baratineur de génie');
      expect(pth?.ranks[3].title).toBe('Charisme héroïque');
      expect(pth?.ranks[4].title).toBe('Suggestion');
      expect(pth?.ranks[4].isSpell).toBe(true);

      const char = createDefaultCharacter();
      char.profileId = 'barde';
      char.baseStats = { FOR: 0, AGI: 2, CON: 1, PER: 0, INT: 1, VOL: 0, CHA: 3 };
      char.equippedArmorId = undefined; // No armor

      // Rank 1 acquired: DEF = 10 + AGI (2) = 12
      char.acquiredAbilities = [{ pathId: 'voie-de-la-seduction', rank: 1 }];
      let stats = computeCharacterStats(char);
      expect(stats.defense).toBe(12);

      // Rank 2 acquired (Dentelles et rapière): bonus CHA (3) capped at rank in path (2) -> DEF = 10 + 2 (AGI) + 2 (CHA cap) = 14
      char.acquiredAbilities.push({ pathId: 'voie-de-la-seduction', rank: 2 });
      stats = computeCharacterStats(char);
      expect(stats.defense).toBe(14);
      expect(stats.pathSituationalNotes).toContain(
        'Dentelles et rapière : +CHA en DEF sans armure (max rang dans la voie)'
      );

      // If wearing armor (cuir-simple, def 2), Dentelles et rapière bonus is disabled: DEF = 10 + 2 (AGI) + 2 (armor) = 14
      char.equippedArmorId = 'cuir-simple';
      stats = computeCharacterStats(char);
      expect(stats.defense).toBe(14);

      // Rank 3 and 4: Rank 4 increases CHA by +1 (CHA becomes 4)
      char.equippedArmorId = undefined;
      char.acquiredAbilities.push({ pathId: 'voie-de-la-seduction', rank: 3 });
      char.acquiredAbilities.push({ pathId: 'voie-de-la-seduction', rank: 4 });
      stats = computeCharacterStats(char);
      expect(stats.finalStats.CHA).toBe(4);
      // DEF with no armor: 10 + 2 (AGI) + min(CHA 4, rank 4) = 16
      expect(stats.defense).toBe(16);

      // Rank 5 (Suggestion is a spell): With Rank 4, PM uses CHA instead of VOL
      // CHA is 4, 1 spell acquired (Suggestion), no extra PM bonus -> maxPm = 4 + 1 = 5 (instead of VOL 0 + 1 = 1)
      char.acquiredAbilities.push({ pathId: 'voie-de-la-seduction', rank: 5 });
      stats = computeCharacterStats(char);
      expect(stats.maxPm).toBe(5);
    });

    it('correctly applies scaling path bonuses across ranks (Voleur Agile, Moine Agilité/Peau de fer/Ki, Druide Félin, Forgesort Runes)', () => {
      const char = createDefaultCharacter();
      char.profileId = 'voleur';
      char.baseStats = { FOR: 0, AGI: 2, CON: 1, PER: 1, INT: 0, VOL: 2, CHA: 0 };
      char.equippedArmorId = undefined;

      // Voie du déplacement (Voleur): R1 gives +1 DEF, +1 Init; R3 gives +1 DEF, +1 Init (total +2); R5 gives +1 DEF, +1 Init (total +3)
      char.acquiredAbilities = [{ pathId: 'voie-du-deplacement', rank: 1 }];
      let stats = computeCharacterStats(char);
      // base DEF = 10 + 2 (AGI) + 1 (voie) = 13
      expect(stats.defense).toBe(13);
      // base Init = 10 + 1 (PER) + 1 (voie) = 12
      expect(stats.initiative).toBe(12);

      char.acquiredAbilities.push({ pathId: 'voie-du-deplacement', rank: 2 });
      char.acquiredAbilities.push({ pathId: 'voie-du-deplacement', rank: 3 });
      stats = computeCharacterStats(char);
      expect(stats.defense).toBe(14);
      expect(stats.initiative).toBe(13);

      char.acquiredAbilities.push({ pathId: 'voie-du-deplacement', rank: 4 });
      char.acquiredAbilities.push({ pathId: 'voie-du-deplacement', rank: 5 });
      stats = computeCharacterStats(char);
      // Rank 4 adds +1 AGI (AGI becomes 3), Rank 5 brings path DEF to +3 and Init to +3
      // DEF = 10 + 3 (AGI) + 3 (voie) = 16
      expect(stats.defense).toBe(16);
      // Init = 10 + 1 (PER) + 3 (voie) = 14
      expect(stats.initiative).toBe(14);

      // Moine: Voie de la maîtrise R1 (+2 DEF), R4 (+3 DEF total)
      const monk = createDefaultCharacter();
      monk.profileId = 'moine';
      monk.baseStats = { FOR: 1, AGI: 2, CON: 1, PER: 0, INT: 0, VOL: 3, CHA: 0 };
      monk.equippedArmorId = undefined;
      monk.acquiredAbilities = [{ pathId: 'voie-de-la-maitrise', rank: 1 }];
      stats = computeCharacterStats(monk);
      expect(stats.defense).toBe(14); // 10 + 2 AGI + 2 Voie

      monk.acquiredAbilities.push({ pathId: 'voie-de-la-maitrise', rank: 2 });
      monk.acquiredAbilities.push({ pathId: 'voie-de-la-maitrise', rank: 3 });
      monk.acquiredAbilities.push({ pathId: 'voie-de-la-maitrise', rank: 4 });
      stats = computeCharacterStats(monk);
      expect(stats.defense).toBe(15); // 10 + 2 AGI + 3 Voie

      // Moine: Voie de la méditation R3 (+2 DEF, +VOL Init, +VOL PV)
      monk.acquiredAbilities.push({ pathId: 'voie-de-la-meditation', rank: 1 });
      monk.acquiredAbilities.push({ pathId: 'voie-de-la-meditation', rank: 2 });
      monk.acquiredAbilities.push({ pathId: 'voie-de-la-meditation', rank: 3 });
      stats = computeCharacterStats(monk);
      // DEF: 10 + 2 AGI + 3 (maîtrise) + 2 (méditation) = 17
      expect(stats.defense).toBe(17);
      // Init: 10 + 0 (PER) + 3 (VOL bonus) = 13
      expect(stats.initiative).toBe(13);

      // Druide: Voie du fauve R1 (+3 Init, +1 DEF), R3 (+2 DEF), R5 (+3 DEF)
      const druid = createDefaultCharacter();
      druid.profileId = 'druide';
      druid.baseStats = { FOR: 0, AGI: 1, CON: 1, PER: 2, INT: 0, VOL: 2, CHA: 0 };
      druid.equippedArmorId = undefined;
      druid.acquiredAbilities = [{ pathId: 'voie-du-fauve', rank: 1 }];
      stats = computeCharacterStats(druid);
      expect(stats.defense).toBe(12); // 10 + 1 AGI + 1 Voie
      expect(stats.initiative).toBe(15); // 10 + 2 PER + 3 Voie

      druid.acquiredAbilities.push({ pathId: 'voie-du-fauve', rank: 2 });
      druid.acquiredAbilities.push({ pathId: 'voie-du-fauve', rank: 3 });
      stats = computeCharacterStats(druid);
      expect(stats.defense).toBe(13); // 10 + 1 AGI + 2 Voie

      druid.acquiredAbilities.push({ pathId: 'voie-du-fauve', rank: 4 });
      druid.acquiredAbilities.push({ pathId: 'voie-du-fauve', rank: 5 });
      stats = computeCharacterStats(druid);
      expect(stats.defense).toBe(14); // 10 + 1 AGI + 3 Voie

      // Forgesort: Voie des runes R1 (+2 DEF), R3 (+3 DEF), R5 (+4 DEF)
      const forge = createDefaultCharacter();
      forge.profileId = 'forgesort';
      forge.baseStats = { FOR: 0, AGI: 1, CON: 2, PER: 0, INT: 3, VOL: 1, CHA: 0 };
      forge.equippedArmorId = undefined;
      forge.acquiredAbilities = [{ pathId: 'voie-des-runes', rank: 1 }];
      stats = computeCharacterStats(forge);
      expect(stats.defense).toBe(13); // 10 + 1 AGI + 2 Voie

      forge.acquiredAbilities.push({ pathId: 'voie-des-runes', rank: 2 });
      forge.acquiredAbilities.push({ pathId: 'voie-des-runes', rank: 3 });
      stats = computeCharacterStats(forge);
      expect(stats.defense).toBe(14); // 10 + 1 AGI + 3 Voie

      forge.acquiredAbilities.push({ pathId: 'voie-des-runes', rank: 4 });
      forge.acquiredAbilities.push({ pathId: 'voie-des-runes', rank: 5 });
      stats = computeCharacterStats(forge);
      expect(stats.defense).toBe(15); // 10 + 1 AGI + 4 Voie
    });

    it('should ensure all profiles have exactly 5 paths including Rôdeur with Voie de l\'archer', () => {
      const rodeur = getProfileById('rodeur');
      expect(rodeur).toBeDefined();
      expect(rodeur?.paths).toHaveLength(5);
      expect(rodeur?.paths).toContain('voie-de-l-archer');

      // Check Voie de l'archer initiative scaling (+1 per rank)
      const char = createDefaultCharacter();
      char.profileId = 'rodeur';
      char.baseStats = { FOR: 0, AGI: 2, CON: 1, PER: 3, INT: 0, VOL: 0, CHA: 0 };
      char.acquiredAbilities = [{ pathId: 'voie-de-l-archer', rank: 1 }];
      let stats = computeCharacterStats(char);
      expect(stats.initiative).toBe(14); // 10 + 3 PER + 1 Voie

      char.acquiredAbilities.push({ pathId: 'voie-de-l-archer', rank: 2 });
      char.acquiredAbilities.push({ pathId: 'voie-de-l-archer', rank: 3 });
      stats = computeCharacterStats(char);
      expect(stats.initiative).toBe(16); // 10 + 3 PER + 3 Voie

      char.acquiredAbilities.push({ pathId: 'voie-de-l-archer', rank: 4 });
      char.acquiredAbilities.push({ pathId: 'voie-de-l-archer', rank: 5 });
      stats = computeCharacterStats(char);
      expect(stats.initiative).toBe(18); // 10 + 3 PER + 5 Voie
    });
  });

  describe('V2 Declarative Mechanics (Weapon Modifiers, External Abilities, Tiny Size & Companions)', () => {
    it('applies weaponModifiers for Nain R2 (axe/hammer proficiency & +1/+1), Elfe sylvain R3 (bow crit 19-20), and Gnome R4 (+AGI DM)', () => {
      // 1. Nain Magicien with Voie du nain R2: masters axes & hammers and gets +1 ATQ / +1 DM
      const dwarf = createDefaultCharacter();
      dwarf.peopleId = 'nain';
      dwarf.profileId = 'magicien';
      dwarf.baseStats = { FOR: 2, AGI: 0, CON: 2, PER: 0, INT: 3, VOL: 1, CHA: 0 };
      dwarf.racialStatChoices = ['CON'];
      dwarf.acquiredAbilities = [
        { pathId: 'voie-du-nain', rank: 1 },
        { pathId: 'voie-du-nain', rank: 2 },
      ];
      dwarf.weapons = [
        {
          id: 'w_axe',
          weaponRefId: 'hache-armes',
          name: "Hache d'armes",
          damage: '1d8',
          range: 'Contact',
          category: 'contact',
        },
      ];

      // Magicien without Nain R2 cannot use hache-armes, but with Nain R2 it is allowed!
      expect(checkWeaponProficiency('hache-armes', 'magicien', 'nain').allowed).toBe(false);
      expect(
        checkWeaponProficiency('hache-armes', 'magicien', 'nain', undefined, undefined, dwarf.acquiredAbilities).allowed
      ).toBe(true);

      const dwarfStats = computeCharacterStats(dwarf);
      const axeInfo = getWeaponAttackInfo(dwarf.weapons[0], dwarfStats);
      // BAB (1) + FOR (2) + Nain R2 (+1) = +4 ATQ; DM = FOR (2) + Nain R2 (+1) = +3
      expect(axeInfo.atkBonus).toBe(4);
      expect(axeInfo.dmBonus).toBe('+ 3');

      // 2. Elfe sylvain R3 (Archer sylvain): critRangeBonus +1 on bows (19-20)
      const elf = createDefaultCharacter();
      elf.peopleId = 'elfe-sylvain';
      elf.profileId = 'rodeur';
      elf.acquiredAbilities = [
        { pathId: 'voie-de-l-elfe-sylvain', rank: 1 },
        { pathId: 'voie-de-l-elfe-sylvain', rank: 2 },
        { pathId: 'voie-de-l-elfe-sylvain', rank: 3 },
      ];
      elf.weapons = [
        {
          id: 'w_bow',
          weaponRefId: 'arc-long',
          name: 'Arc long',
          damage: '1d8',
          range: '50 m',
          category: 'distance',
        },
      ];
      const elfStats = computeCharacterStats(elf);
      const bowInfo = getWeaponAttackInfo(elf.weapons[0], elfStats);
      expect(bowInfo.critMin).toBe(19);
      expect(bowInfo.critRange).toBe('19-20');

      // 3. Gnome R4 (Botte secrète): adds AGI to damage with rapière & arbalète légère
      const gnome = createDefaultCharacter();
      gnome.peopleId = 'gnome';
      gnome.profileId = 'voleur';
      gnome.baseStats = { FOR: 0, AGI: 3, CON: 1, PER: 1, INT: 2, VOL: 0, CHA: 0 };
      gnome.racialStatChoices = ['INT'];
      gnome.acquiredAbilities = [{ pathId: 'voie-du-gnome', rank: 4 }];
      gnome.weapons = [
        {
          id: 'w_xbow',
          weaponRefId: 'arbalete-legere',
          name: 'Arbalète légère',
          damage: '2d4',
          range: '30 m',
          category: 'distance',
        },
      ];
      const gnomeStats = computeCharacterStats(gnome);
      const xbowInfo = getWeaponAttackInfo(gnome.weapons[0], gnomeStats);
      expect(xbowInfo.dmBonus).toBe('+ 3'); // +3 AGI on arbalète légère
    });

    it('applies borrowed abilities via grantExternalAbility and externalAbilityChoices', () => {
      const orc = createDefaultCharacter();
      orc.peopleId = 'demi-orc';
      orc.profileId = 'barbare';
      orc.baseStats = { FOR: 3, AGI: 1, CON: 2, PER: 0, INT: -1, VOL: 0, CHA: -1 };
      orc.racialStatChoices = ['FOR', 'CHA'];
      orc.acquiredAbilities = [
        { pathId: 'voie-du-demi-orc', rank: 1 },
        { pathId: 'voie-du-demi-orc', rank: 2 }, // Instinct guerrier: choose R1 of Barbare or Guerrier
      ];

      // Without external choice: HP = (2 * 5) + 2 (CON) = 12
      let stats = computeCharacterStats(orc);
      expect(stats.maxHp).toBe(12);

      // Choose Guerrier -> Voie de la résistance R1 (Endurant : +3 PV)
      orc.externalAbilityChoices = {
        'voie-du-demi-orc_2': { pathId: 'voie-de-la-resistance', rank: 1 },
      };
      stats = computeCharacterStats(orc);
      expect(stats.maxHp).toBe(15);
    });

    it('applies Tiny size +2 DEF and 1d4 one-handed limit for Farfadet and Fée', () => {
      const fee = createDefaultCharacter();
      fee.peopleId = 'fee'; // Fixed stats: AGI +1, CHA +1, CON -1, FOR -2
      fee.profileId = 'ensorceleur';
      fee.baseStats = { FOR: 0, AGI: 3, CON: 1, PER: 1, INT: 1, VOL: 2, CHA: 1 };
      fee.equippedArmorId = undefined;
      fee.acquiredAbilities = [{ pathId: 'voie-de-la-fee', rank: 1 }];

      const stats = computeCharacterStats(fee);
      expect(stats.finalStats.AGI).toBe(4);
      expect(stats.finalStats.FOR).toBe(-2);
      // DEF = 10 + 4 (AGI) + 2 (sizeDefenseBonus) = 16
      expect(stats.defense).toBe(16);
      expect(stats.pathSituationalNotes).toContain('RD 1 (sauf fer froid)');

      // Weapon check: dague (1d4) is 1-handed, épée courte (1d6) requires 2 hands for a Fée
      const dagueCheck = checkWeaponProficiency('dague', 'guerrier', 'fee');
      expect(dagueCheck.allowed).toBe(true);
      expect(dagueCheck.requiresTwoHands).toBe(false);

      const epeeCourteCheck = checkWeaponProficiency('epee-courte', 'guerrier', 'fee');
      expect(epeeCourteCheck.allowed).toBe(true);
      expect(epeeCourteCheck.requiresTwoHands).toBe(true);
    });

    it('evaluates live companion formulas via resolveCompanionStats', () => {
      const char = createDefaultCharacter();
      char.peopleId = 'gobelin'; // Fixed stats: AGI +1, PER +1, FOR -1, VOL -1
      char.level = 4;
      char.baseStats = { FOR: 1, AGI: 2, CON: 1, PER: 1, INT: 0, VOL: 3, CHA: 0 };
      char.acquiredAbilities = [
        { pathId: 'voie-du-gobelin', rank: 1 }, // +3 Init
        { pathId: 'voie-du-gobelin', rank: 4 }, // Monture gobeline (Worg)
      ];

      const stats = computeCharacterStats(char);
      const path = getPathById('voie-du-gobelin');
      const worg = path?.ranks[3].companions?.[0];
      expect(worg).toBeDefined();
      expect(worg?.name).toBe('Worg');

      const resolved = resolveCompanionStats(worg!, char, stats, 'voie-du-gobelin');
      // Worg DEF: 17
      expect(resolved.defense).toBe('17');
      // Worg HP: level (4) * 5 = 20
      expect(resolved.hp).toBe('20');
      // Worg Init: Init. du gobelin = 10 + 2 (PER) + 3 (Gobelin R1) = 15
      expect(resolved.initiative).toBe('15');
      // Worg Attack: Attaque magique (BAB 4 + VOL 2 = 6) + 2 = +8
      expect(resolved.attacks[0].attackBonus).toBe('+8');
    });

    it('restricts Cotte d’écorce to Satyre, equips it by default, and adds its special note', () => {
      // 1. Not available to non-Satyres
      const humanArmors = getAllowedArmors('rodeur', undefined, 'humain');
      expect(humanArmors.some(a => a.id === 'cotte-ecorce')).toBe(false);

      // 2. Available to Satyre on profiles allowing at least cuir-simple, but not on Magicien
      const satyreRodeurArmors = getAllowedArmors('rodeur', undefined, 'satyre');
      expect(satyreRodeurArmors.some(a => a.id === 'cotte-ecorce')).toBe(true);
      expect(satyreRodeurArmors.some(a => a.id === 'cuir-renforce')).toBe(true);

      const satyreMageArmors = getAllowedArmors('magicien', undefined, 'satyre');
      expect(satyreMageArmors.some(a => a.id === 'cotte-ecorce')).toBe(false);

      // 3. Default equipment for a Satyre Rôdeur or Guerrier prefers cotte-ecorce
      const defEq = getDefaultEquipmentForProfile('guerrier', 'satyre');
      expect(defEq.armorId).toBe('cotte-ecorce');

      // 4. Switching race to Satyre equips cotte-ecorce and adds its note to pathSituationalNotes
      let char = createDefaultCharacter(); // Humain Arquebusier (cuir-renforce)
      char = applyRacialDefaults(char, 'satyre');
      expect(char.equippedArmorId).toBe('cotte-ecorce');

      const stats = computeCharacterStats(char);
      expect(stats.armorDefense).toBe(2);
      expect(
        stats.pathSituationalNotes.some(n =>
          n.includes("Cotte d'écorce") && n.includes('doit être réparée après chaque combat')
        )
      ).toBe(true);

      // 5. Switching back from Satyre to Humain sanitizes cotte-ecorce back to profile default
      char = applyRacialDefaults(char, 'humain');
      expect(char.equippedArmorId).toBe('cuir-renforce');
    });

    it('cleans up false Rank 4 stat bonuses and applies corrected/newly encoded permanent bonuses', () => {
      // 1. Active Rank 4 spells/abilities no longer have parasite stat modifiers
      expect(getPathById('voie-de-l-air')?.ranks[3].modifiers?.stats).toBeUndefined();
      expect(getPathById('voie-du-combat')?.ranks[3].modifiers?.stats).toBeUndefined();
      expect(getPathById('voie-du-musicien')?.ranks[3].modifiers?.stats).toBeUndefined();

      // 2. Corrected stat modifiers (Voie du soldat R4 = FOR +1, Voie du protecteur R4 = PER +1 & +PER PM)
      expect(getPathById('voie-du-soldat')?.ranks[3].modifiers?.stats).toEqual({ FOR: 1 });
      expect(getPathById('voie-du-protecteur')?.ranks[3].modifiers?.stats).toEqual({ PER: 1 });
      expect(getPathById('voie-du-kobold')?.ranks[4].modifiers?.stats).toEqual({ AGI: 1, PER: 1 });
      expect(getPathById('voie-du-gobelin')?.ranks[4].modifiers?.stats).toEqual({ AGI: 1, PER: 1 });
      expect(getPathById('voie-de-la-fee')?.ranks[4].modifiers?.stats).toEqual({ PER: 1, CHA: 1 });

      // 3. Murmures dans le vent (Voie de l'air R1): +1 Init, +1 DEF
      const sorc = createDefaultCharacter();
      sorc.profileId = 'ensorceleur';
      sorc.baseStats = { FOR: 0, AGI: 1, CON: 1, PER: 2, INT: 1, VOL: 2, CHA: 3 };
      sorc.racialStatChoices = ['CHA'];
      sorc.equippedArmorId = undefined;
      sorc.acquiredAbilities = [{ pathId: 'voie-de-l-air', rank: 1 }];
      const sorcStats = computeCharacterStats(sorc);
      expect(sorcStats.defense).toBe(12); // 10 + 1 AGI + 1 Murmures
      expect(sorcStats.initiative).toBe(13); // 10 + 2 PER + 1 Murmures

      // 4. Vêtements sacrés (Voie de la spiritualité R1): +2 DEF without armor (+3 at R3, +4 at R5)
      const priest = createDefaultCharacter();
      priest.profileId = 'pretre';
      priest.baseStats = { FOR: 1, AGI: 1, CON: 1, PER: 1, INT: 0, VOL: 3, CHA: 2 };
      priest.racialStatChoices = ['VOL'];
      priest.equippedArmorId = undefined;
      priest.equippedShieldId = undefined;
      priest.acquiredAbilities = [{ pathId: 'voie-de-la-spiritualite', rank: 1 }];
      let priestStats = computeCharacterStats(priest);
      expect(priestStats.defense).toBe(13); // 10 + 1 AGI + 2 Vêtements sacrés

      priest.acquiredAbilities.push(
        { pathId: 'voie-de-la-spiritualite', rank: 2 },
        { pathId: 'voie-de-la-spiritualite', rank: 3 },
      );
      priestStats = computeCharacterStats(priest);
      expect(priestStats.defense).toBe(14); // +3 at R3
    });

    it('applies fixed racial stats (+2/-2) and statChoices without repeating characteristic codes', () => {
      // Minotaure: fixed stats { FOR: 2, VOL: 1, INT: -2, CHA: -2 }, no statChoices
      let mino = createDefaultCharacter();
      mino.baseStats = { FOR: 2, AGI: 0, CON: 1, PER: 0, INT: 0, VOL: 1, CHA: 0 };
      mino = applyRacialDefaults(mino, 'minotaure');
      expect(mino.racialStatChoices).toEqual([]);
      const minoStats = computeCharacterStats(mino);
      expect(minoStats.racialBonusStats).toEqual({
        FOR: 2,
        AGI: 0,
        CON: 0,
        PER: 0,
        INT: -2,
        VOL: 1,
        CHA: -2,
      });
      expect(minoStats.finalStats.FOR).toBe(4);
      expect(minoStats.finalStats.VOL).toBe(2);
      expect(minoStats.finalStats.INT).toBe(-2);
      expect(minoStats.finalStats.CHA).toBe(-2);

      // Frouïn: fixed { CON: 1, FOR: -1, CHA: -1 } + choice [{ value: 1, options: ['AGI', 'PER'] }]
      let frouin = createDefaultCharacter();
      frouin.baseStats = { FOR: 0, AGI: 2, CON: 1, PER: 2, INT: 0, VOL: 0, CHA: 0 };
      frouin = applyRacialDefaults(frouin, 'frouin');
      expect(frouin.racialStatChoices).toEqual(['AGI']);
      let frouinStats = computeCharacterStats(frouin);
      expect(frouinStats.racialBonusStats.CON).toBe(1);
      expect(frouinStats.racialBonusStats.FOR).toBe(-1);
      expect(frouinStats.racialBonusStats.CHA).toBe(-1);
      expect(frouinStats.racialBonusStats.AGI).toBe(1);
      expect(frouinStats.racialBonusStats.PER).toBe(0);

      // Switch choice to PER
      frouin.racialStatChoices = ['PER'];
      frouinStats = computeCharacterStats(frouin);
      expect(frouinStats.racialBonusStats.AGI).toBe(0);
      expect(frouinStats.racialBonusStats.PER).toBe(1);
    });
  });
});
