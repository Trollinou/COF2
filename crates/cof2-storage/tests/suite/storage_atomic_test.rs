use cof2_core::{CharacterRecord, Coins, StatCode};
use cof2_storage::{CharacterStorage, StorageError, MAX_CHARACTER_FILE_BYTES};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use tempfile::tempdir;

fn sample_character(id: &str, name: &str, level: u8) -> CharacterRecord {
    let mut base_stats = HashMap::new();
    base_stats.insert(StatCode::FOR, 2);
    base_stats.insert(StatCode::AGI, 3);
    base_stats.insert(StatCode::CON, 1);
    base_stats.insert(StatCode::PER, 2);
    base_stats.insert(StatCode::INT, 0);
    base_stats.insert(StatCode::VOL, 1);
    base_stats.insert(StatCode::CHA, 0);

    CharacterRecord {
        id: id.into(),
        version: "0.8.6".into(),
        updated_at: "2026-11-15T12:00:00Z".into(),
        creation_completed: Some(true),
        name: name.into(),
        player_name: "Joueur 2".into(),
        sex: "Féminin".into(),
        age: "22".into(),
        height: "1m10".into(),
        weight: "35kg".into(),
        physical_traits: "Agile".into(),
        languages: vec!["Runique".into()],
        secondary_talents: vec![],
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
        level,
        base_stats,
        stat_array_preset: None,
        racial_stat_choices: vec![],
        racial_stat_modifiers: HashMap::new(),
        manual_stat_bonuses: HashMap::new(),
        selected_path_ids: vec![],
        acquired_abilities: vec![],
        path_rank_choices: HashMap::new(),
        external_ability_choices: HashMap::new(),
        human_diversity: None,
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
    }
}

struct FileCleanupGuard(PathBuf);

impl Drop for FileCleanupGuard {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

#[test]
fn test_atomic_save_and_load() {
    let dir = tempdir().expect("Création dossier temporaire");
    let file_path = dir.path().join("heros_test.cof2");
    let original = sample_character("hero-persiste-1", "Lidda", 2);

    CharacterStorage::save_atomic(&file_path, &original).expect("Sauvegarde réussie");
    let loaded = CharacterStorage::load(&file_path).expect("Chargement réussi");

    assert_eq!(loaded.id, original.id);
    assert_eq!(loaded.name, original.name);
    assert_eq!(loaded.level, original.level);
    assert_eq!(loaded.coins.pa, 25);
    assert_eq!(loaded.base_stats.get(&StatCode::AGI), Some(&3));
}

#[test]
fn test_overwrite_existing_file_leaves_no_temp_files() {
    let dir = tempdir().expect("Création dossier temporaire");
    let file_path = dir.path().join("heros_overwrite.cof2");

    let first = sample_character("hero-1", "Lidda", 1);
    CharacterStorage::save_atomic(&file_path, &first).expect("Première sauvegarde");

    let updated = sample_character("hero-1", "Lidda la Vif", 5);
    CharacterStorage::save_atomic(&file_path, &updated).expect("Écrasement réussi");

    let loaded = CharacterStorage::load(&file_path).expect("Chargement réussi");
    assert_eq!(loaded.name, "Lidda la Vif");
    assert_eq!(loaded.level, 5);

    let entries: Vec<String> = fs::read_dir(dir.path())
        .expect("Lecture dossier")
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    assert_eq!(entries, vec!["heros_overwrite.cof2".to_string()]);
}

#[test]
fn test_backup_created_on_overwrite() {
    let dir = tempdir().expect("Création dossier temporaire");
    let file_path = dir.path().join("heros_backup.cof2");
    let backup_path = dir.path().join("heros_backup.cof2.bak");

    let v1 = sample_character("hero-bak", "Kael v1", 1);
    CharacterStorage::save_atomic_with_backup(&file_path, &v1).expect("Sauvegarde initiale");
    assert!(!backup_path.exists(), "Pas de .bak à la création initiale");

    let v2 = sample_character("hero-bak", "Kael v2", 3);
    CharacterStorage::save_atomic_with_backup(&file_path, &v2).expect("Sauvegarde avec backup");
    assert!(backup_path.exists(), "Le fichier .bak doit être créé lors d'un écrasement");

    let loaded_main = CharacterStorage::load(&file_path).expect("Chargement principal");
    let loaded_bak = CharacterStorage::load(&backup_path).expect("Chargement backup");
    assert_eq!(loaded_main.name, "Kael v2");
    assert_eq!(loaded_main.level, 3);
    assert_eq!(loaded_bak.name, "Kael v1");
    assert_eq!(loaded_bak.level, 1);
}

#[test]
fn test_save_relative_filename_without_parent() {
    let filename = format!("cof2_storage_rel_test_{}.cof2", std::process::id());
    let _guard = FileCleanupGuard(PathBuf::from(&filename));
    let original = sample_character("hero-rel", "Relatif", 1);

    CharacterStorage::save_atomic(&filename, &original).expect("Sauvegarde sans dossier parent");
    let loaded = CharacterStorage::load(&filename).expect("Chargement sans dossier parent");
    assert_eq!(loaded.id, "hero-rel");
}

#[test]
fn test_load_not_found() {
    let dir = tempdir().expect("Création dossier temporaire");
    let missing = dir.path().join("inexistant.cof2");

    let err = CharacterStorage::load(&missing).expect_err("Doit échouer");
    assert!(matches!(err, StorageError::NotFound(_)));
}

#[test]
fn test_load_invalid_json() {
    let dir = tempdir().expect("Création dossier temporaire");
    let corrupted = dir.path().join("corrompu.cof2");
    fs::write(&corrupted, "{ invalid json").expect("Écriture fichier corrompu");

    let err = CharacterStorage::load(&corrupted).expect_err("Doit échouer");
    assert!(matches!(err, StorageError::Serialization(_)));
}

#[test]
fn test_load_invalid_record_level_zero() {
    let dir = tempdir().expect("Création dossier temporaire");
    let invalid_path = dir.path().join("niveau_zero.cof2");
    let invalid_record = sample_character("hero-zero", "Zero", 0);

    CharacterStorage::save_atomic(&invalid_path, &invalid_record).expect("Écriture JSON");
    let err = CharacterStorage::load(&invalid_path).expect_err("Niveau 0 doit être rejeté");
    assert!(matches!(err, StorageError::InvalidRecord(_)));
}

#[test]
fn test_load_file_too_large() {
    let dir = tempdir().expect("Création dossier temporaire");
    let oversized = dir.path().join("geant.cof2");
    let file = fs::File::create(&oversized).expect("Création fichier");
    file.set_len(MAX_CHARACTER_FILE_BYTES + 1)
        .expect("Dimensionnement sparse file");

    let err = CharacterStorage::load(&oversized).expect_err("Fichier trop volumineux doit échouer");
    assert!(matches!(
        err,
        StorageError::FileTooLarge { size, max }
        if size == MAX_CHARACTER_FILE_BYTES + 1 && max == MAX_CHARACTER_FILE_BYTES
    ));
}

#[test]
fn test_concurrent_atomic_saves() {
    let dir = tempdir().expect("Création dossier temporaire");
    let file_path = Arc::new(dir.path().join("concurrent.cof2"));

    let mut handles = Vec::new();
    for idx in 1..=8u8 {
        let path = Arc::clone(&file_path);
        handles.push(thread::spawn(move || {
            let record = sample_character("hero-concurrent", &format!("Héros {idx}"), idx);
            CharacterStorage::save_atomic(&*path, &record).expect("Sauvegarde concurrente réussie");
        }));
    }

    for handle in handles {
        handle.join().expect("Thread terminé sans panique");
    }

    let loaded = CharacterStorage::load(&*file_path).expect("JSON final valide");
    assert_eq!(loaded.id, "hero-concurrent");
    assert!((1..=8).contains(&loaded.level));

    let temp_files: Vec<String> = fs::read_dir(dir.path())
        .expect("Lecture dossier")
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|name| name != "concurrent.cof2")
        .collect();
    assert!(temp_files.is_empty(), "Aucun fichier temporaire résiduel : {temp_files:?}");
}

#[test]
fn test_validate_character_extension() {
    assert!(CharacterStorage::validate_character_extension("heros.cof2").is_ok());
    assert!(CharacterStorage::validate_character_extension("HEROS.COF2").is_ok());
    assert!(CharacterStorage::validate_character_extension("/tmp/heros.json").is_ok());

    assert!(matches!(
        CharacterStorage::validate_character_extension("malware.exe"),
        Err(StorageError::InvalidExtension(_))
    ));
    assert!(matches!(
        CharacterStorage::validate_character_extension("sans_extension"),
        Err(StorageError::InvalidExtension(_))
    ));
}
