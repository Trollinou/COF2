use cof2_core::{
    AcquiredAbility, CharacterRecord, Coins, LevelProgressionStep, RulesDatabase,
    RulesEngine, StatCode,
};
use std::collections::HashMap;

fn create_test_record(profile_id: &str, people_id: &str, level: u8) -> CharacterRecord {
    let mut base_stats = HashMap::new();
    base_stats.insert(StatCode::FOR, 3);
    base_stats.insert(StatCode::AGI, 2);
    base_stats.insert(StatCode::CON, 2);
    base_stats.insert(StatCode::PER, 1);
    base_stats.insert(StatCode::INT, 0);
    base_stats.insert(StatCode::VOL, 0);
    base_stats.insert(StatCode::CHA, -1);

    CharacterRecord {
        id: "char-test-1".into(),
        version: "0.8.5".into(),
        updated_at: "2026-11-11T12:00:00Z".into(),
        name: "Valeros".into(),
        player_name: "Joueur".into(),
        sex: "Masculin".into(),
        age: "25".into(),
        height: "1m80".into(),
        weight: "80kg".into(),
        physical_traits: "Balafré".into(),
        languages: "Commun".into(),
        background: "Soldat".into(),
        ideal: "Bravoure".into(),
        flaw: "Téméraire".into(),
        notes: "".into(),
        deity: None,
        people_id: people_id.into(),
        profile_id: profile_id.into(),
        profile_family: None,
        is_hybrid: None,
        secondary_profile_id: None,
        level,
        base_stats,
        stat_array_preset: None,
        racial_stat_choices: vec![],
        racial_stat_modifiers: HashMap::new(),
        manual_stat_bonuses: HashMap::new(),
        selected_path_ids: vec!["voie-du-bouclier".into()],
        acquired_abilities: vec![AcquiredAbility {
            path_id: "voie-du-bouclier".into(),
            rank: 1,
        }],
        path_rank_choices: HashMap::new(),
        external_ability_choices: HashMap::new(),
        progression_history: vec![],
        current_hp: 14,
        max_hp_bonus: 0,
        level_up_hp_gains: vec![12],
        half_hp_pending: None,
        current_dr: 4,
        current_pc: 1,
        current_pm: 0,
        equipped_armor_id: None,
        equipped_shield_id: None,
        weapons: vec![],
        inventory: vec![],
        coins: Coins {
            pa: 10,
            pc: 5,
            po: 2,
        },
    }
}

#[test]
fn test_embedded_rules_database_loads_successfully() {
    let rules = RulesDatabase::load_embedded()
        .expect("Les règles JSON embarquées doivent se charger sans erreur");
    assert!(
        !rules.peoples.is_empty(),
        "La table des peuples ne doit pas être vide"
    );
    assert!(
        !rules.profiles.is_empty(),
        "La table des profils ne doit pas être vide"
    );
    assert!(
        !rules.armors.is_empty(),
        "La table des équipements/armures ne doit pas être vide"
    );
}

#[test]
fn test_warrior_level_1_computations() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let record = create_test_record("guerrier", "humain", 1);

    let sheet = RulesEngine::compute_sheet(&record, &rules).expect("Calcul valide");

    // Formules officielles COF2 Guerrier (Combattants, hpPerLevel = 6, CON = 2)
    // PV = 12 (base hp gain) + 1 * 2 (CON) = 14
    assert_eq!(sheet.max_hp, 14);
    // Défense sans armure = 10 + 2 AGI = 12
    assert_eq!(sheet.defense, 12);
    // Initiative = 10 + 1 PER = 11
    assert_eq!(sheet.initiative, 11);
    // Attaque au contact = 1 BAB + 3 FOR = 4
    assert_eq!(sheet.attacks.contact, 4);
    // Attaque à distance = 1 BAB + 2 AGI = 3
    assert_eq!(sheet.attacks.distance, 3);
    // DR = 2 + 2 CON = 4
    assert_eq!(sheet.max_dr, 4);
    // PC = 2 - 1 CHA = 1 (Famille Combattants = 0 bonus PC)
    assert_eq!(sheet.max_pc, 1);
}

#[test]
fn test_level_up_progression_history_and_rollback() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let mut record = create_test_record("guerrier", "humain", 1);

    assert_eq!(record.level, 1);
    assert_eq!(record.acquired_abilities.len(), 1);

    // 1. Montée au niveau 2 : apprentissage de la capacité rang 2
    let step_lvl2 = LevelProgressionStep {
        level: 2,
        hp_gain: 6,
        abilities_learned: vec![AcquiredAbility {
            path_id: "voie-du-bouclier".into(),
            rank: 2,
        }],
        selected_path_ids: vec!["voie-du-bouclier".into()],
        path_rank_choices: HashMap::new(),
        manual_stat_bonuses: HashMap::new(),
        timestamp: "2026-11-11T13:00:00Z".into(),
    };

    let sheet_lvl2 = RulesEngine::apply_level_up(&mut record, step_lvl2, &rules)
        .expect("Montée au niveau 2 réussie");

    assert_eq!(record.level, 2);
    assert_eq!(sheet_lvl2.record.level, 2);
    assert_eq!(record.progression_history.len(), 1);
    assert_eq!(record.acquired_abilities.len(), 2);
    // PV Niv 2 = (12 + 6) + (2 * 2 CON) = 22
    assert_eq!(sheet_lvl2.max_hp, 22);
    assert_eq!(record.current_hp, 22);

    // 2. Montée au niveau 3 : apprentissage de la capacité rang 3
    let step_lvl3 = LevelProgressionStep {
        level: 3,
        hp_gain: 7,
        abilities_learned: vec![AcquiredAbility {
            path_id: "voie-du-bouclier".into(),
            rank: 3,
        }],
        selected_path_ids: vec!["voie-du-bouclier".into()],
        path_rank_choices: HashMap::new(),
        manual_stat_bonuses: HashMap::new(),
        timestamp: "2026-11-11T13:05:00Z".into(),
    };

    let sheet_lvl3 = RulesEngine::apply_level_up(&mut record, step_lvl3, &rules)
        .expect("Montée au niveau 3 réussie");

    assert_eq!(record.level, 3);
    assert_eq!(record.progression_history.len(), 2);
    assert_eq!(record.acquired_abilities.len(), 3);
    // PV Niv 3 = (12 + 6 + 7) + (3 * 2 CON) = 31
    assert_eq!(sheet_lvl3.max_hp, 31);

    // 3. Rollback vers le niveau 2 : annule le niveau 3
    let sheet_rollback = RulesEngine::rollback_to_level(&mut record, 2, &rules)
        .expect("Rollback au niveau 2 réussi");

    assert_eq!(record.level, 2);
    assert_eq!(record.progression_history.len(), 1);
    assert_eq!(record.acquired_abilities.len(), 2);
    assert_eq!(sheet_rollback.max_hp, 22);
    assert!(
        !record
            .acquired_abilities
            .iter()
            .any(|a| a.rank == 3),
        "Le rang 3 appris au niveau 3 doit avoir été retiré"
    );

    // 4. Rollback vers le niveau 1 : annule le niveau 2
    let sheet_lvl1_restored = RulesEngine::rollback_to_level(&mut record, 1, &rules)
        .expect("Rollback au niveau 1 réussi");

    assert_eq!(record.level, 1);
    assert_eq!(record.progression_history.len(), 0);
    assert_eq!(record.acquired_abilities.len(), 1);
    assert_eq!(sheet_lvl1_restored.max_hp, 14);
}

#[test]
fn test_unitary_stat_decomposition_and_reconstruction() {
    let rules = RulesDatabase::load_embedded().unwrap();
    // Minotaure: fixed racial stats { FOR: +2, VOL: +1, INT: -2, CHA: -2 }
    let mut record = create_test_record("guerrier", "minotaure", 1);
    // Voie du demi-orc rang 5 ("Colosse"): +1 FOR, +1 CON
    record.acquired_abilities.push(AcquiredAbility {
        path_id: "voie-du-demi-orc".into(),
        rank: 5,
    });
    // Bonus/malus manuel: +1 AGI, -1 CON
    record.manual_stat_bonuses.insert(StatCode::AGI, 1);
    record.manual_stat_bonuses.insert(StatCode::CON, -1);

    let sheet = RulesEngine::compute_sheet(&record, &rules).expect("Calcul valide");

    // Base stats
    assert_eq!(sheet.base_stats.get(&StatCode::FOR), Some(&3));
    assert_eq!(sheet.base_stats.get(&StatCode::AGI), Some(&2));
    assert_eq!(sheet.base_stats.get(&StatCode::CON), Some(&2));
    assert_eq!(sheet.base_stats.get(&StatCode::INT), Some(&0));

    // Racial bonus stats
    assert_eq!(sheet.racial_bonus_stats.get(&StatCode::FOR), Some(&2));
    assert_eq!(sheet.racial_bonus_stats.get(&StatCode::INT), Some(&-2));
    assert_eq!(sheet.racial_bonus_stats.get(&StatCode::VOL), Some(&1));
    assert_eq!(sheet.racial_bonus_stats.get(&StatCode::CHA), Some(&-2));
    assert_eq!(sheet.racial_bonus_stats.get(&StatCode::AGI), Some(&0));

    // Path bonus stats
    assert_eq!(sheet.path_bonus_stats.get(&StatCode::FOR), Some(&1));
    assert_eq!(sheet.path_bonus_stats.get(&StatCode::CON), Some(&1));
    assert_eq!(sheet.path_bonus_stats.get(&StatCode::AGI), Some(&0));

    // Manual bonus stats
    assert_eq!(sheet.manual_bonus_stats.get(&StatCode::AGI), Some(&1));
    assert_eq!(sheet.manual_bonus_stats.get(&StatCode::CON), Some(&-1));
    assert_eq!(sheet.manual_bonus_stats.get(&StatCode::FOR), Some(&0));

    // Other bonus stats = path + manual
    assert_eq!(sheet.other_bonus_stats.get(&StatCode::FOR), Some(&1));
    assert_eq!(sheet.other_bonus_stats.get(&StatCode::AGI), Some(&1));
    assert_eq!(sheet.other_bonus_stats.get(&StatCode::CON), Some(&0));

    // Reconstruction invariant for all 7 stats: final = base + racial + other
    for stat in [
        StatCode::FOR,
        StatCode::AGI,
        StatCode::CON,
        StatCode::PER,
        StatCode::INT,
        StatCode::VOL,
        StatCode::CHA,
    ] {
        let base = sheet.base_stats.get(&stat).copied().unwrap_or(0);
        let racial = sheet.racial_bonus_stats.get(&stat).copied().unwrap_or(0);
        let other = sheet.other_bonus_stats.get(&stat).copied().unwrap_or(0);
        let final_val = sheet.final_stats.get(&stat).copied().unwrap_or(0);
        assert_eq!(final_val, base + racial + other);
    }

    assert_eq!(sheet.final_stats.get(&StatCode::FOR), Some(&6));
    assert_eq!(sheet.final_stats.get(&StatCode::AGI), Some(&3));
    assert_eq!(sheet.final_stats.get(&StatCode::CON), Some(&2));
    assert_eq!(sheet.final_stats.get(&StatCode::INT), Some(&-2));
}
