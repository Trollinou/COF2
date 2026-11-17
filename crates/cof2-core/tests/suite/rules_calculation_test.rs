use cof2_core::{
    AcquiredAbility, CharacterRecord, CharacterWeaponInstance, Coins, HumanDiversityChoice,
    LevelProgressionStep, EnergyType, ProfileFamily, RuleError, RulesDatabase, RulesEngine, StatBlock, StatCode, WeaponCategory,
};
use std::collections::HashMap;

fn create_test_record(profile_id: &str, people_id: &str, level: u8) -> CharacterRecord {
    let mut base_stats = StatBlock::default();
    base_stats.set(StatCode::FOR, 3);
    base_stats.set(StatCode::AGI, 2);
    base_stats.set(StatCode::CON, 2);
    base_stats.set(StatCode::PER, 1);
    base_stats.set(StatCode::INT, 0);
    base_stats.set(StatCode::VOL, 0);
    base_stats.set(StatCode::CHA, -1);

    CharacterRecord {
        id: "char-test-1".into(),
        version: "0.8.5".into(),
        updated_at: "2026-11-11T12:00:00Z".into(),
        creation_completed: Some(true),
        name: "Valeros".into(),
        player_name: "Joueur".into(),
        sex: "Masculin".into(),
        age: "25".into(),
        height: "1m80".into(),
        weight: "80kg".into(),
        physical_traits: "Balafré".into(),
        languages: vec![],
        secondary_talents: vec![],
        background: "Soldat".into(),
        ideal: "Bravoure".into(),
        flaw: "Téméraire".into(),
        notes: "".into(),
        deity: None,
        people_id: people_id.into(),
        profile_id: profile_id.into(),
        profile_family: None,
        is_hybrid: None,
        secondary_profile_id: None,
        level,
        base_stats,
        stat_array_preset: None,
        racial_stat_choices: vec![],
        racial_stat_modifiers: StatBlock::default(),
        manual_stat_bonuses: StatBlock::default(),
        selected_path_ids: vec!["voie-du-bouclier".into()],
        acquired_abilities: vec![AcquiredAbility {
            path_id: "voie-du-bouclier".into(),
            rank: 1,
        }],
        path_rank_choices: HashMap::new(),
        external_ability_choices: HashMap::new(),
        human_diversity: None,
        progression_history: vec![],
        current_hp: 14,
        max_hp_bonus: 0,
        level_up_hp_gains: vec![12],
        half_hp_pending: None,
        current_dr: 4,
        current_pc: 1,
        current_pm: 0,
        equipped_armor_id: None,
        equipped_shield_id: None,
        weapons: vec![],
        inventory: vec![],
        coins: Coins {
            pa: 10,
            pc: 5,
            po: 2,
        },
    }
}

#[test]
fn test_embedded_rules_database_loads_successfully() {
    let rules = RulesDatabase::load_embedded()
        .expect("Les règles JSON embarquées doivent se charger sans erreur");
    assert!(
        !rules.peoples.is_empty(),
        "La table des peuples ne doit pas être vide"
    );
    assert!(
        !rules.profiles.is_empty(),
        "La table des profils ne doit pas être vide"
    );
    assert!(
        !rules.armors.is_empty(),
        "La table des équipements/armures ne doit pas être vide"
    );
}

#[test]
fn test_warrior_level_1_computations() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let record = create_test_record("guerrier", "humain", 1);

    let sheet = RulesEngine::compute_sheet(&record, &rules).expect("Calcul valide");

    // Formules officielles COF2 Guerrier (Combattants, hpPerLevel = 6, CON = 2)
    // PV = 12 (base hp gain) + 1 * 2 (CON) = 14
    assert_eq!(sheet.max_hp, 14);
    // Défense sans armure = 10 + 2 AGI = 12
    assert_eq!(sheet.defense, 12);
    // Initiative = 10 + 1 PER = 11
    assert_eq!(sheet.initiative, 11);
    // Attaque au contact = 1 BAB + 3 FOR = 4
    assert_eq!(sheet.attacks.contact, 4);
    // Attaque à distance = 1 BAB + 2 AGI = 3
    assert_eq!(sheet.attacks.distance, 3);
    // DR = 2 + 2 CON = 4
    assert_eq!(sheet.max_dr, 4);
    // PC = 2 - 1 CHA = 1 (Famille Combattants = 0 bonus PC)
    assert_eq!(sheet.max_pc, 1);
}

#[test]
fn test_level_up_progression_history_and_rollback() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let mut record = create_test_record("guerrier", "humain", 1);

    assert_eq!(record.level, 1);
    assert_eq!(record.acquired_abilities.len(), 1);

    // 1. Montée au niveau 2 : apprentissage de la capacité rang 2
    let step_lvl2 = LevelProgressionStep {
        level: 2,
        hp_gain: 6,
        abilities_learned: vec![AcquiredAbility {
            path_id: "voie-du-bouclier".into(),
            rank: 2,
        }],
        selected_path_ids: vec!["voie-du-bouclier".into()],
        path_rank_choices: HashMap::new(),
        manual_stat_bonuses: HashMap::new(),
        languages_learned: vec![],
        secondary_talents_learned: vec![],
        timestamp: "2026-11-11T13:00:00Z".into(),
    };

    let sheet_lvl2 = RulesEngine::apply_level_up(&mut record, step_lvl2, &rules)
        .expect("Montée au niveau 2 réussie");

    assert_eq!(record.level, 2);
    assert_eq!(sheet_lvl2.record.level, 2);
    assert_eq!(record.progression_history.len(), 1);
    assert_eq!(record.acquired_abilities.len(), 2);
    // PV Niv 2 = (12 + 6) + (2 * 2 CON) = 22
    assert_eq!(sheet_lvl2.max_hp, 22);
    assert_eq!(record.current_hp, 22);

    // 2. Montée au niveau 3 : apprentissage de la capacité rang 3
    let step_lvl3 = LevelProgressionStep {
        level: 3,
        hp_gain: 7,
        abilities_learned: vec![AcquiredAbility {
            path_id: "voie-du-bouclier".into(),
            rank: 3,
        }],
        selected_path_ids: vec!["voie-du-bouclier".into()],
        path_rank_choices: HashMap::new(),
        manual_stat_bonuses: HashMap::new(),
        languages_learned: vec![],
        secondary_talents_learned: vec![],
        timestamp: "2026-11-11T13:05:00Z".into(),
    };

    let sheet_lvl3 = RulesEngine::apply_level_up(&mut record, step_lvl3, &rules)
        .expect("Montée au niveau 3 réussie");

    assert_eq!(record.level, 3);
    assert_eq!(record.progression_history.len(), 2);
    assert_eq!(record.acquired_abilities.len(), 3);
    // PV Niv 3 = (12 + 6 + 7) + (3 * 2 CON) = 31
    assert_eq!(sheet_lvl3.max_hp, 31);

    // 3. Rollback vers le niveau 2 : annule le niveau 3
    let sheet_rollback = RulesEngine::rollback_to_level(&mut record, 2, &rules)
        .expect("Rollback au niveau 2 réussi");

    assert_eq!(record.level, 2);
    assert_eq!(record.progression_history.len(), 1);
    assert_eq!(record.acquired_abilities.len(), 2);
    assert_eq!(sheet_rollback.max_hp, 22);
    assert!(
        !record
            .acquired_abilities
            .iter()
            .any(|a| a.rank == 3),
        "Le rang 3 appris au niveau 3 doit avoir été retiré"
    );

    // 4. Rollback vers le niveau 1 : annule le niveau 2
    let sheet_lvl1_restored = RulesEngine::rollback_to_level(&mut record, 1, &rules)
        .expect("Rollback au niveau 1 réussi");

    assert_eq!(record.level, 1);
    assert_eq!(record.progression_history.len(), 0);
    assert_eq!(record.acquired_abilities.len(), 1);
    assert_eq!(sheet_lvl1_restored.max_hp, 14);
}

#[test]
fn test_unitary_stat_decomposition_and_reconstruction() {
    let rules = RulesDatabase::load_embedded().unwrap();
    // Minotaure: fixed racial stats { FOR: +2, VOL: +1, INT: -2, CHA: -2 }
    let mut record = create_test_record("guerrier", "minotaure", 1);
    // Voie du demi-orc rang 5 ("Colosse"): +1 FOR, +1 CON
    record.acquired_abilities.push(AcquiredAbility {
        path_id: "voie-du-demi-orc".into(),
        rank: 5,
    });
    // Bonus/malus manuel: +1 AGI, -1 CON
    record.manual_stat_bonuses.set(StatCode::AGI, 1);
    record.manual_stat_bonuses.set(StatCode::CON, -1);

    let sheet = RulesEngine::compute_sheet(&record, &rules).expect("Calcul valide");

    // Base stats
    assert_eq!(sheet.base_stats.get(StatCode::FOR), 3);
    assert_eq!(sheet.base_stats.get(StatCode::AGI), 2);
    assert_eq!(sheet.base_stats.get(StatCode::CON), 2);
    assert_eq!(sheet.base_stats.get(StatCode::INT), 0);

    // Racial bonus stats
    assert_eq!(sheet.racial_bonus_stats.get(StatCode::FOR), 2);
    assert_eq!(sheet.racial_bonus_stats.get(StatCode::INT), -2);
    assert_eq!(sheet.racial_bonus_stats.get(StatCode::VOL), 1);
    assert_eq!(sheet.racial_bonus_stats.get(StatCode::CHA), -2);
    assert_eq!(sheet.racial_bonus_stats.get(StatCode::AGI), 0);

    // Path bonus stats
    assert_eq!(sheet.path_bonus_stats.get(StatCode::FOR), 1);
    assert_eq!(sheet.path_bonus_stats.get(StatCode::CON), 1);
    assert_eq!(sheet.path_bonus_stats.get(StatCode::AGI), 0);

    // Manual bonus stats
    assert_eq!(sheet.manual_bonus_stats.get(StatCode::AGI), 1);
    assert_eq!(sheet.manual_bonus_stats.get(StatCode::CON), -1);
    assert_eq!(sheet.manual_bonus_stats.get(StatCode::FOR), 0);

    // Other bonus stats = path + manual
    assert_eq!(sheet.other_bonus_stats.get(StatCode::FOR), 1);
    assert_eq!(sheet.other_bonus_stats.get(StatCode::AGI), 1);
    assert_eq!(sheet.other_bonus_stats.get(StatCode::CON), 0);

    // Reconstruction invariant for all 7 stats: final = base + racial + other
    for stat in [
        StatCode::FOR,
        StatCode::AGI,
        StatCode::CON,
        StatCode::PER,
        StatCode::INT,
        StatCode::VOL,
        StatCode::CHA,
    ] {
        let base = sheet.base_stats.get(stat);
        let racial = sheet.racial_bonus_stats.get(stat);
        let other = sheet.other_bonus_stats.get(stat);
        let final_val = sheet.final_stats.get(stat);
        assert_eq!(final_val, base + racial + other);
    }

    assert_eq!(sheet.final_stats.get(StatCode::FOR), 6);
    assert_eq!(sheet.final_stats.get(StatCode::AGI), 3);
    assert_eq!(sheet.final_stats.get(StatCode::CON), 2);
    assert_eq!(sheet.final_stats.get(StatCode::INT), -2);
}

#[test]
fn test_languages_rules_int_paths_and_rollback() {
    use cof2_core::models::LiteracyStatus;

    let rules = RulesDatabase::load_embedded().unwrap();

    // 1. Farfadet (Commun, Sylvestre) avec INT -2 : ne parle que Sylvestre, illettré, 0 bonus
    let mut record = create_test_record("guerrier", "farfadet", 1);
    record.base_stats.set(StatCode::INT, -2);
    let sheet = RulesEngine::compute_sheet(&record, &rules).unwrap();
    assert_eq!(sheet.languages_info.automatic_languages, vec!["Sylvestre"]);
    assert_eq!(sheet.languages_info.bonus_language_slots, 0);
    assert_eq!(sheet.languages_info.literacy, LiteracyStatus::Illiterate);
    assert!(sheet.languages_info.int_note.is_some());

    // 2. INT 0 : Commun + Sylvestre, déchiffrement hésitant
    record.base_stats.set(StatCode::INT, 0);
    let sheet = RulesEngine::compute_sheet(&record, &rules).unwrap();
    assert_eq!(
        sheet.languages_info.automatic_languages,
        vec!["Commun", "Sylvestre"]
    );
    assert_eq!(sheet.languages_info.literacy, LiteracyStatus::Hesitant);

    // 3. Guerrier avec Argotien choisi en bonus : coûte 2 emplacements ; INT +2 -> 2/2 utilisés
    record.base_stats.set(StatCode::INT, 2);
    record.languages = vec!["Argotien".into()];
    let sheet = RulesEngine::compute_sheet(&record, &rules).unwrap();
    assert_eq!(sheet.languages_info.argotien_slot_cost, 2);
    assert_eq!(sheet.languages_info.bonus_language_slots, 2);
    assert_eq!(sheet.languages_info.used_bonus_slots, 2);
    assert_eq!(sheet.languages_info.literacy, LiteracyStatus::Literate);

    // 4. Chevalier Voie de la noblesse R1 avec INT -1 : alphabétisé et +1 slot
    let mut knight = create_test_record("chevalier", "humain", 1);
    knight.base_stats.set(StatCode::INT, -1);
    knight.acquired_abilities = vec![AcquiredAbility {
        path_id: "voie-de-la-noblesse".into(),
        rank: 1,
    }];
    let sheet = RulesEngine::compute_sheet(&knight, &rules).unwrap();
    assert_eq!(sheet.languages_info.literacy, LiteracyStatus::Literate);
    assert_eq!(sheet.languages_info.bonus_language_slots, 1);

    // 5. Voleur Voie de l'assassin R1 : Argotien automatique gratuit
    let mut rogue = create_test_record("voleur", "humain", 1);
    rogue.acquired_abilities = vec![AcquiredAbility {
        path_id: "voie-de-l-assassin".into(),
        rank: 1,
    }];
    let sheet = RulesEngine::compute_sheet(&rogue, &rules).unwrap();
    assert_eq!(
        sheet.languages_info.automatic_languages,
        vec!["Commun", "Argotien"]
    );
    assert_eq!(sheet.languages_info.argotien_slot_cost, 1);

    // 6. Caravanier Voie du diplomate (Polyglotte R2 & R3) : montée de niveau + rollback
    let mut carav = create_test_record("caravanier", "humain", 1);
    carav.base_stats.set(StatCode::INT, 1);
    let step2 = LevelProgressionStep {
        level: 2,
        hp_gain: 5,
        abilities_learned: vec![AcquiredAbility {
            path_id: "voie-du-diplomate".into(),
            rank: 2,
        }],
        selected_path_ids: vec![],
        path_rank_choices: HashMap::new(),
        manual_stat_bonuses: HashMap::new(),
        languages_learned: vec!["Runique".into()],
        secondary_talents_learned: vec!["Calligraphie".into()],
        timestamp: "2026-11-14T12:00:00Z".into(),
    };
    let sheet2 = RulesEngine::apply_level_up(&mut carav, step2, &rules).unwrap();
    assert_eq!(sheet2.languages_info.bonus_language_slots, 2); // +1 INT + 1 Polyglotte R2
    assert_eq!(sheet2.languages_info.used_bonus_slots, 2); // Runique + Calligraphie
    assert_eq!(carav.languages, vec!["Runique"]);
    assert_eq!(carav.secondary_talents, vec!["Calligraphie"]);

    let sheet1 = RulesEngine::rollback_to_level(&mut carav, 1, &rules).unwrap();
    assert_eq!(sheet1.languages_info.bonus_language_slots, 1);
    assert!(carav.languages.is_empty());
    assert!(carav.secondary_talents.is_empty());
}

#[test]
fn test_human_diversity_situational_notes() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let mut human = create_test_record("guerrier", "humain", 1);
    human.human_diversity = Some(HumanDiversityChoice {
        origin_id: "citadin".into(),
        custom_origin_name: None,
        custom_domain_1: None,
        custom_domain_2: None,
        replaced_domain_index: Some(1),
        replacement_trade: Some("Forgeron".into()),
    });

    let sheet = RulesEngine::compute_sheet(&human, &rules).unwrap();
    assert!(sheet.situational_notes.contains(
        &"Diversité (Citadin) : +3 aux tests de Commerce et Forgeron (gagne-pain)".to_string()
    ));
}

#[test]
fn test_hardcoded_compendium_ids_exist() {
    let rules = RulesDatabase::load_embedded().unwrap();

    for profile_id in ["psionique", "voleur", "barde", "chevalier"] {
        assert!(
            rules.profiles.contains_key(profile_id),
            "Profil attendu manquant dans profiles.json : {profile_id}"
        );
    }

    for path_id in [
        "voie-de-l-assassin",
        "voie-de-la-noblesse",
        "voie-du-diplomate",
    ] {
        assert!(
            rules.paths.contains_key(path_id),
            "Voie attendue manquante dans paths.json : {path_id}"
        );
    }
}

#[test]
fn test_armor_max_agi_shield_size_and_unknown_equipment() {
    let rules = RulesDatabase::load_embedded().unwrap();

    // Farfadet (+2 DEF taille) avec AGI 4, armure de plaques (DEF +6, maxAgi 2) et petit bouclier
    let mut record = create_test_record("guerrier", "farfadet", 1);
    record.base_stats.set(StatCode::AGI, 4);
    record.equipped_armor_id = Some("plaques".into());
    record.equipped_shield_id = Some("petit-bouclier".into());

    let sheet = RulesEngine::compute_sheet(&record, &rules).unwrap();
    // Farfadet a +1 AGI racial? Vérifions via effective_agi plafonné à 2
    assert_eq!(sheet.effective_agi, 2);
    assert_eq!(sheet.armor_defense, 6);
    assert!(sheet.shield_defense > 0);
    // Defense = 10 + 2 (effective_agi) + 6 (plaques) + shield_defense + 2 (size_defense_bonus)
    assert_eq!(sheet.defense, 10 + 2 + 6 + sheet.shield_defense + 2);
    // Attaque à distance utilise AGI non plafonnée (4 base + 1 Farfadet = 5) + BAB (1) = 6
    let final_agi = sheet.final_stats.get(StatCode::AGI);
    assert_eq!(sheet.attacks.distance, 1 + final_agi);
    assert!(sheet
        .situational_notes
        .iter()
        .any(|n| n.contains("Très petite taille")));

    // Équipement inconnu : non-bloquant avec note d'avertissement
    record.equipped_armor_id = Some("armure-inexistante".into());
    record.equipped_shield_id = Some("bouclier-inexistant".into());
    let sheet_unknown = RulesEngine::compute_sheet(&record, &rules).unwrap();
    assert_eq!(sheet_unknown.armor_defense, 0);
    assert_eq!(sheet_unknown.shield_defense, 0);
    assert!(sheet_unknown
        .situational_notes
        .iter()
        .any(|n| n.contains("armure-inexistante")));
    assert!(sheet_unknown
        .situational_notes
        .iter()
        .any(|n| n.contains("bouclier-inexistant")));
}

#[test]
fn test_profile_families_and_psionic_variants() {
    let rules = RulesDatabase::load_embedded().unwrap();

    // Mage : energy_type = PM, pas de bonus DR/PC famille
    let mage = create_test_record("magicien", "humain", 1);
    let mage_sheet = RulesEngine::compute_sheet(&mage, &rules).unwrap();
    assert_eq!(mage_sheet.energy_type, EnergyType::PM);
    assert_eq!(mage_sheet.max_dr, 4); // 2 + 2 CON
    assert_eq!(mage_sheet.max_pc, 1); // 2 - 1 CHA

    // Mystique (prêtre) : +1 DR famille
    let priest = create_test_record("pretre", "humain", 1);
    let priest_sheet = RulesEngine::compute_sheet(&priest, &rules).unwrap();
    assert_eq!(priest_sheet.max_dr, 5); // 2 + 2 CON + 1

    // Aventurier (voleur) : +1 PC famille
    let rogue = create_test_record("voleur", "humain", 1);
    let rogue_sheet = RulesEngine::compute_sheet(&rogue, &rules).unwrap();
    assert_eq!(rogue_sheet.max_pc, 2); // 2 - 1 CHA + 1

    // Psionique : PE et adaptation selon ProfileFamily
    let mut psion = create_test_record("psionique", "humain", 1);
    for (family, expected_dice, expected_dr, expected_pc) in [
        (ProfileFamily::Combattants, "d10", 4, 1),
        (ProfileFamily::Aventuriers, "d8", 4, 2),
        (ProfileFamily::Mystiques, "d8", 5, 1),
        (ProfileFamily::Mages, "d6", 4, 1),
    ] {
        psion.profile_family = Some(family);
        let sheet = RulesEngine::compute_sheet(&psion, &rules).unwrap();
        assert_eq!(sheet.energy_type, EnergyType::PE);
        assert_eq!(sheet.dr_dice, expected_dice);
        assert_eq!(sheet.max_dr, expected_dr);
        assert_eq!(sheet.max_pc, expected_pc);
    }
}

#[test]
fn test_dynamic_racial_and_path_rank_choices() {
    let rules = RulesDatabase::load_embedded().unwrap();
    let mut record = create_test_record("guerrier", "humain", 1);
    record.racial_stat_choices = vec![StatCode::PER];
    record.acquired_abilities.push(AcquiredAbility {
        path_id: "voie-de-l-elfe-haut".into(),
        rank: 5,
    });

    // Sans choix enregistré dans path_rank_choices : aucun bonus silencieux appliqué
    let sheet_no_choice = RulesEngine::compute_sheet(&record, &rules).unwrap();
    assert_eq!(sheet_no_choice.racial_bonus_stats.get(StatCode::PER), 1);
    assert_eq!(sheet_no_choice.path_bonus_stats.get(StatCode::INT), 0);
    assert_eq!(sheet_no_choice.path_bonus_stats.get(StatCode::CHA), 0);

    // Avec choix explicite opt_int -> INT +1
    record
        .path_rank_choices
        .insert("voie-de-l-elfe-haut_5".into(), "opt_int".into());
    let sheet_with_choice = RulesEngine::compute_sheet(&record, &rules).unwrap();
    assert_eq!(sheet_with_choice.path_bonus_stats.get(StatCode::INT), 1);
    assert_eq!(sheet_with_choice.path_bonus_stats.get(StatCode::CHA), 0);
}

#[test]
fn test_validation_errors_and_advanced_rollback() {
    let rules = RulesDatabase::load_embedded().unwrap();

    // Erreurs compute_sheet
    let bad_people = create_test_record("guerrier", "peuple-inconnu", 1);
    assert!(matches!(
        RulesEngine::compute_sheet(&bad_people, &rules),
        Err(RuleError::PeopleNotFound(_))
    ));

    let bad_profile = create_test_record("profil-inconnu", "humain", 1);
    assert!(matches!(
        RulesEngine::compute_sheet(&bad_profile, &rules),
        Err(RuleError::ProfileNotFound(_))
    ));

    let bad_level_zero = create_test_record("guerrier", "humain", 0);
    assert!(matches!(
        RulesEngine::compute_sheet(&bad_level_zero, &rules),
        Err(RuleError::InvalidLevel(0))
    ));

    let bad_level_high = create_test_record("guerrier", "humain", 21);
    assert!(matches!(
        RulesEngine::compute_sheet(&bad_level_high, &rules),
        Err(RuleError::InvalidLevel(21))
    ));

    // Erreurs apply_level_up (PathNotFound, RankNotFound)
    let mut record = create_test_record("guerrier", "humain", 1);
    let step_bad_path = LevelProgressionStep {
        level: 2,
        hp_gain: 6,
        abilities_learned: vec![AcquiredAbility {
            path_id: "voie-inexistante".into(),
            rank: 1,
        }],
        selected_path_ids: vec![],
        path_rank_choices: HashMap::new(),
        manual_stat_bonuses: HashMap::new(),
        languages_learned: vec![],
        secondary_talents_learned: vec![],
        timestamp: "2026-11-15T12:00:00Z".into(),
    };
    assert!(matches!(
        RulesEngine::apply_level_up(&mut record, step_bad_path, &rules),
        Err(RuleError::PathNotFound(_))
    ));

    let step_bad_rank = LevelProgressionStep {
        level: 2,
        hp_gain: 6,
        abilities_learned: vec![AcquiredAbility {
            path_id: "voie-du-bouclier".into(),
            rank: 99,
        }],
        selected_path_ids: vec![],
        path_rank_choices: HashMap::new(),
        manual_stat_bonuses: HashMap::new(),
        languages_learned: vec![],
        secondary_talents_learned: vec![],
        timestamp: "2026-11-15T12:00:00Z".into(),
    };
    assert!(matches!(
        RulesEngine::apply_level_up(&mut record, step_bad_rank, &rules),
        Err(RuleError::RankNotFound(_, 99))
    ));

    // Rollback invalide
    assert!(RulesEngine::rollback_to_level(&mut record, 0, &rules).is_err());
    assert!(RulesEngine::rollback_to_level(&mut record, 1, &rules).is_err());

    // Rollback avancé : retrait d'une nouvelle voie dans selected_path_ids + nettoyage manual_stat_bonuses à 0
    let mut bonus_map = HashMap::new();
    bonus_map.insert(StatCode::FOR, 1);
    let step_lvl2 = LevelProgressionStep {
        level: 2,
        hp_gain: 6,
        abilities_learned: vec![AcquiredAbility {
            path_id: "voie-de-la-resistance".into(),
            rank: 1,
        }],
        selected_path_ids: vec!["voie-de-la-resistance".into()],
        path_rank_choices: HashMap::new(),
        manual_stat_bonuses: bonus_map,
        languages_learned: vec![],
        secondary_talents_learned: vec![],
        timestamp: "2026-11-15T12:05:00Z".into(),
    };

    RulesEngine::apply_level_up(&mut record, step_lvl2, &rules).unwrap();
    assert!(record
        .selected_path_ids
        .contains(&"voie-de-la-resistance".to_string()));
    assert_eq!(record.manual_stat_bonuses.get(StatCode::FOR), 1);

    RulesEngine::rollback_to_level(&mut record, 1, &rules).unwrap();
    assert!(
        !record
            .selected_path_ids
            .contains(&"voie-de-la-resistance".to_string()),
        "La voie ajoutée au niveau 2 doit être retirée lors du rollback au niveau 1"
    );
    assert!(
        record.manual_stat_bonuses.get(StatCode::FOR) == 0,
        "Un bonus manuel retombé à 0 doit être supprimé de la HashMap"
    );
}

#[test]
fn test_external_ability_grants_and_stats() {
    let rules = RulesDatabase::load_embedded().unwrap();

    // 1. Mode libre (voie-du-demi-orc R2) empruntant voie-de-la-resistance R1 (ou une voie à bonus)
    let mut orc = create_test_record("guerrier", "demi-orc", 1);
    orc.acquired_abilities = vec![AcquiredAbility {
        path_id: "voie-du-demi-orc".into(),
        rank: 2,
    }];
    // Emprunt de voie-de-l-elfe-haut R5 (avec choix opt_int -> +1 INT) via external_ability_choices
    orc.external_ability_choices.insert(
        "voie-du-demi-orc_2".into(),
        AcquiredAbility {
            path_id: "voie-du-demi-orc".into(),
            rank: 5, // +1 FOR, +1 CON
        },
    );
    let sheet_orc = RulesEngine::compute_sheet(&orc, &rules).unwrap();
    assert_eq!(sheet_orc.path_bonus_stats.get(StatCode::FOR), 1);
    assert_eq!(sheet_orc.path_bonus_stats.get(StatCode::CON), 1);

    // 2. Mode défaut + remplacement (voie-du-farfadet R3 accorde Invisibilité R3 -> +1 sort)
    let mut farfadet = create_test_record("voleur", "farfadet", 1);
    farfadet.base_stats.set(StatCode::VOL, 2);
    farfadet.acquired_abilities = vec![AcquiredAbility {
        path_id: "voie-du-farfadet".into(),
        rank: 3,
    }];
    let sheet_def = RulesEngine::compute_sheet(&farfadet, &rules).unwrap();
    // Farfadet a +1 VOL racial (2 base + 1 = 3) + voie-de-la-magie-universelle R3 (1 sort) -> max_pm = 4
    assert_eq!(sheet_def.max_pm, 4);
}

#[test]
fn test_scaling_bonuses_conditions_and_non_stacking() {
    let rules = RulesDatabase::load_embedded().unwrap();

    // 1. Condition noArmor (voie-du-primitif R2 = +2 DEF sans armure, R4 = +3 DEF)
    let mut barb = create_test_record("barbare", "humain", 1);
    barb.acquired_abilities = vec![
        AcquiredAbility {
            path_id: "voie-du-primitif".into(),
            rank: 2,
        },
        AcquiredAbility {
            path_id: "voie-du-primitif".into(),
            rank: 4,
        },
    ];
    let sheet_no_armor = RulesEngine::compute_sheet(&barb, &rules).unwrap();
    // DEF = 10 + 2 AGI + 3 (atRank 4) = 15
    assert_eq!(sheet_no_armor.defense, 15);

    barb.equipped_armor_id = Some("cuir-simple".into());
    let sheet_with_armor = RulesEngine::compute_sheet(&barb, &rules).unwrap();
    // Avec armure (def 2), le bonus noArmor ne s'applique pas : 10 + 2 AGI + 2 armure = 14
    assert_eq!(sheet_with_armor.defense, 14);

    // 2. nonStackingGroup ("familier_defense" : voie-de-la-magie-universelle R2 + voie-des-animaux R2)
    let mut mage = create_test_record("magicien", "humain", 1);
    mage.acquired_abilities = vec![
        AcquiredAbility {
            path_id: "voie-de-la-magie-universelle".into(),
            rank: 2,
        },
        AcquiredAbility {
            path_id: "voie-des-animaux".into(),
            rank: 2,
        },
    ];
    let sheet_non_stack = RulesEngine::compute_sheet(&mage, &rules).unwrap();
    // +2 DEF une seule fois (pas +4) -> 10 + 2 AGI + 2 = 14
    assert_eq!(sheet_non_stack.defense, 14);
}

#[test]
fn test_stat_substitutions_defense_attack_and_weapons() {
    let rules = RulesDatabase::load_embedded().unwrap();

    // 1. Substitution de défense : voie-du-pagne R2 (CON remplace AGI si CON > AGI, sinon fallback +1)
    let mut record = create_test_record("barbare", "humain", 1);
    record.base_stats.set(StatCode::AGI, 1);
    record.base_stats.set(StatCode::CON, 4);
    record.acquired_abilities = vec![AcquiredAbility {
        path_id: "voie-du-pagne".into(),
        rank: 2,
    }];
    let sheet_con_def = RulesEngine::compute_sheet(&record, &rules).unwrap();
    assert_eq!(sheet_con_def.defense_stat, StatCode::CON);
    assert_eq!(sheet_con_def.defense_stat_source.as_deref(), Some("Peau de pierre"));
    assert_eq!(sheet_con_def.defense, 14); // 10 + 4 CON

    // Si AGI >= CON, fallbackDefenseBonus (+1) s'applique
    record.base_stats.set(StatCode::AGI, 4);
    record.base_stats.set(StatCode::CON, 2);
    let sheet_fallback = RulesEngine::compute_sheet(&record, &rules).unwrap();
    assert_eq!(sheet_fallback.defense_stat, StatCode::AGI);
    assert_eq!(sheet_fallback.defense, 15); // 10 + 4 AGI + 1 fallback

    // 2. Substitution d'attaque par arme : voie-de-l-escrime R1 (AGI pour lightWeapons)
    let mut escrimeur = create_test_record("voleur", "humain", 1);
    escrimeur.base_stats.set(StatCode::FOR, 0);
    escrimeur.base_stats.set(StatCode::AGI, 4);
    escrimeur.acquired_abilities = vec![AcquiredAbility {
        path_id: "voie-de-l-escrime".into(),
        rank: 1,
    }];
    escrimeur.weapons = vec![CharacterWeaponInstance {
        id: "w-1".into(),
        weapon_ref_id: "dague".into(),
        name: "Dague".into(),
        damage: "1d4".into(),
        range: "Contact".into(),
        category: WeaponCategory::Contact,
        bonus_attack: 0,
        bonus_damage: 0,
        requires_two_hands: false,
        attack_stat_used: None,
        attack_stat_source: None,
    }];
    let sheet_weapon = RulesEngine::compute_sheet(&escrimeur, &rules).unwrap();
    assert_eq!(sheet_weapon.record.weapons[0].attack_stat_used, Some(StatCode::AGI));
    assert_eq!(
        sheet_weapon.record.weapons[0].attack_stat_source.as_deref(),
        Some("Précision")
    );
}

#[test]
fn test_mana_with_spells_and_hybrid_level_1() {
    let rules = RulesDatabase::load_embedded().unwrap();

    // 1. Guerrier sans sort : max_pm == 0 même avec VOL > 0
    let mut warrior = create_test_record("guerrier", "humain", 1);
    warrior.base_stats.set(StatCode::VOL, 3);
    let sheet_w = RulesEngine::compute_sheet(&warrior, &rules).unwrap();
    assert_eq!(sheet_w.max_pm, 0);

    // 2. Magicien avec 2 sorts appris (voie-du-feu R1 et R2 si sorts)
    let mut mage = create_test_record("magicien", "humain", 1);
    mage.base_stats.set(StatCode::VOL, 3);
    mage.acquired_abilities = vec![
        AcquiredAbility {
            path_id: "voie-de-la-magie-universelle".into(),
            rank: 3,
        },
        AcquiredAbility {
            path_id: "voie-de-l-air".into(),
            rank: 3,
        },
    ];
    let sheet_m = RulesEngine::compute_sheet(&mage, &rules).unwrap();
    assert_eq!(sheet_m.max_pm, 5); // 3 VOL + 2 sorts

    // 3. Hybride niveau 1 (guerrier hp 6 + magicien hp 4, sans level_up_hp_gains)
    let mut hybrid = create_test_record("guerrier", "humain", 1);
    hybrid.level_up_hp_gains = vec![];
    hybrid.is_hybrid = Some(true);
    hybrid.secondary_profile_id = Some("magicien".into());
    let sheet_h = RulesEngine::compute_sheet(&hybrid, &rules).unwrap();
    // guerrier (5) + magicien (3) + 1 * 2 CON = 10
    assert_eq!(sheet_h.max_hp, 10);
    assert!(sheet_h.is_hybrid);
    assert_eq!(sheet_h.secondary_profile_name.as_deref(), Some("Magicien"));
}

#[test]
fn test_phase3_damage_crit_weapon_modifiers_and_out_of_pool_hybrid() {
    let rules = RulesDatabase::load_embedded().unwrap();

    // 1. Hybride détecté par voie de profil hors-pool (magicien + voie-du-bouclier)
    let mut hybrid_by_path = create_test_record("magicien", "humain", 1);
    hybrid_by_path.acquired_abilities = vec![AcquiredAbility {
        path_id: "voie-du-bouclier".into(),
        rank: 1,
    }];
    let sheet_hp = RulesEngine::compute_sheet(&hybrid_by_path, &rules).unwrap();
    assert!(sheet_hp.is_hybrid);

    // 2. active_weapon_modifiers (voie-du-nain R2 ou voie-de-l-elfe-sylvain R2)
    let mut dwarf = create_test_record("guerrier", "nain", 1);
    dwarf.acquired_abilities.push(AcquiredAbility {
        path_id: "voie-du-nain".into(),
        rank: 2,
    });
    let sheet_wm = RulesEngine::compute_sheet(&dwarf, &rules).unwrap();
    assert!(!sheet_wm.active_weapon_modifiers.is_empty());

    // 3. path_bonus_damage / path_crit_range_bonus (voie-du-spadassin R2 ou voie-du-duelliste)
    let mut fighter = create_test_record("guerrier", "humain", 1);
    fighter.acquired_abilities = vec![AcquiredAbility {
        path_id: "voie-du-combat-a-deux-armes".into(),
        rank: 1,
    }];
    let sheet_f = RulesEngine::compute_sheet(&fighter, &rules).unwrap();
    assert_eq!(sheet_f.path_bonus_damage.contact, 0);
}
