# Changelog

## [Non publié]

### Modifié

- Remplacement du choix « Saisie libre » par la **Méthode par achat** (règle avancée de l'Atlas) à l'étape 4 de l'assistant de création (`Step4Stats`, `CharacterWizard`) :
  - Base de `0` pour les 7 caractéristiques avec un budget initial de **7 points** (`+1` : 1 pt, `+2` : 2 pts, `+3` : 4 pts, `+4` : 6 pts).
  - Jusqu'à **2 caractéristiques faibles à `-1`**, accordant chacune **+1 point** supplémentaire au budget (jusqu'à 9 points).
  - Affichage en temps réel des points restants, du compteur de faiblesses (`X / 2 max`), du barème, bouton de réinitialisation à `0`, et répartition automatique profil (`+3 / +2 / +1`).
  - Rétrocompatibilité conservée pour les fiches existantes ayant `statArrayPreset: 'libre'`.
- Moteur `rulesEngine.ts` : ajout de `POINT_BUY_COSTS` et `evaluatePointBuyStats()`, et mise à jour de `detectCharacteristicArrayPreset()` pour retourner `'achat'`.
- Tests Vitest : ajout de cas de test pour `evaluatePointBuyStats()` dans `src/engine/__tests__/rulesEngine.test.ts` (exemples Helga Martellame, Kamshaka et cas invalides).

### Documentation

- `README.md`, `CHANGELOG.md` et `docs/DATA_MODELS.md` : documentation de la méthode par achat (Atlas) et de `statArrayPreset: 'achat'`.

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
