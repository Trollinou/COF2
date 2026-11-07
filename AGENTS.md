# 🤖 Guide des Bonnes Pratiques & Directives de Développement (AGENTS.md)

Ce document rassemble les conventions d'architecture, règles de développement, contraintes de performance et de sécurité destinées aux agents IA et aux développeurs intervenant sur le projet **COF2 Compagnon**.

---

## 1. 🎯 Vue d'Ensemble & Philosophie du Projet

- **Produit :** Application hybride Desktop (Electron) et Web (Vite/React) dédiée à la création, la gestion et la progression de personnages pour le jeu de rôle **Chroniques Oubliées Fantasy 2 (COF2)**.
- **Principes cardinaux :**
  1. **Fidélité stricte aux règles officielles COF2** : Le moteur de calcul applique fidèlement les formules, profils, peuples, voies, armes et armures de COF2.
  2. **Offline-First & Autonomie** : L'application doit fonctionner à 100% sans connexion Internet (sessions de jeu en convention, en déplacement, etc.). Aucune ressource critique ne doit dépendre d'un CDN externe.
  3. **Sécurité et intégrité des fiches de héros** : Sauvegardes atomiques, validation des fichiers importés, aucune corruption possible en cas de coupure inopinée.
  4. **Performance & Réactivité** : Navigation instantanée, absence de micro-gels durant la frappe ou la consultation des voies.

---

## 2. 🏛️ Architecture & Découpage du Code

```text
COF2/
├── .vscode/                   # Configuration partagée VS Code (extensions, settings)
├── docs/                      # Documentation technique
│   ├── DATA_MODELS.md         # Schéma V2 des fichiers JSON (src/data/) & guide d'audit
│   └── SECURITY.md            # Politique & Architecture de Sécurité (DevSecOps)
├── electron/                  # Processus principal et preload Electron
│   ├── main.ts                # Gestion de la fenêtre, IPC, boîtes de dialogue et PDF
│   └── preload.ts             # Exposition contrôlée d'API via contextBridge
├── src/
│   ├── data/                  # Données statiques JSON (peoples, profiles, paths, equipment, tables)
│   ├── engine/                # Moteur de règles COF2 (pur TypeScript, agnostique à la vue)
│   │   ├── rulesEngine.ts     # Calculs de stats, filtres d'équipements, profils, voies
│   │   └── __tests__/         # Tests unitaires Vitest du moteur
│   ├── types/                 # Définitions des types TypeScript (cof2.ts)
│   ├── utils/                 # Utilitaires (fileBridge, validation, formatage)
│   ├── components/            # Composants React 19
│   │   ├── Navbar.tsx         # Barre supérieure d'actions
│   │   ├── ErrorBoundary.tsx  # Capture d'erreurs d'exécution
│   │   ├── sheet/             # Fiche interactive (découpée en onglets)
│   │   ├── wizard/            # Assistant pas-à-pas (découpé en étapes)
│   │   ├── modals/            # Fenêtres modales (LevelUpModal, etc.)
│   │   └── pdf/               # Gabarit A4 imprimable et export PDF
│   ├── App.tsx                # Composant racine orchestrateur
│   ├── main.tsx               # Point d'entrée React 19
│   └── index.css              # Styles Tailwind CSS et directives @media print
├── .gitattributes             # Normalisation des fins de ligne (LF) & binaires cross-platform
├── .gitignore                 # Exclusion des builds, caches et fichiers système
└── vite.config.ts             # Configuration du bundler Vite
```

---

## 3. ⚙️ Règles & Bonnes Pratiques par Domaine

### A. Moteur de Règles (`src/engine/rulesEngine.ts`)

1. **Isolation Métier Absolue** :
   - Le moteur de calcul doit rester une bibliothèque de fonctions pures en TypeScript, **sans aucune dépendance à React, au DOM ou à Electron**.
   - Ne jamais importer de hook (`useState`, `useEffect`) ou de JSX dans `src/engine/`.

2. **Indexation et Performance ($O(1)$)** :
   - Éviter impérativement les scans linéaires répétés (`.find()`) sur les listes volumineuses comme `PATHS` (209 voies, ~1045 capacités).
   - Utiliser des tables de hachage `Map<string, T>` précalculées (`PATHS_MAP`, `PEOPLES_MAP`, etc.).

3. **Immuabilité & Calcul Rétroactif** :
   - `computeCharacterStats(char)` ne doit **jamais** muter l'objet `CharacterSheet` passé en paramètre. Il doit retourner un nouvel objet `ComputedCharacterStats`.
   - Respecter les formules officielles :
     - $\text{PV} = (2 \times \text{PV famille}) + \text{CON} + (\text{Niveau} - 1) \times (\text{PV niveau} + \text{CON})$.
     - $\text{DR} = 2 + \text{CON}$ (+1 pour la famille Mystiques).
     - $\text{PC} = 2 + \text{CHA}$ (+1 pour la famille Aventuriers).
     - $\text{PM} = \text{VOL} + \text{sorts appris}$.
     - $\text{Initiative} = 10 + \text{PER}$.
     - $\text{Défense} = 10 + \text{AGI effective} + \text{Armure} + \text{Bouclier}$.

---

### B. Composants & Rendu React 19

1. **Taille & Modularité des Composants** :
   - Maintenir les fichiers sous **300 à 400 lignes maximum**.
   - Découper systématiquement les formulaires ou assistants complexes en sous-composants dédiés par étape (`Step1Peoples.tsx`, `Step2Profiles.tsx`, etc.) et la fiche en onglets (`CombatTab.tsx`, `AbilitiesTab.tsx`, etc.).

2. **Mémoïsation Systématique** :
   - Toujours encapsuler les calculs lourds dans `useMemo` :
     ```typescript
     const stats = useMemo(() => computeCharacterStats(character), [character]);
     ```
   - Éviter de déclencher des effets en boucle (`useEffect`) modifiant l'état parent à chaque re-calcul.

3. **Mises à Jour d'État & Timestamps** :
   - Toujours générer une copie profonde propre et mettre à jour le champ `updatedAt` lors d'une mutation de personnage :
     ```typescript
     onChange({
       ...character,
       ...patch,
       updatedAt: new Date().toISOString(),
     });
     ```

4. **Résilience UI (Error Boundaries)** :
   - Entourer les vues principales d'un `ErrorBoundary` pour qu'une éventuelle anomalie de rendu dans une voie n'affiche pas un écran blanc destructeur pour l'utilisateur.

5. **Version Applicative Dynamique** :
   - La version de l'application est centralisée dans `package.json` et injectée à la compilation par Vite (`__APP_VERSION__`, déclarée dans `src/vite-env.d.ts`).
   - Ne jamais coder en dur le numéro de version dans les composants UI (`Navbar`, etc.).

---

### C. Sécurité Electron & Gestion des Fichiers (I/O)

1. **Sécurité du Contexte d'Exécution & Bac à Sable** :
   - Toujours maintenir `contextIsolation: true`, `nodeIntegration: false` et `sandbox: true` dans `webPreferences`.
   - Ne jamais exposer directement le module `fs` ou `child_process` au renderer. Passer exclusivement par `ipcRenderer.invoke` et `contextBridge`.
   - Verrouiller la navigation via `webContents.on('will-navigate')` et `setWindowOpenHandler` ({ action: 'deny' }).

2. **Opérations I/O Non-bloquantes & Asynchrones** :
   - **Bannir** `fs.writeFileSync` et `fs.readFileSync` dans les handlers IPC. Utiliser `fs.promises.writeFile` et `fs.promises.readFile`.

3. **Sauvegardes Atomiques (Zero Corruption) & Assainissement** :
   - Lors de la sauvegarde d'un fichier `.cof2`, écrire d'abord dans un fichier temporaire (`${filePath}.tmp`) puis effectuer un `fs.promises.rename`. Cela garantit que le fichier de personnage d'origine reste intact si le processus s'interrompt pendant l'écriture.
   - Toujours assainir les noms de fichiers proposés via `path.basename()` dans le processus principal pour prévenir les traversées de chemin.

4. **Validation des Fichiers Entrants & Protection Anti-Pollution** :
   - Ne jamais injecter aveuglément le résultat de `JSON.parse` dans l'état React sans assainissement (`validateAndMigrateCharacter`).
   - Remplir automatiquement les champs absents avec des valeurs par défaut pour assurer la rétrocompatibilité des anciens fichiers de sauvegarde.
   - Bloquer activement les clés prototypes (`__proto__`, `constructor`, `prototype`) et valider l'intégrité numérique (`Number.isFinite`). Voir le guide complet dans `docs/SECURITY.md`.

---

### D. Offline-First & Polices

- Les polices d'interface (`Cinzel` et `Inter`) doivent être chargées localement ou fournies par des assets packagés, et non via `https://fonts.googleapis.com`, afin d'assurer un rendu identique en mode avion ou hors-ligne.

---

### E. Gabarit d'Impression & Export PDF (`@media print`)

1. **Respect du Format A4** :
   - Largeur contrainte à 210mm et hauteur à 297mm.
   - Les éléments d'interface interactifs (boutons, onglets, alertes) doivent impérativement porter la classe utilitaire `no-print`.
2. **Impression & PDF Haute Résolution** :
   - Conserver les contrastes noir et blanc nets pour l'impression papier économique.

---

## 4. 🧪 Stratégie de Tests & Assurance Qualité (QA)

- Tout ajout ou modification d'une formule de calcul dans `rulesEngine.ts` doit être validé par un test unitaire Vitest (`npm test`).
- Les scénarios de tests obligatoires couvrent :
  - La validation des profils & peuples et leurs restrictions (taille, interdictions d'armes, port d'armure).
  - L'application des bonus/malus de caractéristiques et des modificateurs.
  - Le calcul des points de capacités consommés lors du passage de niveau.
  - L'assainissement et la migration d'un fichier `.cof2` obsolète ou corrompu.

---

## 5. 🛠️ Commandes Clés du Projet

| Commande | Action |
| :--- | :--- |
| `npm run dev` | Lance le serveur Vite en mode développement web |
| `npm run data:editor` | Lance l'éditeur de données autonome pour `src/data/*.json` |
| `npm run electron:dev` | Compile Electron et lance l'application desktop en mode dev |
| `npm test` | Exécute la suite de tests unitaires Vitest |
| `npm run build` | Vérifie les types (`tsc`) et génère le bundle de production Vite |
| `npm run compile:electron` | Compile le code TypeScript d'Electron (`electron/`) |
| `npm run build:mac` | Génère les installateurs macOS (`.dmg`, `.zip`) dans `release/` |
| `npm run build:win` | Génère les installateurs Windows (`.exe` NSIS, portable) dans `release/` |

