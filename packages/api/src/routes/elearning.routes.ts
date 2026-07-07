import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { auditLog } from '../middleware/mfa.middleware'
import { validate, CreateElearningAnnouncementSchema } from '../middleware/validate'
import {
  upsertElearningCourse,
  publishElearningCourse,
  getElearningCourseForTeacher,
  createSection,
  updateSection,
  deleteSection,
  createMaterial,
  deleteMaterial,
  createAssignment,
  getSubmissions,
  gradeSubmission,
  createAnnouncement,
  getStudentElearningCourses,
  getElearningCourseForStudent,
  upsertProgress,
  submitAssignment,
} from '../services/elearning.service'

export const elearningRouter = Router()

// ─── Enseignant ───────────────────────────────────────────────────────────────

/**
 * GET /api/elearning/courses/:courseId
 * Cours e-learning d'un cours (vue enseignant)
 */
elearningRouter.get('/courses/:courseId',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const ec = await getElearningCourseForTeacher(req.params.courseId!)
      return res.json({ data: ec })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * PUT /api/elearning/courses/:courseId
 * Créer ou mettre à jour le cours e-learning
 */
elearningRouter.put('/courses/:courseId',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { welcomeMessage, thumbnailUrl } = req.body as {
        welcomeMessage?: string
        thumbnailUrl?:   string
      }
      const input: { welcomeMessage?: string; thumbnailUrl?: string } = {}
      if (welcomeMessage !== undefined) input.welcomeMessage = welcomeMessage
      if (thumbnailUrl   !== undefined) input.thumbnailUrl   = thumbnailUrl

      const ec = await upsertElearningCourse(req.params.courseId!, input)
      return res.json({ data: ec })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/elearning/courses/:ecId/publish
 * Publier / dépublier un cours e-learning
 */
elearningRouter.post('/courses/:ecId/publish',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { published } = req.body as { published: boolean }
      await publishElearningCourse(req.params.ecId!, published ?? true)
      return res.json({ data: { message: 'Statut mis à jour' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

// ─── Sections ─────────────────────────────────────────────────────────────────

/**
 * POST /api/elearning/courses/:ecId/sections
 */
elearningRouter.post('/courses/:ecId/sections',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { title, description } = req.body as { title: string; description?: string }
      if (!title) return res.status(400).json({ error: 'title est requis' })
      const input: { title: string; description?: string } = { title }
      if (description !== undefined) input.description = description
      const section = await createSection(req.params.ecId!, input)
      return res.status(201).json({ data: section })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * PATCH /api/elearning/sections/:id
 */
elearningRouter.patch('/sections/:id',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { title, description } = req.body as { title?: string; description?: string }
      const input: { title?: string; description?: string } = {}
      if (title       !== undefined) input.title       = title
      if (description !== undefined) input.description = description
      await updateSection(req.params.id!, input)
      return res.json({ data: { message: 'Section mise à jour' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * DELETE /api/elearning/sections/:id
 */
elearningRouter.delete('/sections/:id',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      await deleteSection(req.params.id!)
      return res.json({ data: { message: 'Section supprimée' } })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

// ─── Matériaux ────────────────────────────────────────────────────────────────

/**
 * POST /api/elearning/sections/:sectionId/materials
 */
elearningRouter.post('/sections/:sectionId/materials',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { title, type, url, content, durationS } = req.body as {
        title:      string
        type:       string
        url?:       string
        content?:   string
        durationS?: number
      }
      if (!title || !type) return res.status(400).json({ error: 'title et type sont requis' })
      const input: {
        title: string; type: string
        url?: string; content?: string; durationS?: number
      } = { title, type }
      if (url       !== undefined) input.url       = url
      if (content   !== undefined) input.content   = content
      if (durationS !== undefined) input.durationS = durationS
      const material = await createMaterial(req.params.sectionId!, input)
      return res.status(201).json({ data: material })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * DELETE /api/elearning/materials/:id
 */
elearningRouter.delete('/materials/:id',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      await deleteMaterial(req.params.id!)
      return res.json({ data: { message: 'Matériau supprimé' } })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

// ─── Devoirs ──────────────────────────────────────────────────────────────────

/**
 * POST /api/elearning/courses/:ecId/assignments
 */
elearningRouter.post('/courses/:ecId/assignments',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { title, description, dueDate, maxScore } = req.body as {
        title:        string
        description?: string
        dueDate?:     string
        maxScore?:    number
      }
      if (!title) return res.status(400).json({ error: 'title est requis' })
      const input: { title: string; description?: string; dueDate?: string; maxScore?: number } = { title }
      if (description !== undefined) input.description = description
      if (dueDate     !== undefined) input.dueDate     = dueDate
      if (maxScore    !== undefined) input.maxScore    = maxScore
      const assignment = await createAssignment(req.params.ecId!, input)
      return res.status(201).json({ data: assignment })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * GET /api/elearning/assignments/:assignmentId/submissions
 */
elearningRouter.get('/assignments/:assignmentId/submissions',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const subs = await getSubmissions(req.params.assignmentId!)
      return res.json({ data: subs })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/elearning/submissions/:id/grade
 */
elearningRouter.post('/submissions/:id/grade',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req, res) => {
    try {
      const { score, feedback } = req.body as { score: number; feedback?: string }
      if (score === undefined) return res.status(400).json({ error: 'score est requis' })
      await gradeSubmission(req.params.id!, score, feedback)
      return res.json({ data: { message: 'Devoir noté' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/elearning/courses/:ecId/announcements
 */
elearningRouter.post('/courses/:ecId/announcements',
  authMiddleware,
  requireRole('teacher', 'admin'),
  auditLog('ELEARNING_ANNOUNCEMENT_CREATE'),
  validate(CreateElearningAnnouncementSchema),
  async (req, res) => {
    try {
      const { title, body, isPinned } = req.body as { title: string; body: string; isPinned?: boolean }
      const input: { title: string; body: string; isPinned?: boolean } = { title, body }
      if (isPinned !== undefined) input.isPinned = isPinned
      const announcement = await createAnnouncement(req.params.ecId!, input)
      return res.status(201).json({ data: announcement })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

// ─── Étudiant ─────────────────────────────────────────────────────────────────

/**
 * GET /api/elearning/student/courses
 * Cours e-learning disponibles pour l'étudiant
 */
elearningRouter.get('/student/courses',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const courses = await getStudentElearningCourses(req.user!.id)
      return res.json({ data: courses })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * GET /api/elearning/student/courses/:ecId
 * Contenu complet d'un cours e-learning (avec progression)
 */
elearningRouter.get('/student/courses/:ecId',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await getElearningCourseForStudent(req.params.ecId!, req.user!.id)
      return res.json({ data: result })
    } catch (err) {
      return res.status(404).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/elearning/materials/:materialId/progress
 */
elearningRouter.post('/materials/:materialId/progress',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { progressPct, completed } = req.body as { progressPct: number; completed: boolean }
      await upsertProgress(req.params.materialId!, req.user!.id, progressPct ?? 0, completed ?? false)
      return res.json({ data: { message: 'Progression mise à jour' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/elearning/assignments/:assignmentId/submit
 */
elearningRouter.post('/assignments/:assignmentId/submit',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { content, fileUrl } = req.body as { content: string; fileUrl?: string }
      if (!content) return res.status(400).json({ error: 'content est requis' })
      const sub = await submitAssignment(
        req.params.assignmentId!, req.user!.id, content, fileUrl,
      )
      return res.status(201).json({ data: sub })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)
