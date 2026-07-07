'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function apiFetch<T>(path: string): Promise<T> {
  const token = await getToken()
  if (!token) throw new Error('Non authentifie')

  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Erreur API')
  return json.data
}

export interface PlacementStats {
  total: number
  employed: number
  continuingStudies: number
  seeking: number
  employmentRate: number
  bySector: Array<{ label: string; count: number }>
  byContract: Array<{ label: string; count: number }>
  bySurveyYear: Array<{ label: string; count: number }>
}

export interface AlumniProfile {
  id: string
  graduation_year: number | null
  current_city: string | null
  current_country: string | null
  linkedin_url: string | null
  consent_placement_tracking: boolean
  updated_at: string
  students: {
    matricola: string | null
    profiles: { first_name: string | null; last_name: string | null; email: string | null } | null
    degree_programs: { name: string | null; code: string | null } | null
  } | null
  placement_surveys: Array<{
    id: string
    employment_status: string
    company_name: string | null
    job_title: string | null
    contract_type: string | null
    sector: string | null
    salary_range: string | null
    employed_at: string | null
    survey_year: number
    submitted_at: string
  }>
}

export function useAdminAlumniProfiles(graduationYear?: number) {
  return useQuery<AlumniProfile[]>({
    queryKey: ['admin-alumni-profiles', graduationYear ?? null],
    queryFn: () => {
      const params = new URLSearchParams()
      if (graduationYear) params.set('graduationYear', String(graduationYear))
      return apiFetch(`/api/alumni${params.size > 0 ? `?${params}` : ''}`)
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function usePlacementStats() {
  return useQuery<PlacementStats>({
    queryKey: ['admin-placement-stats'],
    queryFn: () => apiFetch('/api/alumni/placement/stats'),
    staleTime: 1000 * 60 * 5,
  })
}
