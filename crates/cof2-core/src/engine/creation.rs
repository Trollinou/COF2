use crate::engine::equipment::{get_default_equipment_for_profile, sanitize_character_equipment};
use crate::engine::paths::{
    can_use_voie_du_mage, get_profile_all_pool_path_ids, has_mage_creation_bonus, is_domain_path,
    is_racial_replacement_path,
};
use crate::engine::stats::{compute_racial_stat_modifiers, empty_stat_map, parse_stat, ALL_STAT_CODES};
use crate::engine::RulesEngine;
use crate::models::{
    AcquiredAbility, CharacterRecord, CharacterWeaponInstance, Coins, InventoryItem, StatBlock,
    StatCode, WeaponCategory,
};
use crate::rules::RulesDatabase;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn generate_character_id_and_timestamp() -> (String, String) {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let millis = duration.as_millis();
    let sub_nanos = duration.subsec_nanos();
    let id = format!("char_{millis}_{sub_nanos:09x}");
    let secs = duration.as_secs();
    let iso = format_unix_secs_iso(secs, duration.subsec_millis());
    (id, iso)
}

fn format_unix_secs_iso(secs: u64, millis: u32) -> String {
    let days = (secs / 86_400) as i64;
    let rem = secs % 86_400;
    let hours = rem / 3_600;
    let minutes = (rem % 3_600) / 60;
    let seconds = rem % 60;

    // Howard Hinnant civil-from-days algorithm (UTC).
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = (z - era * 146_097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146_096) / 365;
    let y = (yoe as i64) + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };

    format!("{year:04}-{m:02}-{d:02}T{hours:02}:{minutes:02}:{seconds:02}.{millis:03}Z")
}

/// Retourne l'identifiant de la voie raciale d'un peuple, avec choix explicite optionnel.
pub(crate) fn get_racial_path_id_with_choice(
    people_id: &str,
    chosen_racial_path_id: Option<&str>,
    rules: &RulesDatabase,
) -> String {
    if let Some(chosen) = chosen_racial_path_id {
        if !chosen.is_empty() {
            return chosen.to_string();
        }
    }
    if let Some(people) = rules.peoples.get(people_id) {
        if let Some(ref explicit) = people.racial_path_id {
            if !explicit.is_empty() {
                return explicit.clone();
            }
        }
        if let Some(ref selectable) = people.selectable_racial_paths {
            if let Some(first) = selectable.first() {
                return first.clone();
            }
        }
    }
    if people_id == "humain" {
        "voie-de-l-humain".to_string()
    } else {
        format!("voie-du-{people_id}")
    }
}

pub(crate) fn get_racial_path_id(people_id: &str, rules: &RulesDatabase) -> String {
    get_racial_path_id_with_choice(people_id, None, rules)
}

/// Crée un personnage par défaut complet au niveau 1 (équivalent de `createDefaultCharacter`).
pub fn default_character_record(rules: &RulesDatabase) -> CharacterRecord {
    let (id, updated_at) = generate_character_id_and_timestamp();
    let people_id = rules.default_people_id().unwrap_or("humain").to_string();
    let profile_id = rules.default_profile_id().unwrap_or("arquebusier").to_string();

    let people = rules.peoples.get(&people_id);
    let profile = rules.profiles.get(&profile_id);

    let mut base_stats = empty_stat_map();
    base_stats.set(StatCode::FOR, 0);
    base_stats.set(StatCode::AGI, 2);
    base_stats.set(StatCode::CON, 1);
    base_stats.set(StatCode::PER, 2);
    base_stats.set(StatCode::INT, 1);
    base_stats.set(StatCode::VOL, 0);
    base_stats.set(StatCode::CHA, -1);

    let racial_stat_choices = vec![StatCode::FOR];
    let racial_stat_modifiers =
        compute_racial_stat_modifiers(&people_id, &racial_stat_choices, None, rules);

    let racial_path_id = get_racial_path_id(&people_id, rules);
    let mut selected_path_ids = Vec::new();
    let mut acquired_abilities = Vec::new();
    if let Some(prof) = profile {
        for p in prof.paths.iter().take(2) {
            selected_path_ids.push(p.clone());
            acquired_abilities.push(AcquiredAbility {
                path_id: p.clone(),
                rank: 1,
            });
        }
    }
    selected_path_ids.push(racial_path_id.clone());
    acquired_abilities.push(AcquiredAbility {
        path_id: racial_path_id,
        rank: 1,
    });

    let inventory = rules
        .starting_adventurer_kit
        .iter()
        .enumerate()
        .map(|(idx, item)| InventoryItem {
            id: format!("inv_{idx}"),
            name: item.clone(),
            quantity: 1,
            notes: None,
        })
        .collect();

    let mut record = CharacterRecord {
        id,
        version: "1.0.0".to_string(),
        updated_at,
        creation_completed: Some(true),
        name: "Nouveau Héros".to_string(),
        player_name: String::new(),
        sex: "Masculin".to_string(),
        age: people.map(|p| p.starting_age.clone()).unwrap_or_default(),
        height: people.map(|p| p.height_range.clone()).unwrap_or_default(),
        weight: people.map(|p| p.weight_range.clone()).unwrap_or_default(),
        physical_traits: people.map(|p| p.physical_traits.clone()).unwrap_or_default(),
        languages: Vec::new(),
        secondary_talents: Vec::new(),
        background: String::new(),
        ideal: "Courage".to_string(),
        flaw: "Impulsif".to_string(),
        notes: String::new(),
        deity: None,
        people_id,
        profile_id,
        profile_family: None,
        is_hybrid: None,
        secondary_profile_id: None,
        level: 1,
        base_stats,
        stat_array_preset: Some("polyvalent".to_string()),
        racial_stat_choices,
        racial_stat_modifiers,
        manual_stat_bonuses: StatBlock::default(),
        selected_path_ids,
        acquired_abilities,
        path_rank_choices: HashMap::new(),
        external_ability_choices: HashMap::new(),
        human_diversity: None,
        progression_history: Vec::new(),
        current_hp: 10,
        max_hp_bonus: 0,
        level_up_hp_gains: Vec::new(),
        half_hp_pending: None,
        current_dr: 3,
        current_pc: 2,
        current_pm: 0,
        equipped_armor_id: Some("cuir-simple".to_string()),
        equipped_shield_id: None,
        weapons: vec![
            CharacterWeaponInstance {
                id: "w_1".to_string(),
                weapon_ref_id: "epee-longue".to_string(),
                name: "Épée longue".to_string(),
                damage: "1d8".to_string(),
                range: "Contact".to_string(),
                category: WeaponCategory::Contact,
                bonus_attack: 0,
                bonus_damage: 0,
                requires_two_hands: false,
                attack_stat_used: None,
                attack_stat_source: None,
            },
            CharacterWeaponInstance {
                id: "w_2".to_string(),
                weapon_ref_id: "dague".to_string(),
                name: "Dague".to_string(),
                damage: "1d4".to_string(),
                range: "Contact (ou 10 m)".to_string(),
                category: WeaponCategory::Contact,
                bonus_attack: 0,
                bonus_damage: 0,
                requires_two_hands: false,
                attack_stat_used: None,
                attack_stat_source: None,
            },
        ],
        inventory,
        coins: Coins {
            pa: 12,
            pc: 0,
            po: 0,
        },
    };

    if let Ok(computed) = RulesEngine::compute_sheet(&record, rules) {
        record.current_hp = computed.max_hp;
        record.current_dr = computed.max_dr;
        record.current_pc = computed.max_pc;
        record.current_pm = computed.max_pm;
    }

    record
}

/// Crée une fiche vierge pour le wizard de création sans choix présélectionnés.
pub fn blank_wizard_character_record(rules: &RulesDatabase) -> CharacterRecord {
    let (id, updated_at) = generate_character_id_and_timestamp();
    let inventory = rules
        .starting_adventurer_kit
        .iter()
        .enumerate()
        .map(|(idx, item)| InventoryItem {
            id: format!("inv_{idx}"),
            name: item.clone(),
            quantity: 1,
            notes: None,
        })
        .collect();

    CharacterRecord {
        id,
        version: "1.0.0".to_string(),
        updated_at,
        creation_completed: Some(false),
        name: String::new(),
        player_name: String::new(),
        sex: String::new(),
        age: String::new(),
        height: String::new(),
        weight: String::new(),
        physical_traits: String::new(),
        languages: Vec::new(),
        secondary_talents: Vec::new(),
        background: String::new(),
        ideal: String::new(),
        flaw: String::new(),
        notes: String::new(),
        deity: None,
        people_id: String::new(),
        profile_id: String::new(),
        profile_family: None,
        is_hybrid: None,
        secondary_profile_id: None,
        level: 1,
        base_stats: empty_stat_map(),
        stat_array_preset: Some(String::new()),
        racial_stat_choices: Vec::new(),
        racial_stat_modifiers: empty_stat_map(),
        manual_stat_bonuses: StatBlock::default(),
        selected_path_ids: Vec::new(),
        acquired_abilities: Vec::new(),
        path_rank_choices: HashMap::new(),
        external_ability_choices: HashMap::new(),
        human_diversity: None,
        progression_history: Vec::new(),
        current_hp: 0,
        max_hp_bonus: 0,
        level_up_hp_gains: Vec::new(),
        half_hp_pending: None,
        current_dr: 0,
        current_pc: 0,
        current_pm: 0,
        equipped_armor_id: None,
        equipped_shield_id: None,
        weapons: Vec::new(),
        inventory,
        coins: Coins {
            pa: 0,
            pc: 0,
            po: 0,
        },
    }
}

/// Applique les valeurs raciales par défaut lors du choix ou changement de peuple.
pub fn apply_racial_defaults(
    record: &CharacterRecord,
    people_id: &str,
    chosen_racial_path_id: Option<&str>,
    preserve_empty_choices: bool,
    rules: &RulesDatabase,
) -> CharacterRecord {
    let Some(people) = rules.peoples.get(people_id) else {
        return record.clone();
    };

    let racial_stat_choices: Vec<StatCode> = if preserve_empty_choices {
        Vec::new()
    } else {
        people
            .stat_choices
            .as_ref()
            .map(|choices| {
                choices
                    .iter()
                    .map(|c| {
                        c.options
                            .first()
                            .filter(|o| o.as_str() != "ANY_LOWEST")
                            .and_then(|o| parse_stat(o).ok())
                            .unwrap_or(StatCode::FOR)
                    })
                    .collect()
            })
            .unwrap_or_default()
    };

    let has_selectable_racial = people
        .selectable_racial_paths
        .as_ref()
        .map(|v| !v.is_empty())
        .unwrap_or(false);

    let racial_path_id = if preserve_empty_choices
        && has_selectable_racial
        && chosen_racial_path_id.map(str::is_empty).unwrap_or(true)
    {
        String::new()
    } else {
        get_racial_path_id_with_choice(people_id, chosen_racial_path_id, rules)
    };

    let profile = rules.profiles.get(&record.profile_id);
    let sec_profile = if record.is_hybrid.unwrap_or(false) {
        record
            .secondary_profile_id
            .as_ref()
            .and_then(|id| rules.profiles.get(id))
    } else {
        None
    };

    let mut all_profile_paths: Vec<String> = Vec::new();
    if let Some(p) = profile {
        all_profile_paths.extend(p.paths.iter().cloned());
    }
    if let Some(sp) = sec_profile {
        all_profile_paths.extend(sp.paths.iter().cloned());
    }

    let current_profile_paths: Vec<String> = record
        .selected_path_ids
        .iter()
        .filter(|id| all_profile_paths.contains(id))
        .cloned()
        .collect();

    let (updated_paths, updated_acquired) = if preserve_empty_choices {
        let mut paths = current_profile_paths.clone();
        if !racial_path_id.is_empty() {
            paths.push(racial_path_id.clone());
        }
        let mut acq: Vec<AcquiredAbility> = record
            .acquired_abilities
            .iter()
            .filter(|a| current_profile_paths.contains(&a.path_id))
            .cloned()
            .collect();
        if !racial_path_id.is_empty() {
            acq.push(AcquiredAbility {
                path_id: racial_path_id,
                rank: 1,
            });
        }
        (paths, acq)
    } else {
        let fallback_profile = profile.or_else(|| {
            rules
                .default_profile_id()
                .and_then(|id| rules.profiles.get(id))
        });
        let p1 = current_profile_paths
            .first()
            .cloned()
            .or_else(|| fallback_profile.and_then(|fp| fp.paths.first().cloned()))
            .unwrap_or_default();
        let p2 = current_profile_paths
            .get(1)
            .cloned()
            .or_else(|| {
                sec_profile
                    .and_then(|sp| sp.paths.first().cloned())
                    .or_else(|| {
                        fallback_profile.and_then(|fp| {
                            fp.paths
                                .iter()
                                .find(|id| id.as_str() != p1)
                                .cloned()
                                .or_else(|| fp.paths.get(1).cloned())
                        })
                    })
            })
            .unwrap_or_default();

        let paths = vec![p1.clone(), p2.clone(), racial_path_id.clone()];
        let mut acq: Vec<AcquiredAbility> = record
            .acquired_abilities
            .iter()
            .filter(|a| a.path_id == p1 || a.path_id == p2)
            .cloned()
            .collect();
        acq.push(AcquiredAbility {
            path_id: racial_path_id,
            rank: 1,
        });
        (paths, acq)
    };

    let mut next_armor_id = record.equipped_armor_id.clone();
    if let Some(ref pref) = people
        .equipment_rules
        .as_ref()
        .and_then(|er| er.preferred_armor_id.as_ref())
    {
        if next_armor_id.is_some()
            && crate::engine::equipment::is_armor_allowed(
                Some(pref),
                &record.profile_id,
                record.secondary_profile_id.as_deref(),
                Some(people_id),
                rules,
            )
        {
            next_armor_id = Some((*pref).clone());
        }
    }

    let next_sex = if people_id == "farfadet" {
        "Masculin".to_string()
    } else if people_id == "fee" {
        "Féminin".to_string()
    } else if preserve_empty_choices
        && (record.people_id == "farfadet" || record.people_id == "fee")
    {
        String::new()
    } else {
        record.sex.clone()
    };

    let (_, updated_at) = generate_character_id_and_timestamp();
    let racial_stat_modifiers =
        compute_racial_stat_modifiers(people_id, &racial_stat_choices, None, rules);

    let mut updated = record.clone();
    updated.people_id = people_id.to_string();
    updated.sex = next_sex;
    updated.equipped_armor_id = next_armor_id;
    updated.age = people.starting_age.clone();
    updated.height = if preserve_empty_choices {
        String::new()
    } else {
        people.height_range.clone()
    };
    updated.weight = if preserve_empty_choices {
        String::new()
    } else {
        people.weight_range.clone()
    };
    updated.physical_traits = people.physical_traits.clone();
    updated.languages = Vec::new();
    updated.secondary_talents = Vec::new();
    updated.racial_stat_choices = racial_stat_choices;
    updated.racial_stat_modifiers = racial_stat_modifiers;
    updated.selected_path_ids = updated_paths;
    updated.acquired_abilities = updated_acquired;
    updated.updated_at = updated_at;

    let sanitized = if !updated.profile_id.is_empty() {
        crate::engine::equipment::sanitize_character_equipment(&updated, rules)
    } else {
        updated
    };
    let mut final_rec = sanitized;
    if let Ok(computed) = RulesEngine::compute_sheet(&final_rec, rules) {
        final_rec.current_hp = computed.max_hp;
        final_rec.current_dr = computed.max_dr;
        final_rec.current_pc = computed.max_pc;
        final_rec.current_pm = computed.max_pm;
    }

    final_rec
}

pub const POINT_BUY_BASE_BUDGET: i32 = 7;
pub const POINT_BUY_MAX_WEAK_STATS: i32 = 2;
pub const POINT_BUY_MIN_VALUE: i32 = -1;
pub const POINT_BUY_MAX_VALUE: i32 = 4;

fn point_buy_cost(val: i32) -> i32 {
    match val {
        -1 | 0 => 0,
        1 => 1,
        2 => 2,
        3 => 4,
        4 => 6,
        _ => 0,
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PointBuyEvaluation {
    pub base_budget: i32,
    pub weak_count: i32,
    pub bonus_budget: i32,
    pub total_budget: i32,
    pub spent: i32,
    pub remaining: i32,
    pub too_many_weak_stats: bool,
    pub has_out_of_range_values: bool,
    pub is_valid: bool,
    pub is_complete: bool,
}

/// Évalue les caractéristiques de base selon la méthode par achat COF2 (budget 7 pts).
pub fn evaluate_point_buy_stats(base_stats: &StatBlock) -> PointBuyEvaluation {
    let mut weak_count = 0;
    let mut spent = 0;
    let mut has_out_of_range_values = false;

    for code in ALL_STAT_CODES {
        let val = base_stats.get(code);
        if !(POINT_BUY_MIN_VALUE..=POINT_BUY_MAX_VALUE).contains(&val) {
            has_out_of_range_values = true;
        } else if val == -1 {
            weak_count += 1;
        } else {
            spent += point_buy_cost(val);
        }
    }

    let too_many_weak_stats = weak_count > POINT_BUY_MAX_WEAK_STATS;
    let bonus_budget = weak_count.min(POINT_BUY_MAX_WEAK_STATS);
    let total_budget = POINT_BUY_BASE_BUDGET + bonus_budget;
    let remaining = total_budget - spent;
    let is_valid = !has_out_of_range_values && !too_many_weak_stats && remaining >= 0;
    let is_complete = is_valid && remaining == 0;

    PointBuyEvaluation {
        base_budget: POINT_BUY_BASE_BUDGET,
        weak_count,
        bonus_budget,
        total_budget,
        spent,
        remaining,
        too_many_weak_stats,
        has_out_of_range_values,
        is_valid,
        is_complete,
    }
}

/// Détecte le tableau de caractéristiques prédéfini correspondant, ou `"achat"`.
pub fn detect_characteristic_array_preset(
    base_stats: &StatBlock,
    rules: &RulesDatabase,
) -> String {
    let mut current: Vec<i32> = ALL_STAT_CODES
        .iter()
        .map(|code| base_stats.get(*code))
        .collect();
    current.sort_by(|a, b| b.cmp(a));

    for arr in &rules.characteristic_arrays {
        let mut preset = arr.values.clone();
        preset.sort_by(|a, b| b.cmp(a));
        if current == preset {
            return arr.id.clone();
        }
    }

    "achat".to_string()
}

fn collect_profile_and_secondary_paths(
    record: &CharacterRecord,
    rules: &RulesDatabase,
    include_optional: bool,
) -> Vec<String> {
    let mut out = Vec::new();
    let mut push_profile = |pid: &str| {
        if let Some(p) = rules.profiles.get(pid) {
            if include_optional {
                out.extend(get_profile_all_pool_path_ids(p));
            } else {
                out.extend(p.paths.iter().cloned());
            }
        }
    };
    push_profile(&record.profile_id);
    if record.is_hybrid.unwrap_or(false) {
        if let Some(ref sec_id) = record.secondary_profile_id {
            push_profile(sec_id);
        }
    }
    out
}

/// Maintient la cohérence des voies et des rangs 2 gratuits lors de la création.
pub fn sanitize_wizard_paths(record: &CharacterRecord, rules: &RulesDatabase) -> CharacterRecord {
    let Some(_profile) = rules.profiles.get(&record.profile_id) else {
        return record.clone();
    };
    let Some(people) = rules.peoples.get(&record.people_id) else {
        return record.clone();
    };

    let all_profile_paths = collect_profile_and_secondary_paths(record, rules, true);
    let is_priest =
        record.profile_id == "pretre" || record.secondary_profile_id.as_deref() == Some("pretre");
    let is_mage = can_use_voie_du_mage(record);

    let mut updated = record.clone();

    // 1. Nettoyer toute voie de remplacement (domaine ou voie-du-mage) devenue invalide
    let invalid_replacements: Vec<String> = updated
        .selected_path_ids
        .iter()
        .filter(|id| {
            (is_domain_path(id, rules) && !is_priest) || (id.as_str() == "voie-du-mage" && !is_mage)
        })
        .cloned()
        .collect();

    for invalid_id in &invalid_replacements {
        updated.selected_path_ids.retain(|id| id != invalid_id);
        if is_domain_path(invalid_id, rules) {
            updated.deity = None;
        }
        updated.acquired_abilities.retain(|a| &a.path_id != invalid_id);
    }

    // 2. Auto-appliquer la voie raciale si aucune 3e voie n'est présente et que le profil ne la remplace pas
    let existing_third_path = updated
        .selected_path_ids
        .iter()
        .find(|id| !all_profile_paths.contains(id))
        .cloned();
    let has_selectable_cultural = people
        .selectable_racial_paths
        .as_ref()
        .is_some_and(|v| !v.is_empty());

    if existing_third_path.is_none() && !is_priest && !is_mage && !has_selectable_cultural {
        let expected_racial = get_racial_path_id(&record.people_id, rules);
        if !expected_racial.is_empty() {
            updated.selected_path_ids.push(expected_racial.clone());
            if !updated
                .acquired_abilities
                .iter()
                .any(|a| a.path_id == expected_racial && a.rank == 1)
            {
                updated.acquired_abilities.push(AcquiredAbility {
                    path_id: expected_racial,
                    rank: 1,
                });
            }
        }
    }

    // 3. Purger les rangs 2 acquis à la création sans bonus mage
    if !has_mage_creation_bonus(&updated, rules) {
        updated.acquired_abilities.retain(|a| a.rank != 2);
    }

    updated
}

/// Sélectionne un profil dans le wizard et réinitialise les voies, l'équipement et les ressources.
pub fn select_profile_with_defaults(
    record: &CharacterRecord,
    profile_id: &str,
    rules: &RulesDatabase,
) -> CharacterRecord {
    if !rules.profiles.contains_key(profile_id) {
        return record.clone();
    }

    let mut temp = record.clone();
    temp.profile_id = profile_id.to_string();
    temp.profile_family = None;

    let all_profile_paths = collect_profile_and_secondary_paths(&temp, rules, false);
    let existing_third = record
        .selected_path_ids
        .iter()
        .find(|id| !all_profile_paths.contains(id))
        .cloned();

    let is_priest =
        profile_id == "pretre" || record.secondary_profile_id.as_deref() == Some("pretre");
    let is_mage = can_use_voie_du_mage(&temp);

    let mut next_selected_paths = Vec::new();
    let mut next_acquired = Vec::new();

    if !is_priest && !is_mage {
        let has_selectable_cultural = rules
            .peoples
            .get(&record.people_id)
            .and_then(|p| p.selectable_racial_paths.as_ref())
            .is_some_and(|v| !v.is_empty());

        let racial_path_id = existing_third.unwrap_or_else(|| {
            if !has_selectable_cultural && !record.people_id.is_empty() {
                get_racial_path_id(&record.people_id, rules)
            } else {
                String::new()
            }
        });

        if !racial_path_id.is_empty() {
            next_selected_paths.push(racial_path_id.clone());
            next_acquired.push(AcquiredAbility {
                path_id: racial_path_id,
                rank: 1,
            });
        }
    }

    let effective_people = if record.people_id.is_empty() {
        "humain"
    } else {
        &record.people_id
    };
    let default_eq = get_default_equipment_for_profile(profile_id, effective_people, rules);

    let (_, updated_at) = generate_character_id_and_timestamp();
    temp.deity = None;
    temp.selected_path_ids = next_selected_paths;
    temp.acquired_abilities = next_acquired;
    temp.path_rank_choices = HashMap::new();
    temp.equipped_armor_id = default_eq.armor_id;
    temp.equipped_shield_id = default_eq.shield_id;
    temp.weapons = default_eq.weapons;
    temp.updated_at = updated_at;

    let mut sanitized = sanitize_character_equipment(&temp, rules);
    if let Ok(computed) = RulesEngine::compute_sheet(&sanitized, rules) {
        sanitized.current_hp = computed.max_hp;
        sanitized.current_dr = computed.max_dr;
        sanitized.current_pc = computed.max_pc;
        sanitized.current_pm = computed.max_pm;
    }

    sanitized
}

/// Active ou désactive une voie de profil dans le wizard (max 2 voies de profil + conservation 3e voie).
pub fn toggle_wizard_profile_path(
    record: &CharacterRecord,
    path_id: &str,
    rules: &RulesDatabase,
) -> CharacterRecord {
    if !rules.profiles.contains_key(&record.profile_id) {
        return record.clone();
    }

    let all_profile_paths = collect_profile_and_secondary_paths(record, rules, true);
    let current_profile_paths: Vec<String> = record
        .selected_path_ids
        .iter()
        .filter(|id| all_profile_paths.contains(id))
        .cloned()
        .collect();

    let existing_third = record
        .selected_path_ids
        .iter()
        .find(|id| !all_profile_paths.contains(id))
        .cloned();

    let is_special_third = existing_third
        .as_deref()
        .is_some_and(|id| is_racial_replacement_path(id, rules));
    let racial_path = get_racial_path_id(&record.people_id, rules);
    let third_path = match existing_third.as_deref() {
        Some(t) if is_special_third => t.to_string(),
        Some(t) => get_racial_path_id_with_choice(&record.people_id, Some(t), rules),
        None => String::new(),
    };

    let new_profile_paths: Vec<String> = if current_profile_paths.iter().any(|id| id == path_id) {
        current_profile_paths
            .into_iter()
            .filter(|id| id != path_id)
            .collect()
    } else if current_profile_paths.len() >= 2 {
        vec![current_profile_paths[0].clone(), path_id.to_string()]
    } else {
        let mut next = current_profile_paths;
        next.push(path_id.to_string());
        next
    };

    let mut next_selected = new_profile_paths.clone();
    if !third_path.is_empty() {
        next_selected.push(third_path.clone());
    }

    let mut next_acquired: Vec<AcquiredAbility> = record
        .acquired_abilities
        .iter()
        .filter(|a| {
            new_profile_paths.contains(&a.path_id)
                || (!third_path.is_empty()
                    && (a.path_id == third_path
                        || (is_special_third && a.path_id == racial_path)))
        })
        .cloned()
        .collect();

    let ensure_rank1 = |acq: &mut Vec<AcquiredAbility>, pid: &str| {
        if !pid.is_empty() && !acq.iter().any(|a| a.path_id == pid && a.rank == 1) {
            acq.push(AcquiredAbility {
                path_id: pid.to_string(),
                rank: 1,
            });
        }
    };

    for pid in &new_profile_paths {
        ensure_rank1(&mut next_acquired, pid);
    }
    ensure_rank1(&mut next_acquired, &third_path);
    if is_special_third {
        ensure_rank1(&mut next_acquired, &racial_path);
    }

    let (_, updated_at) = generate_character_id_and_timestamp();
    let mut updated = record.clone();
    updated.selected_path_ids = next_selected;
    updated.acquired_abilities = next_acquired;
    updated.updated_at = updated_at;
    updated
}

/// Répartit automatiquement les valeurs d'un tableau de caractéristiques selon le profil.
pub fn auto_assign_characteristic_array(
    record: &CharacterRecord,
    preset_id: &str,
    rules: &RulesDatabase,
) -> CharacterRecord {
    if preset_id.is_empty() {
        return record.clone();
    }

    let default_primary = [StatCode::FOR, StatCode::AGI, StatCode::CON];
    let primary: &[StatCode] = rules
        .profiles
        .get(&record.profile_id)
        .map(|p| p.primary_stats.as_slice())
        .filter(|s| !s.is_empty())
        .unwrap_or(&default_primary);

    let mut new_base = empty_stat_map();

    if preset_id == "achat" {
        let point_buy_spread = [3, 2, 1];
        for (idx, stat) in primary.iter().enumerate() {
            if idx < point_buy_spread.len() {
                new_base.set(*stat, point_buy_spread[idx]);
            }
        }
    } else {
        let Some(arr) = rules
            .characteristic_arrays
            .iter()
            .find(|a| a.id == preset_id)
        else {
            return record.clone();
        };

        let mut sorted_values = arr.values.clone();
        sorted_values.sort_by(|a, b| b.cmp(a));

        let secondary: Vec<StatCode> = ALL_STAT_CODES
            .iter()
            .copied()
            .filter(|s| !primary.contains(s))
            .collect();

        for (idx, stat) in primary.iter().enumerate() {
            if let Some(&val) = sorted_values.get(idx) {
                new_base.set(*stat, val);
            }
        }
        for (idx, stat) in secondary.iter().enumerate() {
            if let Some(&val) = sorted_values.get(primary.len() + idx) {
                new_base.set(*stat, val);
            }
        }
    }

    let (_, updated_at) = generate_character_id_and_timestamp();
    let mut updated = record.clone();
    updated.base_stats = new_base;
    updated.stat_array_preset = Some(preset_id.to_string());
    updated.updated_at = updated_at;
    updated
}
