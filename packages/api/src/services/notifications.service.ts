import { createClient } from '@supabase/supabase-js'
import {
  assertNotificationTopic,
  assertNotificationType,
  normalizeNotificationLimit,
  notificationScenario,
  shouldNotify,
  type NotificationTopic,
  type NotificationType,
} from './notification-rules'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export interface CreateNotificationInput {
  userId: string
  title: string
  message: string
  type: NotificationType
  topic?: NotificationTopic
  link?: string
}

export async function getUserNotifications(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, message, type, is_read, read_at, link, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(normalizeNotificationLimit(limit))

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function markNotificationRead(notifId: string, userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notifId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function markAllRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw new Error(error.message)
}

export async function createNotification(input: CreateNotificationInput) {
  assertNotificationType(input.type)
  if (input.topic) assertNotificationTopic(input.topic)

  if (input.topic) {
    const preferences = await getNotificationPreferences(input.userId)
    if (!shouldNotify(preferences, input.topic)) return null
  }

  const { data, error } = await supabase.from('notifications').insert({
    user_id: input.userId,
    title: input.title,
    message: input.message,
    type: input.type,
    link: input.link ?? null,
  }).select().single()

  if (error) throw new Error(error.message)
  await dispatchPushNotification(input).catch(err => {
    console.warn('[notifications] push dispatch skipped:', err instanceof Error ? err.message : err)
  })
  return data
}

export async function createScenarioNotification(input: {
  userId: string
  topic: NotificationTopic
  event: string
  message: string
  link?: string
}) {
  const scenario = notificationScenario(input.topic, input.event)
  const payload: CreateNotificationInput = {
    userId: input.userId,
    title: scenario.title,
    message: input.message,
    type: scenario.type,
    topic: input.topic,
  }
  if (input.link) payload.link = input.link
  return createNotification(payload)
}

export async function createScenarioNotificationForStudent(studentId: string, input: {
  topic: NotificationTopic
  event: string
  message: string
  link?: string
}) {
  const { data: student } = await supabase
    .from('students')
    .select('user_id')
    .eq('id', studentId)
    .single()

  if (!student?.user_id) return null

  const payload: Parameters<typeof createScenarioNotification>[0] = {
    userId: student.user_id,
    topic: input.topic,
    event: input.event,
    message: input.message,
  }
  if (input.link) payload.link = input.link
  return createScenarioNotification(payload)
}

export async function registerPushToken(userId: string, input: {
  token: string
  platform: 'ios' | 'android' | 'web'
  deviceId?: string
}) {
  const { data, error } = await supabase.rpc('upsert_push_token', {
    p_user_id: userId,
    p_token: input.token,
    p_platform: input.platform,
    p_device_id: input.deviceId ?? null,
  })

  if (error) throw new Error(error.message)
  return data
}

export async function deactivatePushToken(userId: string, token: string) {
  const { error } = await supabase.rpc('deactivate_push_token', {
    p_user_id: userId,
    p_token: token,
  })

  if (error) throw new Error(error.message)
}

export async function getNotificationPreferences(userId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('general, exam, fee, grade, certificate, thesis, graduation, elearning, internship, alumni')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)

  return {
    general: data?.general ?? true,
    exam: data?.exam ?? true,
    fee: data?.fee ?? true,
    grade: data?.grade ?? true,
    certificate: data?.certificate ?? true,
    thesis: data?.thesis ?? true,
    graduation: data?.graduation ?? true,
    elearning: data?.elearning ?? true,
    internship: data?.internship ?? true,
    alumni: data?.alumni ?? true,
  }
}

export async function updateNotificationPreferences(userId: string, prefs: Partial<Record<NotificationTopic, boolean>>) {
  const payload = {
    user_id: userId,
    ...prefs,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert(payload, { onConflict: 'user_id' })
    .select('general, exam, fee, grade, certificate, thesis, graduation, elearning, internship, alumni')
    .single()

  if (error) throw new Error(error.message)
  return data
}

async function dispatchPushNotification(input: CreateNotificationInput) {
  if (!supabaseUrl || !serviceRoleKey) return null

  const functionsUrl = process.env.SUPABASE_FUNCTIONS_URL ?? `${supabaseUrl.replace(/\/$/, '')}/functions/v1`
  const res = await fetch(`${functionsUrl}/send-push`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId: input.userId,
      title: input.title,
      body: input.message,
      type: input.type,
      topic: input.topic ?? 'general',
      link: input.link,
      data: {
        type: input.type,
        topic: input.topic ?? 'general',
        route: input.link,
      },
      persist: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `send-push failed with ${res.status}`)
  }

  return res.json()
}
