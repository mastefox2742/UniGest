import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { CreateExamSessionSchema, validate, validateParams } from '../middleware/validate'
import {
  createExamSession,
  getExamsByCourse,
  getBookingsByExam,
  bookExam,
  cancelBooking,
  getStudentAvailableExams,
  getStudentBookings,
} from '../services/exams.service'

export const examsRouter = Router()

// ─── Routes enseignant ────────────────────────────────────────────────────────

/**
 * GET /api/exams/courses/:courseId/exams
 * Sessions d'examen d'un cours
 */
examsRouter.get('/courses/:courseId/exams',
  authMiddleware,
  requireRole('teacher', 'admin', 'secretary'),
  validateParams('courseId'),
  async (req, res) => {
    try {
      const exams = await getExamsByCourse(req.params.courseId!)
      return res.json({ data: exams })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/exams/courses/:courseId/exams
 * Créer un appello
 */
examsRouter.post('/courses/:courseId/exams',
  authMiddleware,
  requireRole('teacher', 'admin'),
  validateParams('courseId'),
  validate(CreateExamSessionSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { date, registrationDeadline, classroomId, maxStudents, notes } = req.body as {
        date: string
        registrationDeadline: string
        classroomId?: string
        maxStudents?: number
        notes?: string
      }

      if (!date || !registrationDeadline) {
        return res.status(400).json({ error: 'date et registrationDeadline sont requis' })
      }

      const sessionInput: Parameters<typeof createExamSession>[1] = {
        courseId:             req.params.courseId!,
        date,
        registrationDeadline,
      }
      if (classroomId) sessionInput.classroomId = classroomId
      if (maxStudents) sessionInput.maxStudents  = maxStudents
      if (notes)       sessionInput.notes        = notes

      const session = await createExamSession(req.user!.id, sessionInput)
      return res.status(201).json({ data: session })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * GET /api/exams/:examId/bookings
 * Prénotations pour une session (vue verbale)
 */
examsRouter.get('/:examId/bookings',
  authMiddleware,
  requireRole('teacher', 'admin', 'secretary'),
  validateParams('examId'),
  async (req, res) => {
    try {
      const bookings = await getBookingsByExam(req.params.examId!)
      return res.json({ data: bookings })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

// ─── Routes étudiant ──────────────────────────────────────────────────────────

/**
 * GET /api/exams/available
 * Examens disponibles à la prénotation
 */
examsRouter.get('/available',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const exams = await getStudentAvailableExams(req.user!.id)
      return res.json({ data: exams })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * GET /api/exams/my-bookings
 * Mes prénotations actives
 */
examsRouter.get('/my-bookings',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const bookings = await getStudentBookings(req.user!.id)
      return res.json({ data: bookings })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/exams/:examId/book
 * Prénoter un examen
 */
examsRouter.post('/:examId/book',
  authMiddleware,
  requireRole('student'),
  validateParams('examId'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const booking = await bookExam(req.user!.id, req.params.examId!)
      return res.status(201).json({ data: booking })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * DELETE /api/exams/:examId/book
 * Annuler une prénotation
 */
examsRouter.delete('/:examId/book',
  authMiddleware,
  requireRole('student'),
  validateParams('examId'),
  async (req: AuthenticatedRequest, res) => {
    try {
      await cancelBooking(req.user!.id, req.params.examId!)
      return res.json({ data: { message: 'Prénotation annulée' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)
