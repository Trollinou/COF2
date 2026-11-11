# Changelog

## 1.0.5

### Ajouté
- Capacités externes avec **remplacement si déjà possédée** (`grantExternalAbility.defaultAbility` / `replacementAbilities`), résolues par `resolveExternalGrants()`.
  - Farfadet R2 « Langage des animaux » : si déjà possédée, choix d'une capacité de rôdeur ou de druide de rang 1.
  - Farfadet R3 « Invisibilité » : si déjà possédée, choix entre Télékinésie et Confusion.
- Composant `ExternalAbilitySelector` (onglet Capacités), extrait de `AbilitiesTab`.
- Tests Vitest `externalGrants.test.ts`.

### Documentation
- `docs/DATA_MODELS.md` : section « Capacité externe & remplacement ».
