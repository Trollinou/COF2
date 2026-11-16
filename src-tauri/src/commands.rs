use cof2_core::engine::creation::{
    apply_racial_defaults, blank_wizard_character_record, default_character_record,
    detect_characteristic_array_preset, evaluate_point_buy_stats, PointBuyEvaluation,
};
use cof2_core::engine::diversity::{resolve_human_diversity, ResolvedHumanDiversity};
use cof2_core::engine::equipment::{
    get_default_equipment_for_profile, get_equipment_options, sanitize_character_equipment,
    DefaultEquipmentResult, EquipmentOptionsResult,
};
use cof2_core::engine::grants::{resolve_external_grants, ResolvedExternalGrant};
use cof2_core::engine::progression::{
    calculate_armor_spell_mana_cost, calculate_level_up_hp_gain, can_character_adopt_hybrid_path,
    get_level_up_context, EligibilityCheck, LevelUpContext, LevelUpHpGainResult,
};
use cof2_core::engine::wizard::{validate_wizard_state, WizardValidationState};
use cof2_core::{
    validate_and_migrate_record, AcquiredAbility, CharacterRecord, ComputedCharacterSheet,
    HumanDiversityChoice, LevelProgressionStep, RulesDatabase, RulesEngine, StatCode,
    ValidationResult,
};
use std::collections::HashMap;
use cof2_storage::{CharacterStorage, StorageError};
use std::path::Path;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

/// État global partagé entre les commandes IPC Tauri.
pub struct AppState {
    pub rules: RulesDatabase,
}

/// Erreur IPC structurée exposée à la WebView via `tauri-specta`.
#[derive(Debug, PartialEq, Eq, serde::Serialize, specta::Type, thiserror::Error)]
#[serde(tag = "kind", content = "message")]
pub enum IpcError {
    #[error("Opération annulée par l'utilisateur")]
    Cancelled,
    #[error("Extension de fichier non autorisée : {0}")]
    InvalidExtension(String),
    #[error("Fichier introuvable : {0}")]
    NotFound(String),
    #[error("Fichier trop volumineux : {0}")]
    FileTooLarge(String),
    #[error("Erreur de lecture/écriture : {0}")]
    Io(String),
    #[error("Erreur de format ou de fiche invalide : {0}")]
    InvalidFormat(String),
    #[error("Erreur du moteur de règles : {0}")]
    Rules(String),
    #[error("Erreur fenêtre/impression : {0}")]
    Window(String),
}

impl From<StorageError> for IpcError {
    fn from(err: StorageError) -> Self {
        match err {
            StorageError::InvalidExtension(ext) => Self::InvalidExtension(ext),
            StorageError::NotFound(path) => Self::NotFound(path),
            StorageError::FileTooLarge { size, max } => {
                Self::FileTooLarge(format!("{size} octets (maximum autorisé : {max} octets)"))
            }
            StorageError::Io(e) => Self::Io(e.to_string()),
            StorageError::Serialization(e) => Self::InvalidFormat(e.to_string()),
            StorageError::InvalidRecord(msg) => Self::InvalidFormat(msg),
        }
    }
}

/// Neutralise toute composante de répertoire dans un nom de fichier proposé par la WebView.
pub(crate) fn sanitize_default_filename(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return "personnage.cof2".to_string();
    }
    Path::new(trimmed)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty() && *name != "." && *name != "..")
        .map(ToString::to_string)
        .unwrap_or_else(|| "personnage.cof2".to_string())
}

#[tauri::command]
#[specta::specta]
pub fn create_default_character(state: State<'_, AppState>) -> CharacterRecord {
    default_character_record(&state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn create_blank_wizard_character(state: State<'_, AppState>) -> CharacterRecord {
    blank_wizard_character_record(&state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn apply_racial_defaults_character(
    record: CharacterRecord,
    people_id: String,
    chosen_racial_path_id: Option<String>,
    preserve_empty_choices: bool,
    state: State<'_, AppState>,
) -> CharacterRecord {
    apply_racial_defaults(
        &record,
        &people_id,
        chosen_racial_path_id.as_deref(),
        preserve_empty_choices,
        &state.rules,
    )
}

#[tauri::command]
#[specta::specta]
pub fn evaluate_point_buy(base_stats: HashMap<StatCode, i32>) -> PointBuyEvaluation {
    evaluate_point_buy_stats(&base_stats)
}

#[tauri::command]
#[specta::specta]
pub fn detect_stat_array_preset(
    base_stats: HashMap<StatCode, i32>,
    state: State<'_, AppState>,
) -> String {
    detect_characteristic_array_preset(&base_stats, &state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn resolve_human_diversity_choice(
    choice: Option<HumanDiversityChoice>,
) -> Option<ResolvedHumanDiversity> {
    resolve_human_diversity(choice.as_ref())
}

#[tauri::command]
#[specta::specta]
pub fn get_equipment_options_character(
    record: CharacterRecord,
    state: State<'_, AppState>,
) -> EquipmentOptionsResult {
    get_equipment_options(&record, &state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn get_default_equipment_character(
    profile_id: String,
    people_id: String,
    state: State<'_, AppState>,
) -> DefaultEquipmentResult {
    get_default_equipment_for_profile(&profile_id, &people_id, &state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn sanitize_equipment_character(
    record: CharacterRecord,
    state: State<'_, AppState>,
) -> CharacterRecord {
    sanitize_character_equipment(&record, &state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn get_level_up_context_character(
    record: CharacterRecord,
    target_level: u8,
    state: State<'_, AppState>,
) -> LevelUpContext {
    get_level_up_context(&record, target_level, &state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn calculate_level_up_hp_gain_character(
    record: CharacterRecord,
    newly_acquired_ranks: Vec<AcquiredAbility>,
    pending_half_hp: bool,
    state: State<'_, AppState>,
) -> Result<LevelUpHpGainResult, IpcError> {
    calculate_level_up_hp_gain(&record, &newly_acquired_ranks, pending_half_hp, &state.rules)
        .map_err(|e| IpcError::Rules(e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub fn calculate_armor_spell_mana_cost_character(
    record: CharacterRecord,
    path_id: String,
    rank: u8,
    state: State<'_, AppState>,
) -> i32 {
    calculate_armor_spell_mana_cost(&record, &path_id, rank, &state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn check_hybrid_path_eligibility(
    record: CharacterRecord,
    candidate_path_id: Option<String>,
    state: State<'_, AppState>,
) -> EligibilityCheck {
    can_character_adopt_hybrid_path(&record, candidate_path_id.as_deref(), &state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn validate_wizard_state_character(
    record: CharacterRecord,
    step: u8,
    state: State<'_, AppState>,
) -> WizardValidationState {
    validate_wizard_state(&record, step, &state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn resolve_external_grants_character(
    record: CharacterRecord,
    state: State<'_, AppState>,
) -> Vec<ResolvedExternalGrant> {
    resolve_external_grants(&record, &state.rules)
}

#[tauri::command]
#[specta::specta]
pub fn validate_character(
    raw_json: String,
    state: State<'_, AppState>,
) -> Result<ValidationResult, IpcError> {
    let value: serde_json::Value =
        serde_json::from_str(&raw_json).map_err(|e| IpcError::InvalidFormat(e.to_string()))?;
    Ok(validate_and_migrate_record(value, &state.rules))
}

#[tauri::command]
#[specta::specta]
pub fn compute_character(
    record: CharacterRecord,
    state: State<'_, AppState>,
) -> Result<ComputedCharacterSheet, IpcError> {
    RulesEngine::compute_sheet(&record, &state.rules).map_err(|e| IpcError::Rules(e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub fn apply_level_up_character(
    mut record: CharacterRecord,
    step: LevelProgressionStep,
    state: State<'_, AppState>,
) -> Result<ComputedCharacterSheet, IpcError> {
    RulesEngine::apply_level_up(&mut record, step, &state.rules)
        .map_err(|e| IpcError::Rules(e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub fn rollback_character_level(
    mut record: CharacterRecord,
    target_level: u8,
    state: State<'_, AppState>,
) -> Result<ComputedCharacterSheet, IpcError> {
    RulesEngine::rollback_to_level(&mut record, target_level, &state.rules)
        .map_err(|e| IpcError::Rules(e.to_string()))
}

/// Ouvre le dialogue natif d'enregistrement côté Rust et sauvegarde atomiquement la fiche avec copie `.bak`.
#[tauri::command]
#[specta::specta]
pub async fn save_character_file(
    app: tauri::AppHandle,
    record: CharacterRecord,
    default_filename: String,
) -> Result<String, IpcError> {
    tauri::async_runtime::spawn_blocking(move || {
        let safe_name = sanitize_default_filename(&default_filename);
        let selected = app
            .dialog()
            .file()
            .set_title("Sauvegarder le personnage COF2")
            .add_filter("Personnage COF2 (*.cof2, *.json)", &["cof2", "json"])
            .set_file_name(&safe_name)
            .blocking_save_file();

        let file_path = selected.ok_or(IpcError::Cancelled)?;
        let path = file_path
            .into_path()
            .map_err(|e| IpcError::Io(e.to_string()))?;

        let path_str = path.to_string_lossy().into_owned();
        CharacterStorage::validate_character_extension(&path_str)?;
        CharacterStorage::save_atomic_with_backup(&path, &record)?;
        Ok(path_str)
    })
    .await
    .map_err(|e| IpcError::Io(e.to_string()))?
}

#[tauri::command]
#[specta::specta]
pub fn print_character_sheet(window: tauri::WebviewWindow) -> Result<(), IpcError> {
    window.print().map_err(|e| IpcError::Window(e.to_string()))
}

/// Ouvre le dialogue natif de sélection côté Rust, charge la fiche `.cof2`/`.json` et calcule ses statistiques.
#[tauri::command]
#[specta::specta]
pub async fn load_character_file(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<ComputedCharacterSheet, IpcError> {
    let selected = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Ouvrir un personnage COF2")
            .add_filter("Personnage COF2 (*.cof2, *.json)", &["cof2", "json"])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| IpcError::Io(e.to_string()))?;

    let file_path = selected.ok_or(IpcError::Cancelled)?;
    let path = file_path
        .into_path()
        .map_err(|e| IpcError::Io(e.to_string()))?;

    let path_str = path.to_string_lossy().into_owned();
    CharacterStorage::validate_character_extension(&path_str)?;
    let raw = CharacterStorage::load_raw_json(&path)?;
    let validated = validate_and_migrate_record(raw, &state.rules);
    RulesEngine::compute_sheet(&validated.character, &state.rules)
        .map_err(|e| IpcError::Rules(e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitize_default_filename_strips_traversal_and_falls_back() {
        assert_eq!(sanitize_default_filename("../../etc/passwd"), "passwd");
        assert_eq!(
            sanitize_default_filename("/tmp/malicious/hero_niv3.cof2"),
            "hero_niv3.cof2"
        );
        assert_eq!(sanitize_default_filename("   "), "personnage.cof2");
        assert_eq!(sanitize_default_filename(".."), "personnage.cof2");
        assert_eq!(
            sanitize_default_filename("Éléonore_niv2.cof2"),
            "Éléonore_niv2.cof2"
        );
    }

    #[test]
    fn storage_error_maps_to_typed_ipc_error() {
        assert_eq!(
            IpcError::from(StorageError::InvalidExtension(".txt".into())),
            IpcError::InvalidExtension(".txt".into())
        );
        assert_eq!(
            IpcError::from(StorageError::NotFound("hero.cof2".into())),
            IpcError::NotFound("hero.cof2".into())
        );
        assert_eq!(
            IpcError::from(StorageError::FileTooLarge {
                size: 11_000_000,
                max: 10_485_760
            }),
            IpcError::FileTooLarge(
                "11000000 octets (maximum autorisé : 10485760 octets)".into()
            )
        );
        assert_eq!(
            IpcError::from(StorageError::InvalidRecord("id manquant".into())),
            IpcError::InvalidFormat("id manquant".into())
        );
    }
}
