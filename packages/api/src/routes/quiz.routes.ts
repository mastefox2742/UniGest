import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import {
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getQuizForStudent,
  getQuizWithQuestions,
  createQuestion,
  deleteQuestion,
  startQuizAttempt,
  submitQuizAttempt,
  getStudentQuizAttempts,
} from '../services/quiz.service'

export const quizRouter = Router()

// ─── Enseignant ───────────────────────────────────────────────────────────────

/**
 * POST /api/quiz/courses/:ecId
 * Créer un quiz
 */
quizRouter.post('/courses/:ecId',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { title, description, timeLimitMin, passScore, maxAttempts } = req.body as {
        title:          string
        description?:   string
        timeLimitMin?:  number
        passScore?:     number
        maxAttempts?:   number
      }
      if (!title) return res.status(400).json({ error: 'title est requis' })
      const input: {
        title: string; description?: string
        timeLimitMin?: number; passScore?: number; maxAttempts?: number
      } = { title }
      if (description  !== undefined) input.description  = description
      if (timeLimitMin !== undefined) input.timeLimitMin = timeLimitMin
      if (passScore    !== undefined) input.passScore    = passScore
      if (maxAttempts  !== undefined) input.maxAttempts  = maxAttempts
      const quiz = await createQuiz(req.params.ecId!, input)
      return res.status(201).json({ data: quiz })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * PATCH /api/quiz/:quizId
 */
quizRouter.patch('/:quizId',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const quiz = await updateQuiz(req.params.quizId!, req.body)
      return res.json({ data: quiz })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * DELETE /api/quiz/:quizId
 */
quizRouter.delete('/:quizId',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      await deleteQuiz(req.params.quizId!)
      return res.json({ data: { message: 'Quiz supprimé' } })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * GET /api/quiz/:quizId
 * Récupérer un quiz avec ses questions (enseignant)
 */
quizRouter.get('/:quizId',
  authMiddleware,
  requireRole('teacher', 'admin', 'student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const quiz = req.user!.role === 'student'
        ? await getQuizForStudent(req.params.quizId!)
        : await getQuizWithQuestions(req.params.quizId!)
      return res.json({ data: quiz })
    } catch (err) {
      return res.status(404).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/quiz/:quizId/questions
 */
quizRouter.post('/:quizId/questions',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      // Accept both "text" and legacy "question" field names
      const body = req.body as {
        text?: string; question?: string
        type:     'single' | 'multiple' | 'true_false' | 'open'
        points?:  number
        options?: { text: string; isCorrect: boolean }[]
      }
      const text = body.text ?? body.question
      const { type, points, options } = body
      if (!text || !type) return res.status(400).json({ error: 'text et type sont requis' })
      const input: {
        text: string; type: 'single' | 'multiple' | 'true_false' | 'open'
        points?: number; options?: { text: string; isCorrect: boolean }[]
      } = { text, type }
      if (points  !== undefined) input.points  = points
      if (options !== undefined) input.options = options
      const q = await createQuestion(req.params.quizId!, input)
      return res.status(201).json({ data: q })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * DELETE /api/quiz/questions/:questionId
 */
quizRouter.delete('/questions/:questionId',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      await deleteQuestion(req.params.questionId!)
      return res.json({ data: { message: 'Question supprimée' } })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

// ─── Étudiant ─────────────────────────────────────────────────────────────────

/**
 * POST /api/quiz/:quizId/start
 */
quizRouter.post('/:quizId/start',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const attempt = await startQuizAttempt(req.params.quizId!, req.user!.id)
      return res.status(201).json({ data: attempt })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/quiz/attempts/:attemptId/submit
 */
quizRouter.post('/attempts/:attemptId/submit',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { answers } = req.body as {
        answers: { questionId: string; selectedOptionIds?: string[]; openAnswer?: string }[]
      }
      if (!answers) return res.status(400).json({ error: 'answers est requis' })
      const result = await submitQuizAttempt(req.params.attemptId!, req.user!.id, answers)
      return res.json({ data: result })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * GET /api/quiz/:quizId/attempts
 */
quizRouter.get('/:quizId/attempts',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const attempts = await getStudentQuizAttempts(req.params.quizId!, req.user!.id)
      return res.json({ data: attempts })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)
