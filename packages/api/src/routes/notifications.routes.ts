import { Router } from 'express'
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.middleware'
import {
  DeactivatePushTokenSchema,
  NotificationPreferencesSchema,
  RegisterPushTokenSchema,
  validate,
  validateParams,
} from '../middleware/validate'
import {
  deactivatePushToken,
  getNotificationPreferences,
  getUserNotifications,
  markAllRead,
  markNotificationRead,
  registerPushToken,
  updateNotificationPreferences,
} from '../services/notifications.service'

export const notificationsRouter = Router()

notificationsRouter.get('/',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined
      const notifs = await getUserNotifications(req.user!.id, limit)
      return res.json({ data: notifs })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

notificationsRouter.post('/read-all',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      await markAllRead(req.user!.id)
      return res.json({ data: { message: 'Toutes les notifications lues' } })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

notificationsRouter.post('/push-token',
  authMiddleware,
  validate(RegisterPushTokenSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { token, platform, deviceId } = req.body as {
        token: string
        platform: 'ios' | 'android' | 'web'
        deviceId?: string
      }
      const input: Parameters<typeof registerPushToken>[1] = { token, platform }
      if (deviceId) input.deviceId = deviceId
      const row = await registerPushToken(req.user!.id, input)
      return res.json({ data: row })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

notificationsRouter.delete('/push-token',
  authMiddleware,
  validate(DeactivatePushTokenSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { token } = req.body as { token: string }
      await deactivatePushToken(req.user!.id, token)
      return res.json({ data: { message: 'Token desactive' } })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

notificationsRouter.get('/preferences',
  authMiddleware,
  async (req: AuthenticatedRequest, res) => {
    try {
      const prefs = await getNotificationPreferences(req.user!.id)
      return res.json({ data: prefs })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)

notificationsRouter.patch('/preferences',
  authMiddleware,
  validate(NotificationPreferencesSchema),
  async (req: AuthenticatedRequest, res) => {
    try {
      const prefs = await updateNotificationPreferences(req.user!.id, req.body)
      return res.json({ data: prefs })
    } catch (err) {
      return res.status(400).json({ error: (err as Error).message })
    }
  },
)

notificationsRouter.post('/:id/read',
  authMiddleware,
  validateParams('id'),
  async (req: AuthenticatedRequest, res) => {
    try {
      await markNotificationRead(req.params.id!, req.user!.id)
      return res.json({ data: { message: 'Notification lue' } })
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message })
    }
  },
)
