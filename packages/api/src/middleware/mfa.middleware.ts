import type { Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import type { AuthenticatedRequest } from './auth.middleware'
import { maskIpAddress, sanitizeAuditPayload } from '../services/audit-rules'
import { recordAuditLog } from '../services/audit.service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function requireMFA(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const mfaEnforced = process.env.NODE_ENV === 'production' || process.env.REQUIRE_MFA === 'true'
  if (!mfaEnforced) {
    console.warn(`[MFA] Bypass allowed env=${process.env.NODE_ENV} user=${req.user?.id ?? 'unknown'} ${req.method} ${req.path}`)
    return next()
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Non authentifie', statusCode: 401 })
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(req.user.id)

    if (error || !data.user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Utilisateur introuvable', statusCode: 401 })
    }

    const factors = data.user.factors ?? []
    const hasTOTP = factors.some(f => f.factor_type === 'totp' && f.status === 'verified')

    if (!hasTOTP) {
      return res.status(403).json({
        error: 'MFA Required',
        message: "L'authentification a deux facteurs est obligatoire pour cette action.",
        mfaSetupUrl: '/settings/security/mfa',
        statusCode: 403,
      })
    }

    return next()
  } catch (err) {
    console.error('[MFA] Verification failed:', (err as Error).message)
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erreur verification MFA', statusCode: 500 })
  }
}

export function auditLog(action: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id ?? 'anonymous'
    const userRole = req.user?.role ?? 'unknown'
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const ipOptions: { nodeEnv?: string } = {}
    if (process.env.NODE_ENV) ipOptions.nodeEnv = process.env.NODE_ENV
    const maskedIp = maskIpAddress(ip, ipOptions)
    const startedAt = Date.now()

    res.on('finish', () => {
      const metadata = {
        params: req.params,
        query: req.query,
        body: req.method === 'GET' ? undefined : sanitizeAuditPayload(req.body),
        durationMs: Date.now() - startedAt,
      }

      void recordAuditLog({
        actorUserId: req.user?.id ?? null,
        actorRole: req.user?.role ?? null,
        action,
        resourceId: req.params.id ?? req.params.userId ?? req.params.memberId ?? null,
        method: req.method,
        path: req.originalUrl ?? req.path,
        statusCode: res.statusCode,
        ipAddress: maskedIp,
        userAgent: req.headers['user-agent'] ?? null,
        metadata,
      }).catch(err => {
        console.error('[audit] persist failed:', err.message)
      })
    })

    console.log(JSON.stringify({
      level: 'audit',
      timestamp: new Date().toISOString(),
      action,
      userId,
      userRole,
      method: req.method,
      path: req.path,
      ip: maskedIp,
    }))

    return next()
  }
}
