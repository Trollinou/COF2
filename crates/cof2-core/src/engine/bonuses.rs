use crate::models::{AcquiredAbility, StatBlock};
use crate::rules::{ArmorStatic, CapRule, RulesDatabase, ScalingBonusRuleStatic};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub(crate) struct CollectedBonus<'a> {
    pub path_id: &'a str,
    pub rank: u8,
    pub bonus: &'a ScalingBonusRuleStatic,
}

#[derive(Debug, Default)]
pub(crate) struct EvaluatedBonuses {
    pub defense: i32,
    pub hp: i32,
    pub initiative: i32,
    pub pc: i32,
    pub dr: i32,
    pub pm: i32,
    pub has_direct_stat_pm_bonus: bool,
    pub atk_contact: i32,
    pub atk_distance: i32,
    pub atk_magic: i32,
    pub dm_contact: i32,
    pub dm_distance: i32,
    pub dm_magic: i32,
    pub crit_range: i32,
    pub rd_notes: Vec<String>,
}

/// Évalue une règle de bonus évolutive et l'accumule dans `EvaluatedBonuses`.
#[allow(clippy::too_many_arguments)]
pub(crate) fn evaluate_single_bonus(
    b: &ScalingBonusRuleStatic,
    path_id: &str,
    rank: u8,
    level: i32,
    armor: Option<&ArmorStatic>,
    shield: Option<&ArmorStatic>,
    final_stats: &StatBlock,
    effective_abilities: &[AcquiredAbility],
    rules: &RulesDatabase,
    non_stacking_best: &mut HashMap<String, i32>,
    out: &mut EvaluatedBonuses,
) {
    if let Some(ref cond) = b.condition {
        match cond.as_str() {
            "noArmor" if armor.is_some_and(|a| a.def > 0) => return,
            "noShield" if shield.is_some() => return,
            "lightArmor" if armor.is_some_and(|a| a.def > 3) => return,
            _ => {}
        }
    }

    let is_prestige = rules
        .paths
        .get(path_id)
        .and_then(|p| p.path_type.as_deref())
        == Some("prestige");

    let ranks_for_path: Vec<u8> = effective_abilities
        .iter()
        .filter(|a| a.path_id == path_id)
        .map(|a| a.rank)
        .collect();
    let max_rank_in_path = ranks_for_path.iter().copied().max().unwrap_or(rank) as i32;
    let count_in_path = (ranks_for_path.len() as i32).max(1);
    let effective_rank_count = if is_prestige {
        count_in_path
    } else {
        max_rank_in_path
    };

    let mut val = b.flat.unwrap_or(0);

    if let Some(ref at_rank) = b.at_rank {
        if let Some(best) = at_rank
            .iter()
            .filter_map(|(k, &v)| k.parse::<i32>().ok().map(|t| (t, v)))
            .filter(|(t, _)| *t <= max_rank_in_path)
            .max_by_key(|(t, _)| *t)
        {
            val = best.1;
        }
    }

    if let Some(ref at_level) = b.at_level {
        if let Some(best) = at_level
            .iter()
            .filter_map(|(k, &v)| k.parse::<i32>().ok().map(|t| (t, v)))
            .filter(|(t, _)| *t <= level)
            .max_by_key(|(t, _)| *t)
        {
            val = best.1;
        }
    }

    if let Some(per_rank) = b.per_rank {
        val += per_rank * effective_rank_count;
    }

    if let Some(per_level) = b.per_level {
        val += per_level * level;
    }

    if let Some(stat) = b.stat {
        let stat_val = final_stats.get(stat);
        val += if b.target == "defense" {
            stat_val.max(0)
        } else {
            stat_val
        };
    }

    if let Some(ref cap) = b.cap {
        match cap {
            CapRule::Keyword(kw) if kw == "rank" => {
                val = val.min(effective_rank_count);
            }
            CapRule::Number(n) => {
                val = val.min(*n);
            }
            _ => {}
        }
    }

    if let Some(ref group) = b.non_stacking_group {
        let group_key = format!("{}:{group}", b.target);
        if let Some(&prev) = non_stacking_best.get(&group_key) {
            if val <= prev {
                return;
            }
            non_stacking_best.insert(group_key, val);
            val -= prev;
        } else {
            non_stacking_best.insert(group_key, val);
        }
    }

    match b.target.as_str() {
        "defense" => out.defense += val,
        "hp" => out.hp += val,
        "initiative" => out.initiative += val,
        "pc" => out.pc += val,
        "dr" => out.dr += val,
        "pm" => {
            out.pm += val;
            if b.stat.is_some() {
                out.has_direct_stat_pm_bonus = true;
            }
        }
        "damageReduction" if val > 0 => {
            let note = match &b.note {
                Some(n) => format!("RD {val} ({n})"),
                None => format!("RD {val}"),
            };
            if !out.rd_notes.contains(&note) {
                out.rd_notes.push(note);
            }
        }
        "atkContact" => out.atk_contact += val,
        "atkDistance" => out.atk_distance += val,
        "atkMagic" => out.atk_magic += val,
        "dmContact" => out.dm_contact += val,
        "dmDistance" => out.dm_distance += val,
        "dmMagic" => out.dm_magic += val,
        "critRange" => out.crit_range += val,
        _ => {}
    }
}

/// Évalue l'ensemble des règles de bonus collectées en Passe 1.
#[allow(clippy::too_many_arguments)]
pub(crate) fn evaluate_bonuses(
    collected: &[CollectedBonus<'_>],
    level: i32,
    armor: Option<&ArmorStatic>,
    shield: Option<&ArmorStatic>,
    final_stats: &StatBlock,
    effective_abilities: &[AcquiredAbility],
    rules: &RulesDatabase,
    non_stacking_best: &mut HashMap<String, i32>,
) -> EvaluatedBonuses {
    let mut out = EvaluatedBonuses::default();
    for item in collected {
        evaluate_single_bonus(
            item.bonus,
            item.path_id,
            item.rank,
            level,
            armor,
            shield,
            final_stats,
            effective_abilities,
            rules,
            non_stacking_best,
            &mut out,
        );
    }
    out
}
