'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  downloadCertificatePdf,
  useRequestCertificate,
  useStudentCertificates,
  type CertEntry,
} from '@/lib/hooks/useStudentCertificates'

type CertType = 'enrollment' | 'transcript' | 'degree' | 'attendance' | 'other'

const CERT_LABELS: Record<CertType, { label: string; short: string }> = {
  enrollment: { label: 'Certificat de scolarite', short: 'Scolarite' },
  transcript: { label: 'Releve de notes officiel', short: 'Releve' },
  degree: { label: 'Diplome', short: 'Diplome' },
  attendance: { label: 'Attestation de presence', short: 'Presence' },
  other: { label: 'Document officiel', short: 'Document' },
}

function certInfo(type: string) {
  return CERT_LABELS[type as CertType] ?? CERT_LABELS.other
}

function safeDate(value: string) {
  return format(new Date(value), 'd MMMM yyyy', { locale: fr })
}

function fileName(cert: CertEntry) {
  return `UniGest_${cert.type}_${cert.serial_number ?? cert.id}.pdf`
}

export function CertificatesPanel() {
  const { data: certs, isLoading, isError } = useStudentCertificates()
  const requestCert = useRequestCertificate()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    window.setTimeout(() => setMessage(null), 3500)
  }

  async function handleRequest(type: CertType) {
    try {
      await requestCert.mutateAsync(type)
      showMessage('success', 'Document emis et disponible au telechargement.')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Demande impossible')
    }
  }

  async function handleDownload(cert: CertEntry) {
    setDownloadingId(cert.id)
    try {
      await downloadCertificatePdf(cert.id, fileName(cert))
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Telechargement impossible')
    } finally {
      setDownloadingId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-destructive">Impossible de charger les certificats.</p>
  }

  const rows = certs ?? []
  const validCount = rows.filter(cert => !cert.expires_at || new Date(cert.expires_at) >= new Date()).length
  const expiredCount = rows.length - validCount

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold">Demander un document</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les documents sont generes immediatement avec un token public de verification.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['enrollment', 'transcript', 'attendance'] as CertType[]).map(type => (
              <button
                key={type}
                type="button"
                disabled={requestCert.isPending}
                onClick={() => handleRequest(type)}
                className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {certInfo(type).short}
              </button>
            ))}
          </div>
        </div>
      </div>

      {message ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Valides</p>
          <p className="mt-1 text-2xl font-semibold">{validCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Expires</p>
          <p className="mt-1 text-2xl font-semibold">{expiredCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p className="text-sm">Aucun certificat emis pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((cert: CertEntry) => {
            const info = certInfo(cert.type)
            const secretary = cert.secretaries?.profiles
            const isExpired = cert.expires_at ? new Date(cert.expires_at) < new Date() : false

            return (
              <article
                key={cert.id}
                className={`rounded-lg border bg-card p-4 shadow-sm ${isExpired ? 'opacity-65' : ''}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{info.short}</span>
                      {isExpired ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Expire</span>
                      ) : (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">Valide</span>
                      )}
                    </div>
                    <h3 className="mt-2 font-medium">{info.label}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Emis le {safeDate(cert.issued_at)}
                      {secretary ? ` par ${secretary.first_name} ${secretary.last_name}` : ''}
                    </p>
                    {cert.serial_number ? (
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{cert.serial_number}</p>
                    ) : null}
                    {cert.expires_at ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Valide jusqu'au {format(new Date(cert.expires_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={downloadingId === cert.id}
                    onClick={() => handleDownload(cert)}
                    className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloadingId === cert.id ? 'Preparation...' : 'PDF'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
