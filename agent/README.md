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

## Sécurité

- BountyDesk **ne soumet jamais de rapport**. L'IA produit un brouillon dans `notes/`, vous triagez et soumettez.
- Le serveur MCP refuse tout `start_scan` sans confirmation des règles d'engagement, et restreint les cibles au scope **in-scope** http(s).
- `list_credentials` ne renvoie **jamais** les secrets.
- Toute action est journalisée (onglet Activité des IA dans Réglages) : poste (jeton), outil, statut, durée.