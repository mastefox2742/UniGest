import { describe, expect, it } from 'vitest'
import {
  assertCertificateIsValid,
  assertCertificateType,
  generateVerificationToken,
  isCertificateExpired,
} from '../services/certificate-rules'

describe('certificate-rules', () => {
  it('accepts known certificate types', () => {
    expect(() => assertCertificateType('enrollment')).not.toThrow()
    expect(() => assertCertificateType('transcript')).not.toThrow()
  })

  it('rejects unknown certificate types', () => {
    expect(() => assertCertificateType('invoice')).toThrow('Type de certificat invalide')
  })

  it('detects expired certificates', () => {
    const now = new Date('2026-07-06T12:00:00Z')
    expect(isCertificateExpired('2026-07-05T23:59:59Z', now)).toBe(true)
    expect(isCertificateExpired('2026-07-07T00:00:00Z', now)).toBe(false)
    expect(isCertificateExpired(null, now)).toBe(false)
  })

  it('throws when a certificate is expired', () => {
    expect(() => assertCertificateIsValid('2026-07-05T00:00:00Z', new Date('2026-07-06T00:00:00Z'))).toThrow('expire')
  })

  it('generates opaque verification tokens', () => {
    const token = generateVerificationToken()
    expect(token).toMatch(/^[a-f0-9]{48}$/)
  })
})
