export interface AuditIpOptions {
  nodeEnv?: string
}

export function maskIpAddress(ip: string | undefined, options: AuditIpOptions = {}) {
  if (!ip) return 'unknown'
  if (options.nodeEnv !== 'production') return ip

  const cleanIp = ip.replace(/^::ffff:/, '')
  if (cleanIp.includes(':')) {
    return `${cleanIp.split(':').slice(0, 4).join(':')}::/64`
  }

  const parts = cleanIp.split('.')
  if (parts.length !== 4) return 'masked'
  return `${parts[0]}.${parts[1]}.x.x`
}

export function sanitizeAuditPayload(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(sanitizeAuditPayload)
  if (typeof value !== 'object') return value

  const blocked = new Set(['password', 'token', 'access_token', 'refresh_token', 'authorization', 'secret'])
  const result: Record<string, unknown> = {}

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (blocked.has(key.toLowerCase())) {
      result[key] = '[redacted]'
    } else {
      result[key] = sanitizeAuditPayload(entry)
    }
  }

  return result
}

export function inferResourceFromPath(path: string) {
  const parts = path.split('/').filter(Boolean)
  return parts[0] ?? 'unknown'
}
