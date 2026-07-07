'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCourseDetail,
  useCreateExamSession,
  useExamBookings,
  useTeacherCourses,
} from '@/lib/hooks/useTeacherCourses'

type Course = {
  id: string
  name: string
  code: string
  year: number
  semester: number
  cfu: number
  course_enrollments?: Array<{ count: number }>
}

type ExamSession = {
  id: string
  date: string
  registration_deadline: string
  max_students: number | null
  notes: string | null
  classrooms?: { name: string; building: string | null } | null
  exam_bookings?: Array<{ count: number }>
}

type Booking = {
  id: string
  status: string
  booked_at: string
  students?: {
    id: string
    matricola: string | null
    profiles?: {
      first_name?: string
      last_name?: string
      email?: string
    }
  }
  grades?: Array<{
    id: string
    value: number | null
    is_honors: boolean
    status: string
    notes?: string | null
  }>
}

function bookingCount(session: ExamSession) {
  return session.exam_bookings?.[0]?.count ?? 0
}

function roomLabel(session: ExamSession) {
  const room = session.classrooms
  if (!room) return 'Lieu a confirmer'
  return [room.name, room.building].filter(Boolean).join(' - ') || 'Lieu a confirmer'
}

function formatDate(value: string) {
  return format(new Date(value), "EEE d MMM yyyy 'a' HH:mm", { locale: fr })
}

function sessionStatus(session: ExamSession) {
  if (isPast(new Date(session.date))) return { label: 'Passe', variant: 'warning' as const }
  if (isPast(new Date(session.registration_deadline))) return { label: 'Inscriptions closes', variant: 'outline' as const }
  return { label: 'Ouvert', variant: 'success' as const }
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/2" />
          <Skeleton className="mt-5 h-9 w-28" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}

function PrenotatiModal({
  examId,
  session,
  onClose,
}: {
  examId: string
  session: ExamSession
  onClose: () => void
}) {
  const bookingsQuery = useExamBookings(examId)
  const bookings = (bookingsQuery.data ?? []) as Booking[]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-3xl flex-col rounded-lg bg-card shadow-xl" style={{ maxHeight: '85vh' }}>
        <div className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">Liste des prenotes</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDate(session.date)} - {roomLabel(session)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {bookingsQuery.isLoading ? (
            <div className="p-5">
              <LoadingGrid />
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-5">
              <EmptyState title="Aucun etudiant prenote" detail="Les inscriptions apparaitront ici." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Etudiant</th>
                  <th className="px-4 py-3">Matricola</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.map((booking, index) => {
                  const profile = booking.students?.profiles
                  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || 'Etudiant'
                  const grade = booking.grades?.[0]
                  const gradeLabel = grade ? (grade.is_honors ? '30L' : grade.value ?? '-') : '-'

                  return (
                    <tr key={booking.id}>
                      <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3 font-medium">{name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{booking.students?.matricola ?? '-'}</td>
                      <td className="px-4 py-3"><Badge variant="outline">{booking.status}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(booking.booked_at)}</td>
                      <td className="px-4 py-3">{gradeLabel}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function NewSessionForm({
  courseId,
  onDone,
}: {
  courseId: string
  onDone: () => void
}) {
  const createSession = useCreateExamSession(courseId)
  const [form, setForm] = useState({
    date: '',
    time: '09:00',
    registrationDeadline: '',
    registrationTime: '23:59',
    maxStudents: '40',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      const input: {
        date: string
        registrationDeadline: string
        maxStudents?: number
        notes?: string
      } = {
        date: `${form.date}T${form.time}:00.000Z`,
        registrationDeadline: `${form.registrationDeadline}T${form.registrationTime}:00.000Z`,
      }
      if (form.maxStudents) input.maxStudents = Number(form.maxStudents)
      if (form.notes) input.notes = form.notes

      await createSession.mutateAsync(input)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation impossible')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-5 shadow-sm">
      <h3 className="font-semibold">Nouvel appello</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Date examen</span>
          <input
            type="date"
            required
            value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Heure examen</span>
          <input
            type="time"
            required
            value={form.time}
            onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Deadline inscription</span>
          <input
            type="date"
            required
            value={form.registrationDeadline}
            onChange={(event) => setForm((prev) => ({ ...prev, registrationDeadline: event.target.value }))}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Heure deadline</span>
          <input
            type="time"
            required
            value={form.registrationTime}
            onChange={(event) => setForm((prev) => ({ ...prev, registrationTime: event.target.value }))}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Places max</span>
          <input
            type="number"
            min="1"
            max="2000"
            value={form.maxStudents}
            onChange={(event) => setForm((prev) => ({ ...prev, maxStudents: event.target.value }))}
            className="w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={createSession.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {createSession.isPending ? 'Creation...' : 'Creer la session'}
        </button>
        <button type="button" onClick={onDone} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
          Annuler
        </button>
      </div>
    </form>
  )
}

function SessionCard({
  course,
  session,
  onViewBookings,
}: {
  course: Course
  session: ExamSession
  onViewBookings: (session: ExamSession) => void
}) {
  const status = sessionStatus(session)
  const count = bookingCount(session)
  const fillPct = session.max_students ? Math.min(100, Math.round((count / session.max_students) * 100)) : 0

  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{course.code}</Badge>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <h3 className="mt-2 font-semibold">{course.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{formatDate(session.date)}</p>
          <p className="text-sm text-muted-foreground">{roomLabel(session)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>{count} prenote{count > 1 ? 's' : ''}</span>
          <span>{session.max_students ? `${session.max_students} places` : 'Capacite libre'}</span>
        </div>
        {session.max_students ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${fillPct}%` }} />
          </div>
        ) : null}
      </div>

      {session.notes ? <p className="mt-3 text-sm text-muted-foreground">{session.notes}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onViewBookings(session)}
          className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Voir prenotes
        </button>
        {isPast(new Date(session.date)) ? (
          <Link
            href={`/teacher/courses/${course.id}/verbale/${session.id}`}
            className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Verbale
          </Link>
        ) : null}
      </div>
    </article>
  )
}

export function TeacherExamsHub() {
  const coursesQuery = useTeacherCourses()
  const courses = (coursesQuery.data ?? []) as Course[]
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null)

  useEffect(() => {
    if (!selectedCourseId && courses[0]) setSelectedCourseId(courses[0].id)
  }, [courses, selectedCourseId])

  const courseQuery = useCourseDetail(selectedCourseId)
  const selectedCourse = (courseQuery.data ?? courses.find((course) => course.id === selectedCourseId) ?? null) as (Course & {
    exam_sessions?: ExamSession[]
  }) | null

  const sessions = selectedCourse?.exam_sessions ?? []
  const kpis = useMemo(() => {
    const allCounts = sessions.map(bookingCount)
    return {
      sessions: sessions.length,
      upcoming: sessions.filter((session) => !isPast(new Date(session.date))).length,
      booked: allCounts.reduce((sum, count) => sum + count, 0),
      grading: sessions.filter((session) => isPast(new Date(session.date))).length,
    }
  }, [sessions])

  return (
    <div className="space-y-6">
      {selectedSession ? (
        <PrenotatiModal
          examId={selectedSession.id}
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hub des examens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere tes appelli, consulte les prenotes et ouvre les verbali.
          </p>
        </div>
        <button
          type="button"
          disabled={!selectedCourseId}
          onClick={() => setShowNewForm((value) => !value)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          + Nouvel appello
        </button>
      </div>

      {coursesQuery.isLoading ? (
        <LoadingGrid />
      ) : courses.length === 0 ? (
        <EmptyState title="Aucun cours enseignant" detail="Les cours assignes apparaitront ici." />
      ) : (
        <>
          <div className="rounded-lg border bg-card p-4">
            <label className="text-sm">
              <span className="mb-2 block text-xs font-medium text-muted-foreground">Cours</span>
              <select
                value={selectedCourseId}
                onChange={(event) => {
                  setSelectedCourseId(event.target.value)
                  setShowNewForm(false)
                }}
                className="w-full rounded-md border bg-background px-3 py-2"
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-2xl font-bold">{kpis.sessions}</p>
              <p className="text-xs text-muted-foreground">Sessions</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-2xl font-bold text-green-600">{kpis.upcoming}</p>
              <p className="text-xs text-muted-foreground">A venir</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-2xl font-bold text-primary">{kpis.booked}</p>
              <p className="text-xs text-muted-foreground">Prenotes</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-2xl font-bold text-amber-600">{kpis.grading}</p>
              <p className="text-xs text-muted-foreground">Verbali</p>
            </div>
          </div>

          {showNewForm && selectedCourseId ? (
            <NewSessionForm courseId={selectedCourseId} onDone={() => setShowNewForm(false)} />
          ) : null}

          {courseQuery.isLoading ? (
            <LoadingGrid />
          ) : sessions.length === 0 ? (
            <EmptyState title="Aucun appello pour ce cours" detail="Cree une premiere session pour ouvrir les inscriptions." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  course={selectedCourse as Course}
                  session={session}
                  onViewBookings={setSelectedSession}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
