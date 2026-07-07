import { describe, expect, it } from 'vitest'
import {
  assertNotificationTopic,
  assertNotificationType,
  normalizeNotificationLimit,
  notificationScenario,
  shouldNotify,
} from '../services/notification-rules'

describe('notification-rules', () => {
  it('validates types and topics', () => {
    expect(() => assertNotificationType('success')).not.toThrow()
    expect(() => assertNotificationType('fatal')).toThrow('invalide')
    expect(() => assertNotificationTopic('fee')).not.toThrow()
    expect(() => assertNotificationTopic('parking')).toThrow('Sujet')
  })

  it('normalizes list limits', () => {
    expect(normalizeNotificationLimit()).toBe(20)
    expect(normalizeNotificationLimit(0)).toBe(20)
    expect(normalizeNotificationLimit(150)).toBe(100)
    expect(normalizeNotificationLimit(12.8)).toBe(12)
  })

  it('checks topic preferences', () => {
    expect(shouldNotify(null, 'fee')).toBe(true)
    expect(shouldNotify({ general: false, fee: true }, 'fee')).toBe(false)
    expect(shouldNotify({ general: true, fee: false }, 'fee')).toBe(false)
    expect(shouldNotify({ general: true, fee: true }, 'fee')).toBe(true)
  })

  it('maps scenarios to titles and notification types', () => {
    expect(notificationScenario('fee', 'paid')).toEqual({ title: 'Paiement confirme', type: 'success' })
    expect(notificationScenario('exam', 'unknown')).toEqual({ title: 'Notification UniGest', type: 'info' })
  })
})
