use cof2_core::engine::creation::{
    apply_racial_defaults, blank_wizard_character_record, default_character_record,
    detect_characteristic_array_preset, evaluate_point_buy_stats,
};
use cof2_core::engine::diversity::{
    format_human_diversity_note, has_human_diversity_rank1, is_human_diversity_valid,
    resolve_human_diversity,
};
use cof2_core::engine::equipment::{
    check_weapon_proficiency, get_allowed_armor_ids, get_allowed_shield_ids,
    get_default_equipment_for_profile, sanitize_character_equipment,
};
use cof2_core::engine::grants::resolve_external_grants;
use cof2_core::engine::progression::{
    calculate_armor_spell_mana_cost, calculate_capability_points, calculate_level_up_hp_gain,
    can_character_adopt_hybrid_path, check_prestige_path_prerequisites, get_level_up_context,
};
use cof2_core::engine::wizard::{get_max_unlocked_wizard_step, validate_wizard_step};
use cof2_core::models::{AcquiredAbility, HumanDiversityChoice, StatCode};
use cof2_core::{validate_and_migrate_record, RulesDatabase, RulesEngine};
use serde_json::json;
use std::collections::HashMap;

#[test]
fn test_validation_and_migration_repairs_corrupted_and_legacy_records() {
    let rules = RulesDatabase::load_embedded().unwrap();

    let invalid = validate_and_migrate_record(json!("not_an_object"), &rules);
    assert!(!invalid.is_valid);
    assert!(!invalid.warnings.is_empty());
    assert_eq!(invalid.character.level, 1);

    let legacy = json!({
        "id": "legacy_1",
        "name": "Borin",
        "peopleId": "nain",
        "profileId": "guerrier",
        "level": 3,
        "baseStats": {
            "FOR": 3, "AGI": 0, "CON": 2, "PER": 1, "INT": 0, "VOL": 1, "CHA": -1
        },
        "pathRankChoices": {
            "__proto__": "evil",
            "valid_key_1": "opt_a"
        }
    });
    let res = validate_and_migrate_record(legacy, &rules);
    assert!(res.is_valid);
    assert_eq!(res.character.name, "Borin");
    assert_eq!(res.character.level, 3);
    assert!(!res.character.path_rank_choices.contains_key("__proto__"));
    assert_eq!(
        res.character.path_rank_choices.get("valid_key_1").map(String::as_str),
        Some("opt_a")
    );
}

#[test]
fn test_creation_point_buy_and_array_presets() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let def = default_character_record(&rules);
    assert_eq!(def.level, 1);
    assert_eq!(def.people_id, "humain");
    assert!(!def.weapons.is_empty());

    let blank = blank_wizard_character_record(&rules);
    assert_eq!(blank.creation_completed, Some(false));
    assert!(blank.people_id.is_empty());

    let mut stats = HashMap::new();
    stats.insert(StatCode::FOR, 3); // 4
    stats.insert(StatCode::AGI, 2); // 2
    stats.insert(StatCode::CON, 1); // 1
    stats.insert(StatCode::PER, 1); // 1
    stats.insert(StatCode::INT, 0); // 0
    stats.insert(StatCode::VOL, 0); // 0
    stats.insert(StatCode::CHA, -1); // +1 budget -> total 8, spent 8
    let pb = evaluate_point_buy_stats(&stats);
    assert!(pb.is_valid);
    assert!(pb.is_complete);
    assert_eq!(pb.remaining, 0);

    let mut poly_stats = def.base_stats.clone();
    poly_stats.insert(StatCode::VOL, 2); // [2, 2, 2, 1, 1, 0, -1]
    let preset = detect_characteristic_array_preset(&poly_stats, &rules);
    assert_eq!(preset, "polyvalent");

    let elf = apply_racial_defaults(&def, "elfe-haut", None, false, &rules);
    assert_eq!(elf.people_id, "elfe-haut");
    assert_eq!(elf.racial_stat_modifiers.get(&StatCode::FOR), Some(&-1));
    assert_eq!(elf.racial_stat_modifiers.get(&StatCode::INT), Some(&1));
}

#[test]
fn test_human_diversity_resolution_and_validation() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let def = default_character_record(&rules);
    assert!(has_human_diversity_rank1(&def));

    let valid_choice = HumanDiversityChoice {
        origin_id: "montagnard".to_string(),
        custom_origin_name: None,
        custom_domain_1: None,
        custom_domain_2: None,
        replaced_domain_index: Some(1),
        replacement_trade: Some("Forgeron".to_string()),
    };
    assert!(is_human_diversity_valid(Some(&valid_choice)));
    let resolved = resolve_human_diversity(Some(&valid_choice)).unwrap();
    assert_eq!(resolved.effective_domains[1], "Forgeron");
    let note = format_human_diversity_note(Some(&valid_choice)).unwrap();
    assert!(note.contains("Forgeron (gagne-pain)"));
}

#[test]
fn test_equipment_proficiency_defaults_and_sanitization() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let mage_armors = get_allowed_armor_ids("magicien", None, Some("humain"), &rules);
    assert!(mage_armors.is_empty());
    let mage_shields = get_allowed_shield_ids("magicien", None, &rules);
    assert!(mage_shields.is_empty());

    let warrior_shields = get_allowed_shield_ids("guerrier", None, &rules);
    assert!(!warrior_shields.is_empty());

    let halfling_greatsword = check_weapon_proficiency(
        "epee-deux-mains",
        "guerrier",
        "halfelin",
        None,
        None,
        &[],
        &rules,
    );
    assert!(!halfling_greatsword.allowed);

    let def_eq = get_default_equipment_for_profile("guerrier", "halfelin", &rules);
    assert!(!def_eq.weapons.is_empty());

    let mut bad_mage = default_character_record(&rules);
    bad_mage.profile_id = "magicien".to_string();
    bad_mage.equipped_armor_id = Some("plaques".to_string());
    let sanitized = sanitize_character_equipment(&bad_mage, &rules);
    assert_ne!(sanitized.equipped_armor_id.as_deref(), Some("plaques"));
}

#[test]
fn test_progression_prestige_hybrid_and_hp_calculations() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let mut hero = default_character_record(&rules);
    hero.level = 5;

    let cap = calculate_capability_points(&hero, &rules);
    assert_eq!(cap.total_earned, 8);
    assert_eq!(cap.available, 8);

    let ctx = get_level_up_context(&hero, 5, &rules);
    assert!(!ctx.accessible_path_ids.is_empty());
    assert!(ctx.hybrid_eligibility.eligible);

    let prestige = check_prestige_path_prerequisites(
        &hero,
        "voie-de-l-entite",
        5,
        &hero.acquired_abilities,
        &rules,
    );
    assert!(!prestige.eligible);

    let hp_res = calculate_level_up_hp_gain(
        &hero,
        &[AcquiredAbility {
            path_id: hero.selected_path_ids[0].clone(),
            rank: 2,
        }],
        false,
        &rules,
    )
    .unwrap();
    assert!(hp_res.hp_gain >= 1);

    assert!(can_character_adopt_hybrid_path(&hero, None, &rules).eligible);
    assert_eq!(
        calculate_armor_spell_mana_cost(&hero, &hero.selected_path_ids[0], 1, &rules),
        0
    );
}

#[test]
fn test_wizard_validation_and_companions_in_computed_sheet() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let blank = blank_wizard_character_record(&rules);
    assert!(!validate_wizard_step(1, &blank, &rules).valid);
    assert_eq!(get_max_unlocked_wizard_step(&blank, &rules), 1);

    let mut def = default_character_record(&rules);
    def.base_stats.insert(StatCode::VOL, 2);
    def.player_name = "Alice".to_string();
    def.languages = vec!["Elfe".to_string()];
    def.human_diversity = Some(HumanDiversityChoice {
        origin_id: "citadin".to_string(),
        custom_origin_name: None,
        custom_domain_1: None,
        custom_domain_2: None,
        replaced_domain_index: None,
        replacement_trade: None,
    });
    assert_eq!(get_max_unlocked_wizard_step(&def, &rules), 7);

    let _grants = resolve_external_grants(&def, &rules);
    let sheet = RulesEngine::compute_sheet(&def, &rules).unwrap();
    assert_eq!(sheet.record.id, def.id);
}
