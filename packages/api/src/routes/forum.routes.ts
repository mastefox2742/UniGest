import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import { requireRole } from '../middleware/rbac.middleware'
import {
  getForumPosts,
  createForumPost,
  pinForumPost,
  deleteForumPost,
} from '../services/forum.service'

export const forumRouter = Router()

/**
 * GET /api/forum/courses/:ecId
 * Posts du forum d'un cours e-learning
 */
forumRouter.get('/courses/:ecId',
  authMiddleware,
  requireRole('student', 'teacher', 'admin'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const posts = await getForumPosts(req.params.ecId!)
      return res.json({ data: posts })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/forum/courses/:ecId
 * Créer un post (ou une réponse si parentId fourni)
 */
forumRouter.post('/courses/:ecId',
  authMiddleware,
  requireRole('student', 'teacher', 'admin'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { content, parentId } = req.body as { content: string; parentId?: string }
      if (!content?.trim()) return res.status(400).json({ error: 'content est requis' })
      const input: { ecId: string; userId: string; content: string; parentId?: string } = {
        ecId:    req.params.ecId!,
        userId:  req.user!.id,
        content,
      }
      if (parentId !== undefined) input.parentId = parentId
      const post = await createForumPost(input)
      return res.status(201).json({ data: post })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * POST /api/forum/posts/:postId/pin
 * Épingler / désépingler
 */
forumRouter.post('/posts/:postId/pin',
  authMiddleware,
  requireRole('teacher', 'admin'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { isPinned } = req.body as { isPinned: boolean }
      await pinForumPost(req.params.postId!, isPinned ?? true)
      return res.json({ data: { message: 'Post mis à jour' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

/**
 * DELETE /api/forum/posts/:postId
 */
forumRouter.delete('/posts/:postId',
  authMiddleware,
  requireRole('student', 'teacher', 'admin'),
  async (req: AuthenticatedRequest, res) => {
    try {
      await deleteForumPost(req.params.postId!, { id: req.user!.id, role: req.user!.role })
      return res.json({ data: { message: 'Post supprimé' } })
    } catch (err) {
      return res.status(403).json({ error: (err as Error).message })
    }
  },
)
