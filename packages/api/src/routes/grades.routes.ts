import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { ProposeGradeSchema, validate, validateParams } from '../middleware/validate'
import {
  getVerbale,
  proposeGrade,
  publishVerbale,
  acceptGrade,
  refuseGrade,
  getStudentPendingGrades,
} from '../services/grades.service'

export const gradesRouter = Router()

// ─── Enseignant — Verbale ─────────────────────────────────────────────────────

/**
 * GET /api/grades/exams/:examId/verbale
 * Verbale complet (bookings + notes)
 */
gradesRouter.get('/exams/:examId/verbale',
  authMiddleware,
  requireRole('teacher', 'admin'),
  validateParams('examId'),
  async (req, res) => {
    try {
      const verbale = await getVerbale(req.params.examId!)
      return res.json({ data: verbale })
    } catch (err) {
      return res.status(404).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/grades/exams/:examId/grades
 * Proposer une note pour une prénotation
 */
gradesRouter.post('/exams/:examId/grades',
  authMiddleware,
  requireRole('teacher'),
  validateParams('examId'),
  validate(ProposeGradeSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { bookingId, value, isHonors, notes } = req.body as {
        bookingId: string
        value: number
        isHonors: boolean
        notes?: string
      }

      if (!bookingId || value === undefined) {
        return res.status(400).json({ error: 'bookingId et value sont requis' })
      }

      const gradeInput: Parameters<typeof proposeGrade>[1] = {
        examSessionId: req.params.examId!,
        bookingId,
        value,
        isHonors: isHonors ?? false,
      }
      if (notes) gradeInput.notes = notes

      const grade = await proposeGrade(req.user!.id, gradeInput)
      return res.status(201).json({ data: grade })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/grades/exams/:examId/publish
 * Publier le verbale (toutes les notes → published, immutable)
 */
gradesRouter.post('/exams/:examId/publish',
  authMiddleware,
  requireRole('teacher', 'admin'),
  validateParams('examId'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await publishVerbale(req.params.examId!, req.user!.id)
      return res.json({ data: result })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

// ─── Étudiant — Gestion des notes ────────────────────────────────────────────

/**
 * GET /api/grades/me/pending
 * Notes proposées en attente d'acceptation
 */
gradesRouter.get('/me/pending',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const grades = await getStudentPendingGrades(req.user!.id)
      return res.json({ data: grades })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/grades/:gradeId/accept
 * Accepter une note proposée
 */
gradesRouter.post('/:gradeId/accept',
  authMiddleware,
  requireRole('student'),
  validateParams('gradeId'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const grade = await acceptGrade(req.params.gradeId!, req.user!.id)
      return res.json({ data: grade })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/grades/:gradeId/refuse
 * Refuser une note proposée
 */
gradesRouter.post('/:gradeId/refuse',
  authMiddleware,
  requireRole('student'),
  validateParams('gradeId'),
  async (req: AuthenticatedRequest, res) => {
    try {
      await refuseGrade(req.params.gradeId!, req.user!.id)
      return res.json({ data: { message: 'Note refusée' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)
