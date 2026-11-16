use cof2_core::models::CharacterRecord;
use std::fs;
use std::io::{ErrorKind, Read, Write};
use std::path::{Path, PathBuf};
use tempfile::NamedTempFile;
use thiserror::Error;

/// Taille maximale autorisée pour un fichier de personnage (10 Mo, aligné sur SECURITY.md).
pub const MAX_CHARACTER_FILE_BYTES: u64 = 10 * 1024 * 1024;

#[derive(Debug, Error)]
pub enum StorageError {
    #[error("Erreur I/O : {0}")]
    Io(#[from] std::io::Error),
    #[error("Erreur de sérialisation JSON : {0}")]
    Serialization(#[from] serde_json::Error),
    #[error("Fichier introuvable : {0}")]
    NotFound(String),
    #[error("Fichier trop volumineux ({size} octets, maximum autorisé : {max} octets)")]
    FileTooLarge { size: u64, max: u64 },
    #[error("Extension de fichier non autorisée : {0} (attendu : .cof2 ou .json)")]
    InvalidExtension(String),
    #[error("Fiche de personnage invalide : {0}")]
    InvalidRecord(String),
}

pub struct CharacterStorage;

impl CharacterStorage {
    /// Sauvegarde atomique : écriture dans un fichier temporaire unique puis renommage (zéro corruption).
    pub fn save_atomic<P: AsRef<Path>>(path: P, record: &CharacterRecord) -> Result<(), StorageError> {
        let target_path = path.as_ref();
        let parent = resolve_parent_dir(target_path);
        fs::create_dir_all(parent)?;

        let json = serde_json::to_string_pretty(record)?;
        let mut tmp = NamedTempFile::new_in(parent)?;
        tmp.write_all(json.as_bytes())?;
        tmp.as_file().sync_all()?;

        tmp.persist(target_path).map_err(|e| e.error)?;
        sync_parent_dir(parent);
        Ok(())
    }

    /// Sauvegarde atomique avec création d'une copie de secours `.bak` si le fichier cible existe déjà.
    pub fn save_atomic_with_backup<P: AsRef<Path>>(
        path: P,
        record: &CharacterRecord,
    ) -> Result<(), StorageError> {
        let target_path = path.as_ref();
        if target_path.try_exists()? {
            let backup_path = backup_path_for(target_path);
            fs::copy(target_path, &backup_path)?;
        }
        Self::save_atomic(target_path, record)
    }

    /// Charge un personnage depuis un fichier `.cof2` ou `.json` avec contrôle de taille et validation.
    pub fn load<P: AsRef<Path>>(path: P) -> Result<CharacterRecord, StorageError> {
        let content = Self::read_checked_string(path)?;
        let record: CharacterRecord = serde_json::from_str(&content)?;
        validate_loaded_record(&record)?;
        Ok(record)
    }

    /// Charge le JSON brut d'un fichier `.cof2` ou `.json` avec contrôle de taille (pour migration/validation).
    pub fn load_raw_json<P: AsRef<Path>>(path: P) -> Result<serde_json::Value, StorageError> {
        let content = Self::read_checked_string(path)?;
        let value: serde_json::Value = serde_json::from_str(&content)?;
        Ok(value)
    }

    fn read_checked_string<P: AsRef<Path>>(path: P) -> Result<String, StorageError> {
        let target_path = path.as_ref();
        let file = fs::File::open(target_path).map_err(|err| {
            if err.kind() == ErrorKind::NotFound {
                StorageError::NotFound(target_path.display().to_string())
            } else {
                StorageError::Io(err)
            }
        })?;

        let metadata_len = file.metadata()?.len();
        if metadata_len > MAX_CHARACTER_FILE_BYTES {
            return Err(StorageError::FileTooLarge {
                size: metadata_len,
                max: MAX_CHARACTER_FILE_BYTES,
            });
        }

        let mut content = String::new();
        let bytes_read = file
            .take(MAX_CHARACTER_FILE_BYTES + 1)
            .read_to_string(&mut content)?;

        if bytes_read as u64 > MAX_CHARACTER_FILE_BYTES {
            return Err(StorageError::FileTooLarge {
                size: bytes_read as u64,
                max: MAX_CHARACTER_FILE_BYTES,
            });
        }

        Ok(content)
    }

    /// Vérifie que le chemin pointe vers un fichier `.cof2` ou `.json`.
    pub fn validate_character_extension<P: AsRef<Path>>(path: P) -> Result<(), StorageError> {
        let target_path = path.as_ref();
        let ext = target_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");

        if ext.eq_ignore_ascii_case("cof2") || ext.eq_ignore_ascii_case("json") {
            Ok(())
        } else {
            Err(StorageError::InvalidExtension(
                target_path.display().to_string(),
            ))
        }
    }
}

fn resolve_parent_dir(path: &Path) -> &Path {
    match path.parent() {
        Some(parent) if !parent.as_os_str().is_empty() => parent,
        _ => Path::new("."),
    }
}

fn backup_path_for(path: &Path) -> PathBuf {
    let mut os_str = path.as_os_str().to_os_string();
    os_str.push(".bak");
    PathBuf::from(os_str)
}

fn validate_loaded_record(record: &CharacterRecord) -> Result<(), StorageError> {
    if record.id.trim().is_empty() {
        return Err(StorageError::InvalidRecord(
            "identifiant de personnage manquant".to_string(),
        ));
    }
    if record.level == 0 {
        return Err(StorageError::InvalidRecord(
            "le niveau du personnage doit être supérieur ou égal à 1".to_string(),
        ));
    }
    Ok(())
}

#[cfg(unix)]
fn sync_parent_dir(parent: &Path) {
    // Certains systèmes de fichiers virtuels ou réseau retournent EINVAL sur fsync de répertoire :
    // le sync du dossier reste donc en best-effort après le persist atomique.
    let _ = fs::File::open(parent).and_then(|dir| dir.sync_all());
}

#[cfg(not(unix))]
fn sync_parent_dir(_parent: &Path) {}
