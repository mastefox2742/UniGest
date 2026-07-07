# Laurea, these et diplomation

Cette phase ajoute le premier workflow complet de demande de Laurea.

## Backend

- `GET /api/graduation/me` retourne la demande de Laurea de l'etudiant connecte.
- `POST /api/graduation/apply` cree une demande et calcule les prerequis.
- Les routes admin gardent la gestion des jurys, dates de soutenance et generation du diplome.
- Les transitions de statut sont validees par `graduation-rules.ts`.
- Les routes these utilisent maintenant des schemas Zod pour les soumissions et changements de statut.

## Prerequis controles

Une demande est `eligible` seulement si:

- les CFU acquis couvrent les CFU requis;
- le solde financier ouvert est nul;
- une these est soumise, approuvee, en cours ou defendue.

Sinon la demande est creee en `blocked` avec les raisons dans `notes`.

## Frontend web

La page etudiante de these utilise maintenant les donnees API:

- `ThesisPanel` pour soumettre ou suivre la these;
- `GraduationApplicationPanel` pour soumettre et suivre la domanda di Laurea.

## Donnees

La migration `00014_graduation_workflow_guards.sql` ajoute:

- une demande ouverte maximum par etudiant;
- des contraintes sur CFU, solde et metadata diplome;
- un index de lecture par etudiant/statut/date.
