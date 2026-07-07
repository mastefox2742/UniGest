import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { auditLog } from '../middleware/mfa.middleware'
import {
  validate,
  SubmitPlacementSurveySchema,
  UpsertAlumniProfileSchema,
} from '../middleware/validate'
import {
  getAlumniProfile,
  getAlumniProfiles,
  getPlacementStats,
  submitPlacementSurvey,
  upsertAlumniProfile,
} from '../services/alumni.service'

export const alumniRouter = Router()

/** GET /api/alumni/me */
alumniRouter.get('/me',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const profile = await getAlumniProfile(req.user!.id)
      return res.json({ data: profile })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** PUT /api/alumni/me */
alumniRouter.put('/me',
  authMiddleware,
  requireRole('student'),
  auditLog('ALUMNI_PROFILE_UPSERT'),
  validate(UpsertAlumniProfileSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const profile = await upsertAlumniProfile(req.user!.id, req.body)
      return res.json({ data: profile })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** POST /api/alumni/me/surveys */
alumniRouter.post('/me/surveys',
  authMiddleware,
  requireRole('student'),
  auditLog('PLACEMENT_SURVEY_SUBMIT'),
  validate(SubmitPlacementSurveySchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const survey = await submitPlacementSurvey(req.user!.id, req.body)
      return res.status(201).json({ data: survey })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** GET /api/alumni */
alumniRouter.get('/',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (req, res) => {
    try {
      const { graduationYear } = req.query as { graduationYear?: string }
      const filters: Parameters<typeof getAlumniProfiles>[0] = {}
      if (graduationYear) filters.graduationYear = Number(graduationYear)
      const profiles = await getAlumniProfiles(filters)
      return res.json({ data: profiles })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** GET /api/alumni/placement/stats */
alumniRouter.get('/placement/stats',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (_req, res) => {
    try {
      const stats = await getPlacementStats()
      return res.json({ data: stats })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)
