# BountyDesk

Application desktop Windows et Linux pour chasser sur la plateforme de bug bounty **Intigriti** : catalogue de programmes, favoris/groups/tags/notes locaux, veille sur le scope, scans de profondeur low/med/high, catalogue de **277 outils** de pen-test installables, et un serveur MCP local pour piloter le tout depuis une IA (Claude, opencode…).

**BountyDesk est un outil de lecture/assistance. Il ne soumet jamais de rapport automatiquement, et aucun scan n'est lancé sans confirmation explicite des règles d'engagement.**

## Prérequis

| | Windows | Linux |
| --- | --- | --- |
| OS | Windows 10/11 64 bits | distribution x86-64 avec glibc ≥ 2.28 (Debian 12+, Ubuntu 22.04+, Fedora 39+) |
| Gestionnaire d'outils système | `winget` (livré avec Windows 11) | `apt` via `pkexec` (polkit), sinon `sudo` non interactif |
| Outils de build | — | `build-essential`, `pkg-config`, `libssl-dev`, `libgtk-3-0` |

Autres prérequis communs :

- Un token d'API Intigriti (onglet *Settings* → *API* sur le site Intigriti, rôle *External Researcher*).
- Accès réseau vers `api.intigriti.com` et `api.github.com` (téléchargement des outils portables).
- Pour l'agent distant Rust : une toolchain Rust (`cargo`) **sous Windows uniquement**, voir [Agent distant](#agent-distant-rust).

## Installation

### Installateur

| Plateforme | Artefact | Contenu |
| --- | --- | --- |
| Windows | `dist/BountyDesk-Setup-0.1.0.exe` (NSIS) | dossier d'installation au choix, raccourcis bureau et menu démarrer, désinstallation propre |
| Linux | `dist/bountydesk-0.1.0.AppImage` | auto-portable : `chmod +x` puis lancer, aucun privilège requis |
| Linux | `dist/bountydesk_0.1.0_amd64.deb` | installation native via `apt install ./bountydesk_0.1.0_amd64.deb` |

Au premier lancement, collez votre token Intigriti : il est testé auprès de l'API puis chiffré au repos (voir [Chiffrement](#chiffrement-au-repos)).

### Depuis les sources

```bash
npm install            # récupère le binaire Electron (voir note)
npm start              # lance l'app en dev (electron-vite preview)
```

Note sous Node ≥24 : les scripts `postinstall` sont bloqués par défaut. Récupérez le binaire Electron manuellement :

```bash
node node_modules/electron/install.js
```

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | dev avec rechargement (electron-vite) |
| `npm start` | preview du build courant |
| `npm run test` | tests unitaires (Vitest) |
| `npm run typecheck` | typecheck TypeScript (main + renderer) |
| `npm run build` | build `out/` (main, preload, renderer) |
| `npm run pack:check` | tests + typecheck + build, **sans** empaquetage — la porte à utiliser en CI et sur les deux plateformes |
| `npm run dist:win` | `pack:check` + installeur NSIS → `dist/BountyDesk-Setup-0.1.0.exe` |
| `npm run dist:linux` | `pack:check` + AppImage et deb → `dist/` |
| `npm run dist:all` | les deux plateformes (à lancer sur chaque OS : un AppImage ne se cross-build pas de façon fiable) |
| `npm run dist` | alias de `dist:win` (compatibilité) |

### Intégration continue

`.github/workflows/ci.yml` s'exécute à chaque push sur `main` et à chaque pull request, sur 6 jobs :

| Job | Ce qu'il prouve |
|---|---|
| `verify` (Windows + Linux) | `npm run pack:check` passe sur les deux plateformes |
| `package` (Windows + Linux) | l'installeur NSIS, l'AppImage et le deb se construisent vraiment |
| `agent` | l'agent Rust compile et passe son test de bout en bout (Windows) |
| `agent-windows-only` | le build de l'agent **échoue** hors Windows, avec le message explicite attendu |
| `smoke-linux` | l'AppImage se lance et son processus tient 30 s |
| `smoke-windows` | l'installeur NSIS s'installe en silence et l'application se lance |

Les artefacts NSIS, AppImage et deb sont publiés en artifact de chaque run.

Le port MCP n'est volontairement pas vérifié par les jobs de smoke test : le serveur ne démarre que si la configuration contient un jeton chiffré, qu'un test externe ne peut pas forger. Ce qui est vérifié, c'est que le binaire démarre et reste vivant.

## Fonctionnalités

### Programmes et sync
- Écran **Programmes** : liste paginée (recherche avec debounce, filtre favoris, tri nom/prime/récent, sens croissant/décroissant).
- **Synchroniser** importe le catalogue (paginated, limite ~400 requêtes / 5 min gérée par un token bucket, retry en backoff sur 429/5xx).
- Favoris, groupes, tags et notes : **stockés localement en SQLite**, indépendants de l'API (lecture seule). Base : `%APPDATA%\BountyDesk\bountydesk.db` sous Windows, `~/.config/BountyDesk/bountydesk.db` sous Linux (chemins XDG standard, résolus par `app.getPath('userData')`).

### Détail de mission et credentials
- Clic sur un programme → modal **Détails** : badges (statut/type/confidentialité/secteur), primes min/max, **règles d'engagement (ROE)** complètes (Intigriti Me, outils automatisés, user-agent, header autorisé, safe harbour, pièces jointes) et **scope in/out** (domaines, tiers, skills requis), lien vers la page programme.
- Bouton **Get credentials** : identifiants (login/mot de passe) chiffrés par programme, avec raccourci vers la page de login de la mission. Les secrets ne sont jamais envoyés au renderer en clair sauf demande explicite de révélation.

### Scans low / med / high
- Bouton **Scanner** dans le détail d'une mission : profils de profondeur — Bas (curl + nuclei low/medium), Moyen (+ tags tech/exposure, severities ≤ high), Élevé (+ ffuf, severities ≤ critical).
- **Garde-fous** : cibles limitées au scope **in-scope** et aux endpoints HTTP(S) ; confirmation manuelle de lecture des ROE obligatoire ; rate limit par scan ; bouton **Arrêter** toujours disponible ; tout est loggé dans `scan_events` ; exécution séquentielle, arrêt propre du process courant. Aucune soumission de rapport.
- Si **aucun** outil du plan n'a pu être lancé, le scan se termine en `error` avec la liste des binaires manquants — il ne se présente jamais comme réussi.

### Outils

Le catalogue compte **277 entrées** réparties en six catégories (`recon`, `enumer`, `fuzz`, `network`, `utility`, `ai`) :

| Source | Nb | Installation |
| --- | --- | --- |
| `winget` | 122 | `winget install` (Windows) ; sous Linux, détection d'abord, puis `apt` via `pkexec` quand un paquet Debian est connu |
| `github` | 38 | asset de release téléchargé, extrait, rendu exécutable, copié dans le dossier outils |
| `git` | ~117 | `git clone` sécurisé (frameworks, wordlists, outils Python/Go) — un bouton **Guide** ouvre la doc, rien n'est compilé ni exécuté automatiquement |

Détails qui comptent :

- **Détection d'abord** : avant toute installation, BountyDesk cherche le binaire dans le `PATH` (via le champ `detectCmd`). Installer un outil déjà présent est sans effet, et les noms diffèrent entre plateformes (`ripgrep`→`rg`, `bat`→`batcat`, `fd`→`fdfind`, `wireshark`→`tshark`, `powershell`→`pwsh`…).
- **Portables multi-plateformes** : pour chaque binaire GitHub, l'asset de release est choisi en fonction de la plateforme hôte (nom du binaire sans extension sous Linux, suffixe `.exe` sous Windows, `chmod +x` à l'installation). Un asset ambigu ou absent produit une erreur explicite, jamais un faux « installé ».
- **Outils signalés non disponibles** : 23 entrées sont marquées Windows-only (Sysinternals, PowerToys, Windows Terminal…) et 29 sont des applications graphiques ; l'app refuse de tenter une installation qui n'a pas de sens sur la plateforme, avec une explication.
- **Token GitHub optionnel** (écran Outils) : les downloads passent par l'API GitHub, qui est limitée à 60 requêtes/heure sans authentification. Le token est chiffré au repos.

### MCP (IA)
- Écran **Réglages → IA** : activer un serveur MCP HTTP (port défaut `8787`), exposable **sur le réseau local (LAN)** pour piloter BountyDesk depuis plusieurs PC, avec **un jeton nommé par PC/IA** (jetons chiffrés, révocation en 1 clic, jamais listés dans le README ni les logs).
- Adresse du serveur (locale et LAN) copiable en 1 clic, et un tableau **Activité des IA** journalise chaque appel d'outil (poste, outil, statut, durée).
- **Outils MCP** : `list_programs`, `get_program_detail`, `list_credentials` (sans secret), `list_tools`, `install_tool`, `start_scan` (mêmes garde-fous que l'UI), `get_scan`, `scan_events`, `run_tool` (exécution *encadrée* d'un binaire du catalogue, whitelist stricte par défaut).
- Exemple de config `claude_desktop_config.json` / `opencode.json` fourni dans l'app.
- Pare-feu : l'app vérifie l'état de la règle d'ouverture du port et sait la créer — `netsh` sous Windows, `ufw` / `firewall-cmd` via `pkexec` sous Linux. Sur les autres plateformes, l'état est honestement rapporté « non géré ».

### Agent IA (pont Claude Code → BountyDesk)
- Dossier `agent/` : un **pack prêt à copier** dans un dossier de mission pour donner à Claude Code un workflow encadré (sélection de programmes, vérification ROE avec verdicts *refuse/restreint/légitime*, choix low/med/high, scan puis tri des résultats, brouillon de rapport dans `reports/` — **jamais de soumission**).
- Contenu : `CLAUDE.md` (garde-fous non négociables), deux skills (`.claude/skills/bountydesk-hunt`, `bountydesk-roe-check`), un agent `hunt-validated` (demande validation humaine avant exécution), et un gabarit `.mcp.json`.
- Mise en place : activer l'IA dans Réglages, copier l'URL + le jeton (1 clic), les placer dans `cibles/<mission>/.mcp.json`. Détails dans `agent/README.md`.

### Agent distant Rust

`remote-agent/` contient un agent Rust qui streame l'écran d'un second poste vers la vue isolée de BountyDesk.

> **Cet agent est Windows uniquement.** La capture (BitBlt/GetDIBits) et l'injection d'entrées (SendInput) utilisent l'API Win32 déclarée en FFI brut dans `remote-agent/src/main.rs`, sans couche de portage. Un `cargo build` hors de Windows s'arrête volontairement sur un `compile_error!` explicite. Le reste de BountyDesk, lui, tourne sur Windows et Linux.

C'est un binaire **compilé séparément** :

```bash
cd remote-agent
cargo build --release          # produit target/release/bountydesk-agent.exe
```

L'agent lit son `config.json` **à côté de son propre exécutable** (pas dans le répertoire courant) :

```json
{ "server": "192.168.1.20", "port": 8787, "token": "<jeton de l'agent>", "fps": 5 }
```

Le test `tests/agent-rust.test.ts` est automatiquement ignoré si le binaire n'a pas été compilé, afin que `npm test` reste vert sur une machine qui ne l'a pas construit.

## Chiffrement au repos

Les secrets (token Intigriti, credentials de mission, jetons MCP, token GitHub) sont chiffrés avec le trousseau du système quand il est disponible :

| Plateforme | Mécanisme |
| --- | --- |
| Windows | DPAPI via `safeStorage` |
| Linux avec keyring (GNOME Keyring, KWallet, libsecret) | `safeStorage` |
| Linux **sans** keyring (poste headless, session sans agent) | repli interne : AES-256-GCM, clé scrypt dérivée et stockée dans un fichier `0600` du dossier utilisateur |

Le mécanisme réellement utilisé est visible dans l'app. Le repli AES-GCM protège le fichier au repos mais ne bénéficie pas dunir de session du système : sur un poste Linux sans keyring, préférez-en un.

## Sécurité

- Secrets chiffrés au repos (voir ci-dessus), jamais en clair ni en logs.
- Renderer isolé : `contextIsolation`, pas de `nodeIntegration`, `sandbox`, CSP stricte au build.
- Toute entrée IPC est validée (zod) ; les schémas API sont dérivés de la spec OpenAPI officielle fournie dans `openapi/researcher.swagger.json`.
- L'API Intigriti est utilisée en **lecture seule** ; les favoris/groups/tags/notes/credentials sont strictement locaux.
- Serveur MCP : JSON-RPC sur `POST`, authentification par jeton Bearer, **aucun header CORS** (un navigateur cross-origin ne peut pas consommer le serveur), liste blanche d'outils par défaut (les shells sont refusés).

## Structure

```
src/
  main/            # processus principal : fenêtres, IPC, DB, API, scans, outils, MCP
    db/            # migrations + openDatabase + repository (node:sqlite)
    services/
      intigriti/   # client API
      scan/        # plan + runner
      tools/       # catalog.ts, installer.ts, platform.ts (résolution binaire/asset)
      mcp/         # serveur HTTP, agents, outils exposés
    ipc-*.ts       # validateurs + handlers (programs, detail, scan, tools, mcp)
  preload/         # contextBridge → window.bountydesk
  renderer/        # React (UI seule, sans réseau ni SQL)
  shared/ipc.ts    # contrat de types et canaux partagés
remote-agent/      # agent Rust d'ecran distant (Windows uniquement, compile a part)
agent/             # pack Claude Code + skills
tests/             # Vitest (API, schema, throttler, paginate, db, scan, catalogue, plateforme, installer, MCP)
openapi/           # spec OpenAPI Intigriti vendored
```

## Licence

Usage personnel/assistant seulement. N'utilisez pas un tool sur des cibles hors scope, et respectez toujours les règles d'engagement de chaque programme.
