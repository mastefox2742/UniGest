import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { auditLog } from '../middleware/mfa.middleware'
import {
  getOverviewReport,
  getAnnualReport,
  getProgramReport,
  exportStudentsCsv,
} from '../services/reports.service'

export const reportsRouter = Router()

/** GET /api/reports/overview */
reportsRouter.get('/overview',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (_req, res) => {
    try {
      const report = await getOverviewReport()
      return res.json({ data: report })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** GET /api/reports/annual?universityId=...&academicYearId=... */
reportsRouter.get('/annual',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (req, res) => {
    try {
      const { universityId, academicYearId } = req.query as {
        universityId?: string; academicYearId?: string
      }
      if (!universityId) return res.status(400).json({ error: 'universityId requis' })
      const report = await getAnnualReport(universityId, academicYearId)
      return res.json({ data: report })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** GET /api/reports/programs/:id */
reportsRouter.get('/programs/:id',
  authMiddleware,
  requireRole('admin', 'secretary'),
  async (req, res) => {
    try {
      const report = await getProgramReport(req.params.id!)
      return res.json({ data: report })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/** GET /api/reports/export/students — CSV */
reportsRouter.get('/export/students',
  authMiddleware,
  requireRole('admin', 'secretary'),
  auditLog('REPORT_STUDENTS_EXPORT'),
  async (req, res) => {
    try {
      const { programId, status } = req.query as { programId?: string; status?: string }
      const exportFilter: Parameters<typeof exportStudentsCsv>[0] = {}
      if (programId) exportFilter.programId = programId
      if (status)    exportFilter.status    = status
      const csv = await exportStudentsCsv(exportFilter)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="etudiants.csv"')
      return res.send('﻿' + csv) // BOM pour Excel
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)
