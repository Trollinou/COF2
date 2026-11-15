use crate::engine::RulesEngine;
use crate::models::{CharacterRecord, ComputedCharacterSheet, LevelProgressionStep, StatCode};
use crate::rules::{RuleError, RulesDatabase};
use std::collections::HashMap;

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
        *record.manual_stat_bonuses.entry(*stat).or_insert(0) += bonus;
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

    // Déduction des bonus manuels et suppression des entrées à 0
    for (stat, bonus) in stat_bonuses_to_revert {
        if let Some(cur) = record.manual_stat_bonuses.get_mut(&stat) {
            *cur -= bonus;
            if *cur == 0 {
                record.manual_stat_bonuses.remove(&stat);
            }
        }
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
