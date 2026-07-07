import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { auditLog } from '../middleware/mfa.middleware'
import {
  validate,
  validateParams,
  ApplyInternshipSchema,
  CreateInternshipOpportunitySchema,
  EvaluateInternshipSchema,
  SubmitInternshipReportSchema,
  UpdateInternshipStatusSchema,
} from '../middleware/validate'
import {
  applyForInternship,
  createInternshipOpportunity,
  evaluateInternshipApplication,
  getAllInternshipApplications,
  getInternshipOpportunities,
  getStudentInternshipApplications,
  submitInternshipReport,
  updateInternshipApplicationStatus,
} from '../services/internships.service'
import type { InternshipApplicationStatus, InternshipOpportunityStatus } from '../services/internship-rules'

export const internshipsRouter = Router()

/** GET /api/internships/opportunities */
internshipsRouter.get('/opportunities',
  authMiddleware,
  requireRole('student', 'admin', 'secretary'),
  async (req, res) => {
    try {
      const { status } = req.query as { status?: InternshipOpportunityStatus }
      const filters: Parameters<typeof getInternshipOpportunities>[0] = {}
      if (status) filters.status = status
      const opportunities = await getInternshipOpportunities(filters)
      return res.json({ data: opportunities })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** POST /api/internships/opportunities */
internshipsRouter.post('/opportunities',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('INTERNSHIP_OPPORTUNITY_CREATE'),
  validate(CreateInternshipOpportunitySchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const opportunity = await createInternshipOpportunity(req.body, req.user!.id)
      return res.status(201).json({ data: opportunity })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** GET /api/internships/me */
internshipsRouter.get('/me',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const applications = await getStudentInternshipApplications(req.user!.id)
      return res.json({ data: applications })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** POST /api/internships/apply */
internshipsRouter.post('/apply',
  authMiddleware,
  requireRole('student'),
  auditLog('INTERNSHIP_APPLY'),
  validate(ApplyInternshipSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const application = await applyForInternship(req.user!.id, req.body)
      return res.status(201).json({ data: application })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** GET /api/internships/applications */
internshipsRouter.get('/applications',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (req, res) => {
    try {
      const { status } = req.query as { status?: InternshipApplicationStatus }
      const filters: Parameters<typeof getAllInternshipApplications>[0] = {}
      if (status) filters.status = status
      const applications = await getAllInternshipApplications(filters)
      return res.json({ data: applications })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** PATCH /api/internships/applications/:id/status */
internshipsRouter.patch('/applications/:id/status',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('INTERNSHIP_STATUS_UPDATE'),
  validateParams('id'),
  validate(UpdateInternshipStatusSchema),
  async (req, res) => {
    try {
      const { status } = req.body as { status: InternshipApplicationStatus }
      const application = await updateInternshipApplicationStatus(req.params.id!, status)
      return res.json({ data: application })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** POST /api/internships/applications/:id/report */
internshipsRouter.post('/applications/:id/report',
  authMiddleware,
  requireRole('student'),
  auditLog('INTERNSHIP_REPORT_SUBMIT'),
  validateParams('id'),
  validate(SubmitInternshipReportSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { reportUrl } = req.body as { reportUrl: string }
      const application = await submitInternshipReport(req.user!.id, req.params.id!, reportUrl)
      return res.json({ data: application })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/** POST /api/internships/applications/:id/evaluate */
internshipsRouter.post('/applications/:id/evaluate',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('INTERNSHIP_EVALUATE'),
  validateParams('id'),
  validate(EvaluateInternshipSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const application = await evaluateInternshipApplication(req.params.id!, req.user!.id, req.body)
      return res.json({ data: application })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)
