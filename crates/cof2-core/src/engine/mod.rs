mod bonuses;
mod combat;
pub mod companion;
pub mod creation;
pub mod diversity;
pub mod equipment;
pub mod grants;
mod languages;
pub mod paths;
pub mod progression;
mod resources;
pub(crate) mod stats;
pub mod wizard;

use crate::models::{
    AttackBonuses, CharacterRecord, ComputedCharacterSheet, LevelProgressionStep, StatCode,
};
use crate::rules::{RuleError, RulesDatabase};
use std::collections::HashMap;

pub struct RulesEngine;

impl RulesEngine {
    /// Calcule la fiche complète de statistiques dérivées à partir d'un enregistrement.
    pub fn compute_sheet(
        record: &CharacterRecord,
        rules: &RulesDatabase,
    ) -> Result<ComputedCharacterSheet, RuleError> {
        if record.level < 1 || record.level > 20 {
            return Err(RuleError::InvalidLevel(record.level));
        }

        let profile = rules
            .profiles
            .get(&record.profile_id)
            .ok_or_else(|| RuleError::ProfileNotFound(record.profile_id.clone()))?;
        let people = rules
            .peoples
            .get(&record.people_id)
            .ok_or_else(|| RuleError::PeopleNotFound(record.people_id.clone()))?;

        let effective_abilities = grants::resolve_effective_abilities(record, rules);
        let stat_decomp = stats::compute_stats(record, people, &effective_abilities, rules);

        let armor = record
            .equipped_armor_id
            .as_ref()
            .and_then(|id| rules.armors.get(id));
        let shield = record
            .equipped_shield_id
            .as_ref()
            .and_then(|id| rules.armors.get(id));

        let mut non_stacking_best = HashMap::new();
        let mut evaluated_bonuses = bonuses::evaluate_bonuses(
            &stat_decomp.collected_bonuses,
            record.level as i32,
            armor,
            shield,
            &stat_decomp.final_stats,
            &effective_abilities,
            rules,
            &mut non_stacking_best,
        );

        let combat_summary = combat::compute_combat(
            record,
            people,
            &stat_decomp.final_stats,
            armor,
            shield,
            &mut evaluated_bonuses,
            &stat_decomp.stat_substitutions,
            &stat_decomp.path_situational_notes,
            &effective_abilities,
            rules,
            &mut non_stacking_best,
        );

        let res_summary = resources::compute_resources(
            record,
            profile,
            &stat_decomp.final_stats,
            &evaluated_bonuses,
            stat_decomp.luck_stat_replacement,
            stat_decomp.mana_stat_replacement,
            &effective_abilities,
            rules,
        );

        let stat_int = *stat_decomp.final_stats.get(&StatCode::INT).unwrap_or(&0);
        let languages_info = languages::compute_languages_info(record, people, stat_int);

        let mut updated_record = record.clone();
        updated_record.weapons = combat_summary.updated_weapons;

        let mut sheet = ComputedCharacterSheet {
            record: updated_record,
            base_stats: stat_decomp.base_stats,
            racial_bonus_stats: stat_decomp.racial_bonus_stats,
            path_bonus_stats: stat_decomp.path_bonus_stats,
            manual_bonus_stats: stat_decomp.manual_bonus_stats,
            other_bonus_stats: stat_decomp.other_bonus_stats,
            final_stats: stat_decomp.final_stats,
            bab: combat_summary.bab,
            defense: combat_summary.defense,
            defense_stat: combat_summary.defense_stat,
            defense_stat_source: combat_summary.defense_stat_source,
            effective_agi: combat_summary.effective_agi,
            armor_defense: combat_summary.armor_defense,
            shield_defense: combat_summary.shield_defense,
            initiative: combat_summary.initiative,
            max_hp: res_summary.max_hp,
            max_dr: res_summary.max_dr,
            dr_dice: res_summary.dr_dice,
            max_pc: res_summary.max_pc,
            max_pm: res_summary.max_pm,
            energy_type: res_summary.energy_type,
            effective_family: res_summary.effective_family,
            is_hybrid: res_summary.is_hybrid,
            secondary_profile_name: res_summary.secondary_profile_name,
            attacks: combat_summary.attacks,
            contact_attack_stat: combat_summary.contact_attack_stat,
            contact_attack_stat_source: combat_summary.contact_attack_stat_source,
            distance_attack_stat: combat_summary.distance_attack_stat,
            distance_attack_stat_source: combat_summary.distance_attack_stat_source,
            path_bonus_defense: evaluated_bonuses.defense,
            path_bonus_initiative: evaluated_bonuses.initiative,
            path_bonus_hp: evaluated_bonuses.hp,
            path_bonus_attacks: AttackBonuses {
                contact: evaluated_bonuses.atk_contact,
                distance: evaluated_bonuses.atk_distance,
                magique: evaluated_bonuses.atk_magic,
            },
            path_bonus_damage: AttackBonuses {
                contact: evaluated_bonuses.dm_contact,
                distance: evaluated_bonuses.dm_distance,
                magique: evaluated_bonuses.dm_magic,
            },
            path_crit_range_bonus: evaluated_bonuses.crit_range,
            path_bonus_pc: evaluated_bonuses.pc,
            path_bonus_dr: evaluated_bonuses.dr,
            path_bonus_pm: evaluated_bonuses.pm,
            active_weapon_modifiers: stat_decomp.active_weapon_modifiers,
            situational_notes: combat_summary.situational_notes,
            languages_info,
            companions: Vec::new(),
            computed_weapons: Vec::new(),
        };
        sheet.companions = companion::resolve_character_companions(record, &sheet, rules);
        sheet.computed_weapons = equipment::compute_weapons_info(&sheet, rules);
        Ok(sheet)
    }

    /// Applique une montée de niveau avec validation des capacités et historisation complète.
    pub fn apply_level_up(
        record: &mut CharacterRecord,
        step: LevelProgressionStep,
        rules: &RulesDatabase,
    ) -> Result<ComputedCharacterSheet, RuleError> {
        progression::apply_level_up(record, step, rules)
    }

    /// Rétrograde le personnage à un niveau antérieur en annulant proprement les apprentissages.
    pub fn rollback_to_level(
        record: &mut CharacterRecord,
        target_level: u8,
        rules: &RulesDatabase,
    ) -> Result<ComputedCharacterSheet, RuleError> {
        progression::rollback_to_level(record, target_level, rules)
    }
}
