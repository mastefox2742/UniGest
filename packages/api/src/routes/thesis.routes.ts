import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { SubmitThesisSchema, UpdateThesisStatusSchema, validate, validateParams } from '../middleware/validate'
import { auditLog } from '../middleware/mfa.middleware'
import {
  getStudentThesis,
  submitThesis,
  getAllTheses,
  updateThesisStatus,
  type ThesisStatus,
} from '../services/thesis.service'

export const thesisRouter = Router()

// ─── Étudiant ─────────────────────────────────────────────────────────────────

/**
 * GET /api/thesis/me
 */
thesisRouter.get('/me',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const thesis = await getStudentThesis(req.user!.id)
      return res.json({ data: thesis })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/thesis
 * Soumettre ou mettre à jour sa thèse
 */
thesisRouter.post('/',
  authMiddleware,
  requireRole('student'),
  auditLog('THESIS_SUBMIT'),
  validate(SubmitThesisSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { title, abstract, documentUrl, advisorName, coAdvisorName } = req.body as {
        title:          string
        abstract?:      string
        documentUrl?:   string
        advisorName?:   string
        coAdvisorName?: string
      }

      if (!title?.trim()) {
        return res.status(400).json({ error: 'title est requis' })
      }

      const input: {
        title: string; abstract?: string; documentUrl?: string
        advisorName?: string; coAdvisorName?: string
      } = { title }
      if (abstract      !== undefined) input.abstract      = abstract
      if (documentUrl   !== undefined) input.documentUrl   = documentUrl
      if (advisorName   !== undefined) input.advisorName   = advisorName
      if (coAdvisorName !== undefined) input.coAdvisorName = coAdvisorName

      const thesis = await submitThesis(req.user!.id, input)
      return res.status(201).json({ data: thesis })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

// ─── Admin / Secrétaire ───────────────────────────────────────────────────────

/**
 * GET /api/thesis
 * Toutes les thèses (avec filtre ?status=submitted)
 */
thesisRouter.get('/',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (req, res) => {
    try {
      const { status } = req.query as { status?: string }
      const filter: { status?: string } = {}
      if (status) filter.status = status
      const theses = await getAllTheses(filter)
      return res.json({ data: theses })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * PATCH /api/thesis/:id/status
 */
thesisRouter.patch('/:id/status',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('THESIS_STATUS_UPDATE'),
  validateParams('id'),
  validate(UpdateThesisStatusSchema),
  async (req, res) => {
    try {
      const { status, notes, defenseDate } = req.body as {
        status:       ThesisStatus
        notes?:       string
        defenseDate?: string
      }

      if (!status) return res.status(400).json({ error: 'status est requis' })

      await updateThesisStatus(req.params.id!, status, notes, defenseDate)
      return res.json({ data: { message: 'Statut mis à jour' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)
