use cof2_core::{
    CharacterRecord, ComputedCharacterSheet, LevelProgressionStep, RulesDatabase, RulesEngine,
};
use cof2_storage::CharacterStorage;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub rules: RulesDatabase,
    pub active_character: Mutex<Option<CharacterRecord>>,
}

#[tauri::command]
#[specta::specta]
pub fn compute_character(
    record: CharacterRecord,
    state: State<'_, AppState>,
) -> Result<ComputedCharacterSheet, String> {
    RulesEngine::compute_sheet(&record, &state.rules).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn apply_level_up_character(
    mut record: CharacterRecord,
    step: LevelProgressionStep,
    state: State<'_, AppState>,
) -> Result<ComputedCharacterSheet, String> {
    RulesEngine::apply_level_up(&mut record, step, &state.rules).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn rollback_character_level(
    mut record: CharacterRecord,
    target_level: u8,
    state: State<'_, AppState>,
) -> Result<ComputedCharacterSheet, String> {
    RulesEngine::rollback_to_level(&mut record, target_level, &state.rules).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn save_character_file(
    record: CharacterRecord,
    file_path: String,
) -> Result<(), String> {
    CharacterStorage::save_atomic(file_path, &record).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn print_character_sheet(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn load_character_file(
    file_path: String,
    state: State<'_, AppState>,
) -> Result<ComputedCharacterSheet, String> {
    let record = CharacterStorage::load(file_path).map_err(|e| e.to_string())?;
    RulesEngine::compute_sheet(&record, &state.rules).map_err(|e| e.to_string())
}
