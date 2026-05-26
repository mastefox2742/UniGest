'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface Course {
  id:               string
  name:             string
  code:             string
  year:             number
  semester:         number
  cfu:              number
  description:      string | null
  degree_programs:  { name: string; type: string } | null
  course_enrollments: { count: number }[]
}

interface ExamSession {
  id:                    string
  date:                  string
  registration_deadline: string
  max_students:          number | null
  notes:                 string | null
  classrooms:            { name: string; building: string | null } | null
  exam_bookings:         { count: number }[]
}

interface CourseDetail extends Course {
  syllabus_url: string | null
  exam_sessions: ExamSession[]
}

export function useTeacherCourses() {
  const supabase = createClient()

  return useQuery<Course[]>({
    queryKey: ['teacher-courses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!teacher) return []

      const { data } = await supabase
        .from('courses')
        .select(`
          id, name, code, year, semester, cfu, description,
          degree_programs!degree_program_id(name, type),
          course_enrollments(count)
        `)
        .eq('teacher_id', teacher.id)
        .order('year')
        .order('semester')

      return (data ?? []) as unknown as Course[]
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useCourseDetail(courseId: string) {
  const supabase = createClient()

  return useQuery<CourseDetail | null>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from('courses')
        .select(`
          id, name, code, year, semester, cfu, description, syllabus_url,
          degree_programs!degree_program_id(name, type, total_cfu),
          exam_sessions(
            id, date, registration_deadline, max_students, notes,
            classrooms!classroom_id(name, building),
            exam_bookings(count)
          )
        `)
        .eq('id', courseId)
        .single()

      return (data ?? null) as CourseDetail | null
    },
    enabled: !!courseId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateExamSession(courseId: string) {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      date: string
      registrationDeadline: string
      maxStudents?: number
      notes?: string
    }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non authentifié')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/exams/courses/${courseId}/exams`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(input),
        },
      )

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erreur création appello')
      }

      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course', courseId] })
    },
  })
}
