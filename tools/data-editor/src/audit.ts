import type {
  PathData,
  ProfileData,
  PeopleData,
  ArmorItem,
  WeaponItem,
} from '../../../src/types/cof2.ts';

export interface AuditIssue {
  id: string;
  category: 'paths' | 'profiles' | 'peoples' | 'equipment' | 'tables';
  targetId: string;
  targetName: string;
  severity: 'error' | 'warning';
  field: string;
  message: string;
}

export interface FullDataset {
  paths: PathData[];
  profiles: ProfileData[];
  peoples: PeopleData[];
  equipment: {
    armorHierarchy: string[];
    armors: ArmorItem[];
    weapons: WeaponItem[];
    startingAdventurerKit?: unknown[];
  };
  tables: Record<string, unknown>;
}

export function runFullAudit(data: FullDataset): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const pathsMap = new Map<string, PathData>();
  const armorsMap = new Map<string, ArmorItem>();
  const weaponsMap = new Map<string, WeaponItem>();
  const profilesMap = new Map<string, ProfileData>();
  const peoplesMap = new Map<string, PeopleData>();

  // 1. Audit Equipment: Armors & Weapons
  if (data.equipment) {
    const { armors = [], weapons = [], armorHierarchy = [] } = data.equipment;

    const seenArmorIds = new Set<string>();
    for (const armor of armors) {
      if (seenArmorIds.has(armor.id)) {
        issues.push({
          id: `dup-armor-${armor.id}`,
          category: 'equipment',
          targetId: armor.id,
          targetName: armor.name,
          severity: 'error',
          field: 'armors.id',
          message: `Identifiant d'armure dupliqué : "${armor.id}"`,
        });
      }
      seenArmorIds.add(armor.id);
      armorsMap.set(armor.id, armor);

      if (armor.equivalentArmorId && !armors.some(a => a.id === armor.equivalentArmorId)) {
        issues.push({
          id: `eq-armor-unknown-${armor.id}`,
          category: 'equipment',
          targetId: armor.id,
          targetName: armor.name,
          severity: 'error',
          field: 'equivalentArmorId',
          message: `L'armure équivalente "${armor.equivalentArmorId}" n'existe pas dans equipment.armors`,
        });
      }
    }

    const seenWeaponIds = new Set<string>();
    for (const weapon of weapons) {
      if (seenWeaponIds.has(weapon.id)) {
        issues.push({
          id: `dup-weapon-${weapon.id}`,
          category: 'equipment',
          targetId: weapon.id,
          targetName: weapon.name,
          severity: 'error',
          field: 'weapons.id',
          message: `Identifiant d'arme dupliqué : "${weapon.id}"`,
        });
      }
      seenWeaponIds.add(weapon.id);
      weaponsMap.set(weapon.id, weapon);
    }

    for (const hierId of armorHierarchy) {
      if (!armorsMap.has(hierId)) {
        issues.push({
          id: `hier-unknown-${hierId}`,
          category: 'equipment',
          targetId: hierId,
          targetName: hierId,
          severity: 'warning',
          field: 'armorHierarchy',
          message: `L'ID "${hierId}" dans armorHierarchy ne correspond à aucune armure définie.`,
        });
      }
    }
  }

  // 2. Audit Paths
  if (Array.isArray(data.paths)) {
    const seenPathIds = new Set<string>();
    for (const path of data.paths) {
      if (seenPathIds.has(path.id)) {
        issues.push({
          id: `dup-path-${path.id}`,
          category: 'paths',
          targetId: path.id,
          targetName: path.name,
          severity: 'error',
          field: 'id',
          message: `Identifiant de voie dupliqué : "${path.id}"`,
        });
      }
      seenPathIds.add(path.id);
      pathsMap.set(path.id, path);

      if (!path.ranks || path.ranks.length !== 5) {
        issues.push({
          id: `ranks-count-${path.id}`,
          category: 'paths',
          targetId: path.id,
          targetName: path.name,
          severity: 'error',
          field: 'ranks',
          message: `La voie contient ${path.ranks?.length || 0} rang(s) au lieu des 5 requis.`,
        });
      } else {
        path.ranks.forEach((rank, idx) => {
          if (!rank.title?.trim()) {
            issues.push({
              id: `rank-title-${path.id}-${idx + 1}`,
              category: 'paths',
              targetId: path.id,
              targetName: path.name,
              severity: 'error',
              field: `ranks[${idx}].title`,
              message: `Le rang ${idx + 1} n'a pas de titre défini.`,
            });
          }
          if (!rank.description?.trim()) {
            issues.push({
              id: `rank-desc-${path.id}-${idx + 1}`,
              category: 'paths',
              targetId: path.id,
              targetName: path.name,
              severity: 'warning',
              field: `ranks[${idx}].description`,
              message: `Le rang ${idx + 1} n'a pas de description.`,
            });
          }
        });
      }

      // Check sacredWeaponIds
      if (path.sacredWeaponIds) {
        for (const wId of path.sacredWeaponIds) {
          if (!weaponsMap.has(wId)) {
            issues.push({
              id: `sacred-weapon-unknown-${path.id}-${wId}`,
              category: 'paths',
              targetId: path.id,
              targetName: path.name,
              severity: 'warning',
              field: 'sacredWeaponIds',
              message: `Arme sacrée référencée "${wId}" inconnue dans equipment.weapons.`,
            });
          }
        }
      }
    }
  }

  // 3. Audit Profiles
  if (Array.isArray(data.profiles)) {
    const seenProfileIds = new Set<string>();
    for (const profile of data.profiles) {
      if (seenProfileIds.has(profile.id)) {
        issues.push({
          id: `dup-profile-${profile.id}`,
          category: 'profiles',
          targetId: profile.id,
          targetName: profile.name,
          severity: 'error',
          field: 'id',
          message: `Identifiant de profil dupliqué : "${profile.id}"`,
        });
      }
      seenProfileIds.add(profile.id);
      profilesMap.set(profile.id, profile);

      // Check referenced paths
      if (!profile.paths || profile.paths.length !== 5) {
        issues.push({
          id: `profile-paths-count-${profile.id}`,
          category: 'profiles',
          targetId: profile.id,
          targetName: profile.name,
          severity: 'warning',
          field: 'paths',
          message: `Le profil associe ${profile.paths?.length || 0} voies (attendu: 5 voies).`,
        });
      }

      if (profile.paths) {
        for (const pathId of profile.paths) {
          if (!pathsMap.has(pathId)) {
            issues.push({
              id: `profile-path-unknown-${profile.id}-${pathId}`,
              category: 'profiles',
              targetId: profile.id,
              targetName: profile.name,
              severity: 'error',
              field: 'paths',
              message: `Voie inconnue "${pathId}" référencée dans le profil.`,
            });
          }
        }
      }

      // Check default equipment
      const defEq = profile.defaultEquipment;
      if (defEq?.armorId && !armorsMap.has(defEq.armorId)) {
        issues.push({
          id: `def-armor-unknown-${profile.id}-${defEq.armorId}`,
          category: 'profiles',
          targetId: profile.id,
          targetName: profile.name,
          severity: 'error',
          field: 'defaultEquipment.armorId',
          message: `Armure de départ "${defEq.armorId}" introuvable dans equipment.armors.`,
        });
      }

      if (defEq?.shieldId && !armorsMap.has(defEq.shieldId)) {
        issues.push({
          id: `def-shield-unknown-${profile.id}-${defEq.shieldId}`,
          category: 'profiles',
          targetId: profile.id,
          targetName: profile.name,
          severity: 'error',
          field: 'defaultEquipment.shieldId',
          message: `Bouclier de départ "${defEq.shieldId}" introuvable dans equipment.armors.`,
        });
      }

      if (defEq?.defaultWeaponIds) {
        for (const wId of defEq.defaultWeaponIds) {
          if (!weaponsMap.has(wId)) {
            issues.push({
              id: `def-weapon-unknown-${profile.id}-${wId}`,
              category: 'profiles',
              targetId: profile.id,
              targetName: profile.name,
              severity: 'error',
              field: 'defaultEquipment.defaultWeaponIds',
              message: `Arme de départ "${wId}" introuvable dans equipment.weapons.`,
            });
          }
        }
      }

      // Check maxArmorId
      const maxArmor = profile.equipmentRules?.maxArmorId;
      if (maxArmor && !armorsMap.has(maxArmor)) {
        issues.push({
          id: `max-armor-unknown-${profile.id}-${maxArmor}`,
          category: 'profiles',
          targetId: profile.id,
          targetName: profile.name,
          severity: 'warning',
          field: 'equipmentRules.maxArmorId',
          message: `Armure max autorisée "${maxArmor}" introuvable dans equipment.armors.`,
        });
      }
    }
  }

  // 4. Audit Peoples
  if (Array.isArray(data.peoples)) {
    const seenPeopleIds = new Set<string>();
    for (const people of data.peoples) {
      if (seenPeopleIds.has(people.id)) {
        issues.push({
          id: `dup-people-${people.id}`,
          category: 'peoples',
          targetId: people.id,
          targetName: people.name,
          severity: 'error',
          field: 'id',
          message: `Identifiant de peuple dupliqué : "${people.id}"`,
        });
      }
      seenPeopleIds.add(people.id);
      peoplesMap.set(people.id, people);

      // Check racialPathId
      if (people.racialPathId && !pathsMap.has(people.racialPathId)) {
        issues.push({
          id: `people-racial-path-${people.id}-${people.racialPathId}`,
          category: 'peoples',
          targetId: people.id,
          targetName: people.name,
          severity: 'error',
          field: 'racialPathId',
          message: `Voie raciale "${people.racialPathId}" introuvable dans paths.json.`,
        });
      }

      // Check selectableRacialPaths
      if (people.selectableRacialPaths) {
        for (const pathId of people.selectableRacialPaths) {
          if (!pathsMap.has(pathId)) {
            issues.push({
              id: `people-selectable-path-${people.id}-${pathId}`,
              category: 'peoples',
              targetId: people.id,
              targetName: people.name,
              severity: 'error',
              field: 'selectableRacialPaths',
              message: `Voie sélectionnable "${pathId}" introuvable dans paths.json.`,
            });
          }
        }
      }

      // Check forbidden / two handed weapon IDs
      const eqRules = people.equipmentRules;
      if (eqRules?.forbiddenWeaponIds) {
        for (const wId of eqRules.forbiddenWeaponIds) {
          if (!weaponsMap.has(wId)) {
            issues.push({
              id: `people-forbidden-weapon-${people.id}-${wId}`,
              category: 'peoples',
              targetId: people.id,
              targetName: people.name,
              severity: 'warning',
              field: 'equipmentRules.forbiddenWeaponIds',
              message: `Arme interdite "${wId}" introuvable dans equipment.weapons.`,
            });
          }
        }
      }

      if (eqRules?.preferredArmorId && !armorsMap.has(eqRules.preferredArmorId)) {
        issues.push({
          id: `people-pref-armor-${people.id}-${eqRules.preferredArmorId}`,
          category: 'peoples',
          targetId: people.id,
          targetName: people.name,
          severity: 'warning',
          field: 'equipmentRules.preferredArmorId',
          message: `Armure de prédilection "${eqRules.preferredArmorId}" introuvable dans equipment.armors.`,
        });
      }

      // Check statChoices coherence (single non-ANY_LOWEST option should be in fixed stats)
      if (people.statChoices) {
        people.statChoices.forEach((choice, cIdx) => {
          if (choice.options.length === 1 && choice.options[0] !== 'ANY_LOWEST') {
            issues.push({
              id: `people-single-choice-${people.id}-${cIdx}`,
              category: 'peoples',
              targetId: people.id,
              targetName: people.name,
              severity: 'warning',
              field: `statChoices[${cIdx}]`,
              message: `Le choix #${cIdx + 1} ne contient qu'une seule caractéristique (${choice.options[0]}). Utilisez plutôt le bloc fixe "stats".`,
            });
          }
        });
      }
    }
  }

  return issues;
}

