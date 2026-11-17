use crate::engine::bonuses::CollectedBonus;
use crate::models::{AcquiredAbility, CharacterRecord, StatBlock, StatCode, WeaponModifierRule};
use crate::rules::{PeopleStatic, RankModifiersStatic, RulesDatabase, StatSubstitutionRuleStatic};
use std::collections::HashMap;

pub(crate) const ALL_STAT_CODES: [StatCode; 7] = [
    StatCode::FOR,
    StatCode::AGI,
    StatCode::CON,
    StatCode::PER,
    StatCode::INT,
    StatCode::VOL,
    StatCode::CHA,
];

#[derive(Debug, Clone)]
pub(crate) struct CollectedSubstitution {
    pub path_id: String,
    pub rank: u8,
    pub rule: StatSubstitutionRuleStatic,
}

pub(crate) struct StatDecomposition {
    pub base_stats: StatBlock,
    pub racial_bonus_stats: StatBlock,
    pub path_bonus_stats: StatBlock,
    pub manual_bonus_stats: StatBlock,
    pub other_bonus_stats: StatBlock,
    pub final_stats: StatBlock,
    pub collected_bonuses: Vec<CollectedBonus>,
    pub stat_substitutions: Vec<CollectedSubstitution>,
    pub active_weapon_modifiers: Vec<WeaponModifierRule>,
    pub luck_stat_replacement: Option<StatCode>,
    pub mana_stat_replacement: Option<StatCode>,
    pub path_situational_notes: Vec<String>,
}

pub(crate) fn empty_stat_map() -> StatBlock {
    StatBlock::default()
}

pub(crate) fn parse_stat(s: &str) -> Result<StatCode, ()> {
    match s {
        "FOR" => Ok(StatCode::FOR),
        "AGI" => Ok(StatCode::AGI),
        "CON" => Ok(StatCode::CON),
        "PER" => Ok(StatCode::PER),
        "INT" => Ok(StatCode::INT),
        "VOL" => Ok(StatCode::VOL),
        "CHA" => Ok(StatCode::CHA),
        _ => Err(()),
    }
}

/// Collecte récursivement les modificateurs de rang (stats, bonus évolutifs, substitutions, notes).
#[allow(clippy::too_many_arguments)]
fn collect_modifiers_from_block(
    modifiers: &RankModifiersStatic,
    path_id: &str,
    rank: u8,
    path_rank_choices: &HashMap<String, String>,
    path_bonus_stats: &mut StatBlock,
    collected_bonuses: &mut Vec<CollectedBonus>,
    stat_substitutions: &mut Vec<CollectedSubstitution>,
    active_weapon_modifiers: &mut Vec<WeaponModifierRule>,
    luck_stat_replacement: &mut Option<StatCode>,
    mana_stat_replacement: &mut Option<StatCode>,
    path_situational_notes: &mut Vec<String>,
) {
    if let Some(ref choice_options) = modifiers.choice_options {
        if !choice_options.is_empty() {
            let choice_key = format!("{path_id}_{rank}");
            if let Some(opt) = path_rank_choices
                .get(&choice_key)
                .and_then(|chosen_id| choice_options.iter().find(|o| &o.id == chosen_id))
            {
                if let Some(ref opt_mods) = opt.modifiers {
                    collect_modifiers_from_block(
                        opt_mods,
                        path_id,
                        rank,
                        path_rank_choices,
                        path_bonus_stats,
                        collected_bonuses,
                        stat_substitutions,
                        active_weapon_modifiers,
                        luck_stat_replacement,
                        mana_stat_replacement,
                        path_situational_notes,
                    );
                }
            }
        }
    }

    if let Some(ref stats) = modifiers.stats {
        for (stat, val) in stats {
            path_bonus_stats.add(*stat, *val);
        }
    }

    if let Some(ref bonuses) = modifiers.bonuses {
        for b in bonuses {
            collected_bonuses.push(CollectedBonus {
                path_id: path_id.to_string(),
                rank,
                bonus: b.clone(),
            });
        }
    }

    if let Some(ref subs) = modifiers.stat_substitutions {
        for s in subs {
            stat_substitutions.push(CollectedSubstitution {
                path_id: path_id.to_string(),
                rank,
                rule: s.clone(),
            });
        }
    }

    if let Some(ref wms) = modifiers.weapon_modifiers {
        active_weapon_modifiers.extend(wms.iter().cloned());
    }

    if let Some(rep) = modifiers.luck_stat_replacement {
        *luck_stat_replacement = Some(rep);
    }
    if let Some(rep) = modifiers.mana_stat_replacement {
        *mana_stat_replacement = Some(rep);
    }

    if let Some(ref notes) = modifiers.situational_notes {
        for n in notes {
            if !path_situational_notes.contains(n) {
                path_situational_notes.push(n.clone());
            }
        }
    }
}

/// Calcule les modificateurs de caractéristiques raciaux d'un peuple selon les choix sélectionnés.
pub fn compute_racial_stat_modifiers(
    people_id: &str,
    racial_stat_choices: &[StatCode],
    fallback_modifiers: Option<&StatBlock>,
    rules: &RulesDatabase,
) -> StatBlock {
    let mut mods = empty_stat_map();
    let Some(people) = rules.peoples.get(people_id) else {
        if let Some(fb) = fallback_modifiers {
            mods = *fb;
        }
        return mods;
    };

    if let Some(ref racial_mods) = people.stats {
        for (stat, modif) in racial_mods {
            mods.add(*stat, *modif);
        }
    }
    if let Some(ref choices) = people.stat_choices {
        for (idx, choice) in choices.iter().enumerate() {
            if let Some(chosen_stat) = racial_stat_choices.get(idx) {
                mods.add(*chosen_stat, choice.value);
            } else if let Some(first_opt) = choice.options.first() {
                if let Ok(st) = parse_stat(first_opt) {
                    mods.add(st, choice.value);
                }
            }
        }
    }
    if ALL_STAT_CODES.iter().all(|&s| mods.get(s) == 0)
        && people.stats.is_none()
        && people.stat_choices.is_none()
    {
        if let Some(fb) = fallback_modifiers {
            mods = *fb;
        }
    }
    mods
}

/// Calcule la décomposition unitaire des 7 caractéristiques et collecte les modificateurs de Passe 1.
pub(crate) fn compute_stats(
    record: &CharacterRecord,
    _people: &PeopleStatic,
    effective_abilities: &[AcquiredAbility],
    rules: &RulesDatabase,
) -> StatDecomposition {
    let base_stats = record.base_stats;

    let racial_bonus_stats = compute_racial_stat_modifiers(
        &record.people_id,
        &record.racial_stat_choices,
        Some(&record.racial_stat_modifiers),
        rules,
    );

    let mut path_bonus_stats = empty_stat_map();
    let mut collected_bonuses = Vec::new();
    let mut stat_substitutions = Vec::new();
    let mut active_weapon_modifiers = Vec::new();
    let mut luck_stat_replacement = None;
    let mut mana_stat_replacement = None;
    let mut path_situational_notes = Vec::new();

    for acq in effective_abilities {
        if let Some(path) = rules.paths.get(&acq.path_id) {
            if let Some(rank_data) = path.ranks.iter().find(|r| r.rank == acq.rank) {
                if let Some(ref mods) = rank_data.modifiers {
                    collect_modifiers_from_block(
                        mods,
                        &acq.path_id,
                        acq.rank,
                        &record.path_rank_choices,
                        &mut path_bonus_stats,
                        &mut collected_bonuses,
                        &mut stat_substitutions,
                        &mut active_weapon_modifiers,
                        &mut luck_stat_replacement,
                        &mut mana_stat_replacement,
                        &mut path_situational_notes,
                    );
                }
            }
        }
    }

    let manual_bonus_stats = record.manual_stat_bonuses;

    let mut other_bonus_stats = empty_stat_map();
    let mut final_stats = empty_stat_map();
    for stat in ALL_STAT_CODES {
        let base = base_stats.get(stat);
        let racial = racial_bonus_stats.get(stat);
        let path = path_bonus_stats.get(stat);
        let manual = manual_bonus_stats.get(stat);
        let other = path + manual;
        other_bonus_stats.set(stat, other);
        final_stats.set(stat, base + racial + other);
    }

    StatDecomposition {
        base_stats,
        racial_bonus_stats,
        path_bonus_stats,
        manual_bonus_stats,
        other_bonus_stats,
        final_stats,
        collected_bonuses,
        stat_substitutions,
        active_weapon_modifiers,
        luck_stat_replacement,
        mana_stat_replacement,
        path_situational_notes,
    }
}
