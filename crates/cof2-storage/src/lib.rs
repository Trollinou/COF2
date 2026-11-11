use cof2_core::models::CharacterRecord;
use std::fs;
use std::io::Write;
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("Erreur I/O : {0}")]
    Io(#[from] std::io::Error),
    #[error("Erreur de sérialisation JSON : {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Fichier introuvable : {0}")]
    NotFound(String),
}

pub struct CharacterStorage;

impl CharacterStorage {
    /// Sauvegarde atomique : écriture dans un fichier temporaire puis renommage (zéro corruption)
    pub fn save_atomic<P: AsRef<Path>>(path: P, record: &CharacterRecord) -> Result<(), StorageError> {
        let target_path = path.as_ref();
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)?;
        }

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);

        let tmp_path = target_path.with_extension(format!("tmp_{timestamp}"));

        let json = serde_json::to_string_pretty(record)?;
        {
            let mut file = fs::File::create(&tmp_path)?;
            file.write_all(json.as_bytes())?;
            file.sync_all()?;
        }

        // Renommage atomique POSIX / Windows
        fs::rename(&tmp_path, target_path)?;
        Ok(())
    }

    /// Charge un personnage depuis un fichier .cof2 ou .json
    pub fn load<P: AsRef<Path>>(path: P) -> Result<CharacterRecord, StorageError> {
        let target_path = path.as_ref();
        if !target_path.exists() {
            return Err(StorageError::NotFound(target_path.display().to_string()));
        }

        let content = fs::read_to_string(target_path)?;
        let record = serde_json::from_str(&content)?;
        Ok(record)
    }
}
