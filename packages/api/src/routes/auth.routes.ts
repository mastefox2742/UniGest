import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { getProfile } from '../services/profile.service'

export const authRouter = Router()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/** POST /api/auth/login */
authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    return res.status(400).json({ error: 'Bad Request', message: 'email et password requis' })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Identifiants invalides' })
  }

  const profile = await getProfile(data.user.id)
  return res.json({
    data: {
      accessToken:  data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt:    data.session.expires_at,
      user: {
        id:    data.user.id,
        email: data.user.email,
        ...profile,
      },
    },
  })
})

/** POST /api/auth/logout */
authRouter.post('/logout', authMiddleware, async (_req, res) => {
  await supabase.auth.signOut()
  return res.json({ data: { message: 'Déconnecté avec succès' } })
})

/** POST /api/auth/refresh */
authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string }
  if (!refreshToken) {
    return res.status(400).json({ error: 'Bad Request', message: 'refreshToken requis' })
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.session) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Token invalide ou expiré' })
  }

  return res.json({
    data: {
      accessToken:  data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt:    data.session.expires_at,
    },
  })
})

/** GET /api/auth/me */
authRouter.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' })

  const profile = await getProfile(req.user.id)
  if (!profile) return res.status(404).json({ error: 'Not Found', message: 'Profil introuvable' })

  return res.json({ data: { id: req.user.id, email: req.user.email, ...profile } })
})
