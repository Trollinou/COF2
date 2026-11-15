use crate::models::{ProfileFamily, StatCode, WeaponModifierRule};
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
    #[error("Erreur de chargement du compendium : {0}")]
    DatabaseLoad(String),
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
    #[serde(default)]
    pub default_languages: String,
    pub stats: Option<HashMap<StatCode, i32>>,
    pub stat_choices: Option<Vec<RacialStatChoice>>,
    pub equipment_rules: Option<PeopleEquipmentRules>,
}

impl PeopleStatic {
    /// Retourne la langue maternelle du peuple (hors "Commun"), si elle existe.
    pub fn native_language(&self) -> Option<String> {
        let langs: Vec<String> = self
            .default_languages
            .split(',')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty() && !s.eq_ignore_ascii_case("Commun"))
            .map(|s| s.to_string())
            .collect();
        if langs.is_empty() {
            None
        } else {
            Some(langs.join(", "))
        }
    }
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
pub struct WeaponStatic {
    pub id: String,
    pub name: String,
    pub category: String,
    #[serde(default = "default_hands")]
    pub hands: u8,
    #[serde(default)]
    pub tags: Vec<String>,
    pub attack_stat: Option<StatCode>,
}

fn default_hands() -> u8 {
    1
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EquipmentStatic {
    pub armors: Vec<ArmorStatic>,
    #[serde(default)]
    pub weapons: Vec<WeaponStatic>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum CapRule {
    Keyword(String),
    Number(i32),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScalingBonusRuleStatic {
    pub target: String,
    pub flat: Option<i32>,
    pub stat: Option<StatCode>,
    pub per_rank: Option<i32>,
    pub per_level: Option<i32>,
    pub at_rank: Option<HashMap<String, i32>>,
    pub at_level: Option<HashMap<String, i32>>,
    pub cap: Option<CapRule>,
    pub condition: Option<String>,
    pub non_stacking_group: Option<String>,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FallbackDefenseBonusStatic {
    #[serde(default)]
    pub flat: i32,
    pub at_rank: Option<HashMap<String, i32>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatSubstitutionRuleStatic {
    pub target: String,
    pub replacement_stat: StatCode,
    pub base_stat: StatCode,
    pub weapon_filter: Option<String>,
    pub source_name: Option<String>,
    pub fallback_defense_bonus: Option<FallbackDefenseBonusStatic>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum AllowedProfilesRule {
    Keyword(String),
    List(Vec<String>),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AbilityRefStatic {
    pub path_id: String,
    pub rank: u8,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalAbilityGrantRuleStatic {
    pub allowed_profiles: AllowedProfilesRule,
    pub max_rank: u8,
    pub default_ability: Option<AbilityRefStatic>,
    pub replacement_abilities: Option<Vec<AbilityRefStatic>>,
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
    pub bonuses: Option<Vec<ScalingBonusRuleStatic>>,
    pub stat_substitutions: Option<Vec<StatSubstitutionRuleStatic>>,
    pub weapon_modifiers: Option<Vec<WeaponModifierRule>>,
    pub luck_stat_replacement: Option<StatCode>,
    pub mana_stat_replacement: Option<StatCode>,
    pub grant_external_ability: Option<ExternalAbilityGrantRuleStatic>,
    pub choice_options: Option<Vec<RankChoiceOptionStatic>>,
    pub situational_notes: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionRankStatic {
    pub rank: u8,
    #[serde(default)]
    pub is_spell: bool,
    pub modifiers: Option<RankModifiersStatic>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathStatic {
    pub id: String,
    #[serde(rename = "type")]
    pub path_type: Option<String>,
    pub ranks: Vec<ActionRankStatic>,
}

pub struct RulesDatabase {
    pub peoples: HashMap<String, PeopleStatic>,
    pub profiles: HashMap<String, ProfileStatic>,
    pub armors: HashMap<String, ArmorStatic>,
    pub weapons: HashMap<String, WeaponStatic>,
    pub paths: HashMap<String, PathStatic>,
}

impl RulesDatabase {
    /// Charge les données statiques embarquées directement dans le binaire
    pub fn load_embedded() -> Result<Self, RuleError> {
        let peoples_str = include_str!("../../../src/data/peoples.json");
        let profiles_str = include_str!("../../../src/data/profiles.json");
        let equipment_str = include_str!("../../../src/data/equipment.json");
        let paths_str = include_str!("../../../src/data/paths.json");

        let peoples_vec: Vec<PeopleStatic> = serde_json::from_str(peoples_str)
            .map_err(|e| RuleError::DatabaseLoad(format!("Erreur parsing peoples.json : {e}")))?;
        let profiles_vec: Vec<ProfileStatic> = serde_json::from_str(profiles_str)
            .map_err(|e| RuleError::DatabaseLoad(format!("Erreur parsing profiles.json : {e}")))?;
        let equipment: EquipmentStatic = serde_json::from_str(equipment_str)
            .map_err(|e| RuleError::DatabaseLoad(format!("Erreur parsing equipment.json : {e}")))?;
        let paths_vec: Vec<PathStatic> = serde_json::from_str(paths_str)
            .map_err(|e| RuleError::DatabaseLoad(format!("Erreur parsing paths.json : {e}")))?;

        Ok(Self {
            peoples: peoples_vec.into_iter().map(|p| (p.id.clone(), p)).collect(),
            profiles: profiles_vec.into_iter().map(|p| (p.id.clone(), p)).collect(),
            armors: equipment.armors.into_iter().map(|a| (a.id.clone(), a)).collect(),
            weapons: equipment.weapons.into_iter().map(|w| (w.id.clone(), w)).collect(),
            paths: paths_vec.into_iter().map(|p| (p.id.clone(), p)).collect(),
        })
    }
}
