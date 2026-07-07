'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export interface AuditLogEntry {
  id: string
  actor_user_id: string | null
  actor_role: string | null
  action: string
  resource: string
  resource_id: string | null
  method: string | null
  path: string | null
  status_code: number | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface AuditFilters {
  action?: string
  resource?: string
  actorUserId?: string
  limit?: number
}

export function useAdminAuditLogs(filters: AuditFilters = {}) {
  return useQuery<AuditLogEntry[]>({
    queryKey: ['admin-audit', filters],
    queryFn: async () => {
      const token = await getToken()
      if (!token) return []

      const params = new URLSearchParams()
      if (filters.action) params.set('action', filters.action)
      if (filters.resource) params.set('resource', filters.resource)
      if (filters.actorUserId) params.set('actorUserId', filters.actorUserId)
      if (filters.limit) params.set('limit', String(filters.limit))

      const res = await fetch(`${API}/api/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur chargement audit')
      const json = await res.json()
      return json.data ?? []
    },
    staleTime: 1000 * 30,
  })
}
