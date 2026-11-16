use crate::engine::creation::{default_character_record, generate_character_id_and_timestamp};
use crate::engine::stats::{compute_racial_stat_modifiers, parse_stat, ALL_STAT_CODES};
use crate::models::{
    AcquiredAbility, CharacterRecord, CharacterWeaponInstance, Coins, HumanDiversityChoice,
    InventoryItem, LevelProgressionStep, ProfileFamily, StatCode,
};
use crate::rules::RulesDatabase;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub is_valid: bool,
    pub character: CharacterRecord,
    pub warnings: Vec<String>,
}

fn is_safe_key(key: &str) -> bool {
    !matches!(key, "__proto__" | "constructor" | "prototype")
        && !key.is_empty()
        && key
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn is_valid_origin_id(s: &str) -> bool {
    !s.is_empty()
        && s.chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
}

fn stat_code_key(stat: StatCode) -> &'static str {
    match stat {
        StatCode::FOR => "FOR",
        StatCode::AGI => "AGI",
        StatCode::CON => "CON",
        StatCode::PER => "PER",
        StatCode::INT => "INT",
        StatCode::VOL => "VOL",
        StatCode::CHA => "CHA",
    }
}

fn as_non_empty_str(val: Option<&Value>) -> Option<String> {
    val.and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .filter(|s| !s.trim().is_empty())
}

fn as_str_or(val: Option<&Value>, default: &str) -> String {
    val.and_then(|v| v.as_str())
        .map(ToString::to_string)
        .unwrap_or_else(|| default.to_string())
}

fn as_finite_i32(val: Option<&Value>) -> Option<i32> {
    let v = val?;
    if let Some(n) = v.as_i64() {
        return i32::try_from(n).ok();
    }
    if let Some(f) = v.as_f64() {
        if f.is_finite() {
            return Some(f.trunc() as i32);
        }
    }
    None
}

fn as_int_in_range(val: Option<&Value>, min: i64, max: i64) -> Option<u8> {
    let v = val?;
    let n = if let Some(i) = v.as_i64() {
        Some(i)
    } else if let Some(f) = v.as_f64() {
        if f.is_finite() && f.fract() == 0.0 {
            Some(f as i64)
        } else {
            None
        }
    } else {
        None
    }?;
    if n >= min && n <= max {
        Some(n as u8)
    } else {
        None
    }
}

fn parse_profile_family(s: &str) -> Option<ProfileFamily> {
    match s {
        "Aventuriers" => Some(ProfileFamily::Aventuriers),
        "Combattants" => Some(ProfileFamily::Combattants),
        "Mages" => Some(ProfileFamily::Mages),
        "Mystiques" => Some(ProfileFamily::Mystiques),
        _ => None,
    }
}

/// Valide et migre un JSON de fiche potentiellement incomplet ou issu d'une version antérieure.
pub fn validate_and_migrate_record(data: Value, rules: &RulesDatabase) -> ValidationResult {
    let default_char = default_character_record(rules);
    let mut warnings: Vec<String> = Vec::new();

    let Some(raw) = data.as_object() else {
        return ValidationResult {
            is_valid: false,
            character: default_char,
            warnings: vec![
                "Données invalides : format non reconnu. Réinitialisé avec un personnage par défaut."
                    .to_string(),
            ],
        };
    };

    let id = as_non_empty_str(raw.get("id")).unwrap_or_else(|| default_char.id.clone());
    let version = as_str_or(raw.get("version"), "1.0.0");
    let name = as_non_empty_str(raw.get("name")).unwrap_or_else(|| "Héros sans nom".to_string());
    let player_name = as_str_or(raw.get("playerName"), "");
    let people_id = as_str_or(raw.get("peopleId"), &default_char.people_id);
    let profile_id = as_str_or(raw.get("profileId"), &default_char.profile_id);
    let secondary_profile_id = raw
        .get("secondaryProfileId")
        .and_then(|v| v.as_str())
        .map(ToString::to_string);
    let level = as_int_in_range(raw.get("level"), 1, 20).unwrap_or(1);

    let mut base_stats = default_char.base_stats.clone();
    if let Some(raw_base) = raw.get("baseStats").and_then(|v| v.as_object()) {
        for stat in ALL_STAT_CODES {
            let key = stat_code_key(stat);
            if let Some(val) = as_finite_i32(raw_base.get(key)) {
                base_stats.insert(stat, val);
            } else {
                let fallback = *base_stats.get(&stat).unwrap_or(&0);
                warnings.push(format!(
                    "Statistique {key} invalide ou manquante, réinitialisée à {fallback}."
                ));
            }
        }
    } else {
        warnings.push(
            "Bloc de caractéristiques de base absent, initialisé aux valeurs par défaut."
                .to_string(),
        );
    }

    let stat_array_preset = raw
        .get("statArrayPreset")
        .and_then(|v| v.as_str())
        .map(ToString::to_string);

    let selected_path_ids: Vec<String> = raw
        .get("selectedPathIds")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|p| p.as_str().map(ToString::to_string))
                .collect()
        })
        .unwrap_or_else(|| default_char.selected_path_ids.clone());

    let acquired_abilities: Vec<AcquiredAbility> = raw
        .get("acquiredAbilities")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| {
                    let obj = item.as_object()?;
                    let path_id = obj.get("pathId")?.as_str()?.to_string();
                    let rank = as_int_in_range(obj.get("rank"), 1, 8)?;
                    Some(AcquiredAbility { path_id, rank })
                })
                .collect()
        })
        .unwrap_or_else(|| default_char.acquired_abilities.clone());

    let mut path_rank_choices: HashMap<String, String> = HashMap::new();
    if let Some(obj) = raw.get("pathRankChoices").and_then(|v| v.as_object()) {
        for (key, val) in obj {
            if is_safe_key(key) {
                if let Some(s) = val.as_str() {
                    path_rank_choices.insert(key.clone(), s.to_string());
                }
            }
        }
    }

    let mut external_ability_choices: HashMap<String, AcquiredAbility> = HashMap::new();
    if let Some(obj) = raw
        .get("externalAbilityChoices")
        .and_then(|v| v.as_object())
    {
        for (key, val) in obj {
            if is_safe_key(key) {
                if let Some(inner) = val.as_object() {
                    if let (Some(path_id), Some(rank)) = (
                        inner.get("pathId").and_then(|v| v.as_str()),
                        as_int_in_range(inner.get("rank"), 1, 8),
                    ) {
                        external_ability_choices.insert(
                            key.clone(),
                            AcquiredAbility {
                                path_id: path_id.to_string(),
                                rank,
                            },
                        );
                    }
                }
            }
        }
    }

    let mut human_diversity: Option<HumanDiversityChoice> = None;
    if let Some(hd) = raw.get("humanDiversity").and_then(|v| v.as_object()) {
        if let Some(raw_origin) = hd.get("originId").and_then(|v| v.as_str()) {
            let origin_id = raw_origin.trim().to_string();
            if is_valid_origin_id(&origin_id) {
                let trim_opt = |k: &str| -> Option<String> {
                    hd.get(k)
                        .and_then(|v| v.as_str())
                        .map(|s| s.trim().to_string())
                        .filter(|s| !s.is_empty())
                };
                let replaced_domain_index = match hd.get("replacedDomainIndex").and_then(|v| v.as_u64()) {
                    Some(0) => Some(0),
                    Some(1) => Some(1),
                    _ => None,
                };
                human_diversity = Some(HumanDiversityChoice {
                    origin_id,
                    custom_origin_name: trim_opt("customOriginName"),
                    custom_domain_1: trim_opt("customDomain1"),
                    custom_domain_2: trim_opt("customDomain2"),
                    replaced_domain_index,
                    replacement_trade: trim_opt("replacementTrade"),
                });
            }
        }
    }

    let weapons: Vec<CharacterWeaponInstance> = raw
        .get("weapons")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .enumerate()
                .filter_map(|(idx, item)| {
                    let w = item.as_object()?;
                    let category = if w.get("category").and_then(|v| v.as_str()) == Some("distance") {
                        "distance".to_string()
                    } else {
                        "contact".to_string()
                    };
                    let attack_stat_used = w
                        .get("attackStatUsed")
                        .and_then(|v| v.as_str())
                        .and_then(|s| parse_stat(s).ok());
                    Some(CharacterWeaponInstance {
                        id: as_str_or(w.get("id"), &format!("w_{}", idx + 1)),
                        weapon_ref_id: as_str_or(w.get("weaponRefId"), "mains-nues"),
                        name: as_str_or(w.get("name"), "Arme inconnue"),
                        damage: as_str_or(w.get("damage"), "1d4"),
                        range: as_str_or(w.get("range"), "Contact"),
                        category,
                        bonus_attack: as_finite_i32(w.get("bonusAttack")).unwrap_or(0),
                        bonus_damage: as_finite_i32(w.get("bonusDamage")).unwrap_or(0),
                        requires_two_hands: w
                            .get("requiresTwoHands")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false),
                        attack_stat_used,
                        attack_stat_source: w
                            .get("attackStatSource")
                            .and_then(|v| v.as_str())
                            .map(ToString::to_string),
                    })
                })
                .collect()
        })
        .unwrap_or_else(|| default_char.weapons.clone());

    let inventory: Vec<InventoryItem> = raw
        .get("inventory")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .enumerate()
                .filter_map(|(idx, item)| {
                    let obj = item.as_object()?;
                    let qty = as_finite_i32(obj.get("quantity")).filter(|&q| q >= 0).unwrap_or(1);
                    Some(InventoryItem {
                        id: as_str_or(obj.get("id"), &format!("inv_{idx}")),
                        name: as_str_or(obj.get("name"), "Objet"),
                        quantity: qty,
                        notes: obj
                            .get("notes")
                            .and_then(|v| v.as_str())
                            .map(ToString::to_string),
                    })
                })
                .collect()
        })
        .unwrap_or_else(|| default_char.inventory.clone());

    let raw_coins = raw.get("coins").and_then(|v| v.as_object());
    let coins = Coins {
        pa: as_finite_i32(raw_coins.and_then(|c| c.get("pa"))).unwrap_or(0),
        pc: as_finite_i32(raw_coins.and_then(|c| c.get("pc"))).unwrap_or(0),
        po: as_finite_i32(raw_coins.and_then(|c| c.get("po"))).unwrap_or(0),
    };

    let racial_stat_choices: Vec<StatCode> = raw
        .get("racialStatChoices")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().and_then(|s| parse_stat(s).ok()))
                .collect()
        })
        .unwrap_or_else(|| default_char.racial_stat_choices.clone());

    let mut fallback_racial_mods: HashMap<StatCode, i32> = HashMap::new();
    if let Some(obj) = raw.get("racialStatModifiers").and_then(|v| v.as_object()) {
        for stat in ALL_STAT_CODES {
            if let Some(val) = as_finite_i32(obj.get(stat_code_key(stat))) {
                fallback_racial_mods.insert(stat, val);
            }
        }
    }
    let racial_stat_modifiers = compute_racial_stat_modifiers(
        &people_id,
        &racial_stat_choices,
        Some(&fallback_racial_mods),
        rules,
    );

    let mut manual_stat_bonuses: HashMap<StatCode, i32> = HashMap::new();
    if let Some(obj) = raw.get("manualStatBonuses").and_then(|v| v.as_object()) {
        for stat in ALL_STAT_CODES {
            if let Some(val) = as_finite_i32(obj.get(stat_code_key(stat))) {
                if val != 0 {
                    manual_stat_bonuses.insert(stat, val);
                }
            }
        }
    }

    let level_up_hp_gains: Vec<i32> = raw
        .get("levelUpHpGains")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| as_finite_i32(Some(v)))
                .collect()
        })
        .unwrap_or_default();

    let progression_history: Vec<LevelProgressionStep> = raw
        .get("progressionHistory")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| serde_json::from_value::<LevelProgressionStep>(v.clone()).ok())
                .collect()
        })
        .unwrap_or_default();

    let (_, now_iso) = generate_character_id_and_timestamp();
    let updated_at = raw
        .get("updatedAt")
        .and_then(|v| v.as_str())
        .map(ToString::to_string)
        .unwrap_or(now_iso);

    let filter_str_array = |key: &str| -> Vec<String> {
        raw.get(key)
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .map(ToString::to_string)
                    .collect()
            })
            .unwrap_or_default()
    };

    let migrated = CharacterRecord {
        id,
        version,
        updated_at,
        creation_completed: Some(
            raw.get("creationCompleted")
                .and_then(|v| v.as_bool())
                .unwrap_or(true),
        ),
        name,
        player_name,
        sex: as_str_or(raw.get("sex"), "Masculin"),
        age: as_str_or(raw.get("age"), ""),
        height: as_str_or(raw.get("height"), ""),
        weight: as_str_or(raw.get("weight"), ""),
        physical_traits: as_str_or(raw.get("physicalTraits"), ""),
        languages: filter_str_array("languages"),
        secondary_talents: filter_str_array("secondaryTalents"),
        background: as_str_or(raw.get("background"), ""),
        ideal: as_str_or(raw.get("ideal"), ""),
        flaw: as_str_or(raw.get("flaw"), ""),
        notes: as_str_or(raw.get("notes"), ""),
        deity: raw
            .get("deity")
            .and_then(|v| v.as_str())
            .map(ToString::to_string),
        people_id,
        profile_id,
        profile_family: raw
            .get("profileFamily")
            .and_then(|v| v.as_str())
            .and_then(parse_profile_family),
        is_hybrid: raw.get("isHybrid").and_then(|v| v.as_bool()),
        secondary_profile_id,
        level,
        base_stats,
        stat_array_preset,
        racial_stat_choices,
        racial_stat_modifiers,
        manual_stat_bonuses,
        selected_path_ids,
        acquired_abilities,
        path_rank_choices,
        external_ability_choices,
        human_diversity,
        progression_history,
        current_hp: as_finite_i32(raw.get("currentHp")).unwrap_or(default_char.current_hp),
        max_hp_bonus: as_finite_i32(raw.get("maxHpBonus")).unwrap_or(0),
        level_up_hp_gains,
        half_hp_pending: raw.get("halfHpPending").and_then(|v| v.as_bool()),
        current_dr: as_finite_i32(raw.get("currentDr")).unwrap_or(default_char.current_dr),
        current_pc: as_finite_i32(raw.get("currentPc")).unwrap_or(default_char.current_pc),
        current_pm: as_finite_i32(raw.get("currentPm")).unwrap_or(default_char.current_pm),
        equipped_armor_id: raw
            .get("equippedArmorId")
            .and_then(|v| v.as_str())
            .map(ToString::to_string),
        equipped_shield_id: raw
            .get("equippedShieldId")
            .and_then(|v| v.as_str())
            .map(ToString::to_string),
        weapons,
        inventory,
        coins,
    };

    ValidationResult {
        is_valid: warnings.is_empty(),
        character: migrated,
        warnings,
    }
}
