use crate::models::{CharacterRecord, HumanDiversityChoice};
use serde::{Deserialize, Serialize};
use specta::Type;

pub const HUMAN_DIVERSITY_PATH_ID: &str = "voie-de-l-humain";

pub struct HumanOriginPreset {
    pub id: &'static str,
    pub label: &'static str,
    pub domains: [&'static str; 2],
}

pub const HUMAN_ORIGINS: [HumanOriginPreset; 6] = [
    HumanOriginPreset {
        id: "montagnard",
        label: "Montagnard",
        domains: ["Escalade", "Résistance au froid"],
    },
    HumanOriginPreset {
        id: "citadin",
        label: "Citadin",
        domains: ["Commerce", "Résistance aux maladies"],
    },
    HumanOriginPreset {
        id: "campagnard",
        label: "Campagnard",
        domains: ["Météorologie", "Équitation"],
    },
    HumanOriginPreset {
        id: "riverain",
        label: "Riverain",
        domains: ["Natation", "Navigation"],
    },
    HumanOriginPreset {
        id: "sauvage",
        label: "Sauvage",
        domains: ["Chasser", "Pister"],
    },
    HumanOriginPreset {
        id: "nomade",
        label: "Nomade",
        domains: ["Orientation", "Résistance à la chaleur ou au froid"],
    },
];

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedHumanDiversity {
    pub origin_id: String,
    pub origin_label: String,
    pub base_domains: [String; 2],
    pub effective_domains: [String; 2],
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replaced_domain_index: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub replacement_trade: Option<String>,
}

/// Indique si le personnage possède la capacité « Diversité » (Voie de l'humain, Rang 1).
pub fn has_human_diversity_rank1(record: &CharacterRecord) -> bool {
    if record
        .acquired_abilities
        .iter()
        .any(|a| a.path_id == HUMAN_DIVERSITY_PATH_ID && a.rank == 1)
    {
        return true;
    }
    record.people_id == "humain"
}

/// Résout l'origine et les deux domaines effectifs (+3) pour « Diversité ».
pub fn resolve_human_diversity(
    choice: Option<&HumanDiversityChoice>,
) -> Option<ResolvedHumanDiversity> {
    let choice = choice?;
    if choice.origin_id.is_empty() {
        return None;
    }

    let (origin_label, base_domains) = if choice.origin_id == "custom" {
        let label = choice
            .custom_origin_name
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .unwrap_or("Origine personnalisée")
            .to_string();
        let d1 = choice
            .custom_domain_1
            .as_deref()
            .map(str::trim)
            .unwrap_or("")
            .to_string();
        let d2 = choice
            .custom_domain_2
            .as_deref()
            .map(str::trim)
            .unwrap_or("")
            .to_string();
        (label, [d1, d2])
    } else {
        let preset = HUMAN_ORIGINS.iter().find(|o| o.id == choice.origin_id)?;
        (
            preset.label.to_string(),
            [preset.domains[0].to_string(), preset.domains[1].to_string()],
        )
    };

    let trade = choice
        .replacement_trade
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string);

    let replaced_idx = match choice.replaced_domain_index {
        Some(0) => Some(0u8),
        Some(1) => Some(1u8),
        _ => None,
    };

    let mut effective_domains = base_domains.clone();
    let (final_idx, final_trade) = match (replaced_idx, trade) {
        (Some(idx), Some(t)) => {
            effective_domains[idx as usize] = t.clone();
            (Some(idx), Some(t))
        }
        _ => (None, None),
    };

    Some(ResolvedHumanDiversity {
        origin_id: choice.origin_id.clone(),
        origin_label,
        base_domains,
        effective_domains,
        replaced_domain_index: final_idx,
        replacement_trade: final_trade,
    })
}

/// Vérifie que le choix de Diversité est complet et valide.
pub fn is_human_diversity_valid(choice: Option<&HumanDiversityChoice>) -> bool {
    let Some(choice) = choice else {
        return false;
    };
    if choice.origin_id.is_empty() {
        return false;
    }

    let has_trade = choice
        .replacement_trade
        .as_deref()
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false);

    if choice.origin_id == "custom" {
        let has_name = choice
            .custom_origin_name
            .as_deref()
            .map(|s| !s.trim().is_empty())
            .unwrap_or(false);
        if !has_name {
            return false;
        }
        let d1_ok = if choice.replaced_domain_index == Some(0) {
            has_trade
        } else {
            choice
                .custom_domain_1
                .as_deref()
                .map(|s| !s.trim().is_empty())
                .unwrap_or(false)
        };
        let d2_ok = if choice.replaced_domain_index == Some(1) {
            has_trade
        } else {
            choice
                .custom_domain_2
                .as_deref()
                .map(|s| !s.trim().is_empty())
                .unwrap_or(false)
        };
        return d1_ok && d2_ok;
    }

    if !HUMAN_ORIGINS.iter().any(|o| o.id == choice.origin_id) {
        return false;
    }

    if matches!(choice.replaced_domain_index, Some(0) | Some(1)) {
        return has_trade;
    }

    true
}

/// Formate la note situationnelle associée au choix de Diversité.
pub fn format_human_diversity_note(choice: Option<&HumanDiversityChoice>) -> Option<String> {
    let resolved = resolve_human_diversity(choice)?;
    let formatted: Vec<String> = resolved
        .effective_domains
        .iter()
        .enumerate()
        .filter_map(|(idx, d)| {
            if d.is_empty() {
                None
            } else if resolved.replaced_domain_index == Some(idx as u8) {
                Some(format!("{d} (gagne-pain)"))
            } else {
                Some(d.clone())
            }
        })
        .collect();

    if formatted.is_empty() {
        None
    } else {
        Some(format!(
            "Diversité ({}) : +3 aux tests de {}",
            resolved.origin_label,
            formatted.join(" et ")
        ))
    }
}
