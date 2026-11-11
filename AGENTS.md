# 🤖 Guide des Bonnes Pratiques & Directives de Développement (AGENTS.md)

Ce document rassemble les conventions d'architecture, règles de développement, contraintes de performance, de sécurité et d'ingénierie Rust destinées aux agents IA et aux développeurs intervenant sur le projet **COF2 Compagnon**.

---

## 1. 🎯 Vue d'Ensemble & Philosophie du Projet

- **Produit :** Application hybride Desktop (**Rust + Tauri v2**) et Web (**Vite / React 19 / Tailwind CSS**) dédiée à la création, la gestion et la progression de personnages pour le jeu de rôle **Chroniques Oubliées Fantasy 2 (COF2)**.
- **Principes cardinaux :**
  1. **Fidélité stricte aux règles officielles COF2** : Le moteur de règles Rust (`crates/cof2-core`) est l'unique autorité de calcul (*Single Source of Truth*) pour les formules, profils, peuples, voies, armes et armures.
  2. **Offline-First & Autonomie Totale (Air-Gapped)** : L'application fonctionne à 100% hors-ligne (en convention, en déplacement, etc.). Aucune ressource critique ne dépend d'un CDN ou d'un réseau sortant (`connect-src 'none'`).
  3. **Sécurité et intégrité des fiches de héros** : Sauvegardes atomiques (`.tmp` $\to$ `rename`), validation stricte des fichiers importés, aucune corruption possible en cas de coupure de courant.
  4. **Performance & Réactivité** : Navigation instantanée, calculs de règles natifs en Rust ultra-rapides, et interface déclarative fluide.

---

## 2. 🏛️ Architecture & Découpage du Code (Cargo Workspace)

```text
COF2/
├── .vscode/                   # Configuration partagée VS Code (extensions, settings)
├── Cargo.toml                 # Workspace Cargo racine (profils dev légers, dépendances partagées)
├── docs/                      # Documentation technique
│   ├── DATA_MODELS.md         # Schéma V2 des fichiers JSON (src/data/) & guide d'audit
│   └── SECURITY.md            # Politique & Architecture de Sécurité (DevSecOps)
├── crates/
│   ├── cof2-core/             # Moteur de règles COF2 pur en Rust (ZÉRO dépendance UI/OS/Tauri)
│   │   ├── src/               # Modèles, compendium statique embarqué, moteur de calcul, level-up
│   │   └── tests/             # Tests d'intégration monobinaires (tests/integration_tests.rs -> tests/suite/)
│   └── cof2-storage/          # Bibliothèque de persistance locale atomique (.tmp -> rename)
│       ├── src/               # Sauvegarde et chargement non-bloquants zéro-corruption
│       └── tests/             # Tests de persistance atomique
├── src-tauri/                 # Shell Desktop Tauri v2 (air-gapped, connect-src 'none')
│   ├── capabilities/          # Permissions granulaires (default.json)
│   ├── src/                   # Commandes IPC (commands.rs), builder tauri-specta (lib.rs, main.rs)
│   ├── tauri.conf.json        # Configuration Tauri v2 (sécurité CSP, fenêtres, bundle OS)
│   └── Info.plist             # Déclaration des langues et localisation macOS (fr_FR)
├── src/
│   ├── bindings.ts            # Définitions TypeScript et fonctions IPC générées par tauri-specta
│   ├── data/                  # Données statiques JSON (peoples, profiles, paths, equipment, tables)
│   ├── engine/                # Helpers et référentiels de compendium pour le frontend
│   ├── types/                 # Définitions des types TypeScript (cof2.ts)
│   ├── utils/                 # Utilitaires (fileBridge Tauri v2, validation, formatage)
│   ├── components/            # Composants React 19
│   │   ├── Navbar.tsx         # Barre supérieure d'actions
│   │   ├── ErrorBoundary.tsx  # Capture d'erreurs d'exécution
│   │   ├── sheet/             # Fiche interactive (découpée en onglets)
│   │   ├── wizard/            # Assistant pas-à-pas (découpé en étapes)
│   │   ├── modals/            # Fenêtres modales (LevelUpModal avec rollback, etc.)
│   │   └── pdf/               # Gabarit A4 imprimable et export PDF natif
│   ├── App.tsx                # Composant racine orchestrateur
│   ├── main.tsx               # Point d'entrée React 19
│   └── index.css              # Styles Tailwind CSS et directives @media print
├── .gitattributes             # Normalisation des fins de ligne (LF) & binaires cross-platform
├── .gitignore                 # Exclusion des builds, caches et fichiers système
└── vite.config.mts            # Configuration du bundler Vite (port 1420 déterministe pour Tauri)
```

---

## 3. ⚙️ Règles & Bonnes Pratiques par Domaine

### A. Moteur de Règles Rust (`crates/cof2-core`)

1. **Isolation Métier Absolue** :
   - Le crate `cof2-core` doit rester une bibliothèque Rust pure, **sans aucune dépendance à Tauri, au Webview, au DOM, à React ou au système d'exploitation**.
   - Ne jamais importer de crate UI ou de couche réseau dans `crates/cof2-core`.
2. **Compendium Embarqué Statique** :
   - Les données du compendium (`peoples.json`, `profiles.json`, `equipment.json`, etc.) sont intégrées au binaire via `include_str!` dans `RulesDatabase::load_embedded()`.
3. **Immuabilité & Calcul Rétroactif** :
   - `RulesEngine::compute_sheet(&record, &rules)` calcule à la volée une structure `ComputedCharacterSheet` sans muter l'enregistrement original.
   - Respect strict des formules officielles COF2 :
     - $\text{PV} = (2 \times \text{PV famille}) + \text{CON} + (\text{Niveau} - 1) \times (\text{PV niveau} + \text{CON})$.
     - $\text{DR} = 2 + \text{CON}$ (+1 pour la famille Mystiques).
     - $\text{PC} = 2 + \text{CHA}$ (+1 pour la famille Aventuriers).
     - $\text{PM} = \text{VOL} + \text{sorts appris}$ (ou $\text{PE}$ pour les Psioniques).
     - $\text{Initiative} = 10 + \text{PER}$.
     - $\text{Défense} = 10 + \text{AGI effective} + \text{Armure} + \text{Bouclier} + \text{Bonus taille}$.
4. **Traçabilité & Réversibilité des Montées de Niveau (Rollback)** :
   - Chaque passage de niveau doit consigner une étape `LevelProgressionStep` dans `progression_history` (PV obtenus, capacités apprises, voies débloquées, choix de sous-options, bonus de caractéristiques).
   - Le moteur fournit `apply_level_up` pour progresser et `rollback_to_level` pour annuler proprement les apprentissages supérieurs et rétrograder un héros à un niveau antérieur sans corruption d'état.

---

### B. Directives d'Ingénierie Rust & Gestion de l'Empreinte Disque

1. **Profils de Compilation Dev Légers** :
   - Dans le `Cargo.toml` racine, désactiver systématiquement les symboles de débogage pour les dépendances externes afin d'éviter l'explosion de `target/debug/deps` :
     ```toml
     [profile.dev.package."*"]
     debug = 0

     [profile.dev]
     debug = 1
     ```
2. **Structuration Stricte des Tests d'Intégration (Monobinaire)** :
   - Ne **jamais** placer de fichiers `.rs` autonomes multiples directement à la racine de `tests/`.
   - Regrouper systématiquement les suites de tests d'intégration dans un sous-dossier (ex: `tests/suite/`) rattaché à un unique point d'entrée `tests/integration_tests.rs`.
   - Objectif : éviter la multiplication des binaires de tests liés et diviser par 5 à 10 le poids de compilation.

---

### C. Persistance Locale & Sécurité I/O (`crates/cof2-storage`)

1. **Sauvegardes Atomiques (Zéro Corruption)** :
   - Lors de la sauvegarde d'un fichier `.cof2`, écrire d'abord dans un fichier temporaire (`.tmp_${timestamp}`), forcer la synchronisation disque (`sync_all()`), puis effectuer un renommage atomique (`fs::rename`).
2. **Aucune Dépendance Réseau** :
   - La persistance s'effectue exclusivement sur le système de fichiers local.

---

### D. Shell Desktop Tauri v2 & Localisation Système (`src-tauri`)

1. **Sécurité Air-Gapped & Bac à Sable** :
   - Maintenir une politique CSP étanche : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none';`.
   - Télémétrie désactivée, aucun updater réseau non sollicité.
2. **Contrats Typés Stricts (`tauri-specta`)** :
   - Toutes les commandes IPC Rust (`compute_character`, `apply_level_up_character`, `rollback_character_level`, `save_character_file`, `load_character_file`, `print_character_sheet`) doivent être annotées avec `#[specta::specta]` pour régénérer automatiquement `src/bindings.ts`.
3. **Impression Native & Localisation OS (macOS & Windows)** :
   - L'impression délègue à la méthode native `window.print()` (`tauri::WebviewWindow`) avec la permission `"core:webview:allow-print"`.
   - **macOS** : `src-tauri/Info.plist` déclare obligatoirement `CFBundleDevelopmentRegion = fr_FR`, `CFBundleLocalizations = ["fr", "fr_FR", "en"]` et `CFBundleAllowMixedLocalizations = true`. Initialisation de `AppleLanguages` pour le mode dev.
   - **Windows** : Injection de `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--lang=fr-FR"` et configuration de `languages` dans `nsis` et `wix` dans `tauri.conf.json`.

---

### E. Frontend React 19 ("Dumb UI")

1. **Interface Déclarative Pure** :
   - Le frontend ne réalise plus aucun calcul de règles de combat ni de points de vie : il consomme directement `ComputedCharacterSheet` retourné par le moteur Rust.
2. **Modularité & Mémoïsation** :
   - Fichiers sous **300 à 400 lignes maximum**.
   - Découpage par étape de wizard (`Step1Peoples.tsx`, etc.) et par onglet de fiche (`CombatTab.tsx`, `AbilitiesTab.tsx`, etc.).
   - Utilisation systématique de `useMemo` pour les sélections dérivées.
3. **Gabarit A4 et Impression (`@media print`)** :
   - Respect strict du format 210mm x 297mm en 2 pages pour la fiche officielle.
   - Classe utilitaire `no-print` sur tous les contrôles d'interface interactive.

---

## 4. 🧪 Stratégie de Tests & Assurance Qualité (QA)

- Toute modification de règle ou de modèle doit être validée par les suites de tests automatisés :
  - **Tests Rust** : `cargo test --workspace` (moteur de calcul, montée de niveau réversible, persistance atomique, export des bindings).
  - **Tests Frontend Vitest** : `npm test` (validation et migration de fiches, historique UI, helpers).
  - **Validation de typage et compilation** : `npm run build` (`tsc && vite build`).

---

## 5. 🛠️ Commandes Clés du Projet

| Commande | Action |
| :--- | :--- |
| `npm run tauri:dev` | Lance l'application desktop Tauri v2 en mode développement |
| `cargo test --workspace` | Exécute l'intégralité des tests unitaires et d'intégration Rust |
| `npm test` | Exécute la suite de tests unitaires Vitest |
| `npm run build` | Vérifie les types (`tsc`) et génère le bundle de production Vite |
| `npm run tauri:build` | Génère les installateurs et paquets natifs de production (macOS / Windows / Linux) |
| `npm run dev` | Lance le serveur Vite en mode développement web autonome |
| `npm run data:editor` | Lance l'éditeur de données autonome pour `src/data/*.json` |
