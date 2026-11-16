use crate::models::{CharacterRecord, ComputedCharacterSheet};
use crate::rules::{CompanionFormulaStatic, CompanionStatBlockStatic, RulesDatabase};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedCompanionAttack {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attack_bonus: Option<String>,
    pub damage: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedCompanionStats {
    pub path_id: String,
    pub rank: u8,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub defense: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hp: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub initiative: Option<String>,
    pub attacks: Vec<ResolvedCompanionAttack>,
}

pub fn evaluate_companion_formula(
    formula: Option<&CompanionFormulaStatic>,
    level: i32,
    max_rank_in_path: i32,
    sheet: &ComputedCharacterSheet,
    profile_rank5_count: i32,
) -> Option<i32> {
    let formula = formula?;
    let mut total = formula.base.unwrap_or(0);
    if let Some(per_rank) = formula.per_rank {
        total += per_rank * max_rank_in_path;
    }
    if let Some(per_level) = formula.per_level {
        total += per_level * level;
    }
    if let Some(per_r5) = formula.per_profile_rank5 {
        total += per_r5 * profile_rank5_count;
    }
    if let Some(stat) = formula.stat {
        if let Some(val) = sheet.final_stats.get(&stat) {
            total += *val;
        }
    }
    if let Some(ref hero_ref) = formula.hero_stat_ref {
        match hero_ref.as_str() {
            "initiative" => total += sheet.initiative,
            "magicAttack" => total += sheet.attacks.magique,
            "contactAttack" => total += sheet.attacks.contact,
            "distanceAttack" => total += sheet.attacks.distance,
            "defense" => total += sheet.defense,
            _ => {}
        }
    }
    if let Some(offset) = formula.offset {
        total += offset;
    }
    Some(total)
}

pub fn resolve_companion_block(
    companion: &CompanionStatBlockStatic,
    record: &CharacterRecord,
    sheet: &ComputedCharacterSheet,
    path_id: &str,
    rank: u8,
    rules: &RulesDatabase,
) -> ResolvedCompanionStats {
    let level = i32::from(record.level.max(1));
    let max_rank_in_path = i32::from(
        record
            .acquired_abilities
            .iter()
            .filter(|a| a.path_id == path_id)
            .map(|a| a.rank)
            .max()
            .unwrap_or(1),
    );

    let owner_profile = rules
        .profiles
        .values()
        .find(|p| p.paths.iter().any(|pid| pid == path_id))
        .or_else(|| rules.profiles.get(&record.profile_id));

    let profile_rank5_count = owner_profile
        .map(|p| {
            p.paths
                .iter()
                .filter(|pid| {
                    record
                        .acquired_abilities
                        .iter()
                        .any(|a| &a.path_id == *pid && a.rank >= 5)
                })
                .count() as i32
        })
        .unwrap_or(0)
        .max(1);

    let def_val = evaluate_companion_formula(
        companion.defense_formula.as_ref(),
        level,
        max_rank_in_path,
        sheet,
        profile_rank5_count,
    );
    let hp_val = evaluate_companion_formula(
        companion.hp_formula.as_ref(),
        level,
        max_rank_in_path,
        sheet,
        profile_rank5_count,
    );
    let init_val = evaluate_companion_formula(
        companion.initiative_formula.as_ref(),
        level,
        max_rank_in_path,
        sheet,
        profile_rank5_count,
    );

    let attacks = companion
        .attacks
        .iter()
        .map(|atk| {
            let atk_val = evaluate_companion_formula(
                atk.attack_formula.as_ref(),
                level,
                max_rank_in_path,
                sheet,
                profile_rank5_count,
            );
            let attack_bonus = match atk_val {
                Some(v) if v >= 0 => Some(format!("+{v}")),
                Some(v) => Some(v.to_string()),
                None => atk.attack_bonus.clone(),
            };
            ResolvedCompanionAttack {
                name: atk.name.clone(),
                attack_bonus,
                damage: atk.damage.clone(),
            }
        })
        .collect();

    ResolvedCompanionStats {
        path_id: path_id.to_string(),
        rank,
        name: companion.name.clone(),
        defense: def_val
            .map(|v| v.to_string())
            .or_else(|| companion.defense.clone()),
        hp: hp_val
            .map(|v| v.to_string())
            .or_else(|| companion.hp.clone()),
        initiative: init_val
            .map(|v| v.to_string())
            .or_else(|| companion.initiative.clone()),
        attacks,
    }
}

/// Résout tous les compagnons liés aux capacités acquises d'un personnage.
pub fn resolve_character_companions(
    record: &CharacterRecord,
    sheet: &ComputedCharacterSheet,
    rules: &RulesDatabase,
) -> Vec<ResolvedCompanionStats> {
    let mut out = Vec::new();
    for acq in &record.acquired_abilities {
        let Some(path) = rules.paths.get(&acq.path_id) else {
            continue;
        };
        let Some(rank_data) = path.ranks.iter().find(|r| r.rank == acq.rank) else {
            continue;
        };
        let Some(ref companions) = rank_data.companions else {
            continue;
        };
        for comp in companions {
            out.push(resolve_companion_block(
                comp,
                record,
                sheet,
                &acq.path_id,
                acq.rank,
                rules,
            ));
        }
    }
    out
}
