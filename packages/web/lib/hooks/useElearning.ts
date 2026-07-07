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

// ─── Vue enseignant ───────────────────────────────────────────────────────────

export function useElearningCourseTeacher(courseId: string | null) {
  return useQuery({
    queryKey: ['elearning-teacher', courseId],
    queryFn:  () => apiFetch(`/api/elearning/courses/${courseId}`),
    enabled:  !!courseId,
    staleTime: 1000 * 30,
  })
}

export function useUpsertElearningCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, body }: { courseId: string; body: Record<string, unknown> }) =>
      apiFetch(`/api/elearning/courses/${courseId}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: (_data, { courseId }) => {
      qc.invalidateQueries({ queryKey: ['elearning-teacher', courseId] })
    },
  })
}

export function usePublishElearningCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ecId, published }: { ecId: string; published: boolean }) =>
      apiFetch(`/api/elearning/courses/${ecId}/publish`, {
        method: 'POST', body: JSON.stringify({ published }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-teacher'] }),
  })
}

// Sections
export function useCreateSection(ecId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      apiFetch(`/api/elearning/courses/${ecId}/sections`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-teacher'] }),
  })
}

export function useUpdateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { title?: string; description?: string } }) =>
      apiFetch(`/api/elearning/sections/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-teacher'] }),
  })
}

export function useDeleteSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/elearning/sections/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-teacher'] }),
  })
}

// Matériaux
export function useCreateMaterial(sectionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; type: string; url?: string; content?: string; durationS?: number }) =>
      apiFetch(`/api/elearning/sections/${sectionId}/materials`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-teacher'] }),
  })
}

export function useDeleteMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/elearning/materials/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-teacher'] }),
  })
}

// Devoirs
export function useCreateAssignment(ecId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; description?: string; dueDate?: string; maxScore?: number }) =>
      apiFetch(`/api/elearning/courses/${ecId}/assignments`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-teacher'] }),
  })
}

export function useSubmissions(assignmentId: string | null) {
  return useQuery({
    queryKey: ['elearning-submissions', assignmentId],
    queryFn:  () => apiFetch(`/api/elearning/assignments/${assignmentId}/submissions`),
    enabled:  !!assignmentId,
  })
}

export function useGradeSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, score, feedback }: { id: string; score: number; feedback?: string }) =>
      apiFetch(`/api/elearning/submissions/${id}/grade`, {
        method: 'POST', body: JSON.stringify({ score, feedback }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-submissions'] }),
  })
}

export function useCreateElearningAnnouncement(ecId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { title: string; body: string; isPinned?: boolean }) =>
      apiFetch(`/api/elearning/courses/${ecId}/announcements`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-teacher'] }),
  })
}

// ─── Vue étudiant ─────────────────────────────────────────────────────────────

export function useStudentElearningCourses() {
  return useQuery({
    queryKey: ['elearning-student-courses'],
    queryFn:  () => apiFetch('/api/elearning/student/courses'),
    staleTime: 1000 * 60,
  })
}

export function useStudentElearningCourse(ecId: string | null) {
  return useQuery({
    queryKey: ['elearning-student-course', ecId],
    queryFn:  () => apiFetch(`/api/elearning/student/courses/${ecId}`),
    enabled:  !!ecId,
    staleTime: 1000 * 30,
  })
}

export function useUpsertProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ materialId, progressPct, completed }: {
      materialId: string; progressPct: number; completed: boolean
    }) =>
      apiFetch(`/api/elearning/materials/${materialId}/progress`, {
        method: 'POST', body: JSON.stringify({ progressPct, completed }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-student-course'] }),
  })
}

export function useSubmitAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assignmentId, content, fileUrl }: {
      assignmentId: string; content: string; fileUrl?: string
    }) => {
      const body: { content: string; fileUrl?: string } = { content }
      if (fileUrl !== undefined) body.fileUrl = fileUrl
      return apiFetch(`/api/elearning/assignments/${assignmentId}/submit`, {
        method: 'POST', body: JSON.stringify(body),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['elearning-student-course'] }),
  })
}
