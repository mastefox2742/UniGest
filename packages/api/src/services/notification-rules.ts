export const NOTIFICATION_TYPES = ['info', 'warning', 'success', 'error'] as const
export const NOTIFICATION_TOPICS = [
  'general',
  'exam',
  'fee',
  'grade',
  'certificate',
  'thesis',
  'graduation',
  'elearning',
  'internship',
  'alumni',
] as const

export type NotificationType = typeof NOTIFICATION_TYPES[number]
export type NotificationTopic = typeof NOTIFICATION_TOPICS[number]

const TYPE_SET = new Set<string>(NOTIFICATION_TYPES)
const TOPIC_SET = new Set<string>(NOTIFICATION_TOPICS)

export function assertNotificationType(type: string): asserts type is NotificationType {
  if (!TYPE_SET.has(type)) throw new Error('Type de notification invalide')
}

export function assertNotificationTopic(topic: string): asserts topic is NotificationTopic {
  if (!TOPIC_SET.has(topic)) throw new Error('Sujet de notification invalide')
}

export function normalizeNotificationLimit(limit?: number) {
  if (!limit || !Number.isFinite(limit)) return 20
  return Math.min(Math.max(Math.trunc(limit), 1), 100)
}

export function shouldNotify(preferences: Record<string, boolean> | null | undefined, topic: NotificationTopic) {
  if (!preferences) return true
  if (topic === 'general') return preferences.general !== false
  if (preferences.general === false) return false
  return preferences[topic] !== false
}

export function notificationScenario(topic: NotificationTopic, event: string) {
  const scenarios: Record<string, { title: string; type: NotificationType }> = {
    'fee.paid': { title: 'Paiement confirme', type: 'success' },
    'fee.created': { title: 'Nouveaux frais disponibles', type: 'warning' },
    'certificate.issued': { title: 'Certificat disponible', type: 'success' },
    'thesis.submitted': { title: 'These soumise', type: 'success' },
    'thesis.status': { title: 'Mise a jour de these', type: 'info' },
    'graduation.applied': { title: 'Demande de Laurea enregistree', type: 'success' },
    'graduation.status': { title: 'Mise a jour Laurea', type: 'info' },
    'elearning.announcement': { title: 'Nouvelle annonce de cours', type: 'info' },
    'internship.status': { title: 'Mise a jour de stage', type: 'info' },
    'alumni.survey': { title: 'Enquete placement alumni', type: 'info' },
  }

  return scenarios[`${topic}.${event}`] ?? { title: 'Notification UniGest', type: 'info' as const }
}
