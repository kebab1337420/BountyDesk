---
name: bountydesk-roe-check
description: >-
  Valide une action (scan fuzzing, scan de vulnérabilités actif) contre les
  règles d'engagement (ROE) du programme lu via bountydesk/get_program_detail,
  AVANT de lancer bountydesk/start_scan. Renvoie legitime (permis) / restreint
  (à adapter) / refuse (interdit). OBLIGATOIRE avant toute action active.
---

# Vérification ROE BountyDesk

## Entrée
- `roe` (objet lu via `bountydesk/get_program_detail`) ou l'id/endpoint ciblé.
- L'action envisagée (ex. « nuclei sur <endpoint> », « ffuf sur <host> »).

## Règles

Renvoyer `refuse` si :
- `automatedTooling` est `0`/`false` → pas de scan outillé, seulement du
  manuel ou des tests fonctionnels ponctuels (toujours demander la main).
- L'action cible un endpoint hors scope, un `out-of-scope`, un programme tiers,
  un fournisseur non listé, ou un produit dont le tier l'interdit.
- `safeHarbour` est `false` ET une régularisation explicite est requise.
- L'utilisateur n'est pas clairement inscrit/autorisé sur le programme.

Renvoyer `restreint` si :
- Un `userAgent` ou `requestHeader` est imposé → le réutiliser dans la méthode
  (via l'UA qu'utilise le plan de scan) ou marquer un warning.
- La profondeur dépasse la tolérance probable (ex. `high` sur un programme qui
  n'autorise que des tests légers) → proposer de redescendre en `low`/`med`.
- `intigritiMe` requis (= 1) → vérifier qu'on reste sur l'identité BountyDesk
  / compte inscrit ; ne pas masquer l'origine.

Renvoyer `legitime` sinon (ROE non bloquante, outillage automatisé permis,
cible in-scope).

## Sortie
Un JSON court :
```json
{ "verdict": "legitime", "notes": ["in-scope, automatedTooling autorisé"], "rateLimitSuggere": 2 }
```
Respecter `rateLimitSuggere` (max 10).

## Post-check
Après `start_scan`, rappeler dans la réponse finale : scanId, cibles, profondeur,
rateLimit, et « j'ai respecté la ROE ».