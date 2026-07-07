'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export type NotificationPreferences = {
  general: boolean
  exam: boolean
  fee: boolean
  grade: boolean
  certificate: boolean
  thesis: boolean
  graduation: boolean
  elearning: boolean
  internship: boolean
  alumni: boolean
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) {
        return {
          general: true,
          exam: true,
          fee: true,
          grade: true,
          certificate: true,
          thesis: true,
          graduation: true,
          elearning: true,
          internship: true,
          alumni: true,
        }
      }
      const res = await fetch(`${API}/api/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur chargement preferences')
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (prefs: Partial<NotificationPreferences>) => {
      const token = await getToken()
      if (!token) throw new Error('Non authentifie')
      const res = await fetch(`${API}/api/notifications/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Mise a jour impossible')
      }
      const json = await res.json()
      return json.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-preferences'] }),
  })
}
