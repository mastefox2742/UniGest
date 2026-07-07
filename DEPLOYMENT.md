# Guide de déploiement — UniGest

## Vue d'ensemble

```
                    ┌─────────────────┐
                    │   EAS Build     │
                    │  (iOS/Android)  │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐       ┌──────────┐
    │  Vercel  │      │ Railway  │       │ Supabase │
    │   Web    │─────▶│   API    │◀─────▶│    DB    │
    │ (Next.js)│      │(Express) │       │  (Postgres)│
    └──────────┘      └──────────┘       └──────────┘
```

---

## Étape 1 — Supabase (Base de données)

### 1.1 Créer un projet

1. Aller sur [supabase.com](https://supabase.com) → New project
2. Choisir une région EU (Frankfurt recommandé pour la RGPD)
3. Noter : `Project URL` et `anon public key` et `service_role key`

### 1.2 Appliquer les migrations

```bash
# Installer la CLI Supabase
npm install -g supabase

# Se connecter
supabase login

# Lier au projet
supabase link --project-ref VOTRE_PROJECT_REF

# Appliquer toutes les migrations
supabase db push
```

### 1.3 Déployer l'Edge Function push

```bash
supabase functions deploy send-push
```

### 1.4 Variables d'environnement à noter

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=VOTRE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=VOTRE_SERVICE_ROLE_KEY  (⚠️ SECRET — jamais dans le client)
```

---

## Étape 2 — API Express (Railway)

### 2.1 Créer un service Railway

1. Aller sur [railway.app](https://railway.app) → New Project
2. Deploy from GitHub repo → sélectionner `Apha-Uni`
3. Choisir le root directory : `packages/api`
4. Railway détecte le `Dockerfile` automatiquement

### 2.2 Variables d'environnement Railway

```bash
NODE_ENV=production
API_PORT=3001

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Auth
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# MFA (activer après déploiement initial)
REQUIRE_MFA=false

# Email
RESEND_API_KEY=re_xxxx
RESEND_FROM=noreply@unigest.fr

# CORS
NEXT_PUBLIC_APP_URL=https://unigest.vercel.app
```

### 2.3 URL de l'API

Railway fournira une URL type : `https://api-unigest.up.railway.app`

---

## Étape 3 — Frontend Web (Vercel)

### 3.1 Déployer sur Vercel

```bash
# Depuis la racine du projet
npx vercel --cwd packages/web
```

Ou via le dashboard Vercel :
1. Import GitHub repo
2. Root directory : `packages/web`
3. Framework preset : Next.js

### 3.2 Variables d'environnement Vercel

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://api-unigest.up.railway.app
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_APP_URL=https://unigest.vercel.app
PUBLIC_APP_URL=https://unigest.vercel.app
SUPABASE_FUNCTIONS_URL=https://xxxx.supabase.co/functions/v1
SENTRY_DSN=https://...
```

### 3.3 Désactiver le mode démo

```bash
NEXT_PUBLIC_DEMO_MODE=false  # ← IMPORTANT
```

---

## Étape 4 — App Mobile (EAS)

### 4.1 Configurer EAS

```bash
cd packages/mobile

# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Créer le projet EAS (génère le projectId)
eas build:configure
```

Copier le `projectId` généré dans `app.json` :
```json
"extra": {
  "eas": {
    "projectId": "VOTRE_VRAI_PROJECT_ID"
  }
}
```

### 4.2 Variables d'environnement mobile

Mettre à jour `eas.json` profile `production` :
```json
"env": {
  "EXPO_PUBLIC_API_URL": "https://api-unigest.up.railway.app",
  "EXPO_PUBLIC_SUPABASE_URL": "https://xxxx.supabase.co",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJ..."
}
```

### 4.3 Build de développement (test sur device)

```bash
# Android APK (installer directement)
eas build --profile development --platform android

# iOS Simulator
eas build --profile development --platform ios
```

### 4.4 Build de production

```bash
# iOS App Store
eas build --profile production --platform ios

# Android Play Store
eas build --profile production --platform android

# Les deux en parallèle
eas build --profile production --platform all
```

### 4.5 Soumettre aux stores

```bash
# iOS App Store
eas submit --platform ios --profile production

# Google Play Store
eas submit --platform android --profile production
```

---

## Étape 5 — Vérifications post-déploiement

### Checklist

```bash
# 1. API répond
curl https://api-unigest.up.railway.app/health
# → {"status":"ok","timestamp":"..."}

# 2. Auth fonctionne
curl -X POST https://api-unigest.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrongpassword"}'
# → 401 (normal)

# 3. Rate limiting actif
for i in {1..6}; do curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://api-unigest.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"a@b.com","password":"x"}'; done
# → 401 401 401 401 401 429 ← le 6e est rate limité ✅

# 4. CSP présente (web)
curl -I https://unigest.vercel.app | grep -i "content-security-policy"

# 5. HSTS présent
curl -I https://unigest.vercel.app | grep -i "strict-transport"
```

---

## Coûts estimés (stack complète)

| Service | Plan | Coût/mois |
|---------|------|-----------|
| Supabase | Free (500MB DB, 50k auth) | **0€** |
| Vercel | Hobby (1 projet) | **0€** |
| Railway | Starter ($5 crédit/mois) | **~0–5€** |
| Resend | Free (100 emails/jour) | **0€** |
| EAS Build | Free (30 builds/mois) | **0€** |
| **Total** | | **0–5€/mois** |

Pour > 500 étudiants, passer Supabase Pro (~25€/mois).
