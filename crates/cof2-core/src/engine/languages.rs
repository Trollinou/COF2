use crate::models::{CharacterRecord, LanguageSummary, LiteracyStatus};
use crate::rules::PeopleStatic;

/// Calcule les langues automatiques, emplacements bonus et niveau d'alphabétisation.
pub(crate) fn compute_languages_info(
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
