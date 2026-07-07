# Reporting decisionnel

Cette phase ajoute une synthese decisionnelle branchee aux donnees reelles.

## Backend

- `GET /api/reports/overview` retourne un snapshot global.
- Les exports CSV etudiants restent disponibles via `/api/reports/export/students`.
- L'export CSV est audite avec `REPORT_STUDENTS_EXPORT`.

## Indicateurs

Le snapshot inclut:

- effectifs actifs, diplomes, abandons;
- taux d'abandon et ratio d'encadrement;
- moyenne GPA et moyenne des notes publiees/acceptees;
- taux de presence aux examens;
- revenus encaisses, solde restant du, taux de recouvrement;
- demandes de Laurea par statut;
- nationalites, statuts etudiants, evolution des inscriptions;
- KPI par programme.

## Frontend

La page `/admin/reports` consomme `useOverviewReport` et affiche:

- KPIs principaux;
- onglets Effectifs, Resultats, Finance, Laurea;
- tableaux et barres de repartition;
- export CSV etudiants.
