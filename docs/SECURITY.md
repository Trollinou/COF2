# 🛡️ Politique & Architecture de Sécurité (DevSecOps)

Ce document décrit les mesures de sécurité applicative, les règles de durcissement et les politiques de défense en profondeur implémentées dans le projet **Le Grimoire d'Osgild** (COF2).

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

## 2. 🖥️ Durcissement du Shell Desktop Tauri v2 (`src-tauri/`)

Conformément aux bonnes pratiques de sécurité Tauri v2 :

1. **Isolation IPC & Bac à Sable (`src-tauri/tauri.conf.json`)** :
   - `withGlobalTauri: false` : Aucune API globale Tauri n'est exposée sur `window` ; la WebView communique exclusivement via les imports explicites et typés (`src/bindings.ts` généré par `tauri-specta`).
   - **Politique CSP stricte (Air-Gapped)** : `connect-src 'none'`, `img-src 'self' data:`, `font-src 'self'` — aucun trafic réseau sortant et aucune dépendance externe ne sont autorisés.

2. **Permissions Minimales (`src-tauri/capabilities/default.json`)** :
   - Les capacités accordées à la fenêtre principale sont restreintes au strict nécessaire (`core:default`, `core:webview:allow-print`), sans accès direct au système de fichiers depuis le frontend JavaScript.

3. **Dialogues Natifs & Protection des Chemins (`src-tauri/src/commands.rs`)** :
   - Les opérations d'ouverture et de sauvegarde (`save_character_file`, `load_character_file`) ouvrent leurs sélecteurs de fichiers natifs côté Rust via `tauri_plugin_dialog::DialogExt` afin que la WebView ne transmette ni ne manipule jamais de chemins disque arbitraires.
   - `sanitize_default_filename` et `validate_character_extension` neutralisent toute injection de chemin (`../`, chemins absolus) et vérifient l'extension (`.cof2` / `.json`) avant toute opération disque.

---

## 3. 🧪 Validation & Assainissement des Données (`crates/cof2-core/src/validation.rs`)

La fonction `validate_and_migrate_record()` garantit l'intégrité et la résilience du moteur Rust face à des fichiers `.cof2` malformés, tronqués ou forgés :

1. **Protection contre l'Injection de Clés Réservées (`is_safe_key`)** :
   - Les clés réservées (`__proto__`, `constructor`, `prototype`) et les clés malformées sont formellement ignorées lors du traitement des dictionnaires dynamiques (`path_rank_choices`, `external_ability_choices`).
   - Les bonus manuels de caractéristiques (`manual_stat_bonuses`) n'acceptent que les clés valides de `StatCode` (`FOR`, `AGI`, `CON`, `PER`, `INT`, `VOL`, `CHA`).

2. **Validation Numérique Stricte (`as_finite_i32`, `as_int_in_range`)** :
   - Toutes les valeurs numériques (PV, DR, PC, PM, pièces de monnaie, bonus, gains de PV par niveau `level_up_hp_gains`, rangs de capacités) sont vérifiées côté Rust pour exclure les valeurs non entières, non finies ou hors bornes.

3. **Validation par Liste Blanche (Whitelisting)** :
   - `racial_stat_choices` et `attack_stat_used` sur les armes sont validés contre les codes officiels `StatCode`.

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

---

## 5. 💾 Persistance Locale & Sécurité I/O (`crates/cof2-storage` & `src-tauri`)

1. **Écriture Atomique & Résilience aux Collisions (`save_atomic` / `save_atomic_with_backup`)** :
   - Création d'un fichier temporaire unique dans le répertoire cible via `tempfile::NamedTempFile::new_in` (`O_EXCL`), évitant les collisions en écriture concurrente et garantissant la suppression automatique en cas d'erreur.
   - Synchronisation disque (`sync_all()`), persistance atomique (`persist_with_retry()` : jusqu'à 6 tentatives avec backoff exponentiel sur `ErrorKind::PermissionDenied` pour absorber les verrous transitoires NTFS sous Windows), et création d'une copie de secours `.bak` avant écrasement dans `save_character_file`.
2. **Protection Anti-DoS & Suppression du TOCTOU (`load`)** :
   - Ouverture directe du fichier sans pré-vérification `exists()`.
   - Plafonnement strict à **10 Mo** (`MAX_CHARACTER_FILE_BYTES`) via contrôle des métadonnées et `Read::take(MAX_CHARACTER_FILE_BYTES + 1)`.
   - Validation post-désérialisation (`validate_loaded_record`) vérifiant l'intégrité minimale (`id` non vide, `level >= 1`).
3. **Dialogues Natifs & Erreurs IPC Typées (`src-tauri/src/commands.rs`)** :
   - Les commandes `save_character_file` et `load_character_file` ouvrent directement les sélecteurs de fichiers natifs côté Rust (`tauri_plugin_dialog::DialogExt`), empêchant la WebView de fournir un chemin disque arbitraire en lecture ou en écriture.
   - Le paramètre `default_filename` transmis à `save_character_file` est assaini via `Path::file_name()` (`sanitize_default_filename`) pour neutraliser toute tentative de *Path Traversal*.
   - L'extension du fichier sélectionné (`.cof2` ou `.json`) est vérifiée via `validate_character_extension` avant tout accès disque.
   - Les erreurs IPC retournées à la WebView utilisent l'enum typé `IpcError` (`tauri-specta`), évitant l'exposition de traces internes brutes.
   - La CSP Tauri (`src-tauri/tauri.conf.json`) applique en complément `connect-src 'none'`, `img-src 'self' data:` et `font-src 'self'`.
