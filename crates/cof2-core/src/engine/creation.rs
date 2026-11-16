use crate::engine::stats::{compute_racial_stat_modifiers, empty_stat_map, parse_stat, ALL_STAT_CODES};
use crate::engine::RulesEngine;
use crate::models::{
    AcquiredAbility, CharacterRecord, CharacterWeaponInstance, Coins, InventoryItem, StatCode,
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
    base_stats.insert(StatCode::FOR, 0);
    base_stats.insert(StatCode::AGI, 2);
    base_stats.insert(StatCode::CON, 1);
    base_stats.insert(StatCode::PER, 2);
    base_stats.insert(StatCode::INT, 1);
    base_stats.insert(StatCode::VOL, 0);
    base_stats.insert(StatCode::CHA, -1);

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
        manual_stat_bonuses: HashMap::new(),
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
                category: "contact".to_string(),
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
                category: "contact".to_string(),
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
        manual_stat_bonuses: HashMap::new(),
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
pub fn evaluate_point_buy_stats(base_stats: &HashMap<StatCode, i32>) -> PointBuyEvaluation {
    let mut weak_count = 0;
    let mut spent = 0;
    let mut has_out_of_range_values = false;

    for code in ALL_STAT_CODES {
        let val = *base_stats.get(&code).unwrap_or(&0);
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
    base_stats: &HashMap<StatCode, i32>,
    rules: &RulesDatabase,
) -> String {
    let mut current: Vec<i32> = ALL_STAT_CODES
        .iter()
        .map(|code| *base_stats.get(code).unwrap_or(&0))
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
