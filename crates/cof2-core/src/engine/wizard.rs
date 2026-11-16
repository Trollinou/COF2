use crate::engine::creation::evaluate_point_buy_stats;
use crate::engine::diversity::{has_human_diversity_rank1, is_human_diversity_valid};
use crate::engine::grants::resolve_external_grants;
use crate::engine::paths::{
    get_mage_creation_rank2_ability, get_profile_all_pool_path_ids, has_mage_creation_bonus,
    is_domain_path,
};
use crate::engine::stats::{parse_stat, ALL_STAT_CODES};
use crate::engine::RulesEngine;
use crate::models::CharacterRecord;
use crate::rules::RulesDatabase;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StepValidationResult {
    pub valid: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WizardValidationState {
    pub step_result: StepValidationResult,
    pub max_unlocked_step: u8,
}

fn ok_step() -> StepValidationResult {
    StepValidationResult {
        valid: true,
        reason: None,
    }
}

fn err_step(reason: impl Into<String>) -> StepValidationResult {
    StepValidationResult {
        valid: false,
        reason: Some(reason.into()),
    }
}

pub fn validate_wizard_step(
    step: u8,
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> StepValidationResult {
    match step {
        1 => {
            let Some(people) = rules.peoples.get(&record.people_id) else {
                return err_step("Veuillez sélectionner un peuple pour continuer.");
            };

            if let Some(ref choices) = people.stat_choices {
                for (i, choice) in choices.iter().enumerate() {
                    let chosen = record.racial_stat_choices.get(i).copied();
                    let is_any = choice.options.iter().any(|o| o == "ANY_LOWEST");
                    let is_valid = match chosen {
                        Some(st) if is_any => ALL_STAT_CODES.contains(&st),
                        Some(st) => choice
                            .options
                            .iter()
                            .filter_map(|o| parse_stat(o).ok())
                            .any(|opt| opt == st),
                        None => false,
                    };
                    if !is_valid {
                        return err_step(
                            "Veuillez choisir tous les modificateurs de caractéristiques de votre peuple.",
                        );
                    }
                }
            }

            if let Some(ref selectable) = people.selectable_racial_paths {
                if !selectable.is_empty()
                    && !selectable
                        .iter()
                        .any(|pid| record.selected_path_ids.contains(pid))
                {
                    return err_step(format!(
                        "Veuillez choisir l'héritage culturel de votre {}.",
                        people.name
                    ));
                }
            }

            ok_step()
        }
        2 => {
            let Some(profile) = rules.profiles.get(&record.profile_id) else {
                return err_step("Veuillez sélectionner un profil pour continuer.");
            };

            if profile.is_family_selectable && record.profile_family.is_none() {
                return err_step(format!(
                    "Veuillez choisir une famille pour le profil {}.",
                    profile.name
                ));
            }

            if record.is_hybrid.unwrap_or(false) {
                let sec_ok = record
                    .secondary_profile_id
                    .as_deref()
                    .and_then(|id| rules.profiles.get(id))
                    .map(|sp| sp.id != profile.id)
                    .unwrap_or(false);
                if !sec_ok {
                    return err_step(
                        "Veuillez choisir un profil secondaire différent du profil principal.",
                    );
                }
            }

            ok_step()
        }
        3 => {
            let raw_preset = match record.stat_array_preset.as_deref() {
                Some("libre") => Some("achat"),
                other => other,
            };
            let Some(preset) = raw_preset.filter(|s| !s.is_empty()) else {
                return err_step(
                    "Veuillez choisir une méthode d'attribution des caractéristiques.",
                );
            };

            if preset == "achat" {
                let pb = evaluate_point_buy_stats(&record.base_stats);
                if !pb.is_valid || pb.remaining != 0 {
                    let msg = if pb.remaining > 0 {
                        format!(
                            "Il reste {} point(s) de caractéristique à répartir.",
                            pb.remaining
                        )
                    } else {
                        "La répartition par achat dépasse les limites autorisées.".to_string()
                    };
                    return err_step(msg);
                }
                return ok_step();
            }

            let Some(arr) = rules.characteristic_arrays.iter().find(|a| a.id == preset) else {
                return err_step(
                    "Veuillez choisir une méthode d'attribution des caractéristiques.",
                );
            };

            let mut current_sorted: Vec<i32> = ALL_STAT_CODES
                .iter()
                .map(|code| *record.base_stats.get(code).unwrap_or(&0))
                .collect();
            current_sorted.sort_by(|a, b| b.cmp(a));
            let mut target_sorted = arr.values.clone();
            target_sorted.sort_by(|a, b| b.cmp(a));

            if current_sorted != target_sorted {
                return err_step("Veuillez répartir toutes les valeurs de la série sélectionnée.");
            }

            ok_step()
        }
        4 => {
            let Some(profile) = rules.profiles.get(&record.profile_id) else {
                return err_step(
                    "Veuillez sélectionner un profil avant de choisir vos voies.",
                );
            };
            let sec_profile = if record.is_hybrid.unwrap_or(false) {
                record
                    .secondary_profile_id
                    .as_deref()
                    .and_then(|id| rules.profiles.get(id))
            } else {
                None
            };

            let mut all_profile_paths = get_profile_all_pool_path_ids(profile);
            if let Some(sp) = sec_profile {
                all_profile_paths.extend(get_profile_all_pool_path_ids(sp));
            }

            let selected_profile_count = record
                .selected_path_ids
                .iter()
                .filter(|id| all_profile_paths.contains(id))
                .count();
            if selected_profile_count < 2 {
                return err_step("Veuillez choisir 2 voies de profil pour continuer.");
            }

            let Some(third_path) = record
                .selected_path_ids
                .iter()
                .find(|id| !all_profile_paths.contains(id))
            else {
                return err_step(
                    "Veuillez choisir votre 3e voie (Peuple, Domaine ou Voie du Mage).",
                );
            };

            if is_domain_path(third_path, rules)
                && record
                    .deity
                    .as_deref()
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .is_none()
            {
                return err_step("Veuillez choisir votre divinité pour la voie de Domaine.");
            }

            if has_mage_creation_bonus(record, rules)
                && get_mage_creation_rank2_ability(record, rules).is_none()
            {
                return err_step(
                    "Veuillez choisir votre capacité de rang 2 bonus (Famille des Mages).",
                );
            }

            let external_grants = resolve_external_grants(record, rules);
            for acq in &record.acquired_abilities {
                let Some(rank_obj) = rules
                    .paths
                    .get(&acq.path_id)
                    .and_then(|p| p.ranks.iter().find(|r| r.rank == acq.rank))
                else {
                    continue;
                };

                if let Some(ref mods) = rank_obj.modifiers {
                    if let Some(ref choice_opts) = mods.choice_options {
                        if !choice_opts.is_empty() {
                            let choice_key = format!("{}_{}", acq.path_id, acq.rank);
                            let chosen = record.path_rank_choices.get(&choice_key);
                            let valid_opt = chosen
                                .map(|c| choice_opts.iter().any(|o| &o.id == c))
                                .unwrap_or(false);
                            if !valid_opt {
                                return err_step(format!(
                                    "Veuillez sélectionner l'option du rang {} ({}).",
                                    acq.rank, rank_obj.title
                                ));
                            }
                        }
                    }

                    if mods.grant_external_ability.is_some() {
                        let source_key = format!("{}_{}", acq.path_id, acq.rank);
                        let resolved = external_grants.iter().find(|g| g.source_key == source_key);
                        if resolved.and_then(|g| g.ability.as_ref()).is_none() {
                            return err_step(format!(
                                "Veuillez sélectionner la capacité accordée par {}.",
                                rank_obj.title
                            ));
                        }
                    }
                }
            }

            if has_human_diversity_rank1(record)
                && !is_human_diversity_valid(record.human_diversity.as_ref())
            {
                return err_step(
                    "Veuillez choisir l'origine (et, si remplacé, le gagne-pain) pour la capacité Diversité.",
                );
            }

            ok_step()
        }
        5 => ok_step(),
        6 => {
            if record.name.trim().is_empty() {
                return err_step("Veuillez saisir le nom du personnage.");
            }
            if record.player_name.trim().is_empty() {
                return err_step("Veuillez saisir le nom du joueur.");
            }
            if record.sex.trim().is_empty() {
                return err_step("Veuillez sélectionner le sexe / genre du personnage.");
            }
            if record.height.trim().is_empty() {
                return err_step("Veuillez saisir la taille du personnage.");
            }
            if record.weight.trim().is_empty() {
                return err_step("Veuillez saisir le poids du personnage.");
            }

            if let Ok(computed) = RulesEngine::compute_sheet(record, rules) {
                let remaining = computed.languages_info.bonus_language_slots
                    - computed.languages_info.used_bonus_slots;
                if remaining > 0 {
                    return err_step(format!(
                        "Il reste {remaining} point(s) de langue / talent bonus à répartir."
                    ));
                }
                if remaining < 0 {
                    return err_step(
                        "Vous avez utilisé plus de points de langues / talents que votre maximum autorisé.",
                    );
                }
            }

            ok_step()
        }
        _ => ok_step(),
    }
}

pub fn get_max_unlocked_wizard_step(record: &CharacterRecord, rules: &RulesDatabase) -> u8 {
    for step in 1..=7u8 {
        if step == 7 {
            return 7;
        }
        if !validate_wizard_step(step, record, rules).valid {
            return step;
        }
    }
    7
}

pub fn validate_wizard_state(
    record: &CharacterRecord,
    step: u8,
    rules: &RulesDatabase,
) -> WizardValidationState {
    WizardValidationState {
        step_result: validate_wizard_step(step, record, rules),
        max_unlocked_step: get_max_unlocked_wizard_step(record, rules),
    }
}
