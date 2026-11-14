use crate::models::{
    AttackBonuses, CharacterRecord, ComputedCharacterSheet, LanguageSummary, LevelProgressionStep,
    LiteracyStatus, ProfileFamily, StatCode,
};
use crate::rules::{PeopleStatic, RankModifiersStatic, RuleError, RulesDatabase};
use std::collections::HashMap;

const ALL_STAT_CODES: [StatCode; 7] = [
    StatCode::FOR,
    StatCode::AGI,
    StatCode::CON,
    StatCode::PER,
    StatCode::INT,
    StatCode::VOL,
    StatCode::CHA,
];

fn empty_stat_map() -> HashMap<StatCode, i32> {
    ALL_STAT_CODES.iter().map(|&s| (s, 0)).collect()
}

fn collect_path_stat_bonuses(
    modifiers: &RankModifiersStatic,
    path_id: &str,
    rank: u8,
    path_rank_choices: &HashMap<String, String>,
    acc: &mut HashMap<StatCode, i32>,
) {
    if let Some(ref choice_options) = modifiers.choice_options {
        if !choice_options.is_empty() {
            let choice_key = format!("{path_id}_{rank}");
            let selected = path_rank_choices
                .get(&choice_key)
                .and_then(|chosen_id| choice_options.iter().find(|o| &o.id == chosen_id))
                .or_else(|| choice_options.first());
            if let Some(opt) = selected {
                if let Some(ref opt_mods) = opt.modifiers {
                    collect_path_stat_bonuses(opt_mods, path_id, rank, path_rank_choices, acc);
                }
            }
        }
    }

    if let Some(ref stats) = modifiers.stats {
        for (stat, val) in stats {
            *acc.entry(*stat).or_insert(0) += val;
        }
    }
}

pub struct RulesEngine;

impl RulesEngine {
    pub fn compute_sheet(
        record: &CharacterRecord,
        rules: &RulesDatabase,
    ) -> Result<ComputedCharacterSheet, RuleError> {
        let profile = rules
            .profiles
            .get(&record.profile_id)
            .ok_or_else(|| RuleError::ProfileNotFound(record.profile_id.clone()))?;
        let people = rules
            .peoples
            .get(&record.people_id)
            .ok_or_else(|| RuleError::PeopleNotFound(record.people_id.clone()))?;

        // 1. Décomposition unitaire des caractéristiques :
        //    - base_stats (valeur initiale choisie)
        //    - racial_bonus_stats (modificateurs raciaux fixes + choix)
        //    - path_bonus_stats (bonus issus des capacités de voies)
        //    - manual_bonus_stats (bonus/malus manuels éventuels)
        //    - other_bonus_stats = path_bonus_stats + manual_bonus_stats
        //    - final_stats = base_stats + racial_bonus_stats + other_bonus_stats
        let mut base_stats = empty_stat_map();
        for (stat, val) in &record.base_stats {
            base_stats.insert(*stat, *val);
        }

        let mut racial_bonus_stats = empty_stat_map();
        if let Some(ref racial_mods) = people.stats {
            for (stat, modif) in racial_mods {
                *racial_bonus_stats.entry(*stat).or_insert(0) += modif;
            }
        }
        if let Some(ref choices) = people.stat_choices {
            for (idx, choice) in choices.iter().enumerate() {
                if let Some(chosen_stat) = record.racial_stat_choices.get(idx) {
                    *racial_bonus_stats.entry(*chosen_stat).or_insert(0) += choice.value;
                } else if let Some(first_opt) = choice.options.first() {
                    if let Ok(st) = parse_stat(first_opt) {
                        *racial_bonus_stats.entry(st).or_insert(0) += choice.value;
                    }
                }
            }
        }
        if racial_bonus_stats.values().all(|&v| v == 0)
            && !record.racial_stat_modifiers.is_empty()
            && people.stats.is_none()
            && people.stat_choices.is_none()
        {
            for (stat, modif) in &record.racial_stat_modifiers {
                racial_bonus_stats.insert(*stat, *modif);
            }
        }

        let mut path_bonus_stats = empty_stat_map();
        for acq in &record.acquired_abilities {
            if let Some(path) = rules.paths.get(&acq.path_id) {
                if let Some(rank_data) = path.ranks.iter().find(|r| r.rank == acq.rank) {
                    if let Some(ref mods) = rank_data.modifiers {
                        collect_path_stat_bonuses(
                            mods,
                            &acq.path_id,
                            acq.rank,
                            &record.path_rank_choices,
                            &mut path_bonus_stats,
                        );
                    }
                }
            }
        }

        let mut manual_bonus_stats = empty_stat_map();
        for (stat, bonus) in &record.manual_stat_bonuses {
            *manual_bonus_stats.entry(*stat).or_insert(0) += bonus;
        }

        let mut other_bonus_stats = empty_stat_map();
        let mut final_stats = empty_stat_map();
        for stat in ALL_STAT_CODES {
            let base = *base_stats.get(&stat).unwrap_or(&0);
            let racial = *racial_bonus_stats.get(&stat).unwrap_or(&0);
            let path = *path_bonus_stats.get(&stat).unwrap_or(&0);
            let manual = *manual_bonus_stats.get(&stat).unwrap_or(&0);
            let other = path + manual;
            other_bonus_stats.insert(stat, other);
            final_stats.insert(stat, base + racial + other);
        }

        let level = record.level.clamp(1, 20) as i32;
        let bab = level.min(10);

        // 2. Gestion de l'armure et du bouclier
        let armor = record
            .equipped_armor_id
            .as_ref()
            .and_then(|id| rules.armors.get(id));
        let shield = record
            .equipped_shield_id
            .as_ref()
            .and_then(|id| rules.armors.get(id));

        let raw_agi = *final_stats.get(&StatCode::AGI).unwrap_or(&0);
        let effective_agi = if let Some(arm) = armor {
            arm.max_agi.map_or(raw_agi, |cap| raw_agi.min(cap))
        } else {
            raw_agi
        };

        let armor_defense = armor.map_or(0, |a| a.def);
        let shield_defense = shield.map_or(0, |s| s.def);

        let mut path_bonus_defense = 0;
        let mut situational_notes = Vec::new();

        if let Some(ref eq_rules) = people.equipment_rules {
            if let Some(bonus) = eq_rules.size_defense_bonus {
                path_bonus_defense += bonus;
            }
            if let Some(ref notes) = eq_rules.size_notes {
                for n in notes {
                    situational_notes.push(n.clone());
                }
            }
        }

        if let Some(arm) = armor {
            if let Some(ref n) = arm.notes {
                situational_notes.push(format!("{} : {}", arm.name, n));
            }
        }

        let defense = 10 + effective_agi + armor_defense + shield_defense + path_bonus_defense;

        // 3. Attaques de base & Initiative
        let stat_for = *final_stats.get(&StatCode::FOR).unwrap_or(&0);
        let stat_per = *final_stats.get(&StatCode::PER).unwrap_or(&0);
        let stat_vol = *final_stats.get(&StatCode::VOL).unwrap_or(&0);
        let stat_con = *final_stats.get(&StatCode::CON).unwrap_or(&0);
        let stat_cha = *final_stats.get(&StatCode::CHA).unwrap_or(&0);

        let attacks = AttackBonuses {
            contact: bab + stat_for,
            distance: bab + effective_agi,
            magique: bab + stat_vol,
        };

        let initiative = 10 + stat_per;

        // 4. Points de Vie (PV)
        let base_hp: i32 = if !record.level_up_hp_gains.is_empty() {
            record.level_up_hp_gains.iter().sum()
        } else {
            (level + 1) * profile.hp_per_level
        };

        let max_hp = (base_hp + (level * stat_con) + record.max_hp_bonus).max(1);

        // 5. Famille de profil et Dés de Récupération (DR), Points de Chance (PC), Points de Magie (PM)
        let effective_family = record
            .profile_family
            .as_ref()
            .unwrap_or(&profile.family);

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

        let max_dr = (2 + stat_con + bonus_dr).max(0);
        let max_pc = (2 + stat_cha + bonus_pc).max(0);
        let max_pm = stat_vol.max(0);

        let energy_type = if is_psionic {
            "PE".to_string()
        } else {
            "PM".to_string()
        };

        let stat_int = *final_stats.get(&StatCode::INT).unwrap_or(&0);
        let languages_info = Self::compute_languages_info(record, people, stat_int);

        Ok(ComputedCharacterSheet {
            record: record.clone(),
            base_stats,
            racial_bonus_stats,
            path_bonus_stats,
            manual_bonus_stats,
            other_bonus_stats,
            final_stats,
            bab,
            defense,
            defense_stat: StatCode::AGI,
            defense_stat_source: None,
            effective_agi,
            armor_defense,
            shield_defense,
            initiative,
            max_hp,
            max_dr,
            dr_dice,
            max_pc,
            max_pm,
            energy_type,
            attacks,
            contact_attack_stat: StatCode::FOR,
            contact_attack_stat_source: None,
            distance_attack_stat: StatCode::AGI,
            distance_attack_stat_source: None,
            situational_notes,
            languages_info,
        })
    }

    fn compute_languages_info(
        record: &CharacterRecord,
        people: &PeopleStatic,
        stat_int: i32,
    ) -> LanguageSummary {
        let has_assassin_r1 = record
            .acquired_abilities
            .iter()
            .any(|a| a.path_id == "voie-de-l-assassin" && a.rank == 1);
        let has_noblesse_r1 = record
            .acquired_abilities
            .iter()
            .any(|a| a.path_id == "voie-de-la-noblesse" && a.rank == 1);
        let diplomate_max_rank = record
            .acquired_abilities
            .iter()
            .filter(|a| a.path_id == "voie-du-diplomate")
            .map(|a| a.rank)
            .max()
            .unwrap_or(0);
        let polyglotte_bonus = if diplomate_max_rank >= 2 {
            (diplomate_max_rank - 1) as i32
        } else {
            0
        };

        let is_voleur_or_barde = record.profile_id == "voleur"
            || record.profile_id == "barde"
            || record.secondary_profile_id.as_deref() == Some("voleur")
            || record.secondary_profile_id.as_deref() == Some("barde");

        let argotien_slot_cost = if is_voleur_or_barde || has_assassin_r1 {
            1
        } else {
            2
        };

        let mut automatic_languages = Vec::new();
        if stat_int > -2 {
            automatic_languages.push("Commun".to_string());
        }
        if let Some(native_lang) = people.native_language() {
            if !automatic_languages
                .iter()
                .any(|l| l.eq_ignore_ascii_case(&native_lang))
            {
                automatic_languages.push(native_lang);
            }
        }
        if has_assassin_r1
            && !automatic_languages
                .iter()
                .any(|l| l.eq_ignore_ascii_case("Argotien"))
        {
            automatic_languages.push("Argotien".to_string());
        }

        let bonus_language_slots =
            stat_int.max(0) + if has_noblesse_r1 { 1 } else { 0 } + polyglotte_bonus;

        let lang_slots: i32 = record
            .languages
            .iter()
            .filter(|lang| {
                !automatic_languages
                    .iter()
                    .any(|auto| auto.eq_ignore_ascii_case(lang))
            })
            .map(|lang| {
                if lang.eq_ignore_ascii_case("Argotien") {
                    argotien_slot_cost
                } else {
                    1
                }
            })
            .sum();
        let used_bonus_slots = lang_slots + record.secondary_talents.len() as i32;

        let literacy = if stat_int > 0 || has_noblesse_r1 {
            LiteracyStatus::Literate
        } else if stat_int == 0 {
            LiteracyStatus::Hesitant
        } else {
            LiteracyStatus::Illiterate
        };

        let int_note = if stat_int <= -2 {
            Some("INT -2 : ne parle que sa langue natale (et quelques mots de Commun).".to_string())
        } else {
            None
        };

        LanguageSummary {
            automatic_languages,
            bonus_language_slots,
            used_bonus_slots,
            argotien_slot_cost,
            literacy,
            int_note,
        }
    }

    /// Applique une montée de niveau avec historisation complète des apprentissages
    pub fn apply_level_up(
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

        // 1. Enregistrement des PV de niveau
        record.level_up_hp_gains.push(step.hp_gain);

        // 2. Intégration des nouvelles capacités apprises
        for ability in &step.abilities_learned {
            if !record
                .acquired_abilities
                .iter()
                .any(|a| a.path_id == ability.path_id && a.rank == ability.rank)
            {
                record.acquired_abilities.push(ability.clone());
            }
        }

        // 3. Intégration des voies sélectionnées
        for path_id in &step.selected_path_ids {
            if !record.selected_path_ids.contains(path_id) {
                record.selected_path_ids.push(path_id.clone());
            }
        }

        // 4. Choix de rangs / sous-options
        for (k, v) in &step.path_rank_choices {
            record.path_rank_choices.insert(k.clone(), v.clone());
        }

        // 5. Bonus manuels de caracs
        for (stat, bonus) in &step.manual_stat_bonuses {
            *record.manual_stat_bonuses.entry(*stat).or_insert(0) += bonus;
        }

        // 5b. Langues et talents secondaires appris à ce niveau
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

        // 6. Sauvegarde de l'étape dans l'historique
        record.progression_history.push(step);
        record.level = next_level;

        // 7. Recalcul et réajustement des jauges courantes
        let computed = Self::compute_sheet(record, rules)?;
        record.current_hp = computed.max_hp;
        record.current_dr = computed.max_dr;
        record.current_pc = computed.max_pc;
        record.current_pm = computed.max_pm;

        Self::compute_sheet(record, rules)
    }

    /// Rétrograde le personnage à un niveau antérieur en annulant proprement les apprentissages
    pub fn rollback_to_level(
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

        // 1. Récupération des capacités apprises aux niveaux annulés
        let mut abilities_to_remove = Vec::new();
        let mut choices_to_remove = Vec::new();
        let mut languages_to_remove = Vec::new();
        let mut talents_to_remove = Vec::new();
        let mut stat_bonuses_to_revert: std::collections::HashMap<StatCode, i32> =
            std::collections::HashMap::new();

        for step in record
            .progression_history
            .iter()
            .filter(|s| s.level > target_level)
        {
            for ab in &step.abilities_learned {
                abilities_to_remove.push(ab.clone());
            }
            for k in step.path_rank_choices.keys() {
                choices_to_remove.push(k.clone());
            }
            for lang in &step.languages_learned {
                languages_to_remove.push(lang.clone());
            }
            for talent in &step.secondary_talents_learned {
                talents_to_remove.push(talent.clone());
            }
            for (stat, bonus) in &step.manual_stat_bonuses {
                *stat_bonuses_to_revert.entry(*stat).or_insert(0) += bonus;
            }
        }

        // 2. Nettoyage des capacités apprises
        record.acquired_abilities.retain(|ab| {
            !abilities_to_remove
                .iter()
                .any(|rem| rem.path_id == ab.path_id && rem.rank == ab.rank)
        });

        // 3. Nettoyage des choix de sous-options
        for k in choices_to_remove {
            record.path_rank_choices.remove(&k);
        }

        // 3b. Nettoyage des langues et talents secondaires appris aux niveaux annulés
        record.languages.retain(|lang| {
            !languages_to_remove
                .iter()
                .any(|rem| rem.eq_ignore_ascii_case(lang))
        });
        record.secondary_talents.retain(|talent| {
            !talents_to_remove
                .iter()
                .any(|rem| rem.eq_ignore_ascii_case(talent))
        });

        // 4. Déduction des bonus manuels
        for (stat, bonus) in stat_bonuses_to_revert {
            if let Some(cur) = record.manual_stat_bonuses.get_mut(&stat) {
                *cur -= bonus;
            }
        }

        // 5. Tronquage des gains de PV
        if record.level_up_hp_gains.len() > target_level as usize {
            record.level_up_hp_gains.truncate(target_level as usize);
        }

        // 6. Tronquage de l'historique
        record
            .progression_history
            .retain(|s| s.level <= target_level);

        record.level = target_level;

        // 7. Recalcul et réajustement des jauges
        let computed = Self::compute_sheet(record, rules)?;
        record.current_hp = record.current_hp.min(computed.max_hp);
        record.current_dr = record.current_dr.min(computed.max_dr);
        record.current_pc = record.current_pc.min(computed.max_pc);
        record.current_pm = record.current_pm.min(computed.max_pm);

        Self::compute_sheet(record, rules)
    }
}

fn parse_stat(s: &str) -> Result<StatCode, ()> {
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
