# BountyDesk Agent Pack

Toolkit Claude Code qui fait travailler une IA sur des **missions autorisées** en s'appuyant sur le serveur MCP local de BountyDesk.

## Prérequis

- BountyDesk installé et lancé sur le PC « hôte ».
- MCP **activé** dans **Réglages → IA** (port 8787 par défaut, jeton affiché et copiable).
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`).

## Mise en place (rapide)

1. Dans **Réglages → IA** de BountyDesk : activez le serveur, copiez l'URL et un jeton (PC principal, ou un jeton dédié par PC/IA).
2. Copiez ce dossier dans votre espace de mission :

   ```
   xcopy /E agent\ cibles\<mission>\agent\
   ```

3. Ajoutez l'adresse du serveur MCP à Claude Code pour cet espace (`cibles\<mission>\.mcp.json`) :

   ```json
   {
     "mcpServers": {
       "bountydesk": {
         "type": "http",
         "url": "http://127.0.0.1:8787/mcp",
         "headers": { "Authorization": "Bearer VOTRE_JETON" }
       }
     }
   }
   ```

   (L'URL et le jeton sont copiables en 1 clic depuis **Réglages → IA** ; remplacez `127.0.0.1` par l'IP du PC hôte si l'IA est sur un autre PC et que le LAN est exposé.)

4. Lancez `claude` dans `cibles\<mission>\` et demandez, par exemple :

   - *« Chasse sur le programme X avec bountydesk-hunt »*
   - *« Prépare-moi une mission sur ce programme en suivant les règles d'engagement »*

## Ce que contient ce pack

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Règles du workspace de mission (GARDE-FOUS, lecture seule côté plateforme). |
| `.claude/skills/bountydesk-hunt/SKILL.md` | Workflow complet : trouver → lire ROE → cibler → scanner → trier. |
| `.claude/skills/bountydesk-roe-check/SKILL.md` | Porte obligatoire : vérifier ROE avant tout `start_scan`. |
| `.claude/agents/hunt-validated.md` | Agent « chasseur validé » avec garde-fous actifs. |
| `mcp.example.json` | Gabarit de config MCP Claude Code. |

## Assistant IA

L'IA travaille en mode **assisté** : elle pilote BountyDesk par le serveur MCP, dans le périmètre du
programme, et vous gardez la main sur tout ce qui sort.

- **Rôle** : lecture du catalogue, récupération du scope et des ROE, tri des résultats, rédaction de brouillons.
- **Garde-fous** : chaque appel est validé côté BountyDesk (scope in-scope, `roeConfirm`, listes de binaires autorisés, journalisation).
- **Traçabilité** : *Réglages → Activité des IA* conserve poste, jeton, outil, statut et durée de chaque invocation.
- **Limite ferme** : BountyDesk ne soumet aucun rapport. La soumission reste une action humaine.

### Navigateur intégré

Un bouton **Ouvrir le navigateur intégré** dans l'onglet **Assistant** ouvre une fenêtre de navigation
dédiée : plus besoin d'empiler trente onglets pour lire une doc, un scope ou un advisory.

- Le site distant est rendu dans un iframe sandboxé, **sans** accès au pont privilégié `bountydesk` : le contenu web ne peut pas appeler l'API de l'application.
- Seuls `http` et `https` sont acceptés, et toute navigation est refusée hors de la fenêtre Assistant.
- C'est un confort de travail, pas un canal d'action : rien n'y est exécuté.

### Exécution d'outils

`bountydesk/run_tool` autorise les binaires du catalogue BountyDesk et une liste de binaires système de
confiance (interpréteurs `node`/`python`/`php`/`ruby`, coquilles `sh`/`bash`, réseau `curl`/`openssl`/`dig`,
fichiers `grep`/`sed`/`awk`/`find`…). Restent refusés les téléchargeurs/lanceurs indirects
(`certutil`, `bitsadmin`, `winget`, `mshta`, `rundll32`, `wscript`, `cscript`) ainsi que
`cmd`/`powershell`/`pwsh`, qui disposeraient de cmdlets d'exécution mémoire que le suivi d'argv ne couvre pas.
Le `cwd` reste confiné au dossier `tools` de BountyDesk.