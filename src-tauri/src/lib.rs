pub mod commands;

use commands::*;
use cof2_core::RulesDatabase;
use std::sync::Mutex;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::Emitter;

fn build_app_menu(app: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    let mut menu_builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    {
        let app_menu = SubmenuBuilder::new(app, "COF2 Compagnon")
            .item(&PredefinedMenuItem::about(app, Some("À propos de COF2 Compagnon"), None)?)
            .separator()
            .item(&PredefinedMenuItem::services(app, Some("Services"))?)
            .separator()
            .item(&PredefinedMenuItem::hide(app, Some("Masquer COF2 Compagnon"))?)
            .item(&PredefinedMenuItem::hide_others(app, Some("Masquer les autres"))?)
            .item(&PredefinedMenuItem::show_all(app, Some("Tout afficher"))?)
            .separator()
            .item(&PredefinedMenuItem::quit(app, Some("Quitter COF2 Compagnon"))?)
            .build()?;
        menu_builder = menu_builder.item(&app_menu);
    }

    let file_new = MenuItemBuilder::with_id("file-new", "Nouveau")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let file_load = MenuItemBuilder::with_id("file-load", "Charger...")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;
    let file_save = MenuItemBuilder::with_id("file-save", "Sauvegarder...")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let file_print = MenuItemBuilder::with_id("file-print", "Imprimer / PDF...")
        .accelerator("CmdOrCtrl+P")
        .build(app)?;

    #[cfg_attr(target_os = "macos", allow(unused_mut))]
    let mut file_menu_builder = SubmenuBuilder::new(app, "Fichier")
        .item(&file_new)
        .item(&file_load)
        .item(&file_save)
        .separator()
        .item(&file_print);

    #[cfg(not(target_os = "macos"))]
    {
        file_menu_builder = file_menu_builder
            .separator()
            .item(&PredefinedMenuItem::quit(app, Some("Quitter"))?);
    }

    let file_menu = file_menu_builder.build()?;

    let edit_menu = SubmenuBuilder::new(app, "Édition")
        .item(&PredefinedMenuItem::undo(app, Some("Annuler"))?)
        .item(&PredefinedMenuItem::redo(app, Some("Rétablir"))?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, Some("Couper"))?)
        .item(&PredefinedMenuItem::copy(app, Some("Copier"))?)
        .item(&PredefinedMenuItem::paste(app, Some("Coller"))?)
        .item(&PredefinedMenuItem::select_all(app, Some("Tout sélectionner"))?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Fenêtre")
        .item(&PredefinedMenuItem::minimize(app, Some("Réduire"))?)
        .item(&PredefinedMenuItem::maximize(app, Some("Agrandir"))?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, Some("Fermer"))?)
        .build()?;

    menu_builder
        .item(&file_menu)
        .item(&edit_menu)
        .item(&window_menu)
        .build()
}

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

            let menu = build_app_menu(app.handle())?;
            app.set_menu(menu)?;

            app.on_menu_event(|app_handle, event| {
                let action = match event.id().as_ref() {
                    "file-new" => Some("new"),
                    "file-load" => Some("load"),
                    "file-save" => Some("save"),
                    "file-print" => Some("print"),
                    _ => None,
                };
                if let Some(action_name) = action {
                    let _ = app_handle.emit("menu-action", action_name);
                }
            });

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
