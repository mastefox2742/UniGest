'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

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
  status: 'submitted' | 'approved' | 'in_progress' | 'report_submitted' | 'evaluated' | 'closed' | 'refused'
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
  internship_opportunities: {
    id: string
    title: string
    company_name: string
    location: string | null
    start_date: string | null
    end_date: string | null
    cfu: number
    status: string
  } | null
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

export function useInternshipOpportunities() {
  return useQuery<InternshipOpportunity[]>({
    queryKey: ['student-internship-opportunities'],
    queryFn: () => apiFetch('/api/internships/opportunities?status=open'),
    staleTime: 1000 * 60,
  })
}

export function useStudentInternshipApplications() {
  return useQuery<InternshipApplication[]>({
    queryKey: ['student-internship-applications'],
    queryFn: () => apiFetch('/api/internships/me'),
    staleTime: 1000 * 60,
  })
}

export function useApplyForInternship() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: { opportunityId: string; motivation?: string }) =>
      apiFetch('/api/internships/apply', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-internship-applications'] })
    },
  })
}

export function useSubmitInternshipReport() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (input: { applicationId: string; reportUrl: string }) =>
      apiFetch(`/api/internships/applications/${input.applicationId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reportUrl: input.reportUrl }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-internship-applications'] })
    },
  })
}
