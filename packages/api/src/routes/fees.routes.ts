import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { validate, validateParams, CreateFeeSchema, PayFeeSchema, WaiveFeeSchema } from '../middleware/validate'
import { auditLog } from '../middleware/mfa.middleware'
import {
  getStudentFees,
  getStudentFeesSummary,
  getAllFees,
  markFeePaid,
  payStudentFee,
  waiveFee,
  createFee,
} from '../services/fees.service'

export const feesRouter = Router()

// ─── Étudiant ─────────────────────────────────────────────────────────────────

/**
 * GET /api/fees/me
 * Frais de l'étudiant connecté
 */
feesRouter.get('/me',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const summary = await getStudentFeesSummary(req.user!.id)
      return res.json({ data: summary })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/fees/:id/self-pay
 * Paiement en libre-service de l'etudiant connecte
 */
feesRouter.post('/:id/self-pay',
  authMiddleware,
  requireRole('student'),
  auditLog('FEE_SELF_PAY'),
  validateParams('id'),
  validate(PayFeeSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { paymentRef, method, amount } = req.body as {
        paymentRef: string
        method:     string
        amount:     number
      }
      await payStudentFee(req.user!.id, { feeId: req.params.id!, paymentRef, method, amount })
      return res.json({ data: { message: 'Paiement enregistre' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

// ─── Admin / Secrétaire ───────────────────────────────────────────────────────

/**
 * GET /api/fees
 * Tous les frais (avec filtres ?status=overdue&academicYearId=...)
 */
feesRouter.get('/',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (req, res) => {
    try {
      const { status, academicYearId } = req.query as {
        status?: string
        academicYearId?: string
      }
      const feeFilter: Parameters<typeof getAllFees>[0] = {}
      if (status)         feeFilter.status         = status
      if (academicYearId) feeFilter.academicYearId = academicYearId
      const fees = await getAllFees(feeFilter)
      return res.json({ data: fees })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/fees
 * Créer un frais pour un étudiant
 */
feesRouter.post('/',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('FEE_CREATE'),
  validate(CreateFeeSchema),
  async (req, res) => {
    try {
      const { studentId, academicYearId, amount, dueDate } = req.body as {
        studentId: string; academicYearId: string; amount: number; dueDate: string
      }
      const fee = await createFee({ studentId, academicYearId, amount, dueDate })
      return res.status(201).json({ data: fee })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/fees/:id/pay
 * Enregistrer un paiement
 */
feesRouter.post('/:id/pay',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('FEE_MARK_PAID'),
  validateParams('id'),
  validate(PayFeeSchema),
  async (req, res) => {
    try {
      const { paymentRef, method, amount } = req.body as {
        paymentRef: string
        method:     string
        amount:     number
      }
      if (!paymentRef || !method || !amount) {
        return res.status(400).json({ error: 'paymentRef, method et amount sont requis' })
      }
      await markFeePaid({ feeId: req.params.id!, paymentRef, method, amount })
      return res.json({ data: { message: 'Paiement enregistré' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/fees/:id/waive
 * Exonérer un frais
 */
feesRouter.post('/:id/waive',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('FEE_WAIVE'),
  validateParams('id'),
  validate(WaiveFeeSchema),
  async (req, res) => {
    try {
      const { reason } = req.body as { reason?: string }
      await waiveFee(req.params.id!, reason)
      return res.json({ data: { message: 'Frais exonéré' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)
