use crate::engine::creation::get_racial_path_id;
use crate::engine::paths::{get_profile_all_pool_path_ids, has_mage_creation_bonus};
use crate::engine::RulesEngine;
use crate::models::{
    AcquiredAbility, CharacterRecord, ComputedCharacterSheet, LevelProgressionStep, ProfileFamily,
    StatCode,
};
use crate::rules::{RuleError, RulesDatabase};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::{HashMap, HashSet};

/// Applique une montée de niveau avec validation des capacités et historisation complète.
pub(crate) fn apply_level_up(
    record: &mut CharacterRecord,
    step: LevelProgressionStep,
    rules: &RulesDatabase,
) -> Result<ComputedCharacterSheet, RuleError> {
    if record.level >= 20 {
        return Err(RuleError::InvalidLevel(record.level));
    }

    let next_level = record.level + 1;
    if step.level != next_level {
        return Err(RuleError::Custom(format!(
            "Niveau de progression incohérent : attendu {}, reçu {}",
            next_level, step.level
        )));
    }

    // Validation des capacités apprises avant toute mutation
    for ability in &step.abilities_learned {
        let path = rules
            .paths
            .get(&ability.path_id)
            .ok_or_else(|| RuleError::PathNotFound(ability.path_id.clone()))?;
        if !path.ranks.iter().any(|r| r.rank == ability.rank) {
            return Err(RuleError::RankNotFound(
                ability.path_id.clone(),
                ability.rank,
            ));
        }
    }

    record.level_up_hp_gains.push(step.hp_gain);

    for ability in &step.abilities_learned {
        if !record
            .acquired_abilities
            .iter()
            .any(|a| a.path_id == ability.path_id && a.rank == ability.rank)
        {
            record.acquired_abilities.push(ability.clone());
        }
    }

    for path_id in &step.selected_path_ids {
        if !record.selected_path_ids.contains(path_id) {
            record.selected_path_ids.push(path_id.clone());
        }
    }

    for (k, v) in &step.path_rank_choices {
        record.path_rank_choices.insert(k.clone(), v.clone());
    }

    for (stat, bonus) in &step.manual_stat_bonuses {
        record.manual_stat_bonuses.add(*stat, *bonus);
    }

    for lang in &step.languages_learned {
        if !record
            .languages
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(lang))
        {
            record.languages.push(lang.clone());
        }
    }
    for talent in &step.secondary_talents_learned {
        if !record
            .secondary_talents
            .iter()
            .any(|existing| existing.eq_ignore_ascii_case(talent))
        {
            record.secondary_talents.push(talent.clone());
        }
    }

    record.progression_history.push(step);
    record.level = next_level;

    let mut computed = RulesEngine::compute_sheet(record, rules)?;
    record.current_hp = computed.max_hp;
    record.current_dr = computed.max_dr;
    record.current_pc = computed.max_pc;
    record.current_pm = computed.max_pm;
    computed.record = record.clone();

    Ok(computed)
}

/// Rétrograde le personnage à un niveau antérieur en annulant proprement les apprentissages.
pub(crate) fn rollback_to_level(
    record: &mut CharacterRecord,
    target_level: u8,
    rules: &RulesDatabase,
) -> Result<ComputedCharacterSheet, RuleError> {
    if target_level < 1 || target_level >= record.level {
        return Err(RuleError::Custom(format!(
            "Niveau cible de retour en arrière invalide ({target_level}). Niveau actuel : {}",
            record.level
        )));
    }

    let mut abilities_to_remove = Vec::new();
    let mut paths_from_reverted_steps = Vec::new();
    let mut choices_to_remove = Vec::new();
    let mut languages_to_remove = Vec::new();
    let mut talents_to_remove = Vec::new();
    let mut stat_bonuses_to_revert: HashMap<StatCode, i32> = HashMap::new();

    for step in record
        .progression_history
        .iter()
        .filter(|s| s.level > target_level)
    {
        abilities_to_remove.extend(step.abilities_learned.iter().cloned());
        paths_from_reverted_steps.extend(step.selected_path_ids.iter().cloned());
        choices_to_remove.extend(step.path_rank_choices.keys().cloned());
        languages_to_remove.extend(step.languages_learned.iter().cloned());
        talents_to_remove.extend(step.secondary_talents_learned.iter().cloned());
        for (stat, bonus) in &step.manual_stat_bonuses {
            *stat_bonuses_to_revert.entry(*stat).or_insert(0) += bonus;
        }
    }

    record.acquired_abilities.retain(|ab| {
        !abilities_to_remove
            .iter()
            .any(|rem| rem.path_id == ab.path_id && rem.rank == ab.rank)
    });

    for k in choices_to_remove {
        record.path_rank_choices.remove(&k);
    }

    // Ne retirer que les langues/talents non présents dans les étapes conservées
    let kept_steps: Vec<&LevelProgressionStep> = record
        .progression_history
        .iter()
        .filter(|s| s.level <= target_level)
        .collect();

    record.languages.retain(|lang| {
        let in_reverted = languages_to_remove
            .iter()
            .any(|rem| rem.eq_ignore_ascii_case(lang));
        let in_kept = kept_steps.iter().any(|s| {
            s.languages_learned
                .iter()
                .any(|k| k.eq_ignore_ascii_case(lang))
        });
        !in_reverted || in_kept
    });

    record.secondary_talents.retain(|talent| {
        let in_reverted = talents_to_remove
            .iter()
            .any(|rem| rem.eq_ignore_ascii_case(talent));
        let in_kept = kept_steps.iter().any(|s| {
            s.secondary_talents_learned
                .iter()
                .any(|k| k.eq_ignore_ascii_case(talent))
        });
        !in_reverted || in_kept
    });

    // Retirer les voies introduites uniquement aux niveaux annulés
    record.selected_path_ids.retain(|path_id| {
        let in_reverted = paths_from_reverted_steps.contains(path_id);
        let in_kept = kept_steps
            .iter()
            .any(|s| s.selected_path_ids.contains(path_id));
        let still_has_ability = record
            .acquired_abilities
            .iter()
            .any(|ab| &ab.path_id == path_id);
        !in_reverted || in_kept || still_has_ability
    });

    // Déduction des bonus manuels
    for (stat, bonus) in stat_bonuses_to_revert {
        record.manual_stat_bonuses.add(stat, -bonus);
    }

    if record.level_up_hp_gains.len() > target_level as usize {
        record.level_up_hp_gains.truncate(target_level as usize);
    }

    record
        .progression_history
        .retain(|s| s.level <= target_level);

    record.level = target_level;

    let mut computed = RulesEngine::compute_sheet(record, rules)?;
    record.current_hp = record.current_hp.min(computed.max_hp);
    record.current_dr = record.current_dr.min(computed.max_dr);
    record.current_pc = record.current_pc.min(computed.max_pc);
    record.current_pm = record.current_pm.min(computed.max_pm);
    computed.record = record.clone();

    Ok(computed)
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityPointsSummary {
    pub total_earned: i32,
    pub spent: i32,
    pub available: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct EligibilityCheck {
    pub eligible: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PrestigePathEligibility {
    pub path_id: String,
    pub eligible: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LevelUpHpGainResult {
    pub hp_gain: i32,
    pub base_hp: i32,
    pub con_bonus: i32,
    pub new_half_hp_pending: bool,
    pub details: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LevelUpContext {
    pub capability_points: CapabilityPointsSummary,
    pub accessible_path_ids: Vec<String>,
    pub prestige_paths: Vec<PrestigePathEligibility>,
    pub mastered_profile_ids: Vec<String>,
    pub non_racial_active_paths_count: u32,
    pub hybrid_eligibility: EligibilityCheck,
}

pub fn calculate_capability_points(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> CapabilityPointsSummary {
    let level = i32::from(record.level.max(1));
    let level_up_points = (level - 1) * 2;

    let mut points_spent = 0;
    for acq in &record.acquired_abilities {
        points_spent += if acq.rank <= 2 { 1 } else { 2 };
    }

    let has_domain_r1 = record.acquired_abilities.iter().any(|a| {
        a.rank == 1
            && (a.path_id == "voie-du-mage"
                || rules
                    .paths
                    .get(&a.path_id)
                    .and_then(|p| p.path_type.as_deref())
                    == Some("domain"))
    });
    let has_racial_r1 = record.acquired_abilities.iter().any(|a| {
        a.rank == 1
            && rules
                .paths
                .get(&a.path_id)
                .and_then(|p| p.path_type.as_deref())
                == Some("racial")
    });

    let mage_bonus = if has_mage_creation_bonus(record, rules) {
        1
    } else {
        0
    };
    let base_free_points = (if has_domain_r1 && has_racial_r1 { 4 } else { 3 }) + mage_bonus;
    let net_spent = (points_spent - base_free_points).max(0);
    let available = level_up_points - net_spent;

    CapabilityPointsSummary {
        total_earned: level_up_points,
        spent: net_spent,
        available,
    }
}

pub fn is_prestige_path(path_id: &str, rules: &RulesDatabase) -> bool {
    rules
        .paths
        .get(path_id)
        .and_then(|p| p.path_type.as_deref())
        == Some("prestige")
}

pub fn get_rank_point_cost(rank: u8) -> i32 {
    if rank <= 2 {
        1
    } else {
        2
    }
}

pub fn get_rank_level_requirement(is_prestige: bool, rank: u8, path_id: Option<&str>) -> u8 {
    if is_prestige {
        if path_id == Some("voie-du-familier-fantastique") {
            return match rank {
                3 => 3,
                4 => 5,
                5 => 7,
                6 => 9,
                7 => 11,
                _ => 3,
            };
        }
        return match rank {
            3 => 3,
            4 => 5,
            5 => 7,
            6 => 9,
            7 => 11,
            8 => 13,
            _ => 5,
        };
    }
    match rank {
        1 | 2 => 1,
        3 => 3,
        4 => 5,
        5 => 7,
        _ => 1,
    }
}

fn family_label(f: &ProfileFamily) -> &'static str {
    match f {
        ProfileFamily::Aventuriers => "Aventuriers",
        ProfileFamily::Combattants => "Combattants",
        ProfileFamily::Mages => "Mages",
        ProfileFamily::Mystiques => "Mystiques",
    }
}

pub fn check_prestige_path_prerequisites(
    record: &CharacterRecord,
    path_id: &str,
    target_level: u8,
    current_acquired: &[AcquiredAbility],
    rules: &RulesDatabase,
) -> EligibilityCheck {
    let Some(path) = rules.paths.get(path_id) else {
        return EligibilityCheck {
            eligible: false,
            reason: Some("Cette voie n'est pas une voie de prestige.".to_string()),
        };
    };
    if path.path_type.as_deref() != Some("prestige") {
        return EligibilityCheck {
            eligible: false,
            reason: Some("Cette voie n'est pas une voie de prestige.".to_string()),
        };
    }

    if let Some(existing_prestige) = record
        .selected_path_ids
        .iter()
        .filter_map(|id| rules.paths.get(id))
        .find(|p| p.path_type.as_deref() == Some("prestige") && p.id != path_id)
    {
        return EligibilityCheck {
            eligible: false,
            reason: Some(format!(
                "Vous possédez déjà une voie de prestige ({}). Un héros ne peut choisir qu'une seule voie de prestige dans sa carrière.",
                existing_prestige.name
            )),
        };
    }

    let prereq = path.prerequisites.as_ref();
    let min_level = prereq.and_then(|p| p.min_level).unwrap_or(
        if path_id == "voie-du-familier-fantastique" {
            3
        } else {
            5
        },
    );
    if target_level < min_level {
        return EligibilityCheck {
            eligible: false,
            reason: Some(format!(
                "Niveau {min_level} requis (votre niveau actuel ou cible est {target_level})."
            )),
        };
    }

    let profile = rules.profiles.get(&record.profile_id);
    let effective_family = if record.profile_id == "psionique" {
        record
            .profile_family
            .clone()
            .or_else(|| profile.map(|p| p.family.clone()))
            .unwrap_or(ProfileFamily::Combattants)
    } else {
        profile
            .map(|p| p.family.clone())
            .unwrap_or(ProfileFamily::Combattants)
    };

    if let Some(allowed_rule) = prereq.and_then(|p| p.allowed_families.as_ref()) {
        if let crate::rules::AllowedFamiliesRule::List(allowed_families) = allowed_rule {
            if !allowed_families.is_empty() && !allowed_families.contains(&effective_family) {
                let names: Vec<&str> = allowed_families.iter().map(family_label).collect();
                return EligibilityCheck {
                    eligible: false,
                    reason: Some(format!(
                        "Réservé à la famille {} (vous êtes {}).",
                        names.join(" / "),
                        family_label(&effective_family)
                    )),
                };
            }
        }
    } else {
        if path_id == "voie-de-l-entite" && effective_family != ProfileFamily::Mages {
            return EligibilityCheck {
                eligible: false,
                reason: Some("Réservé aux membres de la famille des Mages.".to_string()),
            };
        }
        if path_id != "voie-des-mutations" {
            if let Some(ref restriction) = path.family_restriction {
                if restriction != "All" && restriction != family_label(&effective_family) {
                    return EligibilityCheck {
                        eligible: false,
                        reason: Some(format!(
                            "Réservé à la famille {} (vous êtes {}).",
                            restriction,
                            family_label(&effective_family)
                        )),
                    };
                }
            }
        }
    }

    if let Some(min_req) = prereq.and_then(|p| p.min_profile_paths_at_rank.as_ref()) {
        let profile_paths = profile.map(|p| p.paths.as_slice()).unwrap_or(&[]);
        let matching_count = profile_paths
            .iter()
            .filter(|pid| {
                current_acquired
                    .iter()
                    .any(|a| &a.path_id == *pid && a.rank >= min_req.rank)
            })
            .count();

        if matching_count < min_req.count {
            let reason = if min_req.count == 1 {
                format!(
                    "Prérequis : avoir acquis au moins le rang {} dans une voie de votre profil principal.",
                    min_req.rank
                )
            } else {
                format!(
                    "Prérequis : avoir acquis au moins le rang {} dans {} voies de votre profil principal ({}/{} actuellement).",
                    min_req.rank, min_req.count, matching_count, min_req.count
                )
            };
            return EligibilityCheck {
                eligible: false,
                reason: Some(reason),
            };
        }
    }

    EligibilityCheck {
        eligible: true,
        reason: None,
    }
}

pub fn get_eligible_prestige_paths(
    record: &CharacterRecord,
    target_level: u8,
    current_acquired: &[AcquiredAbility],
    rules: &RulesDatabase,
) -> Vec<PrestigePathEligibility> {
    rules
        .paths_order
        .iter()
        .filter_map(|id| rules.paths.get(id))
        .filter(|p| p.path_type.as_deref() == Some("prestige"))
        .map(|p| {
            let check = check_prestige_path_prerequisites(
                record,
                &p.id,
                target_level,
                current_acquired,
                rules,
            );
            PrestigePathEligibility {
                path_id: p.id.clone(),
                eligible: check.eligible,
                reason: check.reason,
            }
        })
        .collect()
}

pub fn get_accessible_path_ids_for_level_up(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> Vec<String> {
    let profile = rules.profiles.get(&record.profile_id);
    let mut ordered_ids: Vec<String> = profile.map(|p| p.paths.clone()).unwrap_or_default();

    for id in &record.selected_path_ids {
        if !ordered_ids.contains(id) {
            ordered_ids.push(id.clone());
        }
    }

    if let Some(p) = profile {
        if !p.optional_paths.is_empty() {
            let pool = get_profile_all_pool_path_ids(p);
            let invested_count = pool
                .iter()
                .filter(|pid| {
                    record.acquired_abilities.iter().any(|a| &a.path_id == *pid)
                        || record.selected_path_ids.contains(pid)
                })
                .count();
            if invested_count < p.paths.len() {
                for id in &p.optional_paths {
                    if !ordered_ids.contains(id) {
                        ordered_ids.push(id.clone());
                    }
                }
            }
        }
    }

    ordered_ids
        .into_iter()
        .filter(|id| rules.paths.contains_key(id))
        .collect()
}

pub fn get_character_mastered_profile_ids(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut ids = Vec::new();

    if !record.profile_id.is_empty() && seen.insert(record.profile_id.clone()) {
        ids.push(record.profile_id.clone());
    }
    if let Some(ref sec) = record.secondary_profile_id {
        if !sec.is_empty() && seen.insert(sec.clone()) {
            ids.push(sec.clone());
        }
    }

    for pid in &rules.profiles_order {
        if let Some(p) = rules.profiles.get(pid) {
            let ranks_in_profile = record
                .acquired_abilities
                .iter()
                .filter(|a| p.paths.contains(&a.path_id))
                .count();
            if ranks_in_profile >= 2 && seen.insert(p.id.clone()) {
                ids.push(p.id.clone());
            }
        }
    }

    ids
}

pub fn is_racial_or_replacement_path(
    path_id: &str,
    people_id: &str,
    rules: &RulesDatabase,
) -> bool {
    let Some(pth) = rules.paths.get(path_id) else {
        return false;
    };
    let p_type = pth.path_type.as_deref();
    p_type == Some("racial")
        || p_type == Some("domain")
        || path_id == "voie-du-mage"
        || path_id == get_racial_path_id(people_id, rules)
}

pub fn get_non_racial_active_paths_count(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> u32 {
    let active: HashSet<&str> = record
        .acquired_abilities
        .iter()
        .map(|a| a.path_id.as_str())
        .filter(|pid| !is_racial_or_replacement_path(pid, &record.people_id, rules))
        .collect();
    active.len() as u32
}

pub fn can_character_adopt_hybrid_path(
    record: &CharacterRecord,
    candidate_path_id: Option<&str>,
    rules: &RulesDatabase,
) -> EligibilityCheck {
    let Some(profile) = rules.profiles.get(&record.profile_id) else {
        return EligibilityCheck {
            eligible: true,
            reason: None,
        };
    };

    let pool = get_profile_all_pool_path_ids(profile);
    let profile_paths_invested = pool
        .iter()
        .filter(|pid| record.acquired_abilities.iter().any(|a| &a.path_id == *pid))
        .count();

    if profile_paths_invested >= profile.paths.len() {
        return EligibilityCheck {
            eligible: false,
            reason: Some(
                "Vous avez déjà acquis des capacités dans les 5 voies de votre profil principal. L'hybridation n'est plus permise (Règles COF2, chap. 9)."
                    .to_string(),
            ),
        };
    }

    let current_non_racial_count = get_non_racial_active_paths_count(record, rules);
    let is_new_path = candidate_path_id
        .map(|cid| !record.acquired_abilities.iter().any(|a| a.path_id == cid))
        .unwrap_or(true);

    if is_new_path && current_non_racial_count >= 6 {
        return EligibilityCheck {
            eligible: false,
            reason: Some(
                "Plafond atteint : un personnage ne peut jamais posséder plus de 6 voies au total, plus la voie de peuple (Règles COF2, p. 622)."
                    .to_string(),
            ),
        };
    }

    EligibilityCheck {
        eligible: true,
        reason: None,
    }
}

pub fn calculate_level_up_hp_gain(
    record: &CharacterRecord,
    newly_acquired_ranks: &[AcquiredAbility],
    pending_half_hp: bool,
    rules: &RulesDatabase,
) -> Result<LevelUpHpGainResult, RuleError> {
    let profile = rules
        .profiles
        .get(&record.profile_id)
        .or_else(|| {
            rules
                .default_profile_id()
                .and_then(|id| rules.profiles.get(id))
        })
        .ok_or_else(|| RuleError::ProfileNotFound(record.profile_id.clone()))?;

    let computed = RulesEngine::compute_sheet(record, rules)?;
    let con_bonus = computed.final_stats.get(StatCode::CON);

    let get_path_hp = |path_id: &str| -> (i32, &'static str) {
        if is_racial_or_replacement_path(path_id, &record.people_id, rules) {
            return (profile.hp_per_level, family_label(&profile.family));
        }
        if let Some(owning) = rules
            .profiles
            .values()
            .find(|p| p.paths.iter().any(|pid| pid == path_id))
        {
            return (owning.hp_per_level, family_label(&owning.family));
        }
        (profile.hp_per_level, family_label(&profile.family))
    };

    if newly_acquired_ranks.is_empty() {
        return Ok(LevelUpHpGainResult {
            hp_gain: profile.hp_per_level + con_bonus,
            base_hp: profile.hp_per_level,
            con_bonus,
            new_half_hp_pending: pending_half_hp,
            details: format!(
                "{} base ({}) + {} CON",
                profile.hp_per_level,
                family_label(&profile.family),
                con_bonus
            ),
        });
    }

    let hp_infos: Vec<(i32, &'static str)> = newly_acquired_ranks
        .iter()
        .map(|r| get_path_hp(&r.path_id))
        .collect();
    let mut unique_families: Vec<&'static str> = Vec::new();
    for (_, fam) in &hp_infos {
        if !unique_families.contains(fam) {
            unique_families.push(*fam);
        }
    }

    if unique_families.len() <= 1 {
        let base_hp = hp_infos[0].0;
        return Ok(LevelUpHpGainResult {
            hp_gain: base_hp + con_bonus,
            base_hp,
            con_bonus,
            new_half_hp_pending: pending_half_hp,
            details: format!("{} base ({}) + {} CON", base_hp, unique_families[0], con_bonus),
        });
    }

    let total_hp: i32 = hp_infos.iter().map(|(hp, _)| *hp).sum();
    let count = hp_infos.len() as i32;
    let has_half_point = (total_hp * 2 / count) % 2 != 0 && (total_hp % count) * 2 == count;
    let floor_avg = total_hp / count;
    let ceil_avg = (total_hp + count - 1) / count;

    let (base_hp, new_half_hp_pending) = if has_half_point {
        if pending_half_hp {
            (ceil_avg, false)
        } else {
            (floor_avg, true)
        }
    } else {
        (floor_avg, pending_half_hp)
    };

    let half_note = if has_half_point {
        if pending_half_hp {
            " + ½ PV récupéré"
        } else {
            " - ½ PV reporté"
        }
    } else {
        ""
    };
    let details = format!(
        "{base_hp} base (moyenne {}{half_note}) + {con_bonus} CON",
        unique_families.join("/")
    );

    Ok(LevelUpHpGainResult {
        hp_gain: base_hp + con_bonus,
        base_hp,
        con_bonus,
        new_half_hp_pending,
        details,
    })
}

pub fn calculate_armor_spell_mana_cost(
    record: &CharacterRecord,
    path_id: &str,
    rank: u8,
    rules: &RulesDatabase,
) -> i32 {
    let Some(pth) = rules.paths.get(path_id) else {
        return 0;
    };
    let is_spell = pth
        .ranks
        .iter()
        .find(|r| r.rank == rank)
        .map(|r| r.is_spell)
        .unwrap_or(false);
    if !is_spell {
        return 0;
    }

    let Some(ref armor_id) = record.equipped_armor_id else {
        return 0;
    };
    let Some(armor) = rules.armors.get(armor_id) else {
        return 0;
    };
    if armor.def <= 0 {
        return 0;
    }
    if pth.path_type.as_deref() == Some("domain") {
        return 0;
    }

    let owning_profile = rules
        .profiles
        .values()
        .find(|p| p.paths.iter().any(|pid| pid == path_id));

    if let Some(er) = owning_profile.and_then(|p| p.equipment_rules.as_ref()) {
        match er.max_spellcasting_armor_def {
            None => return 0,
            Some(max_def) => return (armor.def - max_def).max(0),
        }
    }

    armor.def
}

/// Calcule les surcoûts en PM liés à l'armure pour les sorts des voies du personnage.
pub fn compute_armor_spell_costs(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> HashMap<String, i32> {
    let mut path_ids: HashSet<&str> = record
        .selected_path_ids
        .iter()
        .map(String::as_str)
        .collect();
    for acq in &record.acquired_abilities {
        path_ids.insert(acq.path_id.as_str());
    }

    let mut costs = HashMap::new();
    for path_id in path_ids {
        let Some(pth) = rules.paths.get(path_id) else {
            continue;
        };
        for r in &pth.ranks {
            if r.is_spell {
                let cost = calculate_armor_spell_mana_cost(record, path_id, r.rank, rules);
                if cost > 0 {
                    costs.insert(format!("{path_id}_{}", r.rank), cost);
                }
            }
        }
    }
    costs
}

pub fn get_level_up_context(
    record: &CharacterRecord,
    target_level: u8,
    rules: &RulesDatabase,
) -> LevelUpContext {
    LevelUpContext {
        capability_points: calculate_capability_points(record, rules),
        accessible_path_ids: get_accessible_path_ids_for_level_up(record, rules),
        prestige_paths: get_eligible_prestige_paths(
            record,
            target_level,
            &record.acquired_abilities,
            rules,
        ),
        mastered_profile_ids: get_character_mastered_profile_ids(record, rules),
        non_racial_active_paths_count: get_non_racial_active_paths_count(record, rules),
        hybrid_eligibility: can_character_adopt_hybrid_path(record, None, rules),
    }
}
