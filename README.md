# BountyDesk

Application desktop Windows pour chasser sur la plateforme de bug bounty **Intigriti** : catalogue de programmes, favoris/groups/tags/notes locaux, veille sur le scope, scans de profondeur low/med/high, outils pen-test installables, et un serveur MCP local pour piloter le tout depuis une IA (Claude, opencode…).

**BountyDesk est un outil de lecture/assistance. Il ne soumet jamais de rapport automatiquement, et aucun scan n'est lancé sans confirmation explicite des règles d'engagement.**

## Prérequis

- Windows 10/11 64 bits
- Un token d'API Intigriti (onglet *Settings* → *API* sur le site Intigriti, rôle *External Researcher*)
- Accès réseau vers `api.intigriti.com` et `api.github.com` (téléchargement des outils portables)
- `winget` (installé par défaut sur Windows 11, ajoutable sur Windows 10) pour les outils système

## Installation

### Via l'installeur (recommandé)

1. Téléchargez `dist/BountyDesk-Setup-0.1.0.exe`.
2. Lancez-le : choix du dossier d'installation, raccourcis bureau et menu démarrer, désinstallation propre via l'Add/Remove normal de Windows.
3. Au premier lancement, collez votre token Intigriti : il est testé auprès de l'API puis chiffré avec le DPAPI Windows (chiffrement de session, jamais stocké en clair, jamais loggé).

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
| `npm run dist` | tests + typecheck + build + **installeur NSIS** → `dist/BountyDesk-Setup-0.1.0.exe` |

## Fonctionnalités

### Programmes et sync
- Écran **Programmes** : liste paginée (recherche avec debounce, filtre favoris, tri nom/prime/récent, sens croissant/décroissant).
- **Synchroniser** importe le catalogue (paginated, limite ~400 requêtes / 5 min gérée par un token bucket, retry en backoff sur 429/5xx).
- Favoris, groupes, tags et notes : **stockés localement en SQLite** (`%APPDATA%\BountyDesk\bountydesk.db`), indépendants de l'API (lecture seule).

### Détail de mission et credentials
- Clic sur un programme → modal **Détails** : badges (statut/type/confidentialité/secteur), primes min/max, **règles d'engagement (ROE)** complètes (Intigriti Me, outils automatisés, user-agent, header autorisé, safe harbour, pièces jointes) et **scope in/out** (domaines, tiers, skills requis), lien vers la page programme.
- Bouton **Get credentials** : identifiants (login/mot de passe) chiffrés par programme via DPAPI + raccourci vers la page de login de la mission. Les secrets ne sont jamais envoyés au renderer en clair sauf demande explicite de révélation.

### Scans low / med / high
- Bouton **Scanner** dans le détail d'une mission : profils de profondeur — Bas (curl + nuclei low/medium), Moyen (+ tags tech/exposure, severities ≤ high), Élevé (+ ffuf, severities ≤ critical).
- **Garde-fous** : cibles limitées au scope **in-scope** et aux endpoints HTTP(S) ; confirmation manuelle de lecture des ROE obligatoire ; rate limit par scan ; bouton **Arrêter** toujours disponible ; tout est loggé dans `scan_events` ; exécution séquentielle, arrêt propre du process courant. Aucune soumission de rapport.

### Outils
- Catalogue pré-rempli (cochés par défaut) : nmap, nuclei, subfinder, httpx, ffuf, gobuster (portables GitHub au besoin) + wireshark, jq, ripgrep, git, python (via winget).
- Installation silencieuse en un clic, journal de sortie par outil, état persisté.
- Les frameworks de chasse pilotés par IA (ex. **BugHunter AI**, Claude Code) sont disponibles en `git clone` sécurisé : rien n'est exécuté automatiquement, un bouton **Guide** ouvre la doc en 1 clic.

### MCP (IA)
- Écran **Réglages → IA** : activer un serveur MCP HTTP (port défaut `8787`), exposable **sur le réseau local (LAN)** pour piloter BountyDesk depuis plusieurs PC, avec **un jeton nommé par PC/IA** (jetons chiffrés, révocation en 1 clic, jamais listés dans le README ni les logs).
- Adresse du serveur (locale et LAN) copiable en 1 clic, et un tableau **Activité des IA** journalise chaque appel d'outil (poste, outil, statut, durée).
- **Outils MCP** : `list_programs`, `get_program_detail`, `list_credentials` (sans secret), `list_tools`, `install_tool`, `start_scan` (mêmes garde-fous que l'UI), `get_scan`, `scan_events`, `run_tool` (exécution *encadrée* d'un binaire du catalogue dans `%APPDATA%\BountyDesk\tools`).
- Exemple de config `claude_desktop_config.json` / `opencode.json` fourni dans l'app.

### Agent IA (pont Claude Code → BountyDesk)
- Dossier `agent/` : un **pack prêt à copier** dans un dossier de mission pour donner à Claude Code un workflow encadré (sélection de programmes, vérification ROE avec verdicts *refuse/restreint/légitime*, choix low/med/high, scan puis tri des résultats, brouillon de rapport dans `reports/` — **jamais de soumission**).
- Contenu : `CLAUDE.md` (garde-fous non négociables), deux skills (`.claude/skills/bountydesk-hunt`, `bountydesk-roe-check`), un agent `hunt-validated` (demande validation humaine avant exécution), et un gabarit `.mcp.json`.
- Mise en place : activer l'IA dans Réglages, copier l'URL + le jeton (1 clic), les placer dans `cibles/<mission>/.mcp.json`. Détails dans `agent/README.md`.

## Sécurité

- Token et credentials : chiffrés via `safeStorage` (DPAPI), jamais en clair ni en logs.
- Renderer isolé : `contextIsolation`, pas de `nodeIntegration`, `sandbox`, CSP stricte au build.
- Toute entrée IPC est validée (zod) ; les schémas API sont dérivés de la spec OpenAPI officielle fournie dans `openapi/researcher.swagger.json`.
- L'API Intigriti est utilisée en **lecture seule** ; les favoris/groups/tags/notes/credentials sont strictement locaux.

## Structure

```
src/
  main/            # processus principal : fenêtres, IPC, DB, API, scans, outils, MCP
    db/            # migrations + openDatabase + repository (node:sqlite)
    services/      # intigriti (client API), program-detail, credentials, scan, tools, mcp
    ipc-*.ts       # validateurs + handlers (programs, detail, scan, tools, mcp)
  preload/         # contextBridge → window.bountydesk
  renderer/        # React (UI seule, sans réseau ni SQL)
  shared/ipc.ts    # contrat de types et canaux partagés
tests/             # Vitest (unitaires : client API, schema, throttler, paginate, db, scan, catalogue, MCP) + tests HTTP réels du serveur MCP
openapi/           # spec OpenAPI Intigriti vendored
```

## Licence

Usage personnel/assistant seulement. N'utilisez pas un tool sur des cibles hors scope, et respectez toujours les règles d'engagement de chaque programme.