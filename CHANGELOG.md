# Changelog

## [Non publié]

### Modifié

- **Renommage de l'application en « Le Grimoire d'Osgild » (`eu.gagnon.OsgildApp`)** :
  - Mise à jour de `productName`, `identifier` (`eu.gagnon.OsgildApp`) et du titre de fenêtre (`COF2 — Le Grimoire d'Osgild`) dans `src-tauri/tauri.conf.json`.
  - Mise à jour du menu macOS dans `src-tauri/src/lib.rs` et de la description des permissions dans `src-tauri/capabilities/default.json`.
  - Mise à jour du titre HTML dans `index.html` et du nom affiché dans la barre de navigation (`src/components/Navbar.tsx`).
  - Mise à jour de la documentation (`README.md`, `AGENTS.md`, `docs/SECURITY.md`, `docs/DATA_MODELS.md`).

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
