use crate::engine::bonuses::{evaluate_single_bonus, EvaluatedBonuses};
use crate::engine::stats::CollectedSubstitution;
use crate::models::{
    AcquiredAbility, AttackBonuses, CharacterRecord, CharacterWeaponInstance, HumanDiversityChoice,
    StatCode,
};
use crate::rules::{ArmorStatic, PeopleStatic, RulesDatabase, ScalingBonusRuleStatic};
use std::collections::HashMap;

pub(crate) struct CombatSummary {
    pub bab: i32,
    pub defense: i32,
    pub defense_stat: StatCode,
    pub defense_stat_source: Option<String>,
    pub effective_agi: i32,
    pub armor_defense: i32,
    pub shield_defense: i32,
    pub initiative: i32,
    pub attacks: AttackBonuses,
    pub contact_attack_stat: StatCode,
    pub contact_attack_stat_source: Option<String>,
    pub distance_attack_stat: StatCode,
    pub distance_attack_stat_source: Option<String>,
    pub updated_weapons: Vec<CharacterWeaponInstance>,
    pub situational_notes: Vec<String>,
}

fn push_unique_note(notes: &mut Vec<String>, note: String) {
    if !notes.contains(&note) {
        notes.push(note);
    }
}

fn is_weapon_eligible_for_filter(
    weapon: &CharacterWeaponInstance,
    filter: Option<&str>,
    rules: &RulesDatabase,
) -> bool {
    let Some(f) = filter else {
        return true;
    };
    if f == "any" {
        return true;
    }

    let base_w = rules.weapons.get(&weapon.weapon_ref_id);
    let tags = base_w.map(|w| w.tags.as_slice()).unwrap_or(&[]);
    let category = base_w
        .map(|w| w.category.as_str())
        .unwrap_or(weapon.category.as_str());

    match f {
        "bareHands" => {
            tags.iter().any(|t| t == "mains-nues") || weapon.weapon_ref_id == "mains-nues"
        }
        "lightWeapons" => tags.iter().any(|t| t == "legere"),
        "sabres" => tags.iter().any(|t| t == "sabre"),
        "duellisteWeapons" => tags.iter().any(|t| t == "duelliste"),
        "danseurWeapons" => tags.iter().any(|t| t == "danseur"),
        "projectiles" => {
            category == "distance"
                && !tags.iter().any(|t| t == "poudre")
                && (tags.iter().any(|t| t == "arc" || t == "arbalete")
                    || weapon.weapon_ref_id == "fronde")
        }
        "oneHanded" => base_w.map(|w| w.hands == 1).unwrap_or(true),
        _ => false,
    }
}

/// Calcule les valeurs de combat (Défense, Initiative, Attaques, Armes) et les notes situationnelles.
#[allow(clippy::too_many_arguments)]
pub(crate) fn compute_combat(
    record: &CharacterRecord,
    people: &PeopleStatic,
    final_stats: &HashMap<StatCode, i32>,
    armor: Option<&ArmorStatic>,
    shield: Option<&ArmorStatic>,
    bonuses: &mut EvaluatedBonuses,
    substitutions: &[CollectedSubstitution],
    path_situational_notes: &[String],
    effective_abilities: &[AcquiredAbility],
    rules: &RulesDatabase,
    non_stacking_best: &mut HashMap<String, i32>,
) -> CombatSummary {
    let level = record.level as i32;
    let bab = level.min(10);

    let mut situational_notes = Vec::new();
    for n in path_situational_notes {
        push_unique_note(&mut situational_notes, n.clone());
    }
    for n in &bonuses.rd_notes {
        push_unique_note(&mut situational_notes, n.clone());
    }

    if let Some(ref id) = record.equipped_armor_id {
        if armor.is_none() {
            push_unique_note(
                &mut situational_notes,
                format!("Armure introuvable dans le compendium : {id}"),
            );
        }
    }
    if let Some(ref id) = record.equipped_shield_id {
        if shield.is_none() {
            push_unique_note(
                &mut situational_notes,
                format!("Bouclier introuvable dans le compendium : {id}"),
            );
        }
    }

    // Substitutions de défense
    let mut defense_stat = StatCode::AGI;
    let mut defense_stat_source: Option<String> = None;

    let raw_agi = *final_stats.get(&StatCode::AGI).unwrap_or(&0);
    let mut effective_agi = armor.and_then(|a| a.max_agi).map_or(raw_agi, |cap| raw_agi.min(cap));

    let def_subs: Vec<&CollectedSubstitution> = substitutions
        .iter()
        .filter(|s| s.rule.target == "defense")
        .collect();

    for sub in &def_subs {
        let rep_val = *final_stats.get(&sub.rule.replacement_stat).unwrap_or(&0);
        let capped_rep = armor
            .and_then(|a| a.max_agi)
            .map_or(rep_val, |cap| rep_val.min(cap));

        if capped_rep > effective_agi {
            effective_agi = capped_rep;
            defense_stat = sub.rule.replacement_stat;
            defense_stat_source = sub.rule.source_name.clone();
        }
    }

    // Fallback défensif si la stat de substitution n'a pas été retenue
    for sub in &def_subs {
        if let Some(ref fb) = sub.rule.fallback_defense_bonus {
            if defense_stat != sub.rule.replacement_stat {
                let fb_rule = ScalingBonusRuleStatic {
                    target: "defense".to_string(),
                    flat: Some(fb.flat),
                    stat: None,
                    per_rank: None,
                    per_level: None,
                    at_rank: fb.at_rank.clone(),
                    at_level: None,
                    cap: None,
                    condition: None,
                    non_stacking_group: None,
                    note: None,
                };
                evaluate_single_bonus(
                    &fb_rule,
                    &sub.path_id,
                    sub.rank,
                    level,
                    armor,
                    shield,
                    final_stats,
                    effective_abilities,
                    rules,
                    non_stacking_best,
                    bonuses,
                );
            }
        }
    }

    let armor_defense = armor.map_or(0, |a| a.def);
    let shield_defense = shield.map_or(0, |s| s.def);

    let mut path_bonus_defense = bonuses.defense;

    if let Some(ref eq_rules) = people.equipment_rules {
        if let Some(bonus) = eq_rules.size_defense_bonus {
            path_bonus_defense += bonus;
        }
        if let Some(ref notes) = eq_rules.size_notes {
            for n in notes {
                push_unique_note(&mut situational_notes, n.clone());
            }
        }
    }

    if let Some(arm) = armor {
        if let Some(ref n) = arm.notes {
            push_unique_note(&mut situational_notes, format!("{} : {}", arm.name, n));
        }
    }

    if let Some(ref div) = record.human_diversity {
        if let Some(note) = format_human_diversity_note(div) {
            push_unique_note(&mut situational_notes, note);
        }
    }

    let defense = 10 + effective_agi + armor_defense + shield_defense + path_bonus_defense;

    // Substitutions d'attaques générales
    let mut contact_attack_stat = StatCode::FOR;
    let mut contact_attack_stat_source: Option<String> = None;
    let mut distance_attack_stat = StatCode::AGI;
    let mut distance_attack_stat_source: Option<String> = None;

    for sub in substitutions.iter().filter(|s| {
        s.rule.target == "attackContact"
            && s.rule
                .weapon_filter
                .as_deref()
                .is_none_or(|f| f == "any")
    }) {
        let rep_val = *final_stats.get(&sub.rule.replacement_stat).unwrap_or(&0);
        let cur_val = *final_stats.get(&contact_attack_stat).unwrap_or(&0);
        if rep_val > cur_val {
            contact_attack_stat = sub.rule.replacement_stat;
            contact_attack_stat_source = sub.rule.source_name.clone();
        }
    }

    for sub in substitutions.iter().filter(|s| {
        s.rule.target == "attackDistance"
            && s.rule
                .weapon_filter
                .as_deref()
                .is_none_or(|f| f == "any")
    }) {
        let rep_val = *final_stats.get(&sub.rule.replacement_stat).unwrap_or(&0);
        let cur_val = *final_stats.get(&distance_attack_stat).unwrap_or(&0);
        if rep_val > cur_val {
            distance_attack_stat = sub.rule.replacement_stat;
            distance_attack_stat_source = sub.rule.source_name.clone();
        }
    }

    let stat_contact = *final_stats.get(&contact_attack_stat).unwrap_or(&0);
    let stat_distance = *final_stats.get(&distance_attack_stat).unwrap_or(&0);
    let stat_vol = *final_stats.get(&StatCode::VOL).unwrap_or(&0);
    let stat_per = *final_stats.get(&StatCode::PER).unwrap_or(&0);

    let attacks = AttackBonuses {
        contact: bab + stat_contact + bonuses.atk_contact,
        distance: bab + stat_distance + bonuses.atk_distance,
        magique: bab + stat_vol + bonuses.atk_magic,
    };

    // Évaluation des instances d'armes
    let updated_weapons = record
        .weapons
        .iter()
        .cloned()
        .map(|mut w| {
            let base_w = rules.weapons.get(&w.weapon_ref_id);
            let is_contact = w.category == "contact";
            let default_stat = base_w
                .and_then(|bw| bw.attack_stat)
                .unwrap_or(if is_contact { StatCode::FOR } else { StatCode::AGI });
            let mut best_stat = default_stat;
            let mut best_source = base_w
                .filter(|bw| bw.attack_stat.is_some())
                .map(|bw| bw.name.clone());
            let mut best_mod = *final_stats.get(&default_stat).unwrap_or(&0);

            let target = if is_contact {
                "attackContact"
            } else {
                "attackDistance"
            };

            for sub in substitutions.iter().filter(|s| s.rule.target == target) {
                if is_weapon_eligible_for_filter(&w, sub.rule.weapon_filter.as_deref(), rules) {
                    let rep_mod = *final_stats.get(&sub.rule.replacement_stat).unwrap_or(&0);
                    if rep_mod > best_mod {
                        best_stat = sub.rule.replacement_stat;
                        best_source = sub.rule.source_name.clone();
                        best_mod = rep_mod;
                    }
                }
            }

            w.attack_stat_used = Some(best_stat);
            w.attack_stat_source = best_source;
            w
        })
        .collect();

    let initiative = 10 + stat_per + bonuses.initiative;

    CombatSummary {
        bab,
        defense,
        defense_stat,
        defense_stat_source,
        effective_agi,
        armor_defense,
        shield_defense,
        initiative,
        attacks,
        contact_attack_stat,
        contact_attack_stat_source,
        distance_attack_stat,
        distance_attack_stat_source,
        updated_weapons,
        situational_notes,
    }
}

fn format_human_diversity_note(choice: &HumanDiversityChoice) -> Option<String> {
    let (origin_label, default_d1, default_d2) = match choice.origin_id.as_str() {
        "montagnard" => ("Montagnard", "Escalade", "Résistance au froid"),
        "citadin" => ("Citadin", "Commerce", "Résistance aux maladies"),
        "campagnard" => ("Campagnard", "Météorologie", "Équitation"),
        "riverain" => ("Riverain", "Natation", "Navigation"),
        "sauvage" => ("Sauvage", "Chasser", "Pister"),
        "nomade" => ("Nomade", "Orientation", "Résistance à la chaleur ou au froid"),
        "custom" => {
            let label = choice
                .custom_origin_name
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .unwrap_or("Origine personnalisée");
            let d1 = choice
                .custom_domain_1
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .unwrap_or("");
            let d2 = choice
                .custom_domain_2
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .unwrap_or("");
            return format_diversity_domains(label, d1, d2, choice);
        }
        _ => return None,
    };

    format_diversity_domains(origin_label, default_d1, default_d2, choice)
}

fn format_diversity_domains(
    origin_label: &str,
    base_d1: &str,
    base_d2: &str,
    choice: &HumanDiversityChoice,
) -> Option<String> {
    let trade = choice
        .replacement_trade
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());

    let (d1, d2) = match (choice.replaced_domain_index, trade) {
        (Some(0), Some(t)) => (format!("{t} (gagne-pain)"), base_d2.to_string()),
        (Some(1), Some(t)) => (base_d1.to_string(), format!("{t} (gagne-pain)")),
        _ => (base_d1.to_string(), base_d2.to_string()),
    };

    let domains: Vec<String> = [d1, d2]
        .into_iter()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if domains.is_empty() {
        return None;
    }

    Some(format!(
        "Diversité ({}) : +3 aux tests de {}",
        origin_label,
        domains.join(" et ")
    ))
}
