pub mod commands;

use commands::*;
use cof2_core::RulesDatabase;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "macos")]
    if std::env::var("AppleLanguages").is_err() {
        std::env::set_var("AppleLanguages", "(\"fr-FR\", \"fr\")");
    }

    #[cfg(target_os = "windows")]
    if std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").is_err() {
        std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--lang=fr-FR");
    }

    let rules = RulesDatabase::load_embedded().expect("Failed to load embedded rules compendium");
    let app_state = AppState {
        rules,
        active_character: Mutex::new(None),
    };

    let builder = tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            compute_character,
            apply_level_up_character,
            rollback_character_level,
            save_character_file,
            load_character_file,
            print_character_sheet
        ]);

    #[cfg(debug_assertions)]
    builder
        .export(
            specta_typescript::Typescript::default(),
            "../src/bindings.ts",
        )
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn export_typescript_bindings() {
        let builder = tauri_specta::Builder::<tauri::Wry>::new()
            .commands(tauri_specta::collect_commands![
                compute_character,
                apply_level_up_character,
                rollback_character_level,
                save_character_file,
                load_character_file,
                print_character_sheet
            ]);

        builder
            .export(
                specta_typescript::Typescript::default(),
                "../src/bindings.ts",
            )
            .expect("Failed to export typescript bindings");
    }
}
