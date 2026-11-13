# 🎲 COF2 Compagnon & Fiche de Héros

Application Desktop (**Rust + Tauri v2**) et Web (**Vite / React 19**) de création, de gestion et d'évolution de personnages pour le jeu de rôle **Chroniques Oubliées Fantasy 2 (COF2)**.

---

## 🌟 Fonctionnalités Principales

1. **Règles Officielles de COF2 Intégrées (Livre de Base & Compagnon)** :
   - **25 Peuples** complets (8 du Livre de Base + 17 du Compagnon) avec leurs modificateurs raciaux déclaratifs (`stats` fixes et `statChoices` au choix), contraintes morphologiques et Voies de peuple.
   - **19 Profils** répartis dans les 4 familles (Aventuriers, Combattants, Mages, Mystiques).
   - **209 Voies et Capacités** (Voies de profil, de peuple, de domaine divin, de prestige et génériques) avec textes intégraux, modificateurs déclaratifs V2, compagnons dynamiques, types d'actions (A, L, G, M) et marqueurs de sorts (*).
   - Les **7 Caractéristiques de COF2** (AGI, CON, FOR, PER, INT, VOL, CHA) avec séries de valeurs officielles (*Polyvalent, Expert, Spécialiste*) et la **Méthode par achat** (règle avancée de l'Atlas : 7 points, jusqu'à 2 faiblesses à `-1`).
   - Moteur de règles déterministe en Rust (`crates/cof2-core`) calculant fidèlement :
     - Points de Vie : `PV = (2 x PV famille) + CON` (et gain rétroactif par niveau).
     - Dés de Récupération (DR) : type de dé selon la famille et `[2 + CON]` (+1 pour les Mystiques).
     - Points de Chance (PC) : `[2 + CHA]` (+1 pour les Aventuriers).
     - Points de Mana (PM / PE) : `VOL + sorts appris`.
     - Initiative : `10 + PER`.
     - Défense : `10 + AGI effective + Armure + Bouclier` (avec plafond d'AGI max).
     - Attaques : Contact (`BAB + FOR`), Distance (`BAB + AGI`), Magique (`BAB + VOL`).

2. **Assistant de Création Guidé (Niveau 1)** :
   - Parcours pas-à-pas en 7 étapes : Identité, Peuple, Profil, Caractéristiques, Voies de départ, Équipement & Bourse (2d6 pa), Bilan.

3. **Fiche de Personnage Interactive** :
   - Suivi en temps réel des PV, DR, PC et PM durant les parties.
   - Gestion des armes équipées, de l'armure, de l'inventaire et des pièces de monnaie (pa, po, pc).
   - Arbre des voies interactif permettant de débloquer ou consulter les capacités.

4. **Progression, Historique & Montée de Niveau Réversible** :
   - Modal dédié « **Niveau +** » calculant automatiquement le gain de PV et gérant l'allocation des **2 points de capacité** par niveau.
   - Mémorisation de l'historique complet des apprentissages par niveau (`LevelProgressionStep`) et possibilité de rétrogradation propre à un niveau antérieur sans corruption d'état.

5. **Génération & Export PDF Imprimable (Format A4)** :
   - Mise en page exacte en 2 pages A4 sur fond blanc, prête pour l'impression papier ou l'enregistrement en PDF haute fidélité via la boîte d'impression native du système (`window.print()`).

6. **Persistance Atomique & Sécurité Sans Faille** :
   - Sauvegardes atomiques (`.tmp` $\to$ `rename`) garantissant zéro corruption en cas de coupure de courant.
   - 100% hors-ligne (Air-Gapped, `connect-src 'none'`), aucune ressource externe requise.

---

## 🚀 Lancement & Utilisation Rapide

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)
- [Rust](https://rustup.rs/) (version 1.75 ou supérieure)

### 1. Lancer l'application en mode Desktop (Tauri v2)
```bash
npm run tauri:dev
```
Une fenêtre d'application native ultra-légère s'ouvrira directement sur votre écran.

### 2. Lancer l'application dans votre navigateur (Vite autonome)
```bash
npm run dev
```
Ouvrez ensuite l'URL indiquée (par défaut `http://localhost:1420`).

---

## 📦 Génération des Exécutables Autonomes (Windows & macOS)

Pour distribuer l'application sous forme d'installateurs natifs :

```bash
npm run tauri:build
```
Les installateurs natifs seront générés automatiquement :
- **macOS** : fichier `.dmg` dans `target/release/bundle/dmg/`.
- **Windows** : fichier installateur `.exe` (NSIS) ou `.msi` (WiX) dans `target/release/bundle/nsis/`.

---

## 📁 Architecture du Code (Cargo Workspace)

- `Cargo.toml` : Workspace racine Cargo liant les crates Rust avec profils dev allégés (`debug = 0` pour les dépendances).
- `crates/cof2-core/` : Moteur de règles pur en Rust (sans dépendance UI/OS/Tauri), embarquant statiquement le compendium JSON via `include_str!`.
- `crates/cof2-storage/` : Bibliothèque de persistance locale atomique (fichiers `.cof2` / `.json`).
- `src-tauri/` : Shell desktop Tauri v2 avec commandes IPC, bindings typés (`tauri-specta`), gestion d'impression native et localisation système (français).
- `src/` : Interface utilisateur déclarative en React 19, TypeScript et Tailwind CSS.
  - `src/bindings.ts` : Contrats et fonctions IPC typées générées par `tauri-specta`.
  - `src/data/` : Compendium officiel (`peoples.json`, `profiles.json`, `paths.json`, `equipment.json`, `tables.json`).
  - `src/components/wizard/` : Assistant guidé pas-à-pas.
  - `src/components/sheet/` : Fiche de personnage interactive.
  - `src/components/pdf/` : Gabarit A4 imprimable et exportable en PDF.
  - `src/components/modals/` : Module de progression et montée de niveau réversible.
- `docs/DATA_MODELS.md` : Documentation exhaustive des modèles de données JSON.
- `docs/SECURITY.md` : Politique et architecture de sécurité DevSecOps.

---

## 🛠️ Assurance Qualité & Tests

```bash
# Exécution des tests unitaires et d'intégration Rust
cargo test --workspace

# Exécution des tests unitaires frontend Vitest
npm test

# Vérification du typage TypeScript et bundle de production
npm run build
```
