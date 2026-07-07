# Audit trail

Cette phase remplace l'audit uniquement console par un journal persistant.

## Donnees

La migration `00015_audit_logs.sql` cree `audit_logs` avec:

- acteur et role;
- action;
- ressource et identifiant de ressource;
- methode, chemin, statut HTTP;
- IP masquee en production;
- user-agent;
- metadata JSON nettoyee des secrets;
- date de creation.

## API

- `GET /api/audit` liste les evenements pour le role `admin`.
- Filtres disponibles: `action`, `resource`, `actorUserId`, `limit`.

## Frontend

- `/admin/audit` affiche le journal avec filtres action, ressource et limite.
- La page expose une vue tabulaire et les details metadata des derniers evenements.

## Mutations auditees

- paiements et frais;
- emission/demande/telechargement de certificats;
- soumission et statut de these;
- demande de Laurea, jury, soutenance, diplome;
- export CSV rapports;
- routes RGPD deja branchees sur `auditLog`.

L'ecriture d'audit est non bloquante: une erreur d'insertion dans `audit_logs` ne casse pas l'action metier.
