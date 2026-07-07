import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function apiFetch(path: string, options?: RequestInit) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${session?.access_token ?? ''}`,
      ...(options?.headers ?? {}),
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')
  return json.data
}

// Étudiant
export function useStudentThesis() {
  return useQuery({
    queryKey: ['thesis-me'],
    queryFn:  () => apiFetch('/api/thesis/me'),
  })
}

export function useSubmitThesis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      title: string; abstract?: string; documentUrl?: string
      advisorName?: string; coAdvisorName?: string
    }) => apiFetch('/api/thesis', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thesis-me'] }),
  })
}

export function useStudentGraduationApplication() {
  return useQuery({
    queryKey: ['graduation-me'],
    queryFn:  () => apiFetch('/api/graduation/me'),
  })
}

export function useSubmitGraduationApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { thesisTitle?: string }) => {
      const payload: { thesisTitle?: string } = {}
      if (body.thesisTitle) payload.thesisTitle = body.thesisTitle
      return apiFetch('/api/graduation/apply', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['graduation-me'] })
      qc.invalidateQueries({ queryKey: ['student-dashboard'] })
    },
  })
}

// Admin
export function useAllTheses(status?: string) {
  return useQuery({
    queryKey: ['thesis-all', status],
    queryFn:  () => apiFetch(`/api/thesis${status ? `?status=${status}` : ''}`),
  })
}

export function useUpdateThesisStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id, status, notes, defenseDate,
    }: {
      id: string; status: string; notes?: string; defenseDate?: string
    }) => {
      const body: { status: string; notes?: string; defenseDate?: string } = { status }
      if (notes       !== undefined) body.notes       = notes
      if (defenseDate !== undefined) body.defenseDate = defenseDate
      return apiFetch(`/api/thesis/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thesis-all'] }),
  })
}
