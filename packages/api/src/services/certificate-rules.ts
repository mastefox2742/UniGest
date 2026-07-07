export const CERTIFICATE_TYPES = ['enrollment', 'transcript', 'degree', 'attendance', 'other'] as const

export type CertificateType = typeof CERTIFICATE_TYPES[number]

const TYPE_SET = new Set<string>(CERTIFICATE_TYPES)

export function assertCertificateType(type: string): asserts type is CertificateType {
  if (!TYPE_SET.has(type)) {
    throw new Error('Type de certificat invalide')
  }
}

export function generateVerificationToken() {
  return randomBytes(24).toString('hex')
}

export function isCertificateExpired(expiresAt?: string | null, now = new Date()) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < now.getTime()
}

export function assertCertificateIsValid(expiresAt?: string | null, now = new Date()) {
  if (isCertificateExpired(expiresAt, now)) {
    throw new Error('Certificat expire')
  }
}
import { randomBytes } from 'crypto'
