import { describe, it, expect, vi } from 'vitest'
import type { Response, NextFunction } from 'express'
import { requireRole } from '../middleware/rbac.middleware'
import type { AuthenticatedRequest } from '../middleware/auth.middleware'

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as unknown as Response
}

describe('requireRole', () => {
  it('appelle next() si le rôle est autorisé', () => {
    const req = { user: { id: '1', email: 'a@a.fr', role: 'admin' } } as AuthenticatedRequest
    const res = mockRes()
    const next = vi.fn() as NextFunction

    requireRole('admin', 'secretary')(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('retourne 403 si le rôle est refusé', () => {
    const req = { user: { id: '1', email: 'a@a.fr', role: 'student' } } as AuthenticatedRequest
    const res = mockRes()
    const next = vi.fn() as NextFunction

    requireRole('admin', 'secretary')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('retourne 401 si req.user est absent', () => {
    const req = {} as AuthenticatedRequest
    const res = mockRes()
    const next = vi.fn() as NextFunction

    requireRole('admin')(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('fonctionne avec le rôle teacher', () => {
    const req = { user: { id: '2', email: 'prof@univ.fr', role: 'teacher' } } as AuthenticatedRequest
    const res = mockRes()
    const next = vi.fn() as NextFunction

    requireRole('teacher')(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
