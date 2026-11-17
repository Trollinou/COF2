# Changelog

## 0.9.6

### Ajouté

- **Enrichissement du contrat `ComputedCharacterSheet` (`crates/cof2-core/src/models.rs`, `src/bindings.ts`)** :
  - Calcul et exposition directe côté Rust de `capability_points`, `equipment_options`, `external_grants`, `resolved_human_diversity` et `armor_spell_costs` (`compute_armor_spell_costs`).
- **Profil de production Rust (`Cargo.toml`)** :
  - Ajout du bloc `[profile.release]` (`lto = true`, `codegen-units = 1`, `strip = true`, `panic = "abort"`) et mise à jour de `thiserror` vers `2.0`.
- **Hooks & chargement de polices WOFF2 (`src/`)** :
  - Ajout des hooks `useMediaQuery` (`src/hooks/useMediaQuery.ts`) et `useLevelUpState` (`src/hooks/useLevelUpState.ts`).
  - Chargement exclusif des polices `.woff2` via `src/fonts.css` (`Cinzel` 500–800, `Inter` 400–700).
- **Déport des dernières règles de cohérence du Wizard (`crates/cof2-core/src/engine/creation.rs`, `src-tauri/src/commands.rs`)** :
  - Ajout de `sanitize_wizard_paths`, `select_profile_with_defaults`, `toggle_wizard_profile_path` et `auto_assign_characteristic_array` côté Rust (avec test d'intégration `test_wizard_coherence_functions`), exposés via `tauri-specta`.
  - Ajout du flag CLI `--export-bindings` sur `cof2-desktop` (`src-tauri/src/lib.rs`) pour régénérer `src/bindings.ts` sans ouvrir de fenêtre graphique.

### Modifié

- **Réduction des appels IPC React** :
  - Filtrage de `useComputedSheet` (`src/hooks/useComputedSheet.ts`) par empreinte mécanique (`getMechanicalFingerprint`) afin d'éviter les recalculs Rust sur les éditions purement narratives.
  - Suppression des `useEffect` IPC redondants dans `CharacterSheetView`, `CombatTab`, `AbilitiesTab`, `Step6Equipment`, `Step7Summary`, `PrintablePage1`, `ExternalAbilitySelector` et `HumanDiversitySelector` au profit de la lecture directe de `ComputedCharacterSheet`.
- **Optimisation du moteur Rust (`crates/cof2-core`)** :
  - Emprunts zéro-allocation (`'a`) sur `RulesDatabase` en Passe 1 (`bonuses.rs`, `stats.rs`).
  - Validation de l'assistant de création en un seul passage dans `validate_wizard_state` (`wizard.rs`).
  - Déduplication de `format_human_diversity_note` dans `combat.rs`.
- **Historique, détection de modifications & langues COF2** :
  - Coalescence des éditions rapides (< 500 ms) non structurelles dans `useCharacterHistory.ts` (`COALESCE_WINDOW_MS`), avec test dédié dans `useCharacterHistory.test.ts`.
  - Comparaison `isDirty` ignorant `updatedAt` via `serializeComparable` et sérialisation `localStorage` différée dans `App.tsx`.
  - Alignement de `OFFICIAL_LANGUAGES` sur les 11 langues officielles COF2 et normalisation de `"Noir parlé"` via `isSameLanguage` (`src/utils/uiConstants.ts`, `crates/cof2-core/src/engine/languages.rs`).
- **Modularité UI (`<= 400` lignes) & montage responsive unique** :
  - Montage conditionnel unique de `CombatDefensesCard` et `AbilitiesTab` selon `useMediaQuery('(min-width: 1536px)')` dans `CharacterSheetView.tsx`.
  - Découpage des composants volumineux et extraction de `WizardProfilePathCard`, `Step7VitalsAndStats`, `Step7PathsSection`, `Step1PeopleDetailPanel`, `PrintableLeftColumn`, `PrintableCenterColumn` et `AbilityRankItem`.
- **Unification complète des types Rust ↔ TypeScript (`src/bindings.ts`)** :
  - Introduction de `StatBlock` (struct à 7 champs garantis avec rétrocompatibilité JSON `.cof2`) et des enums typés `WeaponCategory` (`contact` | `distance`) et `EnergyType` (`PM` | `PE`) dans `crates/cof2-core/src/models.rs`.
  - Ré-export direct des types générés dans `src/types/character.ts` et `src/types/rules.ts`, suppression des couches de conversion dans `src/engine/rustBridge.ts`, et nettoyage de `src/hooks/useWizardState.ts`.
- **Documentation de sécurité (`docs/SECURITY.md`)** :
  - Alignement complet sur l'architecture Tauri v2 (`src-tauri/`), la validation Rust (`crates/cof2-core/src/validation.rs`) et la persistance atomique (`persist_with_retry`).

### Corrigé

- **Diversité humaine (`crates/cof2-core/src/engine/creation.rs`)** :
  - Réinitialisation automatique de `human_diversity` lors d'un changement de peuple dans `apply_racial_defaults` lorsque le personnage ne possède pas le rang 1 requis.
- **Tests unitaires `src-tauri` sous Windows (`src-tauri/Cargo.toml`, `src-tauri/src/main.rs`)** :
  - Déplacement des tests unitaires vers la cible binaire `src-tauri/src/main.rs` (`[lib] test = false`) afin de lier le manifeste Windows ComCtl32 v6 généré par `tauri-build`.
- **Persistance atomique sous Windows (`crates/cof2-storage/src/lib.rs`)** :
  - Ajout de `persist_with_retry` (jusqu'à 6 tentatives avec backoff exponentiel sur `ErrorKind::PermissionDenied`) pour absorber les verrous transitoires NTFS lors de remplacements concurrents (`test_concurrent_atomic_saves`).

### Supprimé

- **Allègement du bundle & des dépendances (`package.json`, `src/main.tsx`)** :
  - Suppression des dépendances npm inutilisées (`@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `clsx`, `tailwind-merge`) et abandon du chargement des fichiers `.woff` hérités (-195 Ko sur les polices).

## 0.9.5

### Ajouté

- **Portage intégral de la logique métier COF2 vers Rust (`crates/cof2-core`)** :
  - Validation et migration de fiches (`validation.rs` : `validate_and_migrate_record`, `ValidationResult`), avec migration automatique des fichiers `.cof2`/`.json` chargés via `CharacterStorage::load_raw_json` (`crates/cof2-storage`).
  - Création de personnage, point-buy et détection de tableaux de caractéristiques (`engine/creation.rs` : `default_character_record`, `blank_wizard_character_record`, `apply_racial_defaults`, `evaluate_point_buy_stats`, `detect_characteristic_array_preset`).
  - Diversité Humaine (`engine/diversity.rs` : `resolve_human_diversity`, `is_human_diversity_valid`, `has_human_diversity_rank1`, `format_human_diversity_note`).
  - Équipement, maîtrises, dotation par défaut et calcul des armes équipées (`engine/equipment.rs` : `get_equipment_options`, `get_default_equipment_for_profile`, `sanitize_character_equipment`, `compute_weapons_info`).
  - Résolution des statistiques de compagnons (`engine/companion.rs`) intégrée directement dans `ComputedCharacterSheet.companions`.
  - Règles de progression, prérequis de prestige, hybridation, calcul des PV de montée de niveau, coût en PM d'incantation en armure et dons externes (`engine/progression.rs`, `engine/paths.rs`, `engine/grants.rs`).
  - Validation métier de l'Assistant de Création (`engine/wizard.rs` : `validate_wizard_step`, `get_max_unlocked_wizard_step`, `validate_wizard_state`).
- **Commandes IPC Tauri (`src-tauri/src/commands.rs`, `src/bindings.ts`)** : exposition via `tauri-specta` de toutes les nouvelles commandes métier et régénération automatique des bindings TypeScript.
- **Tests d'intégration Rust (`crates/cof2-core/tests/suite/migrated_rules_test.rs`)** : couverture des modules migrés (35 tests Rust passants).

### Modifié

- **Architecture « Pure Dumb UI » & Shell Tauri exclusif** :
  - `useComputedSheet.ts`, `rustBridge.ts`, `fileBridge.ts`, `App.tsx`, `useWizardState.ts`, `LevelUpModal.tsx` et les composants de fiche/wizard consomment exclusivement les commandes IPC Rust.
  - `src/engine/compendium.ts` est conservé en lecture seule statique sur `src/data/*.json` pour un affichage synchrone de l'interface (Option A), accompagné des constantes UI dans `src/utils/uiConstants.ts`.
  - Mise à jour de `AGENTS.md` et `docs/DATA_MODELS.md`.

### Supprimé

- **Suppression complète du repli Web et des modules métier TypeScript dupliqués** :
  - Suppression de `statsFallback.ts`, `characterFactory.ts`, `equipmentRules.ts`, `progressionRules.ts`, `pathHelpers.ts`, `rulesEngine.ts`, `characterValidation.ts`, `humanDiversity.ts`, `languageUtils.ts`, `wizardValidation.ts` et des 6 suites Vitest correspondantes migrées vers Rust.

## 0.9.0

### Ajouté

- **Voies supplémentaires de l'Atlas (`regles/ATLAS - Voie supplementaire.md`)** :
  - Ajout de 5 nouvelles voies dans `src/data/paths.json` : *Voie des Arcanes Exhumés* (Magicien, avec compagnon *Chien de garde* au rang 4), *Voie des Arcanes Oubliés* (Magicien), *Voie des Arcanes Perdus* (Magicien), *Voie des Arcanes Obscurs* (Sorcier) et *Voie de la Corruption* (Prêtre maléfique).
  - Ajout du champ optionnel `optionalPaths` sur `ProfileData` (`src/data/profiles.json`, `src/types/cof2.ts`) pour `magicien`, `sorcier` et `pretre` (en remplacement d'une des 5 voies habituelles dès le niveau 1).
  - Prise en charge dans `rulesEngine.ts` (`getProfileAllPoolPathIds`, `isPathInProfilePool`, `getMageCreationRank2Ability`, `getAccessiblePathsForLevelUp`, `canCharacterAdoptHybridPath`), l'assistant de création (`Step5Paths`, `CharacterWizard`, `wizardValidation`) et la montée de niveau (`LevelUpModal`).
  - Mise à jour de `docs/DATA_MODELS.md` et ajout de tests unitaires dans `src/engine/__tests__/rulesEngine.test.ts`.

### Modifié

- **Renommage de l'application en « Le Grimoire d'Osgild » (`eu.gagnon.OsgildApp`)** :
  - Mise à jour de `productName`, `identifier` (`eu.gagnon.OsgildApp`) et du titre de fenêtre (`COF2 — Le Grimoire d'Osgild`) dans `src-tauri/tauri.conf.json`.
  - Mise à jour du menu macOS dans `src-tauri/src/lib.rs` et de la description des permissions dans `src-tauri/capabilities/default.json`.
  - Mise à jour du titre HTML dans `index.html` et du nom affiché dans la barre de navigation (`src/components/Navbar.tsx`).
  - Mise à jour de la documentation (`README.md`, `AGENTS.md`, `docs/SECURITY.md`, `docs/DATA_MODELS.md`).

### Corrigé

- **Compilation et packaging Windows (`src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`)** :
  - Ajout de `#[cfg_attr(not(target_os = "macos"), allow(unused_mut))]` sur `menu_builder` dans `build_app_menu` (`src-tauri/src/lib.rs`) pour supprimer l'avertissement `unused_mut` hors macOS.
  - Remplacement de l'apostrophe ASCII (`'`) par l'apostrophe typographique (`’`) dans `productName` (`"Le Grimoire d’Osgild"`, `src-tauri/tauri.conf.json`) afin d'éviter le cassage des macros NSIS (`IsShortcutTarget` / `NSISCOMCALL`) lors de `npm run tauri:build`.

## 0.8.6

### Ajouté

- **Refonte de l'Assistant de Création (`CharacterWizard`, `wizardValidation.ts`)** :
  - Nouvel enchaînement en 7 étapes : **Peuple → Profil → Caractéristiques → Voies → Équipement → Identité & Langues → Bilan**.
  - Initialisation vierge via `createBlankWizardCharacter()` (aucun peuple, profil, méthode de caractéristiques, voie de profil, divinité ou sexe présélectionné).
  - Contrôles bloquants par étape (`validateWizardStep`, `getMaxUnlockedWizardStep`) avec verrouillage des étapes futures dans le stepper et affichage de la raison du blocage.
  - Tests unitaires dans `src/engine/__tests__/wizardValidation.test.ts`.
- **Capacité de rang 2 bonus des Mages (niveau 1)** :
  - Prise en charge de la règle officielle COF2 pour tous les profils de la famille des Mages (`Magicien`, `Sorcier`, `Ensorceleur`, `Forgesort`, `Primaliste`), le `Psionique` ayant choisi la famille `Mages`, ainsi que les personnages hybrides concernés.
  - Nouveau composant `MageBonusRank2Panel` dans l'étape 5 (`Step5Paths`) pour choisir gratuitement dès la création une capacité de rang 2 dans l'une des deux voies de profil ou le rang 2 de la *Voie du Mage* (*Maîtrise de la magie*), avec validation dans `CharacterWizard` et nettoyage automatique en cas de changement de profil ou de famille.
  - Moteur `rulesEngine.ts` : ajout de `hasMageCreationBonus()`, `canUseVoieDuMage()`, `getMageCreationRank2Ability()`, et prise en compte du point bonus de départ dans `calculateCapabilityPoints()`.
  - Tests Vitest associés dans `src/engine/__tests__/rulesEngine.test.ts`.

### Modifié

- **Refonte des écrans de l'Assistant de Création** :
  - **Peuple (`Step1Peoples`)** : ajout des badges de modificateurs raciaux (bonus en émeraude puis malus en rouge) sur la liste des peuples ; suppression des présélections sur les choix raciaux et l'héritage du Demi-elfe.
  - **Profil (`Step3Profiles`)** : suppression de la présélection de famille pour le Psionique.
  - **Caractéristiques (`Step4Stats`)** : séparation des modificateurs raciaux en deux lignes distinctes (Bonus / Malus) et validation de la répartition complète (dont méthode par achat).
  - **Voies (`Step5Paths`, `RankChoiceSelector`)** : aucune voie de profil ni divinité présélectionnée ; choix explicite requis pour les options de rang (`requireExplicitChoice`).
  - **Identité & Langues (`Step2Identity`, `LanguageSelectorPanel`)** : verrouillage automatique du sexe pour les Lutins (`Farfadet` → Masculin, `Fée` → Féminin), réorganisation de `Taille` et `Poids` avec labels `Défaut` alignés à droite, boutons `1d20` séparés pour Idéal et Travers, et intégration du sélecteur de langues/talents avec blocage quand tous les emplacements sont utilisés (`enforceSlotLimit`).
  - **Bilan (`Step7Summary`)** : écran 100 % lecture seule affichant les 4 panels (PV, DR, PC, Défense) avec détail des formules, peuple et modificateurs, profil(s), caractéristiques détaillées, voies et rangs sans description, équipement et bourse.
- **Revue UX de la Fiche de personnage, Assistant et Montée de niveau** :
  - **Voies & Capacités (`AbilitiesTab`, `CharacterSheetView`, `App`)** : suppression du déblocage/retrait libre des capacités et du bouton redondant « Gérer la progression » ; affichage en lecture seule des rangs (`Acquise ✓` / `Non acquise`), des options de rang (`RankChoiceSelector`) et des capacités externes (`ExternalAbilitySelector`).
  - **Biographie & Traits (`BioTab`)** : passage en lecture seule de la voie de peuple du Demi-elfe et du sacerdoce/domaine du Prêtre ; suppression des suggestions de noms et du bouton de réapplication des mensurations (reportés dans l'assistant).
  - **Assistant de création (`Step2Identity`, `Step5Paths`)** : ajout des suggestions de noms typiques cliquables et du bouton `↺ Réappliquer les mensurations du peuple` à l'étape 2 ; intégration de `RankChoiceSelector` et `ExternalAbilitySelector` à l'étape 5.
  - **Montée de niveau (`LevelUpModal`, `LevelUpPathCard`)** : intégration des choix d'options de rang (`pathRankChoices`) et de capacités externes (`externalAbilityChoices`) en brouillon avec calcul en direct et sauvegarde à la validation.
- Remplacement du choix « Saisie libre » par la **Méthode par achat** (règle avancée de l'Atlas) à l'étape 4 de l'assistant de création (`Step4Stats`, `CharacterWizard`) :
  - Base de `0` pour les 7 caractéristiques avec un budget initial de **7 points** (`+1` : 1 pt, `+2` : 2 pts, `+3` : 4 pts, `+4` : 6 pts).
  - Jusqu'à **2 caractéristiques faibles à `-1`**, accordant chacune **+1 point** supplémentaire au budget (jusqu'à 9 points).
  - Affichage en temps réel des points restants, du compteur de faiblesses (`X / 2 max`), du barème, bouton de réinitialisation à `0`, et répartition automatique profil (`+3 / +2 / +1`).
  - Rétrocompatibilité conservée pour les fiches existantes ayant `statArrayPreset: 'libre'`.
- Moteur `rulesEngine.ts` : ajout de `POINT_BUY_COSTS` et `evaluatePointBuyStats()`, et mise à jour de `detectCharacteristicArrayPreset()` pour retourner `'achat'`.
- Tests Vitest : ajout de cas de test pour `evaluatePointBuyStats()` dans `src/engine/__tests__/rulesEngine.test.ts` (exemples Helga Martellame, Kamshaka et cas invalides).

### Documentation

- `README.md`, `CHANGELOG.md` et `docs/DATA_MODELS.md` : documentation de la méthode par achat (Atlas) et de `statArrayPreset: 'achat'`.

### Corrigé

- `CharacterSheetView` : correction de la surbrillance simultanée de l'onglet précédent et de l'onglet « Voies & Capacités » sur écrans `< 2xl`.
- `save_character_file` / `CharacterWeaponInstance` : ajout de `#[serde(default)]` sur `bonus_attack` et `bonus_damage` dans `crates/cof2-core/src/models.rs` et initialisation explicite (`bonusAttack: 0`, `bonusDamage: 0`) à la création d'armes (`rulesEngine.ts`, `CharacterWizard.tsx`, `CharacterSheetView.tsx`).
- `InventoryTab` : affichage des pièces dans l'ordre officiel **Or (po) → Argent (pa) → Cuivre (pc)**.
- `paths.json` & `rulesEngine.ts` : ajout du bonus de DEF (+2) sur *Petit compagnon* (Voie des animaux R2) et des bonus de *Familier* (+2 DEF, +2 Initiative, Voie de la magie universelle R2), avec gestion du non-cumul de DEF via `nonStackingGroup`.

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
