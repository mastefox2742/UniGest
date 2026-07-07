# Notifications et preferences

Cette phase renforce le module notifications.

## Backend

- `GET /api/notifications` liste les notifications de l'utilisateur connecte.
- `POST /api/notifications/read-all` marque tout comme lu.
- `POST /api/notifications/:id/read` marque une notification comme lue.
- `POST /api/notifications/push-token` enregistre un token Expo/web via la fonction Supabase existante.
- `DELETE /api/notifications/push-token` desactive un token.
- `GET /api/notifications/preferences` retourne les preferences.
- `PATCH /api/notifications/preferences` met a jour les preferences.
- `supabase/functions/send-push` cree ou relaie les notifications vers Expo Push Service.

## Corrections

- Le service lit/ecrit maintenant la colonne `message`, conforme au schema.
- La route `read-all` est declaree avant `/:id/read`.
- Les listes appliquent une limite normalisee de 1 a 100.

## Scenarios notifies

- frais crees et paiements confirmes;
- certificat disponible;
- these soumise ou statut modifie;
- domanda di Laurea soumise ou mise a jour;
- diplome emis;
- note proposee.

Les notifications respectent les preferences par sujet.

## Push delivery

- L'API cree d'abord la notification in-app dans `notifications`.
- Le service `notifications.service.ts` appelle ensuite `send-push` avec `persist: false` pour eviter les doublons.
- L'Edge Function accepte `userId`, `userIds` ou `role` comme cible.
- Les tokens Expo invalides (`DeviceNotRegistered`) sont automatiquement desactives.
- Si aucun token actif n'existe, la notification reste disponible dans l'app.

## Donnees

La migration `00016_notification_preferences.sql` ajoute `notification_preferences` avec RLS utilisateur.

## Clients

- Les parametres etudiants web sauvegardent les preferences via `/api/notifications/preferences`.
- L'ecran mobile notifications lit et marque les notifications via l'API au lieu d'acceder directement a Supabase.
- Le hook mobile push enregistre et desactive les tokens via `/api/notifications/push-token`.
