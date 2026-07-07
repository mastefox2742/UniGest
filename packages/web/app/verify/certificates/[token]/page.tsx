'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

type VerificationResult = {
  valid: boolean
  reason: 'not_found' | 'expired' | null
  certificate?: {
    type: string
    label: string
    serialNumber: string | null
    issuedAt: string
    expiresAt: string | null
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
}

export default function VerifyCertificatePage() {
  const params = useParams<{ token: string }>()
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/api/certificates/verify/${params.token}`)
        if (!res.ok) throw new Error('Verification impossible')
        const json = await res.json()
        setResult(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification impossible')
      } finally {
        setLoading(false)
      }
    }

    if (params.token) void load()
  }, [params.token])

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">UniGest</p>
        <h1 className="mt-2 text-2xl font-bold">Verification de certificat</h1>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Verification en cours...</p>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {!loading && result ? (
          <div className="mt-6 space-y-4">
            <div
              className={`rounded-lg border p-4 ${
                result.valid
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              <p className="font-semibold">
                {result.valid ? 'Certificat valide' : result.reason === 'expired' ? 'Certificat expire' : 'Certificat introuvable'}
              </p>
              <p className="mt-1 text-sm">
                Cette page confirme uniquement l'authenticite du document. Elle ne revele aucune donnee etudiante privee.
              </p>
            </div>

            {result.certificate ? (
              <dl className="grid gap-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Document</dt>
                  <dd className="font-medium">{result.certificate.label}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Numero</dt>
                  <dd className="font-mono">{result.certificate.serialNumber ?? '-'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Emission</dt>
                  <dd>{formatDate(result.certificate.issuedAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Expiration</dt>
                  <dd>{formatDate(result.certificate.expiresAt)}</dd>
                </div>
              </dl>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  )
}
