import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest } from '../middleware/auth.middleware'

// Mock complet du module Supabase AVANT l'import du middleware
const mockGetUser = vi.fn()
const mockFrom   = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { role: 'student' }, error: null }) })),
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

const { authMiddleware } = await import('../middleware/auth.middleware')

function mockRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
  return res as unknown as Response
}

describe('authMiddleware', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retourne 401 si pas de header Authorization', async () => {
    const req  = { headers: {} } as AuthenticatedRequest
    const res  = mockRes()
    const next = vi.fn() as NextFunction

    await authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('retourne 401 si le token est invalide', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid') })

    const req  = { headers: { authorization: 'Bearer bad-token' } } as AuthenticatedRequest
    const res  = mockRes()
    const next = vi.fn() as NextFunction

    await authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('appelle next() et attache req.user si le token est valide', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-1', email: 'a@a.fr' } },
      error: null,
    })
    mockFrom.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { role: 'student' }, error: null }),
        })),
      })),
    })

    const req  = { headers: { authorization: 'Bearer good-token' } } as AuthenticatedRequest
    const res  = mockRes()
    const next = vi.fn() as NextFunction

    await authMiddleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.user).toMatchObject({ id: 'user-1', email: 'a@a.fr', role: 'student' })
  })
})
