import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import {
  IssueCertificateSchema,
  RequestCertificateSchema,
  validate,
  validateParams,
} from '../middleware/validate'
import { createClient } from '@supabase/supabase-js'
import { auditLog } from '../middleware/mfa.middleware'
import {
  canUserAccessCertificate,
  getAllCertificates,
  getStudentCertificates,
  issueCertificate,
  requestStudentCertificate,
  streamCertificatePdf,
  verifyCertificate,
} from '../services/certificates.service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const certificatesRouter = Router()

certificatesRouter.get('/verify/:token',
  async (req, res) => {
    try {
      const result = await verifyCertificate(req.params.token!)
      return res.json({ data: result })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

certificatesRouter.get('/me',
  authMiddleware,
  requireRole('student'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const certs = await getStudentCertificates(req.user!.id)
      return res.json({ data: certs })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

certificatesRouter.post('/request',
  authMiddleware,
  requireRole('student'),
  auditLog('CERTIFICATE_REQUEST'),
  validate(RequestCertificateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { type } = req.body as { type: string }
      const cert = await requestStudentCertificate(req.user!.id, type)
      return res.status(201).json({ data: cert })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

certificatesRouter.get('/:id/pdf',
  authMiddleware,
  auditLog('CERTIFICATE_PDF_DOWNLOAD'),
  validateParams('id'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const allowed = await canUserAccessCertificate(req.params.id!, req.user!)
      if (!allowed) return res.status(403).json({ error: 'Acces refuse' })

      await streamCertificatePdf(req.params.id!, res)
      return
    } catch (err) {
      if (!res.headersSent) {
        return res.status(500).json({ error: (err as Error).message })
      }
      return
    }
  },
)

certificatesRouter.get('/',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (req, res) => {
    try {
      const { type } = req.query as { type?: string }
      const certFilter: Parameters<typeof getAllCertificates>[0] = {}
      if (type) certFilter.type = type
      const certs = await getAllCertificates(certFilter)
      return res.json({ data: certs })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

certificatesRouter.post('/',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('CERTIFICATE_ISSUE'),
  validate(IssueCertificateSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { studentId, type, expiresAt } = req.body as {
        studentId: string
        type: string
        expiresAt?: string
      }

      const { data: secretary } = await supabase
        .from('secretaries')
        .select('id')
        .eq('user_id', req.user!.id)
        .maybeSingle()

      let secretaryId = secretary?.id
      if (!secretaryId) {
        const { data: anySecretary } = await supabase
          .from('secretaries')
          .select('id')
          .limit(1)
          .single()
        secretaryId = anySecretary?.id
      }

      if (!secretaryId) {
        return res.status(400).json({ error: 'Aucun secretaire trouve pour emettre le certificat' })
      }

      const certInput: Parameters<typeof issueCertificate>[0] = {
        studentId,
        type,
        secretaryId,
      }
      if (expiresAt) certInput.expiresAt = expiresAt

      const cert = await issueCertificate(certInput)
      return res.status(201).json({ data: cert })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)
