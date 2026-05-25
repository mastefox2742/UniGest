import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from './auth.middleware'
import type { UserRole } from '@unigest/shared'

/**
 * Middleware RBAC — vérifie que l'utilisateur possède l'un des rôles autorisés.
 * Usage : router.get('/route', authMiddleware, requireRole('admin', 'secretary'), handler)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Non authentifié', statusCode: 401 })
    }
    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Accès refusé. Rôles autorisés : ${roles.join(', ')}`,
        statusCode: 403,
      })
    }
    return next()
  }
}
