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
    #[serde(default)]
    pub preferred_armor_id: Option<String>,
    #[serde(default)]
    pub forbidden_weapon_ids: Option<Vec<String>>,
    #[serde(default)]
    pub max_damage_dice: Option<i32>,
    #[serde(default)]
    pub two_handed_weapon_ids: Option<Vec<String>>,
    #[serde(default)]
    pub two_handed_min_damage_dice: Option<i32>,
    #[serde(default)]
    pub max_one_handed_damage_dice: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeopleStatic {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub default_languages: String,
    #[serde(default)]
    pub starting_age: String,
    #[serde(default)]
    pub height_range: String,
    #[serde(default)]
    pub weight_range: String,
    #[serde(default)]
    pub physical_traits: String,
    #[serde(default)]
    pub racial_path_id: Option<String>,
    #[serde(default)]
    pub selectable_racial_paths: Option<Vec<String>>,
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
pub struct ProfileWeaponRulesStatic {
    pub allowed_categories: Option<Vec<String>>,
    pub allowed_damage_types: Option<Vec<String>>,
    #[serde(default)]
    pub forbid_powder: bool,
    #[serde(default)]
    pub forbid_crossbows: bool,
    pub forbidden_tags: Option<Vec<String>>,
    #[serde(default)]
    pub forbid_improved_crit: bool,
    pub max_hands: Option<u8>,
    pub max_hands_melee: Option<u8>,
    pub allowed_exception_weapon_ids: Option<Vec<String>>,
    pub explicit_allowed_weapon_ids: Option<Vec<String>>,
    pub max_damage_dice: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileEquipmentRulesStatic {
    pub max_armor_id: Option<String>,
    #[serde(default = "default_shield_perm")]
    pub shield_permission: String,
    #[serde(default)]
    pub max_spellcasting_armor_def: Option<i32>,
    pub weapon_rules: Option<ProfileWeaponRulesStatic>,
}

fn default_shield_perm() -> String {
    "none".to_string()
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileDefaultEquipmentStatic {
    pub armor_id: Option<String>,
    pub shield_id: Option<String>,
    pub default_weapon_ids: Option<Vec<String>>,
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
    #[serde(default)]
    pub optional_paths: Vec<String>,
    #[serde(default)]
    pub has_mage_bonus: bool,
    #[serde(default)]
    pub is_family_selectable: bool,
    #[serde(default)]
    pub equipment_rules: Option<ProfileEquipmentRulesStatic>,
    #[serde(default)]
    pub default_equipment: Option<ProfileDefaultEquipmentStatic>,
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
    #[serde(default)]
    pub restricted_to_people_ids: Option<Vec<String>>,
    #[serde(default)]
    pub equivalent_armor_id: Option<String>,
}

fn deserialize_optional_nullable_stat<'de, D>(
    deserializer: D,
) -> Result<Option<Option<StatCode>>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Some(Option::<StatCode>::deserialize(deserializer)?))
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WeaponStatic {
    pub id: String,
    pub name: String,
    pub category: String,
    #[serde(default)]
    pub damage: String,
    #[serde(default)]
    pub damage_type: String,
    #[serde(default)]
    pub range: String,
    #[serde(default = "default_crit_min")]
    pub crit_min: i32,
    #[serde(default)]
    pub max_damage_dice: Option<i32>,
    #[serde(default)]
    pub small_race_replacement_id: Option<String>,
    #[serde(default = "default_hands")]
    pub hands: u8,
    #[serde(default)]
    pub tags: Vec<String>,
    pub attack_stat: Option<StatCode>,
    #[serde(default, deserialize_with = "deserialize_optional_nullable_stat")]
    pub damage_stat: Option<Option<StatCode>>,
}

fn default_crit_min() -> i32 {
    20
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
    #[serde(default)]
    pub starting_adventurer_kit: Vec<String>,
    #[serde(default)]
    pub armor_hierarchy: Vec<String>,
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
pub struct CompanionFormulaStatic {
    pub base: Option<i32>,
    pub per_level: Option<i32>,
    pub per_rank: Option<i32>,
    pub per_profile_rank5: Option<i32>,
    pub stat: Option<StatCode>,
    pub hero_stat_ref: Option<String>,
    pub offset: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatureAttackStatic {
    pub name: String,
    pub attack_bonus: Option<String>,
    pub attack_formula: Option<CompanionFormulaStatic>,
    pub damage: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanionStatBlockStatic {
    pub name: String,
    pub defense: Option<String>,
    pub defense_formula: Option<CompanionFormulaStatic>,
    pub hp: Option<String>,
    pub hp_formula: Option<CompanionFormulaStatic>,
    pub initiative: Option<String>,
    pub initiative_formula: Option<CompanionFormulaStatic>,
    #[serde(default)]
    pub attacks: Vec<CreatureAttackStatic>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionRankStatic {
    pub rank: u8,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub is_spell: bool,
    pub modifiers: Option<RankModifiersStatic>,
    #[serde(default)]
    pub companions: Option<Vec<CompanionStatBlockStatic>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MinProfilePathsAtRankStatic {
    pub count: usize,
    pub rank: u8,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum AllowedFamiliesRule {
    Keyword(String),
    List(Vec<ProfileFamily>),
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathPrerequisitesStatic {
    pub min_level: Option<u8>,
    pub allowed_families: Option<AllowedFamiliesRule>,
    pub min_profile_paths_at_rank: Option<MinProfilePathsAtRankStatic>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathStatic {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "type")]
    pub path_type: Option<String>,
    #[serde(default)]
    pub family_restriction: Option<String>,
    #[serde(default)]
    pub prerequisites: Option<PathPrerequisitesStatic>,
    #[serde(default)]
    pub deity: Option<String>,
    #[serde(default)]
    pub sacred_weapon: Option<String>,
    #[serde(default)]
    pub sacred_weapon_ids: Option<Vec<String>>,
    pub ranks: Vec<ActionRankStatic>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacteristicArrayStatic {
    pub id: String,
    pub values: Vec<i32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TablesStatic {
    #[serde(default)]
    characteristic_arrays: Vec<CharacteristicArrayStatic>,
}

pub struct RulesDatabase {
    pub peoples: HashMap<String, PeopleStatic>,
    pub profiles: HashMap<String, ProfileStatic>,
    pub armors: HashMap<String, ArmorStatic>,
    pub weapons: HashMap<String, WeaponStatic>,
    pub paths: HashMap<String, PathStatic>,
    pub peoples_order: Vec<String>,
    pub profiles_order: Vec<String>,
    pub armors_order: Vec<String>,
    pub weapons_order: Vec<String>,
    pub paths_order: Vec<String>,
    pub armor_hierarchy: Vec<String>,
    pub starting_adventurer_kit: Vec<String>,
    pub characteristic_arrays: Vec<CharacteristicArrayStatic>,
}

impl RulesDatabase {
    /// Retourne l'identifiant du peuple par défaut (`humain` si présent, sinon le premier du compendium).
    pub fn default_people_id(&self) -> Option<&str> {
        if self.peoples.contains_key("humain") {
            Some("humain")
        } else {
            self.peoples_order.first().map(String::as_str)
        }
    }

    /// Retourne l'identifiant du premier profil du compendium.
    pub fn default_profile_id(&self) -> Option<&str> {
        self.profiles_order.first().map(String::as_str)
    }

    /// Charge les données statiques embarquées directement dans le binaire
    pub fn load_embedded() -> Result<Self, RuleError> {
        let peoples_str = include_str!("../../../src/data/peoples.json");
        let profiles_str = include_str!("../../../src/data/profiles.json");
        let equipment_str = include_str!("../../../src/data/equipment.json");
        let paths_str = include_str!("../../../src/data/paths.json");
        let tables_str = include_str!("../../../src/data/tables.json");

        let peoples_vec: Vec<PeopleStatic> = serde_json::from_str(peoples_str)
            .map_err(|e| RuleError::DatabaseLoad(format!("Erreur parsing peoples.json : {e}")))?;
        let profiles_vec: Vec<ProfileStatic> = serde_json::from_str(profiles_str)
            .map_err(|e| RuleError::DatabaseLoad(format!("Erreur parsing profiles.json : {e}")))?;
        let equipment: EquipmentStatic = serde_json::from_str(equipment_str)
            .map_err(|e| RuleError::DatabaseLoad(format!("Erreur parsing equipment.json : {e}")))?;
        let paths_vec: Vec<PathStatic> = serde_json::from_str(paths_str)
            .map_err(|e| RuleError::DatabaseLoad(format!("Erreur parsing paths.json : {e}")))?;
        let tables: TablesStatic = serde_json::from_str(tables_str)
            .map_err(|e| RuleError::DatabaseLoad(format!("Erreur parsing tables.json : {e}")))?;

        let peoples_order = peoples_vec.iter().map(|p| p.id.clone()).collect();
        let profiles_order = profiles_vec.iter().map(|p| p.id.clone()).collect();
        let armors_order = equipment.armors.iter().map(|a| a.id.clone()).collect();
        let weapons_order = equipment.weapons.iter().map(|w| w.id.clone()).collect();
        let paths_order = paths_vec.iter().map(|p| p.id.clone()).collect();
        let armor_hierarchy = if equipment.armor_hierarchy.is_empty() {
            vec![
                "tissus",
                "cuir-simple",
                "cuir-renforce",
                "chemise-mailles",
                "cotte-mailles",
                "plaques",
                "plaque-complete",
            ]
            .into_iter()
            .map(ToString::to_string)
            .collect()
        } else {
            equipment.armor_hierarchy
        };

        Ok(Self {
            peoples: peoples_vec.into_iter().map(|p| (p.id.clone(), p)).collect(),
            profiles: profiles_vec.into_iter().map(|p| (p.id.clone(), p)).collect(),
            armors: equipment.armors.into_iter().map(|a| (a.id.clone(), a)).collect(),
            weapons: equipment.weapons.into_iter().map(|w| (w.id.clone(), w)).collect(),
            paths: paths_vec.into_iter().map(|p| (p.id.clone(), p)).collect(),
            peoples_order,
            profiles_order,
            armors_order,
            weapons_order,
            paths_order,
            armor_hierarchy,
            starting_adventurer_kit: equipment.starting_adventurer_kit,
            characteristic_arrays: tables.characteristic_arrays,
        })
    }
}
