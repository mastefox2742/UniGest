import { describe, expect, it } from 'vitest'
import { inferResourceFromPath, maskIpAddress, sanitizeAuditPayload } from '../services/audit-rules'

describe('audit-rules', () => {
  it('masks ipv4 addresses in production', () => {
    expect(maskIpAddress('192.168.10.55', { nodeEnv: 'production' })).toBe('192.168.x.x')
    expect(maskIpAddress('::ffff:10.0.0.12', { nodeEnv: 'production' })).toBe('10.0.x.x')
  })

  it('keeps ip addresses outside production', () => {
    expect(maskIpAddress('192.168.10.55', { nodeEnv: 'test' })).toBe('192.168.10.55')
  })

  it('redacts sensitive fields recursively', () => {
    expect(sanitizeAuditPayload({
      email: 'a@b.test',
      password: 'secret',
      nested: { refresh_token: 'abc' },
    })).toEqual({
      email: 'a@b.test',
      password: '[redacted]',
      nested: { refresh_token: '[redacted]' },
    })
  })

  it('infers resource from path', () => {
    expect(inferResourceFromPath('/graduation/abc/diploma')).toBe('graduation')
    expect(inferResourceFromPath('/')).toBe('unknown')
  })
})
