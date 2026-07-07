import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import { getAuditLogs } from '../services/audit.service'

export const auditRouter = Router()

auditRouter.get('/',
  authMiddleware,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { action, resource, actorUserId, limit } = req.query as {
        action?: string
        resource?: string
        actorUserId?: string
        limit?: string
      }

      const filters: Parameters<typeof getAuditLogs>[0] = {}
      if (action) filters.action = action
      if (resource) filters.resource = resource
      if (actorUserId) filters.actorUserId = actorUserId
      if (limit) filters.limit = Number(limit)

      const logs = await getAuditLogs(filters)
      return res.json({ data: logs })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)
