use crate::engine::bonuses::EvaluatedBonuses;
use crate::models::{AcquiredAbility, CharacterRecord, ProfileFamily, StatCode};
use crate::rules::{ProfileStatic, RulesDatabase};
use std::collections::HashMap;

pub(crate) struct ResourcesSummary {
    pub max_hp: i32,
    pub max_dr: i32,
    pub dr_dice: String,
    pub max_pc: i32,
    pub max_pm: i32,
    pub energy_type: String,
    pub effective_family: ProfileFamily,
    pub is_hybrid: bool,
    pub secondary_profile_name: Option<String>,
}

/// Calcule les ressources vitales et d'énergie (PV, DR, PC, PM/PE), incluant hybrides et sorts.
#[allow(clippy::too_many_arguments)]
pub(crate) fn compute_resources(
    record: &CharacterRecord,
    profile: &ProfileStatic,
    final_stats: &HashMap<StatCode, i32>,
    bonuses: &EvaluatedBonuses,
    luck_stat_replacement: Option<StatCode>,
    mana_stat_replacement: Option<StatCode>,
    effective_abilities: &[AcquiredAbility],
    rules: &RulesDatabase,
) -> ResourcesSummary {
    let level = record.level as i32;
    let stat_con = *final_stats.get(&StatCode::CON).unwrap_or(&0);
    let stat_cha = *final_stats.get(&StatCode::CHA).unwrap_or(&0);
    let stat_vol = *final_stats.get(&StatCode::VOL).unwrap_or(&0);

    let is_hybrid_lvl1 = level == 1
        && (record.is_hybrid == Some(true)
            || record
                .secondary_profile_id
                .as_deref()
                .is_some_and(|sec| sec != record.profile_id));

    let base_hp: i32 = if !record.level_up_hp_gains.is_empty() {
        record.level_up_hp_gains.iter().sum()
    } else if is_hybrid_lvl1 {
        let sec_hp = record
            .secondary_profile_id
            .as_deref()
            .and_then(|sec_id| rules.profiles.get(sec_id))
            .map(|p| p.hp_per_level)
            .unwrap_or(profile.hp_per_level);
        profile.hp_per_level + sec_hp
    } else {
        (level + 1) * profile.hp_per_level
    };

    let max_hp = (base_hp + (level * stat_con) + record.max_hp_bonus + bonuses.hp).max(1);

    let effective_family = if record.profile_id == "psionique" {
        record.profile_family.as_ref().unwrap_or(&profile.family)
    } else {
        &profile.family
    };
    let is_psionic = record.profile_id == "psionique";

    let mut bonus_dr = profile.bonus_dr;
    let mut bonus_pc = profile.bonus_pc;
    let mut dr_dice = profile.hd.clone();

    if is_psionic {
        match effective_family {
            ProfileFamily::Combattants => {
                dr_dice = "d10".to_string();
                bonus_pc = 0;
                bonus_dr = 0;
            }
            ProfileFamily::Aventuriers => {
                dr_dice = "d8".to_string();
                bonus_pc = 1;
                bonus_dr = 0;
            }
            ProfileFamily::Mystiques => {
                dr_dice = "d8".to_string();
                bonus_pc = 0;
                bonus_dr = 1;
            }
            ProfileFamily::Mages => {
                dr_dice = "d6".to_string();
                bonus_pc = 0;
                bonus_dr = 0;
            }
        }
    } else {
        if *effective_family == ProfileFamily::Mystiques {
            bonus_dr += 1;
        }
        if *effective_family == ProfileFamily::Aventuriers {
            bonus_pc += 1;
        }
    }

    let max_dr = (2 + stat_con + bonus_dr + bonuses.dr).max(0);

    let luck_stat_val = luck_stat_replacement
        .and_then(|s| final_stats.get(&s).copied())
        .unwrap_or(stat_cha);
    let max_pc = (2 + luck_stat_val + bonus_pc + bonuses.pc).max(0);

    let spell_count = effective_abilities
        .iter()
        .filter(|acq| {
            rules
                .paths
                .get(&acq.path_id)
                .and_then(|p| p.ranks.iter().find(|r| r.rank == acq.rank))
                .is_some_and(|r| r.is_spell)
        })
        .count() as i32;

    let mana_base_stat = mana_stat_replacement
        .and_then(|s| final_stats.get(&s).copied())
        .unwrap_or(stat_vol);

    let max_pm = if spell_count > 0 {
        (mana_base_stat + spell_count + bonuses.pm).max(0)
    } else if bonuses.has_direct_stat_pm_bonus {
        bonuses.pm.max(0)
    } else {
        0
    };

    let energy_type = if is_psionic { "PE" } else { "PM" }.to_string();

    let is_hybrid = record.is_hybrid == Some(true)
        || record
            .secondary_profile_id
            .as_deref()
            .is_some_and(|sec| sec != record.profile_id)
        || record.acquired_abilities.iter().any(|a| {
            rules
                .paths
                .get(&a.path_id)
                .and_then(|p| p.path_type.as_deref())
                == Some("profile")
                && !profile.paths.contains(&a.path_id)
        });

    let secondary_profile_name = record
        .secondary_profile_id
        .as_deref()
        .and_then(|id| rules.profiles.get(id))
        .map(|p| p.name.clone());

    ResourcesSummary {
        max_hp,
        max_dr,
        dr_dice,
        max_pc,
        max_pm,
        energy_type,
        effective_family: effective_family.clone(),
        is_hybrid,
        secondary_profile_name,
    }
}
