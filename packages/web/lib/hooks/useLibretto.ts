'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface LibrettoEntry {
  id:            string
  matricola:     string
  studentName:   string
  degreeProgram: string
  degreeType:    string
  courseCode:    string
  courseName:    string
  cfu:           number
  courseYear:    number
  semester:      number
  grade:         string
  gradeStatus:   string
  publishedAt:   string | null
  examDate:      string | null
  teacherName:   string
}

export interface LibrettoFilters {
  semester?: 1 | 2
  courseYear?: number
}

export interface StudentCareerResponse {
  student: {
    id: string
    matricola: string | null
    fullName: string
    status: string
    currentYear: number
    enrollmentYear: number
    degreeProgram: string
    degreeType: string
    totalCfu: number
  }
  summary: {
    passedExams: number
    totalCfuEarned: number
    totalCfu: number
    cfuProgressPct: number
    arithmeticMean: number
    weightedMean: number
    laureaStartScore: number
  }
  libretto: LibrettoEntry[]
}

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

async function fetchCareer(filters: LibrettoFilters): Promise<StudentCareerResponse | null> {
  const token = await getToken()
  if (!token) return null

  const params = new URLSearchParams()
  if (filters.semester) params.set('semester', String(filters.semester))
  if (filters.courseYear) params.set('courseYear', String(filters.courseYear))

  const query = params.toString()
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/students/me/career${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return null
  const json = await res.json()
  return json.data ?? null
}

async function fetchLibretto(filters: LibrettoFilters): Promise<LibrettoEntry[]> {
  const career = await fetchCareer(filters)
  return career?.libretto ?? []
}

export function useLibretto(filters: LibrettoFilters = {}) {
  return useQuery({
    queryKey: ['student', 'libretto', filters],
    queryFn:  () => fetchLibretto(filters),
    staleTime: 5 * 60 * 1000,
  })
}

export function useStudentCareer(filters: LibrettoFilters = {}) {
  return useQuery({
    queryKey: ['student', 'career', filters],
    queryFn:  () => fetchCareer(filters),
    staleTime: 5 * 60 * 1000,
  })
}
