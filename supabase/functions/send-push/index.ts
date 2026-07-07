/**
 * UniGest Edge Function: send-push
 *
 * Internal endpoint used by the API/back-office to create an in-app
 * notification and deliver it through Expo push tokens when available.
 *
 * POST /functions/v1/send-push
 * Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const BATCH_SIZE = 100

const TOPICS = [
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
const TYPES = ['info', 'warning', 'success', 'error'] as const

type NotificationTopic = typeof TOPICS[number]
type NotificationType = typeof TYPES[number]

interface PushPayload {
  userId?: string
  userIds?: string[]
  role?: string
  title: string
  body: string
  type?: NotificationType
  topic?: NotificationTopic
  link?: string
  data?: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
  persist?: boolean
}

interface PushTokenRow {
  token: string
  user_id: string
}

interface PreferenceRow {
  user_id: string
  general: boolean | null
  exam: boolean | null
  fee: boolean | null
  grade: boolean | null
  certificate: boolean | null
  thesis: boolean | null
  graduation: boolean | null
  elearning: boolean | null
  internship: boolean | null
  alumni: boolean | null
}

interface ExpoPushMessage {
  to: string
  title: string
  body: string
  data: Record<string, unknown>
  sound?: 'default' | null
  badge?: number
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function json(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: { ...corsHeaders(), ...(init?.headers ?? {}) },
  })
}

function isTopic(value: unknown): value is NotificationTopic {
  return typeof value === 'string' && TOPICS.includes(value as NotificationTopic)
}

function isType(value: unknown): value is NotificationType {
  return typeof value === 'string' && TYPES.includes(value as NotificationType)
}

function uniq(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function shouldNotify(preferences: PreferenceRow | undefined, topic: NotificationTopic) {
  if (!preferences) return true
  if (topic === 'general') return preferences.general !== false
  if (preferences.general === false) return false
  return preferences[topic] !== false
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const suppliedToken = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')

    if (!serviceRoleKey || suppliedToken !== serviceRoleKey) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey,
    )

    const payload = await req.json() as PushPayload
    const title = typeof payload.title === 'string' ? payload.title.trim() : ''
    const body = typeof payload.body === 'string' ? payload.body.trim() : ''
    const type = isType(payload.type) ? payload.type : 'info'
    const topic = isTopic(payload.topic) ? payload.topic : 'general'

    if (!title || !body) {
      return json({ error: 'title and body are required' }, { status: 400 })
    }

    let targetIds = uniq([payload.userId, ...(payload.userIds ?? [])])

    if (payload.role) {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', payload.role)
        .eq('is_active', true)

      if (error) throw new Error(error.message)
      targetIds = uniq([...targetIds, ...((profiles ?? []).map(profile => profile.id as string))])
    }

    if (targetIds.length === 0) {
      return json({ error: 'userId, userIds, or role is required' }, { status: 400 })
    }

    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id, general, exam, fee, grade, certificate, thesis, graduation, elearning, internship, alumni')
      .in('user_id', targetIds)

    if (prefError) throw new Error(prefError.message)

    const preferenceByUser = new Map((preferences ?? []).map(row => [row.user_id, row as PreferenceRow]))
    const eligibleUserIds = targetIds.filter(userId => shouldNotify(preferenceByUser.get(userId), topic))

    if (eligibleUserIds.length === 0) {
      return json({ sent: 0, users: 0, skippedByPreferences: targetIds.length })
    }

    if (payload.persist !== false) {
      const notificationRows = eligibleUserIds.map(userId => ({
        user_id: userId,
        type,
        title,
        message: body,
        link: payload.link ?? (typeof payload.data?.route === 'string' ? payload.data.route : null),
        is_read: false,
      }))

      const { error: insertError } = await supabase.from('notifications').insert(notificationRows)
      if (insertError) throw new Error(insertError.message)
    }

    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', eligibleUserIds)
      .eq('is_active', true)

    if (tokenError) throw new Error(tokenError.message)

    const activeTokens = (tokens ?? []) as PushTokenRow[]
    if (activeTokens.length === 0) {
      return json({ sent: 0, users: eligibleUserIds.length, skippedByPreferences: targetIds.length - eligibleUserIds.length })
    }

    const baseData = {
      ...(payload.data ?? {}),
      type,
      topic,
    }

    const messages: ExpoPushMessage[] = activeTokens.map(row => ({
      to: row.token,
      title,
      body,
      data: baseData,
      sound: payload.sound ?? 'default',
      badge: payload.badge,
    }))

    const results: unknown[] = []
    let sent = 0

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE)
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      })

      const expoData = await response.json()
      results.push(expoData)

      if (!response.ok) continue

      const tickets = Array.isArray(expoData.data) ? expoData.data : []
      sent += tickets.filter((ticket: { status?: string }) => ticket.status === 'ok').length

      for (let j = 0; j < tickets.length; j++) {
        const ticket = tickets[j]
        if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
          const badToken = batch[j]?.to
          if (badToken) {
            await supabase
              .from('push_tokens')
              .update({ is_active: false })
              .eq('token', badToken)
          }
        }
      }
    }

    return json({
      sent,
      users: eligibleUserIds.length,
      tokens: activeTokens.length,
      skippedByPreferences: targetIds.length - eligibleUserIds.length,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[send-push] Error:', message)
    return json({ error: message }, { status: 500 })
  }
})
