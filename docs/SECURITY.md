# 🛡️ Politique & Architecture de Sécurité (DevSecOps)

Ce document décrit les mesures de sécurité applicative, les règles de durcissement et les politiques de défense en profondeur implémentées dans le projet **COF2 Compagnon**.

---

## 1. 🌐 Politique de Sécurité de Contenu (CSP)

L'application web et desktop applique une Content Security Policy stricte via la balise `<meta>` dans `index.html` et `tools/data-editor/index.html` :

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; object-src 'none'; base-uri 'self';">
```

### Principes appliqués :
- **`script-src 'self'`** : Aucun script inline (`'unsafe-inline'`) ni évaluation dynamique (`eval()`, `new Function()`) n'est autorisé. Tous les scripts sont regroupés et hachés par Vite.
- **`object-src 'none'`** : Interdiction absolue d'exécuter des plugins obsolètes ou non sécurisés (Flash, Java, Silverlight, applets).
- **`base-uri 'self'`** : Prévention des attaques de type *Base-Tag Hijacking* (altération des URLs relatives de chargement des chunks ES modules).
- **`style-src 'self' 'unsafe-inline'`** : Autorisé uniquement pour les styles injectés dynamiquement par le moteur d'animation Tailwind CSS et les transitions UI.
- **`font-src 'self' data:`** : Polices d'écriture locales uniquement (`@fontsource/cinzel`, `@fontsource/inter`), garantissant un fonctionnement 100% hors-ligne.

---

## 2. 🖥️ Durcissement du Runtime Electron (`electron/main.ts`)

Conformément au guide de sécurité officiel d'Electron :

1. **Isolation & Bac à Sable (Sandbox)** :
   - `contextIsolation: true` : Le code JavaScript exécuté dans le renderer ne peut pas accéder aux prototypes ou aux variables du processus principal.
   - `nodeIntegration: false` : Aucun module Node.js (`fs`, `child_process`, `crypto`) n'est accessible dans le renderer.
   - `sandbox: true` : Activation explicite du bac à sable OS Chromium.

2. **Verrouillage de la Navigation & Liens Externes** :
   - Écoute de l'événement `will-navigate` sur `mainWindow.webContents` : Toute navigation hors de l'application locale (`file://` ou `http://localhost:5173` en dev) est interceptée et annulée (`event.preventDefault()`). Si l'URL est externe (`http:` / `https:`), elle est ouverte dans le navigateur par défaut de l'utilisateur via `shell.openExternal`.
   - Contrôle d'ouverture de fenêtres (`setWindowOpenHandler`) : Renvoie systématiquement `{ action: 'deny' }` pour neutraliser toute création arbitraire de fenêtre fille non contrôlée.

3. **Protection des Noms de Fichiers (Path Traversal)** :
   - Les paramètres `defaultFilename` reçus via les canaux IPC `save-character-file` et `export-character-pdf` sont systématiquement normalisés avec `path.basename()` afin d'éliminer toute tentative d'injection de chemins (`../`, chemins absolus).

4. **Restriction des Outils de Débogage** :
   - Le rôle de menu applicatif `{ role: 'toggleDevTools' }` est conditionné à l'environnement de développement (`isDev`), empêchant l'accès direct aux outils de développement dans les binaires packagés.

---

## 3. 🧪 Validation & Assainissement des Données (`characterValidation.ts`)

La fonction `validateAndMigrateCharacter()` garantit l'intégrité et la résilience de l'application face à des fichiers `.cof2` malformés ou forgés :

1. **Protection contre la Pollution de Prototype (CWE-1321)** :
   - Les clés réservées `__proto__`, `constructor` et `prototype` sont formellement ignorées lors de l'itération sur les dictionnaires dynamiques (`pathRankChoices`, `externalAbilityChoices`).
   - Le dictionnaire `manualStatBonuses` n'accepte que les clés appartenant à la liste blanche `VALID_STATS` (`FOR`, `AGI`, `CON`, `PER`, `INT`, `VOL`, `CHA`) et des valeurs numériques finies.

2. **Validation Numérique Stricte (Anti-`NaN` / Anti-`Infinity`)** :
   - Remplacement systématique de `typeof x === 'number'` par `typeof x === 'number' && Number.isFinite(x)` sur toutes les valeurs statistiques (PV, DR, PC, PM, pièces de monnaie, bonus).
   - Les gains de PV par niveau (`levelUpHpGains`) et les rangs de capacités doivent être des entiers (`Number.isInteger()`).

3. **Validation par Liste Blanche (Whitelisting)** :
   - `racialStatChoices` est filtré pour ne conserver que les valeurs valides de `StatCode`.
   - `attackStatUsed` dans les armes est validé contre `VALID_STATS`.

---

## 4. 🛠️ Sécurité de l'Éditeur de Données Local (`tools/data-editor/`)

Le serveur de développement autonome du Data Editor (`vite.config.mts` sur le port 5180) applique les défenses suivantes :

1. **Protection Anti-CSRF (Cross-Site Request Forgery)** :
   - Rejet automatique (`HTTP 403`) des requêtes portant l'en-tête `Sec-Fetch-Site: cross-site`.
   - Validation de l'en-tête `Origin` pour s'assurer que seules les requêtes provenant de l'hôte local (`localhost:5180`) peuvent interagir avec l'API.

2. **Limitation de Taille de Requête (Anti-DoS / Memory Exhaustion)** :
   - Le corps des requêtes `POST /api/data/:filename` est plafonné à **10 Mo max**. Au-delà, la requête est rejetée avec un code `HTTP 413 Payload Too Large`.

3. **Sauvegardes Atomiques & Rotation Automatique** :
   - Sauvegarde dans un fichier temporaire (`${targetPath}.tmp`) puis renommage atomique pour éviter tout fichier corrompu en cas d'interruption.
   - Rotation automatique des backups (`.bak`) limitée à 15 versions par fichier source.
