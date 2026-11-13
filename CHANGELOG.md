# Changelog

## 0.8.5

### Ajouté

- Capacités externes avec **remplacement si déjà possédée** (`grantExternalAbility.defaultAbility` / `replacementAbilities`), résolues par `resolveExternalGrants()`.
  - Farfadet R2 « Langage des animaux » : si déjà possédée, choix d'une capacité de rôdeur ou de druide de rang 1.
  - Farfadet R3 « Invisibilité » : si déjà possédée, choix entre Télékinésie et Confusion.
- Composant `ExternalAbilitySelector` (onglet Capacités), extrait de `AbilitiesTab`.
- Tests Vitest `externalGrants.test.ts`.
- Stockage unitaire des caractéristiques (`baseStats`, `racialStatModifiers`, `manualStatBonuses`) et décomposition complète (`baseStats`, `racialBonusStats`, `pathBonusStats`, `manualBonusStats`, `otherBonusStats`, `finalStats`) dans le moteur TypeScript et Rust (`cof2-core`).
- Affichage détaillé des caractéristiques (`TOTAL` + 3 petites cases `Init.`, `Peuple`/`RAC.`, `Autres`/`AUT.`) dans `CharacteristicsCard`, `Step4Stats` et `PrintableCharacterSheet`, avec alignement vertical strict et boutons `+`/`-` empilés verticalement.

### Corrigé

- `LevelUpModal` : mise à jour des jauges courantes (`currentHp`, `currentDr`, `currentPc`, `currentPm`) selon l'écart entre anciens et nouveaux maximums lors de la validation d'une montée de niveau.

### Documentation

- `docs/DATA_MODELS.md` : section « Capacité externe & remplacement » et section « Modélisation & Décomposition Unitaire des Caractéristiques ».
