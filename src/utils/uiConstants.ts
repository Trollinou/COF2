import type { LiteracyStatus } from "../types/cof2";

export const WIZARD_STEPS = [
  { step: 1, label: "Peuple" },
  { step: 2, label: "Profil" },
  { step: 3, label: "Caracs" },
  { step: 4, label: "Voies" },
  { step: 5, label: "Équipement" },
  { step: 6, label: "Identité" },
  { step: 7, label: "Bilan" },
] as const;

export const POINT_BUY_MAX_WEAK_STATS = 2;

export const POINT_BUY_COSTS: Record<number, number> = {
  [-1]: 0,
  0: 0,
  1: 1,
  2: 2,
  3: 4,
  4: 6,
};

export const OFFICIAL_LANGUAGES: readonly string[] = [
  "Commun",
  "Elfe",
  "Nain",
  "Gnome",
  "Orc",
  "Gobelin",
  "Géant",
  "Sylvestre",
  "Draconique",
  "Démoniaque",
  "Céleste",
  "Argotien",
];

export const SECONDARY_TALENT_EXAMPLES: readonly string[] = [
  "Forgeron",
  "Héraldique",
  "Cuisine",
  "Navigation",
  "Musique",
  "Calligraphie",
];

export function getLiteracyLabel(status: LiteracyStatus): string {
  switch (status) {
    case "illiterate":
      return "Illettré";
    case "hesitant":
      return "Lecture / Écriture hésitante";
    case "literate":
      return "Lettré (courant)";
  }
}

export const HUMAN_DIVERSITY_PATH_ID = "voie-de-l-humain";

export interface HumanOriginOption {
  id: string;
  label: string;
  domains: [string, string];
}

export const HUMAN_ORIGINS: HumanOriginOption[] = [
  {
    id: "montagnard",
    label: "Montagnard",
    domains: ["Escalade", "Résistance au froid"],
  },
  {
    id: "citadin",
    label: "Citadin",
    domains: ["Commerce", "Résistance aux maladies"],
  },
  {
    id: "campagnard",
    label: "Campagnard",
    domains: ["Météorologie", "Équitation"],
  },
  {
    id: "riverain",
    label: "Riverain",
    domains: ["Natation", "Navigation"],
  },
  {
    id: "sauvage",
    label: "Sauvage",
    domains: ["Chasser", "Pister"],
  },
  {
    id: "nomade",
    label: "Nomade",
    domains: ["Orientation", "Résistance à la chaleur ou au froid"],
  },
];

export const HUMAN_TRADE_SUGGESTIONS: string[] = [
  "Serrurier",
  "Forgeron",
  "Scribe",
  "Maçon",
  "Chasseur",
  "Cuisinier",
  "Acrobate",
  "Pickpocket",
  "Bibliothécaire",
  "Étudiant",
];

export function getRankPointCost(rank: number): number {
  return rank <= 2 ? 1 : 2;
}

export function getRankLevelRequirement(
  isPrestige: boolean,
  rank: number,
  pathId?: string,
): number {
  if (isPrestige) {
    if (pathId === "voie-du-familier-fantastique") {
      switch (rank) {
        case 3:
          return 3;
        case 4:
          return 5;
        case 5:
          return 7;
        case 6:
          return 9;
        case 7:
          return 11;
        default:
          return 3;
      }
    }
    switch (rank) {
      case 3:
        return 3;
      case 4:
        return 5;
      case 5:
        return 7;
      case 6:
        return 9;
      case 7:
        return 11;
      case 8:
        return 13;
      default:
        return 5;
    }
  }
  switch (rank) {
    case 1:
    case 2:
      return 1;
    case 3:
      return 3;
    case 4:
      return 5;
    case 5:
      return 7;
    default:
      return 1;
  }
}
