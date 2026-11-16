use crate::models::{AcquiredAbility, CharacterRecord};
use crate::rules::{AllowedProfilesRule, ExternalAbilityGrantRuleStatic, RulesDatabase};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedExternalGrant {
    pub source_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ability: Option<AcquiredAbility>,
    pub available_options: Vec<AcquiredAbility>,
    pub is_auto_granted: bool,
}

fn ability_key(path_id: &str, rank: u8) -> (String, u8) {
    (path_id.to_string(), rank)
}

fn rank_choice_key(path_id: &str, rank: u8) -> String {
    format!("{path_id}_{rank}")
}

fn list_replacement_options(
    rule: &ExternalAbilityGrantRuleStatic,
    owned: &HashSet<(String, u8)>,
    rules: &RulesDatabase,
) -> Vec<(String, u8)> {
    let mut candidates: Vec<(String, u8)> = Vec::new();

    if let Some(ref explicit) = rule.replacement_abilities {
        for c in explicit {
            candidates.push((c.path_id.clone(), c.rank));
        }
    } else {
        let mut path_ids: HashSet<String> = HashSet::new();
        match &rule.allowed_profiles {
            AllowedProfilesRule::Keyword(kw) if kw == "any" => {
                for p in rules.profiles.values() {
                    path_ids.extend(p.paths.iter().cloned());
                }
            }
            AllowedProfilesRule::List(list) => {
                for pid in list {
                    if let Some(p) = rules.profiles.get(pid) {
                        path_ids.extend(p.paths.iter().cloned());
                    }
                }
            }
            _ => {}
        }

        for pid in path_ids {
            if let Some(path) = rules.paths.get(&pid) {
                for r in &path.ranks {
                    if r.rank <= rule.max_rank {
                        candidates.push((pid.clone(), r.rank));
                    }
                }
            }
        }
    }

    candidates
        .into_iter()
        .filter(|(pid, r)| rules.paths.contains_key(pid) && !owned.contains(&(pid.clone(), *r)))
        .collect()
}

/// Résout les capacités effectives (acquises + empruntées via `grantExternalAbility`).
pub(crate) fn resolve_effective_abilities(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> Vec<AcquiredAbility> {
    let mut effective = record.acquired_abilities.clone();
    let mut owned: HashSet<(String, u8)> = record
        .acquired_abilities
        .iter()
        .map(|a| ability_key(&a.path_id, a.rank))
        .collect();

    for acq in &record.acquired_abilities {
        let grant_rule = rules
            .paths
            .get(&acq.path_id)
            .and_then(|p| p.ranks.iter().find(|r| r.rank == acq.rank))
            .and_then(|r| r.modifiers.as_ref())
            .and_then(|m| m.grant_external_ability.as_ref());

        let Some(rule) = grant_rule else {
            continue;
        };

        let source_key = rank_choice_key(&acq.path_id, acq.rank);
        let choice = record.external_ability_choices.get(&source_key);

        if let Some(ref def) = rule.default_ability {
            let def_key = ability_key(&def.path_id, def.rank);
            if !owned.contains(&def_key) {
                owned.insert(def_key);
                effective.push(AcquiredAbility {
                    path_id: def.path_id.clone(),
                    rank: def.rank,
                });
            } else if let Some(chosen) = choice {
                let options = list_replacement_options(rule, &owned, rules);
                let chosen_key = ability_key(&chosen.path_id, chosen.rank);
                if options.contains(&chosen_key) {
                    owned.insert(chosen_key);
                    effective.push(chosen.clone());
                }
            }
        } else if let Some(chosen) = choice {
            if !chosen.path_id.is_empty() && chosen.rank > 0 {
                let chosen_key = ability_key(&chosen.path_id, chosen.rank);
                owned.insert(chosen_key);
                effective.push(chosen.clone());
            }
        }
    }

    effective
}

/// Résout les dons externes détaillés (source, capacité effective, options disponibles).
pub fn resolve_external_grants(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> Vec<ResolvedExternalGrant> {
    let mut owned: HashSet<(String, u8)> = record
        .acquired_abilities
        .iter()
        .map(|a| ability_key(&a.path_id, a.rank))
        .collect();
    let mut grants = Vec::new();

    for acq in &record.acquired_abilities {
        let grant_rule = rules
            .paths
            .get(&acq.path_id)
            .and_then(|p| p.ranks.iter().find(|r| r.rank == acq.rank))
            .and_then(|r| r.modifiers.as_ref())
            .and_then(|m| m.grant_external_ability.as_ref());

        let Some(rule) = grant_rule else {
            continue;
        };

        let source_key = rank_choice_key(&acq.path_id, acq.rank);
        let choice = record.external_ability_choices.get(&source_key);

        if let Some(ref def) = rule.default_ability {
            let def_key = ability_key(&def.path_id, def.rank);
            if !owned.contains(&def_key) {
                owned.insert(def_key);
                grants.push(ResolvedExternalGrant {
                    source_key,
                    ability: Some(AcquiredAbility {
                        path_id: def.path_id.clone(),
                        rank: def.rank,
                    }),
                    available_options: Vec::new(),
                    is_auto_granted: true,
                });
                continue;
            }
        }

        let options: Vec<AcquiredAbility> = list_replacement_options(rule, &owned, rules)
            .into_iter()
            .map(|(path_id, rank)| AcquiredAbility { path_id, rank })
            .collect();

        let selected = choice.and_then(|c| {
            options
                .iter()
                .find(|o| o.path_id == c.path_id && o.rank == c.rank)
                .cloned()
        });
        if let Some(ref sel) = selected {
            owned.insert(ability_key(&sel.path_id, sel.rank));
        }

        grants.push(ResolvedExternalGrant {
            source_key,
            ability: selected,
            available_options: options,
            is_auto_granted: false,
        });
    }

    grants
}
