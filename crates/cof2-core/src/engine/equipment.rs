use crate::models::{
    AcquiredAbility, CharacterRecord, CharacterWeaponInstance, ComputedCharacterSheet,
    ComputedWeaponInfo, StatCode, WeaponCategory, WeaponModifierRule,
};
use crate::rules::{PathStatic, RulesDatabase, WeaponStatic};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WeaponProficiencyCheck {
    pub allowed: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    pub requires_two_hands: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AllowedWeaponOption {
    pub weapon_id: String,
    pub requires_two_hands: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DefaultEquipmentResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub armor_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shield_id: Option<String>,
    pub weapons: Vec<CharacterWeaponInstance>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EquipmentOptionsResult {
    pub allowed_armor_ids: Vec<String>,
    pub allowed_shield_ids: Vec<String>,
    pub allowed_weapons: Vec<AllowedWeaponOption>,
}

pub(crate) fn does_weapon_match_modifier_rule(
    weapon: &WeaponStatic,
    rule: &WeaponModifierRule,
) -> bool {
    if let Some(ref cat) = rule.category {
        if weapon.category != cat.as_str() {
            return false;
        }
    }
    let has_weapon_ids = rule
        .weapon_ids
        .as_ref()
        .map(|v| !v.is_empty())
        .unwrap_or(false);
    let has_tags = rule.tags.as_ref().map(|v| !v.is_empty()).unwrap_or(false);
    if !has_weapon_ids && !has_tags {
        return rule.category.is_some();
    }
    if let Some(ref ids) = rule.weapon_ids {
        if ids.iter().any(|id| id == &weapon.id) {
            return true;
        }
    }
    if let Some(ref tags) = rule.tags {
        if weapon.tags.iter().any(|t| tags.contains(t)) {
            return true;
        }
    }
    false
}

pub fn get_allowed_armor_ids(
    profile_id: &str,
    secondary_profile_id: Option<&str>,
    people_id: Option<&str>,
    rules: &RulesDatabase,
) -> Vec<String> {
    let max1 = rules
        .profiles
        .get(profile_id)
        .and_then(|p| p.equipment_rules.as_ref())
        .and_then(|er| er.max_armor_id.as_deref());
    let max2 = secondary_profile_id
        .and_then(|id| rules.profiles.get(id))
        .and_then(|p| p.equipment_rules.as_ref())
        .and_then(|er| er.max_armor_id.as_deref());

    let idx1 = max1.and_then(|id| rules.armor_hierarchy.iter().position(|h| h == id));
    let idx2 = max2.and_then(|id| rules.armor_hierarchy.iter().position(|h| h == id));
    let max_idx = match (idx1, idx2) {
        (Some(a), Some(b)) => Some(a.max(b)),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        (None, None) => None,
    };

    let Some(max_idx) = max_idx else {
        return Vec::new();
    };
    let allowed_tiers = &rules.armor_hierarchy[..=max_idx];

    rules
        .armors_order
        .iter()
        .filter_map(|id| rules.armors.get(id))
        .filter(|a| {
            if a.item_type != "armor" {
                return false;
            }
            if let Some(ref restricted) = a.restricted_to_people_ids {
                if !restricted.is_empty() {
                    let Some(pid) = people_id else {
                        return false;
                    };
                    if !restricted.iter().any(|r| r == pid) {
                        return false;
                    }
                }
            }
            let tier_id = a.equivalent_armor_id.as_deref().unwrap_or(&a.id);
            allowed_tiers.iter().any(|t| t == tier_id)
        })
        .map(|a| a.id.clone())
        .collect()
}

pub fn get_allowed_shield_ids(
    profile_id: &str,
    secondary_profile_id: Option<&str>,
    rules: &RulesDatabase,
) -> Vec<String> {
    let perm1 = rules
        .profiles
        .get(profile_id)
        .and_then(|p| p.equipment_rules.as_ref())
        .map(|er| er.shield_permission.as_str())
        .unwrap_or("none");
    let perm2 = secondary_profile_id
        .and_then(|id| rules.profiles.get(id))
        .and_then(|p| p.equipment_rules.as_ref())
        .map(|er| er.shield_permission.as_str())
        .unwrap_or("none");

    if (perm1 != "none" && perm1 != "small") || (perm2 != "none" && perm2 != "small") {
        return rules
            .armors_order
            .iter()
            .filter_map(|id| rules.armors.get(id))
            .filter(|a| a.item_type == "shield")
            .map(|a| a.id.clone())
            .collect();
    }
    if perm1 == "small" || perm2 == "small" {
        return rules
            .armors
            .get("petit-bouclier")
            .map(|a| vec![a.id.clone()])
            .unwrap_or_default();
    }
    Vec::new()
}

pub fn is_armor_allowed(
    armor_id: Option<&str>,
    profile_id: &str,
    secondary_profile_id: Option<&str>,
    people_id: Option<&str>,
    rules: &RulesDatabase,
) -> bool {
    let Some(armor_id) = armor_id else {
        return true;
    };
    get_allowed_armor_ids(profile_id, secondary_profile_id, people_id, rules)
        .iter()
        .any(|id| id == armor_id)
}

pub fn is_shield_allowed(
    shield_id: Option<&str>,
    profile_id: &str,
    secondary_profile_id: Option<&str>,
    rules: &RulesDatabase,
) -> bool {
    let Some(shield_id) = shield_id else {
        return true;
    };
    get_allowed_shield_ids(profile_id, secondary_profile_id, rules)
        .iter()
        .any(|id| id == shield_id)
}

fn find_deity_path<'a>(
    deity_or_domain_path_id: &str,
    rules: &'a RulesDatabase,
) -> Option<&'a PathStatic> {
    if let Some(p) = rules.paths.get(deity_or_domain_path_id) {
        if p.path_type.as_deref() == Some("domain") && p.deity.is_some() {
            return Some(p);
        }
    }
    let lower = deity_or_domain_path_id.to_lowercase();
    rules.paths.values().find(|p| {
        p.path_type.as_deref() == Some("domain")
            && p.deity
                .as_deref()
                .map(|d| d.to_lowercase() == lower)
                .unwrap_or(false)
    })
}

fn matches_sacred_weapon_path(
    weapon_id: &str,
    deity_path: &PathStatic,
    rules: &RulesDatabase,
) -> bool {
    if let Some(ref ids) = deity_path.sacred_weapon_ids {
        if !ids.is_empty() {
            return ids.iter().any(|id| id == weapon_id);
        }
    }
    let Some(ref sacred_desc) = deity_path.sacred_weapon else {
        return false;
    };
    let desc = sacred_desc.to_lowercase();
    let Some(weapon) = rules.weapons.get(weapon_id) else {
        return false;
    };
    let name = weapon.name.to_lowercase();
    if desc.contains(&name) || name.contains(&desc) {
        return true;
    }
    if desc.contains("bâton") && weapon_id.contains("baton") {
        return true;
    }
    if desc.contains("marteau") && weapon_id.contains("marteau") {
        return true;
    }
    if desc.contains("arc") && weapon_id.contains("arc") {
        return true;
    }
    if desc.contains("épée courte") && weapon_id == "epee-courte" {
        return true;
    }
    if desc.contains("épée longue") && weapon_id == "epee-longue" {
        return true;
    }
    if desc.contains("épée à deux mains") && weapon_id == "epee-deux-mains" {
        return true;
    }
    if desc.contains("masse") && weapon_id.contains("masse") {
        return true;
    }
    if desc.contains("dague") && weapon_id == "dague" {
        return true;
    }
    if desc.contains("rapière") && weapon_id == "rapiere" {
        return true;
    }
    if desc.contains("arbalète légère") && weapon_id == "arbalete-legere" {
        return true;
    }
    if desc.contains("mains nues") && weapon_id == "mains-nues" {
        return true;
    }
    false
}

fn check_profile_weapon_rule(
    weapon: &WeaponStatic,
    profile_id: &str,
    rules: &RulesDatabase,
) -> Result<(), String> {
    let Some(profile) = rules.profiles.get(profile_id) else {
        return Ok(());
    };
    let Some(w_rules) = profile
        .equipment_rules
        .as_ref()
        .and_then(|er| er.weapon_rules.as_ref())
    else {
        return Ok(());
    };

    if let Some(ref cats) = w_rules.allowed_categories {
        if !cats.contains(&weapon.category) {
            return Err(format!("{} dédaigne les armes à distance.", profile.name));
        }
    }
    if let Some(ref dmg_types) = w_rules.allowed_damage_types {
        if !dmg_types.contains(&weapon.damage_type) {
            return Err(format!(
                "{} a l'interdiction de faire couler le sang ({} uniquement).",
                profile.name,
                dmg_types.join(", ")
            ));
        }
    }
    if w_rules.forbid_powder && weapon.tags.iter().any(|t| t == "poudre") {
        return Err(format!("{} refuse les armes à poudre.", profile.name));
    }
    if w_rules.forbid_crossbows && weapon.tags.iter().any(|t| t == "arbalete") {
        return Err(format!("{} refuse les arbalètes.", profile.name));
    }
    if let Some(ref forbidden) = w_rules.forbidden_tags {
        if weapon.tags.iter().any(|t| forbidden.contains(t)) {
            return Err(format!("{} refuse ce type d'arme.", profile.name));
        }
    }
    if w_rules.forbid_improved_crit && weapon.crit_min < 20 {
        return Err(format!(
            "{} ne maîtrise pas les armes à critique étendu ({}-20).",
            profile.name, weapon.crit_min
        ));
    }
    if let Some(max_hands) = w_rules.max_hands {
        if weapon.hands > max_hands {
            return Err(format!(
                "{} manie uniquement les armes à 1 main (doit conserver une main libre).",
                profile.name
            ));
        }
    }
    if let Some(max_melee) = w_rules.max_hands_melee {
        if weapon.category == "contact" && weapon.hands > max_melee {
            let is_exc = w_rules
                .allowed_exception_weapon_ids
                .as_ref()
                .map(|v| v.contains(&weapon.id))
                .unwrap_or(false);
            if !is_exc {
                return Err(format!(
                    "{} sait manier les armes de contact à 1 main uniquement.",
                    profile.name
                ));
            }
        }
    }
    if let Some(ref explicit) = w_rules.explicit_allowed_weapon_ids {
        if !explicit.contains(&weapon.id) {
            return Err(format!(
                "{} ne maîtrise pas cette arme.",
                profile.name
            ));
        }
    }
    if let Some(max_dice) = w_rules.max_damage_dice {
        if weapon.max_damage_dice.unwrap_or(0) > max_dice {
            let is_exc = w_rules
                .allowed_exception_weapon_ids
                .as_ref()
                .map(|v| v.contains(&weapon.id))
                .unwrap_or(false);
            if !is_exc {
                return Err(format!(
                    "{} est limité aux armes n'excédant pas {} de DM.",
                    profile.name, max_dice
                ));
            }
        }
    }

    Ok(())
}

pub fn check_weapon_proficiency(
    weapon_id: &str,
    profile_id: &str,
    people_id: &str,
    deity_or_domain_path_id: Option<&str>,
    secondary_profile_id: Option<&str>,
    acquired_abilities: &[AcquiredAbility],
    rules: &RulesDatabase,
) -> WeaponProficiencyCheck {
    let Some(weapon) = rules.weapons.get(weapon_id) else {
        return WeaponProficiencyCheck {
            allowed: false,
            reason: Some("Arme inconnue".to_string()),
            requires_two_hands: false,
        };
    };

    if (profile_id == "pretre" || secondary_profile_id == Some("pretre"))
        && deity_or_domain_path_id.is_some()
    {
        if let Some(deity_path) =
            deity_or_domain_path_id.and_then(|d| find_deity_path(d, rules))
        {
            if matches_sacred_weapon_path(weapon_id, deity_path, rules) {
                return WeaponProficiencyCheck {
                    allowed: true,
                    reason: None,
                    requires_two_hands: weapon.hands == 2,
                };
            }
        }
    }

    let has_path_weapon_prof = acquired_abilities.iter().any(|acq| {
        rules
            .paths
            .get(&acq.path_id)
            .and_then(|p| p.ranks.iter().find(|r| r.rank == acq.rank))
            .and_then(|r| r.modifiers.as_ref())
            .and_then(|m| m.weapon_modifiers.as_ref())
            .map(|wms| {
                wms.iter().any(|wm| {
                    wm.grant_proficiency.unwrap_or(false)
                        && does_weapon_match_modifier_rule(weapon, wm)
                })
            })
            .unwrap_or(false)
    });

    let rule1 = check_profile_weapon_rule(weapon, profile_id, rules);
    let mut profile_allowed = rule1.is_ok() || has_path_weapon_prof;
    let mut profile_reason = rule1.err();

    if !profile_allowed {
        if let Some(sec_id) = secondary_profile_id {
            if check_profile_weapon_rule(weapon, sec_id, rules).is_ok() {
                profile_allowed = true;
                profile_reason = None;
            }
        }
    }

    if !profile_allowed {
        return WeaponProficiencyCheck {
            allowed: false,
            reason: profile_reason,
            requires_two_hands: false,
        };
    }

    let people = rules.peoples.get(people_id);
    let profile = rules.profiles.get(profile_id);
    let w_rules = profile
        .and_then(|p| p.equipment_rules.as_ref())
        .and_then(|er| er.weapon_rules.as_ref());

    let mut requires_two_hands = weapon.hands == 2;
    if let Some(p_rules) = people.and_then(|p| p.equipment_rules.as_ref()) {
        let people_name = people.map(|p| p.name.as_str()).unwrap_or("raciale");
        if let Some(ref forbidden) = p_rules.forbidden_weapon_ids {
            if forbidden.contains(&weapon.id) {
                return WeaponProficiencyCheck {
                    allowed: false,
                    reason: Some(format!("Morphologie {people_name} : arme interdite.")),
                    requires_two_hands: false,
                };
            }
        }
        if let Some(max_dice) = p_rules.max_damage_dice {
            if weapon.max_damage_dice.unwrap_or(0) > max_dice {
                return WeaponProficiencyCheck {
                    allowed: false,
                    reason: Some(format!(
                        "Taille {people_name} : armes supérieures à 1d{max_dice} DM interdites."
                    )),
                    requires_two_hands: false,
                };
            }
        }
        let weapon_dice = weapon.max_damage_dice.unwrap_or(0);
        let force_two_hands = p_rules
            .two_handed_weapon_ids
            .as_ref()
            .map(|v| v.contains(&weapon.id))
            .unwrap_or(false)
            || p_rules
                .two_handed_min_damage_dice
                .map(|min| weapon_dice >= min && weapon_dice <= 10)
                .unwrap_or(false)
            || p_rules
                .max_one_handed_damage_dice
                .map(|max_1h| weapon_dice > max_1h)
                .unwrap_or(false);

        if force_two_hands {
            requires_two_hands = true;
            if w_rules.and_then(|wr| wr.max_hands) == Some(1)
                && secondary_profile_id.is_none()
                && !has_path_weapon_prof
            {
                let prof_name = profile.map(|p| p.name.as_str()).unwrap_or("ce profil");
                return WeaponProficiencyCheck {
                    allowed: false,
                    reason: Some(format!(
                        "Un {people_name} doit manier cette arme à deux mains, or {prof_name} requiert une main libre."
                    )),
                    requires_two_hands: true,
                };
            }
        }
    }

    WeaponProficiencyCheck {
        allowed: true,
        reason: None,
        requires_two_hands,
    }
}

pub fn get_allowed_weapons(
    profile_id: &str,
    people_id: &str,
    secondary_profile_id: Option<&str>,
    acquired_abilities: &[AcquiredAbility],
    rules: &RulesDatabase,
) -> Vec<AllowedWeaponOption> {
    rules
        .weapons_order
        .iter()
        .filter_map(|wid| {
            let check = check_weapon_proficiency(
                wid,
                profile_id,
                people_id,
                None,
                secondary_profile_id,
                acquired_abilities,
                rules,
            );
            if check.allowed {
                Some(AllowedWeaponOption {
                    weapon_id: wid.clone(),
                    requires_two_hands: check.requires_two_hands,
                })
            } else {
                None
            }
        })
        .collect()
}

pub fn get_default_equipment_for_profile(
    profile_id: &str,
    people_id: &str,
    rules: &RulesDatabase,
) -> DefaultEquipmentResult {
    let profile = rules.profiles.get(profile_id).or_else(|| {
        rules
            .default_profile_id()
            .and_then(|id| rules.profiles.get(id))
    });
    let people = rules.peoples.get(people_id);
    let def = profile.and_then(|p| p.default_equipment.as_ref());

    let mut armor_id = def.and_then(|d| d.armor_id.clone());
    let shield_id = def.and_then(|d| d.shield_id.clone());

    if let Some(pref) = people
        .and_then(|p| p.equipment_rules.as_ref())
        .and_then(|er| er.preferred_armor_id.as_deref())
    {
        if armor_id.is_some()
            && is_armor_allowed(Some(pref), profile_id, None, Some(people_id), rules)
        {
            armor_id = Some(pref.to_string());
        }
    }

    let mut target_weapon_ids = def
        .and_then(|d| d.default_weapon_ids.clone())
        .unwrap_or_else(|| vec!["epee-courte".to_string()]);

    let is_small_race = people
        .and_then(|p| p.equipment_rules.as_ref())
        .and_then(|er| er.max_damage_dice)
        .is_some();

    if is_small_race {
        let prof_id_str = profile.map(|p| p.id.as_str()).unwrap_or("");
        target_weapon_ids = target_weapon_ids
            .into_iter()
            .map(|wid| {
                if wid == "epee-longue" && prof_id_str == "barde" {
                    return "epee-courte".to_string();
                }
                if let Some(rep) = rules
                    .weapons
                    .get(&wid)
                    .and_then(|w| w.small_race_replacement_id.clone())
                {
                    return rep;
                }
                wid
            })
            .collect();
    }

    let mut weapons = Vec::new();
    for (idx, wid) in target_weapon_ids.iter().enumerate() {
        if let Some(w) = rules.weapons.get(wid) {
            let check =
                check_weapon_proficiency(&w.id, profile_id, people_id, None, None, &[], rules);
            if check.allowed {
                weapons.push(CharacterWeaponInstance {
                    id: format!("w_{}", idx + 1),
                    weapon_ref_id: w.id.clone(),
                    name: w.name.clone(),
                    damage: w.damage.clone(),
                    range: w.range.clone(),
                    category: WeaponCategory::from_str_lossy(&w.category),
                    bonus_attack: 0,
                    bonus_damage: 0,
                    requires_two_hands: check.requires_two_hands,
                    attack_stat_used: None,
                    attack_stat_source: None,
                });
            }
        }
    }

    DefaultEquipmentResult {
        armor_id,
        shield_id,
        weapons,
    }
}

pub fn sanitize_character_equipment(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> CharacterRecord {
    let sec = record.secondary_profile_id.as_deref();
    let allowed_armors =
        get_allowed_armor_ids(&record.profile_id, sec, Some(&record.people_id), rules);
    let allowed_shields = get_allowed_shield_ids(&record.profile_id, sec, rules);

    let mut equipped_armor_id = record.equipped_armor_id.clone();
    if let Some(ref current_armor) = equipped_armor_id {
        if !allowed_armors.contains(current_armor) {
            let def_armor =
                get_default_equipment_for_profile(&record.profile_id, &record.people_id, rules)
                    .armor_id;
            if let Some(def) = def_armor.filter(|id| allowed_armors.contains(id)) {
                equipped_armor_id = Some(def);
            } else {
                equipped_armor_id = allowed_armors.last().cloned();
            }
        }
    }

    let mut equipped_shield_id = record.equipped_shield_id.clone();
    if let Some(ref current_shield) = equipped_shield_id {
        if !allowed_shields.contains(current_shield) {
            equipped_shield_id = allowed_shields.first().cloned();
        }
    }

    let domain_path_id = record.selected_path_ids.iter().find(|pid| {
        rules
            .paths
            .get(*pid)
            .and_then(|p| p.path_type.as_deref())
            == Some("domain")
    });
    let deity_context = domain_path_id
        .map(String::as_str)
        .or(record.deity.as_deref());

    let mut sanitized_weapons: Vec<CharacterWeaponInstance> = Vec::new();
    for w in &record.weapons {
        let check = check_weapon_proficiency(
            &w.weapon_ref_id,
            &record.profile_id,
            &record.people_id,
            deity_context,
            sec,
            &record.acquired_abilities,
            rules,
        );
        if check.allowed {
            let mut copy = w.clone();
            copy.requires_two_hands = check.requires_two_hands;
            sanitized_weapons.push(copy);
        }
    }

    if sanitized_weapons.is_empty() {
        let def_eq =
            get_default_equipment_for_profile(&record.profile_id, &record.people_id, rules);
        sanitized_weapons = def_eq.weapons;
    }

    let mut next = record.clone();
    next.equipped_armor_id = equipped_armor_id;
    next.equipped_shield_id = equipped_shield_id;
    next.weapons = sanitized_weapons;
    next
}

pub fn get_equipment_options(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> EquipmentOptionsResult {
    let sec = record.secondary_profile_id.as_deref();
    EquipmentOptionsResult {
        allowed_armor_ids: get_allowed_armor_ids(
            &record.profile_id,
            sec,
            Some(&record.people_id),
            rules,
        ),
        allowed_shield_ids: get_allowed_shield_ids(&record.profile_id, sec, rules),
        allowed_weapons: get_allowed_weapons(
            &record.profile_id,
            &record.people_id,
            sec,
            &record.acquired_abilities,
            rules,
        ),
    }
}

/// Calcule les informations d'attaque, dégâts et critique de toutes les armes équipées.
pub(crate) fn compute_weapons_info(
    sheet: &ComputedCharacterSheet,
    rules: &RulesDatabase,
) -> Vec<ComputedWeaponInfo> {
    sheet
        .record
        .weapons
        .iter()
        .map(|w| {
            let base_w = rules.weapons.get(&w.weapon_ref_id);
            let is_contact = w.category == WeaponCategory::Contact;
            let default_stat = if is_contact {
                StatCode::FOR
            } else {
                StatCode::AGI
            };
            let stat_used = w
                .attack_stat_used
                .or_else(|| base_w.and_then(|bw| bw.attack_stat))
                .unwrap_or(default_stat);
            let is_substituted = stat_used != default_stat;
            let source_name = w
                .attack_stat_source
                .clone()
                .or_else(|| base_w.and_then(|bw| bw.attack_stat.map(|_| bw.name.clone())));

            let matching_rules: Vec<&WeaponModifierRule> = sheet
                .active_weapon_modifiers
                .iter()
                .filter(|rule| {
                    base_w
                        .map(|bw| does_weapon_match_modifier_rule(bw, rule))
                        .unwrap_or(false)
                })
                .collect();

            let weapon_atk_bonus: i32 = matching_rules
                .iter()
                .filter_map(|r| r.attack_bonus)
                .sum();
            let weapon_dm_bonus: i32 = matching_rules
                .iter()
                .map(|r| {
                    r.damage_bonus.unwrap_or(0)
                        + r.damage_stat_bonus
                            .map(|st| sheet.final_stats.get(st))
                            .unwrap_or(0)
                })
                .sum();
            let weapon_crit_bonus: i32 = matching_rules
                .iter()
                .filter_map(|r| r.crit_range_bonus)
                .sum();

            let stat_mod = sheet.final_stats.get(stat_used);
            let path_bonus = if is_contact {
                sheet.path_bonus_attacks.contact
            } else {
                sheet.path_bonus_attacks.distance
            };
            let atk_bonus = sheet.bab + stat_mod + path_bonus + w.bonus_attack + weapon_atk_bonus;

            let path_dm_bonus = if is_contact {
                sheet.path_bonus_damage.contact
            } else {
                sheet.path_bonus_damage.distance
            };
            let extra_dm = w.bonus_damage + weapon_dm_bonus + path_dm_bonus;
            let base_dm_stat_mod = match base_w.and_then(|bw| bw.damage_stat) {
                Some(Some(st)) => sheet.final_stats.get(st),
                Some(None) => 0,
                None => {
                    if is_contact {
                        sheet.final_stats.get(StatCode::FOR)
                    } else {
                        0
                    }
                }
            };
            let total_dm_mod = base_dm_stat_mod + extra_dm;
            let dm_bonus = if total_dm_mod > 0 {
                format!("+ {total_dm_mod}")
            } else if total_dm_mod < 0 {
                format!("- {}", total_dm_mod.abs())
            } else {
                String::new()
            };

            let base_crit_min = base_w.map(|bw| bw.crit_min).unwrap_or(20);
            let crit_min =
                (base_crit_min - sheet.path_crit_range_bonus - weapon_crit_bonus).max(2);
            let crit_range = if crit_min < 20 {
                format!("{crit_min}-20")
            } else {
                "20".to_string()
            };

            ComputedWeaponInfo {
                weapon_id: w.id.clone(),
                atk_bonus,
                stat_used,
                source_name,
                is_substituted,
                dm_bonus,
                crit_min,
                crit_range,
            }
        })
        .collect()
}
