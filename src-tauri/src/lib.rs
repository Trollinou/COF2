pub mod commands;

use commands::*;
use cof2_core::RulesDatabase;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::Emitter;

fn specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new().commands(tauri_specta::collect_commands![
        compute_character,
        apply_level_up_character,
        rollback_character_level,
        save_character_file,
        load_character_file,
        print_character_sheet
    ])
}

#[cfg(debug_assertions)]
fn export_bindings_if_changed(builder: &tauri_specta::Builder<tauri::Wry>, target: &str) {
    let tmp_path = std::env::temp_dir().join("cof2_specta_bindings_preview.ts");
    if builder
        .export(specta_typescript::Typescript::default(), &tmp_path)
        .is_err()
    {
        return;
    }

    let Ok(generated) = std::fs::read_to_string(&tmp_path) else {
        return;
    };
    let _ = std::fs::remove_file(&tmp_path);

    let existing = std::fs::read_to_string(target).ok();
    if existing.as_deref() != Some(generated.as_str()) {
        let _ = std::fs::write(target, generated);
    }
}

fn build_app_menu(app: &tauri::AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    #[cfg_attr(not(target_os = "macos"), allow(unused_mut))]
    let mut menu_builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    {
        let app_menu = SubmenuBuilder::new(app, "Le Grimoire d'Osgild")
            .item(&PredefinedMenuItem::about(
                app,
                Some("À propos du Grimoire d'Osgild"),
                None,
            )?)
            .separator()
            .item(&PredefinedMenuItem::services(app, Some("Services"))?)
            .separator()
            .item(&PredefinedMenuItem::hide(
                app,
                Some("Masquer Le Grimoire d'Osgild"),
            )?)
            .item(&PredefinedMenuItem::hide_others(
                app,
                Some("Masquer les autres"),
            )?)
            .item(&PredefinedMenuItem::show_all(app, Some("Tout afficher"))?)
            .separator()
            .item(&PredefinedMenuItem::quit(
                app,
                Some("Quitter Le Grimoire d'Osgild"),
            )?)
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
        .item(&PredefinedMenuItem::select_all(
            app,
            Some("Tout sélectionner"),
        )?)
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
    let rules = RulesDatabase::load_embedded().expect("Failed to load embedded rules compendium");
    let app_state = AppState { rules };

    let builder = specta_builder();

    #[cfg(debug_assertions)]
    export_bindings_if_changed(&builder, "../src/bindings.ts");

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
                    let _ = app_handle.emit_to("main", "menu-action", action_name);
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
        specta_builder()
            .export(
                specta_typescript::Typescript::default(),
                "../src/bindings.ts",
            )
            .expect("Failed to export typescript bindings");
    }
}
