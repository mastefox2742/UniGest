import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { router } from './routes'
import { apiLimiter, loginLimiter } from './middleware/rateLimiter'
import { initSentry, Sentry } from './lib/sentry'

// Initialiser Sentry en premier (avant tout le reste)
initSentry()

const app  = express()
const PORT = process.env.API_PORT ?? 3001
const isProd = process.env.NODE_ENV === 'production'

// ─── Trust proxy (obligatoire pour rate-limiting correct derrière Nginx/Cloudflare) ──
// Sans ce flag, express-rate-limit lit l'IP du proxy au lieu de l'IP cliente réelle
app.set('trust proxy', 1)

// ─── Sécurité & Headers ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'"],
      objectSrc:  ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge:            31536000,  // 1 an
    includeSubDomains: true,
    preload:           true,
  },
  frameguard:           { action: 'deny' },
  noSniff:              true,
  referrerPolicy:       { policy: 'strict-origin-when-cross-origin' },
  xssFilter:            true,
  dnsPrefetchControl:   { allow: false },
}))

// ─── CORS restreint aux domaines déclarés ─────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:19006',  // Expo web
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    // En production : rejeter les requêtes sans origin (curl, scripts anonymes)
    // En dev : les autoriser pour faciliter les tests locaux
    if (!origin) {
      if (isProd) return callback(new Error('CORS: origine manquante refusée en production'))
      return callback(null, true)
    }
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origine non autorisée — ${origin}`))
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// ─── Rate limiting global ─────────────────────────────────────────────────────
// Appliqué AVANT les routes pour bloquer les requêtes abusives tôt
app.use('/api', apiLimiter as express.RequestHandler)

// ─── Body & Utils ─────────────────────────────────────────────────────────────
app.use(compression())

// Morgan : logs détaillés en dev, format réduit en prod (sans tokens ni PII)
if (isProd) {
  // Token custom : URL sans query params (masque les IDs potentiellement sensibles)
  morgan.token('safe-url', (req: express.Request) => {
    const url = req.url ?? '/'
    return url.split('?')[0] ?? url
  })
  app.use(morgan(':method :safe-url :status :res[content-length] - :response-time ms'))
} else {
  app.use(morgan('dev'))
}

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ─── Health check (sans auth) ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── Routes ───────────────────────────────────────────────────────────────────
// Rate limiter spécifique sur les routes d'auth
app.use('/api/auth/login',  loginLimiter  as express.RequestHandler)
app.use('/api/auth/signup', loginLimiter  as express.RequestHandler)

app.use('/api', router)

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route introuvable', statusCode: 404 })
})

// ─── Erreur globale ───────────────────────────────────────────────────────────
// En production : message générique + log interne
// En développement : message complet pour faciliter le debug
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (isProd) {
    // Envoyer à Sentry avec contexte
    Sentry.withScope(scope => {
      scope.setTag('route', req.path)
      scope.setTag('method', req.method)
      Sentry.captureException(err)
    })
    console.error(`[ERROR] ${new Date().toISOString()} — ${err.name}: ${err.message}`)
    return res.status(500).json({
      error:      'Internal Server Error',
      message:    'Une erreur interne est survenue. Veuillez réessayer.',
      statusCode: 500,
    })
  }
  // Dev uniquement
  console.error(err)
  return res.status(500).json({
    error:      'Internal Server Error',
    message:    err.message,
    stack:      err.stack,
    statusCode: 500,
  })
})

app.listen(PORT, () => {
  console.log(`🚀 UniGest API démarrée sur http://localhost:${PORT} [${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}]`)
})

export default app
