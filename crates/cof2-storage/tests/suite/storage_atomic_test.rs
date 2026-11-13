use cof2_core::{CharacterRecord, Coins, StatCode};
use cof2_storage::CharacterStorage;
use std::collections::HashMap;
use tempfile::tempdir;

#[test]
fn test_atomic_save_and_load() {
    let dir = tempdir().expect("Création dossier temporaire");
    let file_path = dir.path().join("heros_test.cof2");

    let mut base_stats = HashMap::new();
    base_stats.insert(StatCode::FOR, 2);
    base_stats.insert(StatCode::AGI, 3);
    base_stats.insert(StatCode::CON, 1);
    base_stats.insert(StatCode::PER, 2);
    base_stats.insert(StatCode::INT, 0);
    base_stats.insert(StatCode::VOL, 1);
    base_stats.insert(StatCode::CHA, 0);

    let original = CharacterRecord {
        id: "hero-persiste-1".into(),
        version: "0.8.5".into(),
        updated_at: "2026-11-11T12:00:00Z".into(),
        name: "Lidda".into(),
        player_name: "Joueur 2".into(),
        sex: "Féminin".into(),
        age: "22".into(),
        height: "1m10".into(),
        weight: "35kg".into(),
        physical_traits: "Agile".into(),
        languages: "Commun, Hobbit".into(),
        background: "Acrobate".into(),
        ideal: "Liberté".into(),
        flaw: "Gourmande".into(),
        notes: "".into(),
        deity: None,
        people_id: "halfelin".into(),
        profile_id: "voleur".into(),
        profile_family: None,
        is_hybrid: None,
        secondary_profile_id: None,
        level: 2,
        base_stats,
        stat_array_preset: None,
        racial_stat_choices: vec![],
        manual_stat_bonuses: HashMap::new(),
        selected_path_ids: vec![],
        acquired_abilities: vec![],
        path_rank_choices: HashMap::new(),
        external_ability_choices: HashMap::new(),
        progression_history: vec![],
        current_hp: 12,
        max_hp_bonus: 0,
        level_up_hp_gains: vec![6, 5],
        half_hp_pending: None,
        current_dr: 3,
        current_pc: 3,
        current_pm: 0,
        equipped_armor_id: None,
        equipped_shield_id: None,
        weapons: vec![],
        inventory: vec![],
        coins: Coins { pa: 25, pc: 10, po: 5 },
    };

    // 1. Sauvegarde atomique
    CharacterStorage::save_atomic(&file_path, &original).expect("Sauvegarde réussie");

    // 2. Chargement
    let loaded = CharacterStorage::load(&file_path).expect("Chargement réussi");

    assert_eq!(loaded.id, original.id);
    assert_eq!(loaded.name, original.name);
    assert_eq!(loaded.level, original.level);
    assert_eq!(loaded.coins.pa, 25);
    assert_eq!(loaded.base_stats.get(&StatCode::AGI), Some(&3));
}
