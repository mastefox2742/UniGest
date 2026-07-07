'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken()
  if (!token) throw new Error('Non authentifie')

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Erreur API')
  return json.data
}

export type InternshipApplicationStatus =
  | 'submitted'
  | 'approved'
  | 'in_progress'
  | 'report_submitted'
  | 'evaluated'
  | 'closed'
  | 'refused'

export interface InternshipOpportunity {
  id: string
  title: string
  company_name: string
  location: string | null
  description: string | null
  requirements: string | null
  tutor_name: string | null
  tutor_email: string | null
  start_date: string | null
  end_date: string | null
  cfu: number
  application_deadline: string | null
  status: 'draft' | 'open' | 'closed'
  created_at: string
}

export interface InternshipApplication {
  id: string
  status: InternshipApplicationStatus
  motivation: string | null
  report_url: string | null
  evaluation_score: number | null
  evaluation_feedback: string | null
  applied_at: string
  approved_at: string | null
  started_at: string | null
  report_submitted_at: string | null
  evaluated_at: string | null
  closed_at: string | null
  students: {
    matricola: string | null
    profiles: { first_name: string | null; last_name: string | null; email: string | null } | null
    degree_programs: { name: string | null; code: string | null } | null
  } | null
  internship_opportunities: {
    id: string
    title: string
    company_name: string
    location: string | null
    start_date: string | null
    end_date: string | null
    cfu: number
  } | null
}

export interface CreateInternshipOpportunityInput {
  title: string
  companyName: string
  location?: string
  description?: string
  requirements?: string
  tutorName?: string
  tutorEmail?: string
  startDate?: string
  endDate?: string
  cfu?: number
  applicationDeadline?: string
  status?: 'draft' | 'open' | 'closed'
}

export function useAdminInternshipOpportunities(status?: string) {
  return useQuery<InternshipOpportunity[]>({
    queryKey: ['admin-internship-opportunities', status ?? null],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      return apiFetch(`/api/internships/opportunities${params.size > 0 ? `?${params}` : ''}`)
    },
    staleTime: 1000 * 60,
  })
}

export function useAdminInternshipApplications(status?: InternshipApplicationStatus | '') {
  return useQuery<InternshipApplication[]>({
    queryKey: ['admin-internship-applications', status || null],
    queryFn: () => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      return apiFetch(`/api/internships/applications${params.size > 0 ? `?${params}` : ''}`)
    },
    staleTime: 1000 * 60,
  })
}

export function useCreateInternshipOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInternshipOpportunityInput) =>
      apiFetch('/api/internships/opportunities', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-internship-opportunities'] })
    },
  })
}

export function useUpdateInternshipStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { applicationId: string; status: InternshipApplicationStatus }) =>
      apiFetch(`/api/internships/applications/${input.applicationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-internship-applications'] })
    },
  })
}

export function useEvaluateInternship() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { applicationId: string; score: number; feedback?: string }) => {
      const payload: { score: number; feedback?: string } = { score: input.score }
      if (input.feedback) payload.feedback = input.feedback
      return apiFetch(`/api/internships/applications/${input.applicationId}/evaluate`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-internship-applications'] })
    },
  })
}
