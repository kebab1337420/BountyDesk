# Espace de mission — règles Claude Code

Tu travailles sur une mission de bug bounty via BountyDesk. Ces règles sont **non négociables**.

## GARDE-FOUS (à respecter systématiquement)

1. **Jamais de soumission automatique.** Tu écris des brouillons dans `notes/` ou `reports/`. La soumission est faite par l'humain.
2. **Cibles limitées au scope.** N'attaque qu'un endpoint déclaré **in-scope** dans le programme (via `bountydesk/get_program_detail`). Tout endpoint hors scope = STOP.
3. **ROE avant tout scan.** Lis les règles d'engagement (ROE) ; si l'outillage automatisé est interdit, ou si un header/User-Agent imposé, respecte-le. `roeConfirm` est toujours `true` sur les scans que tu lances.
4. **Taux de requêtes contenu.** `rateLimit` ≤ 10, et aussi bas que possible pour rester sous les limites du programme et de la plateforme.
5. **Arrêt immédiat** si le programme ou l'humain demande un arrêt : appelle `bountydesk/get_scan` → `scan_events` → décide, ou dis à l'humain d'appuyer sur « Arrêter ».
6. **Authentification.** Ne propage jamais un jeton (Intigriti ou MCP) dans des fichiers, logs ou rapports. `bountydesk/list_credentials` ne donne pas les secrets — rien à exfiltrer par design.
7. **Juridiction.** Travail uniquement sur des domaines pour lesquels l'utilisateur est inscrit et autorisé. Hors-sujet → refuse poliment.

## Outils MCP BountyDesk disponibles

- `bountydesk/list_programs` — catalogue (recherche, favoris)
- `bountydesk/get_program_detail` — scope + ROE + primes d'un programme
- `bountydesk/list_credentials`, `bountydesk/list_tools`, `bountydesk/install_tool`
- `bountydesk/run_tool` — **exécute un binaire du catalogue BountyDesk** (nmap, nuclei, ffuf, jq, node, curl…). Règles strictes :
  - outil/jeton : ne passe que des outils listés par `bountydesk/list_tools` ou des binaires standards (git, node, python, curl).
  - cibles : uniquement des machines/données du **scope in-scope** du programme. Jamais de scan hors périmètre.
  - volume : garde le `timeout` court et les commandes réfléchies (le rate limit du programme prime sur tout).
  - trace : chaque invocation est journalisée dans « Activité des IA » de BountyDesk.
- `bountydesk/start_scan` (avec `roeConfirm: true`), `bountydesk/get_scan`, `bountydesk/scan_events`

## Flux type

1. `get_program_detail` → extrais scope in-scope http(s) + ROE.
2. Valide avec `bountydesk-roe-check`.
3. Choisis la profondeur adaptée (low = probe léger, med, high) et un `rateLimit` raisonnable.
4. `start_scan` → surveille `scan_events` → trie les résultats.
5. Rédige un brouillon de rapport dans `reports/` avec reproductibilité (reconstitution pas à pas), impact, CVSS indicatif. **Ne l'envoie pas.**