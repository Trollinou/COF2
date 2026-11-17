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

#[cfg(test)]
mod tests {
    use cof2_desktop_lib::commands::{sanitize_default_filename, IpcError};
    use cof2_desktop_lib::{resolve_bindings_path, specta_builder};
    use cof2_storage::StorageError;

    #[test]
    fn export_typescript_bindings() {
        specta_builder()
            .export(
                specta_typescript::Typescript::default(),
                resolve_bindings_path(),
            )
            .expect("Failed to export typescript bindings");
    }

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
