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

export type AlumniEmploymentStatus =
  | 'seeking'
  | 'employed'
  | 'self_employed'
  | 'continuing_studies'
  | 'not_available'

export interface AlumniProfile {
  id: string
  graduation_year: number | null
  current_city: string | null
  current_country: string | null
  linkedin_url: string | null
  consent_placement_tracking: boolean
  created_at: string
  updated_at: string
  students: {
    matricola: string | null
    profiles: { first_name: string | null; last_name: string | null; email: string | null } | null
    degree_programs: { name: string | null; code: string | null } | null
  } | null
  placement_surveys: Array<{
    id: string
    employment_status: AlumniEmploymentStatus
    company_name: string | null
    job_title: string | null
    contract_type: string | null
    sector: string | null
    salary_range: string | null
    employed_at: string | null
    notes: string | null
    survey_year: number
    submitted_at: string
  }>
}

export interface UpsertAlumniProfileInput {
  graduationYear?: number
  currentCity?: string
  currentCountry?: string
  linkedinUrl?: string
  consentPlacementTracking?: boolean
}

export interface SubmitPlacementSurveyInput {
  employmentStatus: AlumniEmploymentStatus
  companyName?: string
  jobTitle?: string
  contractType?: string
  sector?: string
  salaryRange?: '<20k' | '20-30k' | '30-40k' | '40-60k' | '60k+' | 'non_disclosed'
  employedAt?: string
  notes?: string
}

export function useStudentAlumniProfile() {
  return useQuery<AlumniProfile | null>({
    queryKey: ['student-alumni-profile'],
    queryFn: () => apiFetch('/api/alumni/me'),
    staleTime: 1000 * 60,
  })
}

export function useUpsertStudentAlumniProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertAlumniProfileInput) =>
      apiFetch('/api/alumni/me', { method: 'PUT', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-alumni-profile'] }),
  })
}

export function useSubmitPlacementSurvey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SubmitPlacementSurveyInput) =>
      apiFetch('/api/alumni/me/surveys', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student-alumni-profile'] }),
  })
}
