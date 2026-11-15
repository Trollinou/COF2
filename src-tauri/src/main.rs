#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Initialisation avant le démarrage du runtime Tauri (mono-thread, préparation Rust 2024).
    #[cfg(target_os = "macos")]
    if std::env::var("AppleLanguages").is_err() {
        std::env::set_var("AppleLanguages", "(\"fr-FR\", \"fr\")");
    }

    #[cfg(target_os = "windows")]
    if std::env::var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").is_err() {
        std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", "--lang=fr-FR");
    }

    cof2_desktop_lib::run()
}
