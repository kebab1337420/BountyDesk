---
name: bountydesk-hunt
description: >-
  Workflow complet de chasse bug bounty via le MCP BountyDesk : localiser un
  programme, lire scope + règles d'engagement, cibler strictement les endpoints
  in-scope http(s), lancer un scan (low/med/high) avec confirmation ROE, suivre
  les événements et produire un brouillon de rapport. Utilise UNIQUEMENT les
  outils MCP bountydesk/* et respecte les garde-fous ci-dessous. N'est jamais
  censé soumettre un rapport.
---

# Chasse BountyDesk

## Contexte autorisé
Mission bug bounty légitime sur un programme pour lequel l'utilisateur est
inscrit. Toute autre situation (domaine hors programme, hors-scope, cible non
autorisée, juridiction douteuse) → refuse immédiatement.

## Entrées
- Un programme (handle ou nom, ou bien une recherche) ou un contexte de mission.

## Étapes

1. **Localiser le programme**
   - Si handle/nom connu : affiner par `bountydesk/list_programs` ({search}).
   - Sinon : lister ({favoriteOnly} éventuel) et laisser l'utilisateur choisir.
2. **Lire le détail** : `bountydesk/get_program_detail` ({programId}).
   - Extraire `scope` (endpoints in-scope/out-of-scope, tiers, types)
   - Extraire `roe` complet : `automatedTooling`, `intigritiMe`, `userAgent`,
     `requestHeader`, `safeHarbour`, pièces jointes.
3. **Porte ROE** : exécuter la vérification `bountydesk-roe-check` avant toute
   action active. Respecter un éventuel header/User-Agent imposé.
4. **Cibler** : ne retenir que les endpoints **in-scope** et de type http(s)
   (ignorer *.other, ftp, produits tiers non listés, etc.). Max ~10 cibles pour
   un scan, hiérarchisées par tier.
5. **Choisir la profondeur** selon la tolérance du programme et l'exposition :
   - `low` : probe curl simple + nuclei basse sévérité (rateLimit 1-2)
   - `med` : + nuclei full + tags tech/exposure (rateLimit ≤ 5)
   - `high` : + ffuf (si wordlist dispo) + severités critiques (rateLimit ≤ 10)
   - Si ROE interdit l'automatisation → proposer uniquement la liste de cibles manuelles.
6. **Lancer** : `bountydesk/start_scan` avec `roeConfirm: true`,
   `depth`, `rateLimit` (≤ 10). Rapporter `scanId`.
7. **Suivre** : `bountydesk/get_scan` + `bountydesk/scan_events` ({scanId},
   `afterSeq`) jusqu'à done/stopped. Résumer les événements.
8. **Trier** : pour chaque signal, vérifier la criticité, la reproductibilité,
   rester dans le scope. Rejeter les faux positifs.
9. **Rapport** : rédiger un brouillon dans `reports/` (résumé, impact, steps to
   reproduce, évidence, CVSS indicatif, remediation). **Ne jamais envoyer.**

## Garde-fous fermes
- Ne jamais appeler `start_scan` avec `roeConfirm` autre que `true`.
- Ne jamais scanner un endpoint non déclaré in-scope.
- Ne jamais afficher/copier/écrire un jeton (<- jamais présent dans les
  sorties : `list_credentials` ne renvoie pas les secrets).
- Ne jamais tenter de soumettre un rapport par quelque outil que ce soit.
- Respecter le rate limit de la plateforme : les scans BountyDesk sont déjà
  bornés par le throttler (400 req/5 min).

## Critères de réussite
- Une liste des cibles choisies (in-scope uniquement), le scan lancé (scanId),
  les résultats triés et un brouillon de rapport prêt à revue humaine.