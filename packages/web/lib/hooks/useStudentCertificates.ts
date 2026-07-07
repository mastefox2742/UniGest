'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export interface CertEntry {
  id:            string
  type:          string
  issued_at:     string
  expires_at:    string | null
  serial_number: string | null
  file_url:      string | null
  secretaries:   { profiles: { first_name: string; last_name: string } | null } | null
}

export function useStudentCertificates() {
  return useQuery<CertEntry[]>({
    queryKey: ['student-certificates'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) return []

      const res = await fetch(`${API}/api/certificates/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur chargement certificats')
      const json = await res.json()
      return json.data ?? []
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useRequestCertificate() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (type: 'enrollment' | 'transcript' | 'degree' | 'attendance' | 'other') => {
      const token = await getToken()
      if (!token) throw new Error('Non authentifie')

      const res = await fetch(`${API}/api/certificates/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Demande impossible')
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-certificates'] }),
  })
}

export async function downloadCertificatePdf(certId: string, fileName: string) {
  const token = await getToken()
  if (!token) throw new Error('Non authentifie')

  const res = await fetch(`${API}/api/certificates/${certId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Telechargement impossible')
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
