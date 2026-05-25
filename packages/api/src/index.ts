import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import { router } from './routes'

const app = express()
const PORT = process.env.API_PORT ?? 3001

// ─── Middlewares globaux ───────────────────────────────────────────────────────
app.use(helmet())
app.use(
  cors({
    origin: [
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:19006', // Expo web
    ],
    credentials: true,
  }),
)
app.use(compression())
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api', router)

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route introuvable', statusCode: 404 })
})

// ─── Erreur globale ───────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal Server Error', message: err.message, statusCode: 500 })
})

app.listen(PORT, () => {
  console.log(`🚀 UniGest API démarrée sur http://localhost:${PORT}`)
})

export default app
