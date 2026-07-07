# Certificats et verification publique

Cette phase durcit le module certificats autour de trois parcours: emission, demande et verification.

## Backend

- `GET /api/certificates/me` liste les certificats de l'etudiant connecte.
- `POST /api/certificates/request` permet a un etudiant de demander un document officiel.
- `POST /api/certificates` reste reserve aux roles `admin` et `secretary`.
- `GET /api/certificates/:id/pdf` genere le PDF a la demande avec controle d'acces.
- `GET /api/certificates/verify/:token` verifie publiquement un certificat sans exposer de donnees privees.

## Verification

Chaque certificat recoit un `verification_token` opaque et unique.
Le PDF inclut l'URL publique:

```text
/verify/certificates/:token
```

La page publique affiche seulement:

- validite du certificat;
- type de document;
- numero de serie;
- dates d'emission et d'expiration.

## Donnees

La migration `00013_certificate_verification.sql` ajoute:

- `certificates.verification_token`;
- un backfill pour les certificats existants;
- un index unique sur le token;
- un index de lecture par etudiant et date d'emission.

## Frontend

- La page etudiante permet de demander un certificat.
- Le telechargement PDF passe par un `fetch` authentifie, pas par un lien direct sans bearer token.
- Une page publique `/verify/certificates/[token]` permet la verification externe.
