import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import {
  validate,
  validateParams,
  AddJuryMemberSchema,
  SetDefenseDateSchema,
  SubmitGraduationApplicationSchema,
  UpdateGraduationStatusSchema,
} from '../middleware/validate'
import { auditLog } from '../middleware/mfa.middleware'
import { documentLimiter } from '../middleware/rateLimiter'
import {
  getAllApplications,
  getApplicationById,
  getStudentApplication,
  submitGraduationApplication,
  updateApplicationStatus,
  setDefenseDate,
  addJuryMember,
  removeJuryMember,
  generateDiploma,
} from '../services/graduation.service'

export const graduationRouter = Router()

/** GET /api/graduation/me — demande de l'etudiant connecte */
graduationRouter.get('/me',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const app = await getStudentApplication(req.user!.id)
      return res.json({ data: app })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** POST /api/graduation/apply — soumettre sa domanda di Laurea */
graduationRouter.post('/apply',
  authMiddleware,
  requireRole('student'),
  auditLog('GRADUATION_APPLY'),
  validate(SubmitGraduationApplicationSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { thesisTitle } = req.body as { thesisTitle?: string }
      const input: Parameters<typeof submitGraduationApplication>[1] = {}
      if (thesisTitle) input.thesisTitle = thesisTitle
      const app = await submitGraduationApplication(req.user!.id, input)
      return res.status(201).json({ data: app })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** GET /api/graduation — toutes les demandes */
graduationRouter.get('/',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (req, res) => {
    try {
      const { status } = req.query as { status?: string }
      const filter: Parameters<typeof getAllApplications>[0] = {}
      if (status) filter.status = status
      const apps = await getAllApplications(filter)
      return res.json({ data: apps })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** GET /api/graduation/:id */
graduationRouter.get('/:id',
  authMiddleware,
  requireRole('admin', 'secretary'),
  validateParams('id'),
  async (req, res) => {
    try {
      const app = await getApplicationById(req.params.id!)
      return res.json({ data: app })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** PATCH /api/graduation/:id/status */
graduationRouter.patch('/:id/status',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('GRADUATION_STATUS_UPDATE'),
  validateParams('id'),
  validate(UpdateGraduationStatusSchema),
  async (req, res) => {
    try {
      const { status, notes } = req.body as { status: string; notes?: string }
      const app = await updateApplicationStatus(
        req.params.id!,
        status as Parameters<typeof updateApplicationStatus>[1],
        notes,
      )
      return res.json({ data: app })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** PATCH /api/graduation/:id/defense */
graduationRouter.patch('/:id/defense',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('GRADUATION_DEFENSE_SET'),
  validateParams('id'),
  validate(SetDefenseDateSchema),
  async (req, res) => {
    try {
      const { defenseDate, roomId } = req.body as { defenseDate: string; roomId?: string }
      if (!defenseDate) return res.status(400).json({ error: 'defenseDate requis' })
      const app = await setDefenseDate(req.params.id!, defenseDate, roomId)
      return res.json({ data: app })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** POST /api/graduation/:id/jury — ajouter membre jury */
graduationRouter.post('/:id/jury',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('GRADUATION_JURY_ADD'),
  validateParams('id'),
  validate(AddJuryMemberSchema),
  async (req, res) => {
    try {
      const { name, role, teacherId } = req.body as {
        name: string; role: string; teacherId?: string
      }
      if (!name || !role) return res.status(400).json({ error: 'name et role requis' })
      const juryInput: Parameters<typeof addJuryMember>[0] = {
        applicationId: req.params.id!,
        name,
        role: role as Parameters<typeof addJuryMember>[0]['role'],
      }
      if (teacherId) juryInput.teacherId = teacherId
      const member = await addJuryMember(juryInput)
      return res.status(201).json({ data: member })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** DELETE /api/graduation/:id/jury/:memberId */
graduationRouter.delete('/:id/jury/:memberId',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('GRADUATION_JURY_REMOVE'),
  validateParams('id', 'memberId'),
  async (req, res) => {
    try {
      await removeJuryMember(req.params.memberId!, req.params.id!)
      return res.json({ data: { message: 'Membre supprimé' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** POST /api/graduation/:id/diploma — générer le diplôme */
graduationRouter.post('/:id/diploma',
  authMiddleware,
  requireRole('admin', 'secretary'),
  validateParams('id'),
  documentLimiter,
  auditLog('DIPLOMA_GENERATE'),
  async (req, res) => {
    try {
      const diplomaNumber = await generateDiploma(req.params.id!)
      return res.json({ data: { diplomaNumber, message: 'Diplôme généré avec succès' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)
