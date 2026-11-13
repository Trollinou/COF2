use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Type)]
pub enum StatCode {
    FOR,
    AGI,
    CON,
    PER,
    INT,
    VOL,
    CHA,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum ProfileFamily {
    Aventuriers,
    Combattants,
    Mages,
    Mystiques,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AcquiredAbility {
    pub path_id: String,
    pub rank: u8,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CharacterWeaponInstance {
    pub id: String,
    pub weapon_ref_id: String,
    pub name: String,
    pub damage: String,
    pub range: String,
    pub category: String,
    pub bonus_attack: i32,
    pub bonus_damage: i32,
    #[serde(default)]
    pub requires_two_hands: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attack_stat_used: Option<StatCode>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attack_stat_source: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct InventoryItem {
    pub id: String,
    pub name: String,
    pub quantity: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Coins {
    pub pa: i32,
    pub pc: i32,
    pub po: i32,
}

/// Mémorisation détaillée des apprentissages et choix effectués à un niveau précis
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LevelProgressionStep {
    pub level: u8,
    pub hp_gain: i32,
    #[serde(default)]
    pub abilities_learned: Vec<AcquiredAbility>,
    #[serde(default)]
    pub selected_path_ids: Vec<String>,
    #[serde(default)]
    pub path_rank_choices: HashMap<String, String>,
    #[serde(default)]
    pub manual_stat_bonuses: HashMap<StatCode, i32>,
    #[serde(default)]
    pub timestamp: String,
}

/// Modèle persistant officiel d'un personnage COF2 (compatible avec les fichiers .cof2)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CharacterRecord {
    pub id: String,
    #[serde(default = "default_version")]
    pub version: String,
    #[serde(default)]
    pub updated_at: String,
    pub name: String,
    #[serde(default)]
    pub player_name: String,
    #[serde(default)]
    pub sex: String,
    #[serde(default)]
    pub age: String,
    #[serde(default)]
    pub height: String,
    #[serde(default)]
    pub weight: String,
    #[serde(default)]
    pub physical_traits: String,
    #[serde(default)]
    pub languages: String,
    #[serde(default)]
    pub background: String,
    #[serde(default)]
    pub ideal: String,
    #[serde(default)]
    pub flaw: String,
    #[serde(default)]
    pub notes: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deity: Option<String>,

    pub people_id: String,
    pub profile_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub profile_family: Option<ProfileFamily>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_hybrid: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secondary_profile_id: Option<String>,
    pub level: u8,

    pub base_stats: HashMap<StatCode, i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stat_array_preset: Option<String>,
    #[serde(default)]
    pub racial_stat_choices: Vec<StatCode>,
    #[serde(default)]
    pub racial_stat_modifiers: HashMap<StatCode, i32>,
    #[serde(default)]
    pub manual_stat_bonuses: HashMap<StatCode, i32>,

    #[serde(default)]
    pub selected_path_ids: Vec<String>,
    #[serde(default)]
    pub acquired_abilities: Vec<AcquiredAbility>,
    #[serde(default)]
    pub path_rank_choices: HashMap<String, String>,
    #[serde(default)]
    pub external_ability_choices: HashMap<String, AcquiredAbility>,

    /// Historique des apprentissages niveau par niveau (permet de tracer et de revenir en arrière)
    #[serde(default)]
    pub progression_history: Vec<LevelProgressionStep>,

    pub current_hp: i32,
    #[serde(default)]
    pub max_hp_bonus: i32,
    #[serde(default)]
    pub level_up_hp_gains: Vec<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub half_hp_pending: Option<bool>,
    pub current_dr: i32,
    pub current_pc: i32,
    pub current_pm: i32,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub equipped_armor_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub equipped_shield_id: Option<String>,

    #[serde(default)]
    pub weapons: Vec<CharacterWeaponInstance>,
    #[serde(default)]
    pub inventory: Vec<InventoryItem>,
    #[serde(default = "default_coins")]
    pub coins: Coins,
}

fn default_version() -> String {
    "1.0.5".to_string()
}

fn default_coins() -> Coins {
    Coins { pa: 0, pc: 0, po: 0 }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AttackBonuses {
    pub contact: i32,
    pub distance: i32,
    pub magique: i32,
}

/// Fiche de statistiques dérivées calculée à la volée par le moteur Rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ComputedCharacterSheet {
    pub record: CharacterRecord,
    pub base_stats: HashMap<StatCode, i32>,
    pub racial_bonus_stats: HashMap<StatCode, i32>,
    pub path_bonus_stats: HashMap<StatCode, i32>,
    pub manual_bonus_stats: HashMap<StatCode, i32>,
    pub other_bonus_stats: HashMap<StatCode, i32>,
    pub final_stats: HashMap<StatCode, i32>,
    pub bab: i32,
    pub defense: i32,
    pub defense_stat: StatCode,
    pub defense_stat_source: Option<String>,
    pub effective_agi: i32,
    pub armor_defense: i32,
    pub shield_defense: i32,
    pub initiative: i32,
    pub max_hp: i32,
    pub max_dr: i32,
    pub dr_dice: String,
    pub max_pc: i32,
    pub max_pm: i32,
    pub energy_type: String,
    pub attacks: AttackBonuses,
    pub contact_attack_stat: StatCode,
    pub contact_attack_stat_source: Option<String>,
    pub distance_attack_stat: StatCode,
    pub distance_attack_stat_source: Option<String>,
    pub situational_notes: Vec<String>,
}
