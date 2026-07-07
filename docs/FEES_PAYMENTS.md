# Frais, retards et paiements

Cette phase connecte le parcours frais et paiements aux donnees reelles Supabase.

## Backend

- `GET /api/fees/me` renvoie les frais de l'etudiant connecte et les totaux par statut.
- Les frais `pending` dont la date d'echeance est depassee passent automatiquement en `overdue`.
- La penalite de retard est centralisee a 5% dans `fee-rules.ts`.
- `POST /api/fees/:id/self-pay` permet a un etudiant de payer uniquement ses propres frais.
- `POST /api/fees/:id/pay` reste reserve aux roles `admin` et `secretary`.
- Le paiement est refuse si le frais est deja paye, exonere, ou si le montant ne correspond pas exactement au total du.

## Donnees

La migration `00012_fee_payment_guards.sql` ajoute:

- une contrainte sur les penalites negatives;
- une contrainte de metadata pour les frais payes;
- des index pour les recherches par etudiant, statut, echeance et paiement;
- une reference de paiement unique quand elle est renseignee.

## Frontend web

La page etudiante `FeesPage` utilise maintenant `useStudentFees` et `usePayStudentFee`:

- totaux reels a payer, en retard et deja payes;
- liste des frais reelle;
- paiement simule PagoPA via l'API;
- affichage d'un recu apres paiement.
