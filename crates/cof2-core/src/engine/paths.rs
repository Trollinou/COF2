use crate::engine::creation::get_racial_path_id;
use crate::models::{AcquiredAbility, CharacterRecord};
use crate::rules::{ProfileStatic, RulesDatabase};
use std::collections::HashSet;

pub fn is_mage_profile(profile_id: &str) -> bool {
    matches!(
        profile_id,
        "ensorceleur" | "forgesort" | "magicien" | "sorcier"
    )
}

pub fn has_mage_creation_bonus(record: &CharacterRecord, rules: &RulesDatabase) -> bool {
    let profile = rules.profiles.get(&record.profile_id);
    let sec_profile = if record.is_hybrid.unwrap_or(false) {
        record
            .secondary_profile_id
            .as_ref()
            .and_then(|id| rules.profiles.get(id))
    } else {
        None
    };

    let is_psionic_mage = (record.profile_id == "psionique"
        || (record.is_hybrid.unwrap_or(false)
            && record.secondary_profile_id.as_deref() == Some("psionique")))
        && record.profile_family.as_ref() == Some(&crate::models::ProfileFamily::Mages);

    profile.map(|p| p.has_mage_bonus).unwrap_or(false)
        || sec_profile.map(|p| p.has_mage_bonus).unwrap_or(false)
        || is_psionic_mage
}

pub fn can_use_voie_du_mage(record: &CharacterRecord) -> bool {
    let is_psionic_mage = (record.profile_id == "psionique"
        || (record.is_hybrid.unwrap_or(false)
            && record.secondary_profile_id.as_deref() == Some("psionique")))
        && record.profile_family.as_ref() == Some(&crate::models::ProfileFamily::Mages);

    is_mage_profile(&record.profile_id)
        || (record.is_hybrid.unwrap_or(false)
            && record
                .secondary_profile_id
                .as_deref()
                .map(is_mage_profile)
                .unwrap_or(false))
        || is_psionic_mage
}

pub fn get_profile_all_pool_path_ids(profile: &ProfileStatic) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for pid in profile.paths.iter().chain(profile.optional_paths.iter()) {
        if seen.insert(pid.clone()) {
            out.push(pid.clone());
        }
    }
    out
}

pub fn is_path_in_profile_pool(profile: &ProfileStatic, path_id: &str) -> bool {
    profile.paths.iter().any(|p| p == path_id)
        || profile.optional_paths.iter().any(|p| p == path_id)
}

pub fn get_mage_creation_rank2_ability(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> Option<AcquiredAbility> {
    if !has_mage_creation_bonus(record, rules) {
        return None;
    }

    let mut all_pool: HashSet<String> = HashSet::new();
    if let Some(p) = rules.profiles.get(&record.profile_id) {
        all_pool.extend(get_profile_all_pool_path_ids(p));
    }
    if record.is_hybrid.unwrap_or(false) {
        if let Some(ref sec_id) = record.secondary_profile_id {
            if let Some(sp) = rules.profiles.get(sec_id) {
                all_pool.extend(get_profile_all_pool_path_ids(sp));
            }
        }
    }

    let can_mage = can_use_voie_du_mage(record);
    let eligible_paths: HashSet<&str> = record
        .selected_path_ids
        .iter()
        .filter(|id| all_pool.contains(*id) || (*id == "voie-du-mage" && can_mage))
        .map(String::as_str)
        .collect();

    record
        .acquired_abilities
        .iter()
        .find(|a| a.rank == 2 && eligible_paths.contains(a.path_id.as_str()))
        .cloned()
}

pub fn is_domain_path(path_id: &str, rules: &RulesDatabase) -> bool {
    rules
        .paths
        .get(path_id)
        .and_then(|p| p.path_type.as_deref())
        == Some("domain")
}

pub fn is_racial_replacement_path(path_id: &str, rules: &RulesDatabase) -> bool {
    is_domain_path(path_id, rules) || path_id == "voie-du-mage"
}

pub fn get_replaced_racial_path_id(
    record: &CharacterRecord,
    rules: &RulesDatabase,
) -> Option<String> {
    record
        .selected_path_ids
        .iter()
        .find(|id| is_racial_replacement_path(id, rules))?;

    let racial_acq = record.acquired_abilities.iter().find(|a| {
        rules
            .paths
            .get(&a.path_id)
            .and_then(|p| p.path_type.as_deref())
            == Some("racial")
            && a.rank == 1
    });

    Some(
        racial_acq
            .map(|a| a.path_id.clone())
            .unwrap_or_else(|| get_racial_path_id(&record.people_id, rules)),
    )
}
