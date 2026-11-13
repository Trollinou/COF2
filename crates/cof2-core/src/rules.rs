use crate::models::{ProfileFamily, StatCode};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error, Serialize, Deserialize, Type)]
pub enum RuleError {
    #[error("Peuple non reconnu : {0}")]
    PeopleNotFound(String),
    #[error("Profil non reconnu : {0}")]
    ProfileNotFound(String),
    #[error("Voie non reconnue : {0}")]
    PathNotFound(String),
    #[error("Capacité ou rang manquant : voie {0}, rang {1}")]
    RankNotFound(String, u8),
    #[error("Niveau invalide ({0}) : doit être compris entre 1 et 20")]
    InvalidLevel(u8),
    #[error("Erreur de règle : {0}")]
    Custom(String),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RacialStatChoice {
    pub value: i32,
    pub options: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeopleEquipmentRules {
    pub size_defense_bonus: Option<i32>,
    pub size_notes: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeopleStatic {
    pub id: String,
    pub name: String,
    pub stats: Option<HashMap<StatCode, i32>>,
    pub stat_choices: Option<Vec<RacialStatChoice>>,
    pub equipment_rules: Option<PeopleEquipmentRules>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileStatic {
    pub id: String,
    pub name: String,
    pub family: ProfileFamily,
    pub hp_per_level: i32,
    pub hd: String,
    #[serde(default)]
    pub bonus_pc: i32,
    #[serde(default)]
    pub bonus_dr: i32,
    #[serde(default)]
    pub paths: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArmorStatic {
    pub id: String,
    pub name: String,
    pub def: i32,
    pub max_agi: Option<i32>,
    #[serde(rename = "type")]
    pub item_type: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EquipmentStatic {
    pub armors: Vec<ArmorStatic>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankChoiceOptionStatic {
    pub id: String,
    pub modifiers: Option<RankModifiersStatic>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RankModifiersStatic {
    pub stats: Option<HashMap<StatCode, i32>>,
    pub choice_options: Option<Vec<RankChoiceOptionStatic>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionRankStatic {
    pub rank: u8,
    pub modifiers: Option<RankModifiersStatic>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathStatic {
    pub id: String,
    pub ranks: Vec<ActionRankStatic>,
}

pub struct RulesDatabase {
    pub peoples: HashMap<String, PeopleStatic>,
    pub profiles: HashMap<String, ProfileStatic>,
    pub armors: HashMap<String, ArmorStatic>,
    pub paths: HashMap<String, PathStatic>,
}

impl RulesDatabase {
    /// Charge les données statiques embarquées directement dans le binaire
    pub fn load_embedded() -> Result<Self, String> {
        let peoples_str = include_str!("../../../src/data/peoples.json");
        let profiles_str = include_str!("../../../src/data/profiles.json");
        let equipment_str = include_str!("../../../src/data/equipment.json");
        let paths_str = include_str!("../../../src/data/paths.json");

        let peoples_vec: Vec<PeopleStatic> = serde_json::from_str(peoples_str)
            .map_err(|e| format!("Erreur parsing peoples.json : {e}"))?;
        let profiles_vec: Vec<ProfileStatic> = serde_json::from_str(profiles_str)
            .map_err(|e| format!("Erreur parsing profiles.json : {e}"))?;
        let equipment: EquipmentStatic = serde_json::from_str(equipment_str)
            .map_err(|e| format!("Erreur parsing equipment.json : {e}"))?;
        let paths_vec: Vec<PathStatic> = serde_json::from_str(paths_str)
            .map_err(|e| format!("Erreur parsing paths.json : {e}"))?;

        Ok(Self {
            peoples: peoples_vec.into_iter().map(|p| (p.id.clone(), p)).collect(),
            profiles: profiles_vec.into_iter().map(|p| (p.id.clone(), p)).collect(),
            armors: equipment.armors.into_iter().map(|a| (a.id.clone(), a)).collect(),
            paths: paths_vec.into_iter().map(|p| (p.id.clone(), p)).collect(),
        })
    }
}
