import { createClient } from '@supabase/supabase-js'
import { inferResourceFromPath, sanitizeAuditPayload } from './audit-rules'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface AuditRecordInput {
  actorUserId?: string | null
  actorRole?: string | null
  action: string
  resource?: string | null
  resourceId?: string | null
  method?: string | null
  path?: string | null
  statusCode?: number | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}

export interface AuditLogFilters {
  action?: string
  resource?: string
  actorUserId?: string
  limit?: number
}

export async function recordAuditLog(input: AuditRecordInput) {
  const resource = input.resource ?? (input.path ? inferResourceFromPath(input.path) : 'unknown')

  const { error } = await supabase.from('audit_logs').insert({
    actor_user_id: input.actorUserId ?? null,
    actor_role: input.actorRole ?? null,
    action: input.action,
    resource,
    resource_id: input.resourceId ?? null,
    method: input.method ?? null,
    path: input.path ?? null,
    status_code: input.statusCode ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
    metadata: sanitizeAuditPayload(input.metadata ?? null),
  })

  if (error) throw new Error(error.message)
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  let query = supabase
    .from('audit_logs')
    .select(`
      id, actor_user_id, actor_role, action, resource, resource_id,
      method, path, status_code, ip_address, user_agent, metadata, created_at
    `)
    .order('created_at', { ascending: false })
    .limit(Math.min(filters.limit ?? 100, 500))

  if (filters.action) query = query.eq('action', filters.action)
  if (filters.resource) query = query.eq('resource', filters.resource)
  if (filters.actorUserId) query = query.eq('actor_user_id', filters.actorUserId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
