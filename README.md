# 🎲 COF2 Compagnon & Fiche de Héros

Application Desktop et Web de création, de gestion et d'évolution de personnages pour le jeu de rôle **Chroniques Oubliées Fantasy 2 (COF2)**.

---

## 🌟 Fonctionnalités Principales

1. **Règles Officielles de COF2 Intégrées** :
   - **8 Peuples** complets (Demi-elfe, Demi-orc, Elfe haut, Elfe sylvain, Gnome, Halfelin, Humain, Nain) avec leurs modificateurs raciaux et Voies de peuple.
   - **14 Profils** répartis dans les 4 familles (Aventuriers, Combattants, Mages, Mystiques).
   - **73 Voies et Capacités** (Rangs 1 à 5) avec textes intégraux, types d'actions (A, L, G, M) et marqueurs de sorts (*).
   - Les **7 Caractéristiques de COF2** (AGI, CON, FOR, PER, INT, VOL, CHA) avec séries de valeurs officielles (*Polyvalent, Expert, Spécialiste*).
   - Calcul automatique selon les règles de COF2 :
     - Points de Vigueur : `PV = (2 x PV famille) + CON` (et gain rétroactif par niveau).
     - Dés de Récupération (DR) : type de dé selon la famille et `[2 + CON]` (+1 pour les Mystiques).
     - Points de Chance (PC) : `[2 + CHA]` (+1 pour les Aventuriers).
     - Points de Mana (PM) : `VOL + sorts appris`.
     - Initiative : `10 + PER`.
     - Défense : `10 + AGI effective + Armure + Bouclier` (avec gestion de l'AGI max).
     - Attaques : Contact (`Niv + FOR`), Distance (`Niv + AGI`), Magique (`Niv + VOL`).

2. **Assistant de Création Guidé (Niveau 1)** :
   - Parcours pas-à-pas en 7 étapes : Identité, Peuple, Profil, Caractéristiques, Voies de départ, Équipement & Bourse (2d6 pa), Bilan.

3. **Fiche de Personnage Interactive** :
   - Suivi en temps réel des PV, DR, PC et PM durant les parties.
   - Gestion des armes équipées, de l'armure, de l'inventaire et des pièces de monnaie (pa, po, pc).
   - Arbre des voies interactif permettant de débloquer ou consulter les capacités.

4. **Progression & Montée de Niveau** :
   - Modal dédié « **Niveau +** » calculant automatiquement le gain de PV et gérant l'allocation des **2 points de capacité** par niveau (coût de 1 pt pour les rangs 1-2, 2 pts pour les rangs 3-5).

5. **Génération & Export PDF Imprimable (Format A4)** :
   - Mise en page propre au style fantasy/jdr.
   - Prête pour l'impression papier ou l'enregistrement en PDF haute fidélité via Electron ou votre navigateur.

6. **Sauvegarde & Partage Faciles** :
   - Format de fichier individuel `.cof2` (compatible JSON) : vous pouvez exporter votre héros, l'envoyer par Discord ou par e-mail à votre MJ ou à vos amis, et le réimporter en un clic.

---

## 🚀 Lancement & Utilisation Rapide

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure)

### 1. Lancer l'application en mode Desktop (Electron)
```bash
npm run electron:dev
```
Une fenêtre d'application autonome s'ouvrira directement sur votre écran.

### 2. Lancer l'application dans votre navigateur (Vite)
Si vous préférez l'utiliser dans un simple onglet de navigateur :
```bash
npm run dev
```
Ouvrez ensuite l'URL indiquée (par défaut `http://localhost:5173`).

---

## 📦 Génération des Exécutables Autonomes (Windows & Mac)

Pour distribuer l'application à vos joueurs sans qu'ils aient besoin d'installer Node.js :

- **Pour macOS (`.dmg`)** :
  ```bash
  npm run build:mac
  ```
  Le fichier `.dmg` d'installation sera généré dans le dossier `release/`.

- **Pour Windows (`.exe`)** :
  ```bash
  npm run build:win
  ```
  L'installeur Windows `.exe` sera généré dans le dossier `release/`.

---

## 📁 Structure du Code

- `src/data/` : Données structurées extraites du Mémento COF2 (`peoples.json`, `profiles.json`, `paths.json`, `equipment.json`, `tables.json`).
- `src/engine/rulesEngine.ts` : Moteur de calcul des formules et statistiques COF2.
- `src/types/cof2.ts` : Définitions TypeScript complètes.
- `src/components/wizard/` : Assistant guidé pas-à-pas de création de héros.
- `src/components/sheet/` : Fiche de personnage interactive.
- `src/components/pdf/` : Gabarit A4 imprimable et exportable en PDF.
- `src/components/modals/` : Module de montée de niveau.
- `src/utils/fileBridge.ts` : Passerelle de sauvegarde/chargement `.cof2` et export PDF (Electron & Web).
- `electron/` : Processus principal natif et preload d'Electron.

---

## 🛠️ Environnement de Développement

- **Éditeur recommandé** : [Visual Studio Code](https://code.visualstudio.com/) avec les extensions préconisées dans `.vscode/extensions.json` :
  - *Prettier - Code formatter* (`esbenp.prettier-vscode`) pour le formatage automatique à l'enregistrement.
  - *Tailwind CSS IntelliSense* (`bradlc.vscode-tailwindcss`) pour la complétion des classes d'utilitaires.
  - *Vitest Explorer* (`vitest.explorer`) pour exécuter et déboguer les tests graphiquement.
- **Tests unitaires** :
  ```bash
  npm test
  ```
- **Portabilité multiplateforme (macOS / Windows)** :
  - Normalisation des fins de ligne configurée via `.gitattributes` (`* text=auto eol=lf`) et `.vscode/settings.json`.
  - `.gitignore` configuré pour ignorer les artefacts de build Electron, caches d'OS (`.DS_Store`, `Thumbs.db`) et fichiers temporaires.


