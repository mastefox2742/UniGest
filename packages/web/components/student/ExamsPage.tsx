'use client'

import { useMemo, useState } from 'react'
import { format, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAvailableExams,
  useBookExam,
  useCancelBooking,
  useMyBookings,
  usePendingGrades,
  useRespondToGrade,
} from '@/lib/hooks/useStudentExams'

type Tab = 'available' | 'bookings' | 'grades'

type ApiCourse = {
  id?: string
  name?: string
  code?: string
  cfu?: number
  teachers?: {
    profiles?: {
      first_name?: string
      last_name?: string
    }
  }
}

type ApiClassroom = {
  name?: string
  building?: string | null
}

type AvailableExam = {
  id: string
  date: string
  registration_deadline: string
  max_students: number | null
  notes: string | null
  is_booked?: boolean
  courses?: ApiCourse
  classrooms?: ApiClassroom | null
  exam_bookings?: Array<{ count?: number }> | { count?: number } | null
}

type Booking = {
  id: string
  status: string
  booked_at: string
  exam_sessions?: {
    id: string
    date: string
    registration_deadline: string
    notes?: string | null
    courses?: ApiCourse
    classrooms?: ApiClassroom | null
  }
}

type PendingGrade = {
  id: string
  value: number | null
  is_honors?: boolean
  notes?: string | null
  created_at?: string
  exam_sessions?: {
    date?: string
  }
  courses?: {
    name?: string
    code?: string
    cfu?: number
  }
}

function courseLabel(course?: ApiCourse | PendingGrade['courses']) {
  return {
    name: course?.name ?? 'Cours sans nom',
    code: course?.code ?? 'CODE',
    cfu: course?.cfu ?? 0,
  }
}

function teacherLabel(course?: ApiCourse) {
  const profile = course?.teachers?.profiles
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  return name || 'Enseignant a confirmer'
}

function roomLabel(room?: ApiClassroom | null) {
  if (!room) return 'Lieu a confirmer'
  return [room.name, room.building].filter(Boolean).join(' - ') || 'Lieu a confirmer'
}

function bookingCount(exam: AvailableExam) {
  if (Array.isArray(exam.exam_bookings)) return exam.exam_bookings[0]?.count ?? 0
  return exam.exam_bookings?.count ?? 0
}

function formatDate(value?: string) {
  if (!value) return 'Date a confirmer'
  return format(new Date(value), "EEE d MMM yyyy 'a' HH:mm", { locale: fr })
}

function statusBadge(status: string) {
  switch (status) {
    case 'booked':
      return <Badge variant="success">Inscrit</Badge>
    case 'present':
      return <Badge variant="warning">Present</Badge>
    case 'graded':
      return <Badge variant="default">Note</Badge>
    case 'cancelled':
      return <Badge variant="destructive">Annule</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/2" />
          <Skeleton className="mt-4 h-9 w-32" />
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

function AvailableTab({
  exams,
  isLoading,
  onBook,
  actingId,
}: {
  exams: AvailableExam[]
  isLoading: boolean
  onBook: (id: string) => void
  actingId: string | null
}) {
  if (isLoading) return <LoadingList />
  if (exams.length === 0) {
    return <EmptyState title="Aucun appello disponible" detail="Les nouvelles sessions ouvertes apparaitront ici." />
  }

  return (
    <div className="space-y-3">
      {exams.map((exam) => {
        const course = courseLabel(exam.courses)
        const count = bookingCount(exam)
        const seatsLeft = exam.max_students === null ? null : Math.max(exam.max_students - count, 0)
        const closed = isPast(new Date(exam.registration_deadline))
        const full = seatsLeft === 0
        const disabled = Boolean(exam.is_booked || closed || full || actingId === exam.id)

        return (
          <article key={exam.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{course.code}</Badge>
                  <span className="text-xs text-muted-foreground">{course.cfu} CFU</span>
                </div>
                <h3 className="mt-2 font-semibold">{course.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{teacherLabel(exam.courses)}</p>
              </div>
              {exam.is_booked ? <Badge variant="success">Deja inscrit</Badge> : null}
            </div>

            <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <span>Date: {formatDate(exam.date)}</span>
              <span>Cloture: {formatDate(exam.registration_deadline)}</span>
              <span>Lieu: {roomLabel(exam.classrooms)}</span>
              <span>
                Places: {exam.max_students === null ? `${count} inscrits` : `${count}/${exam.max_students}`}
                {seatsLeft !== null ? `, ${seatsLeft} restantes` : ''}
              </span>
            </div>

            {exam.notes ? <p className="mt-3 text-sm text-muted-foreground">{exam.notes}</p> : null}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onBook(exam.id)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actingId === exam.id ? 'Inscription...' : "S'inscrire"}
              </button>
              {closed ? <span className="text-xs text-destructive">Inscriptions fermees</span> : null}
              {full ? <span className="text-xs text-destructive">Session complete</span> : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function BookingsTab({
  bookings,
  isLoading,
  onCancel,
  actingId,
}: {
  bookings: Booking[]
  isLoading: boolean
  onCancel: (examId: string) => void
  actingId: string | null
}) {
  if (isLoading) return <LoadingList />
  if (bookings.length === 0) {
    return <EmptyState title="Aucune prenotation active" detail="Inscris-toi a une session depuis l'onglet des appelli disponibles." />
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => {
        const exam = booking.exam_sessions
        const course = courseLabel(exam?.courses)
        const canCancel = booking.status === 'booked' && exam?.registration_deadline && !isPast(new Date(exam.registration_deadline))

        return (
          <article key={booking.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{course.code}</Badge>
                  {statusBadge(booking.status)}
                </div>
                <h3 className="mt-2 font-semibold">{course.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">Inscrit le {formatDate(booking.booked_at)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <span>Date: {formatDate(exam?.date)}</span>
              <span>Cloture: {formatDate(exam?.registration_deadline)}</span>
              <span>Lieu: {roomLabel(exam?.classrooms)}</span>
            </div>

            {canCancel && exam ? (
              <button
                type="button"
                disabled={actingId === exam.id}
                onClick={() => onCancel(exam.id)}
                className="mt-4 rounded-md border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actingId === exam.id ? 'Annulation...' : "Annuler l'inscription"}
              </button>
            ) : (
              <p className="mt-4 text-xs text-muted-foreground">Annulation non disponible pour cette prenotation.</p>
            )}
          </article>
        )
      })}
    </div>
  )
}

function GradesTab({
  grades,
  isLoading,
  onRespond,
  actingId,
}: {
  grades: PendingGrade[]
  isLoading: boolean
  onRespond: (gradeId: string, accept: boolean) => void
  actingId: string | null
}) {
  if (isLoading) return <LoadingList />
  if (grades.length === 0) {
    return <EmptyState title="Aucune note en attente" detail="Les notes proposees par tes enseignants apparaitront ici." />
  }

  return (
    <div className="space-y-3">
      {grades.map((grade) => {
        const course = courseLabel(grade.courses)
        const value = grade.is_honors ? '30L' : grade.value ?? '-'

        return (
          <article key={grade.id} className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge variant="outline">{course.code}</Badge>
                <h3 className="mt-2 font-semibold">{course.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Examen du {formatDate(grade.exam_sessions?.date)}
                </p>
              </div>
              <div className="rounded-lg border px-4 py-2 text-center">
                <p className="text-xs text-muted-foreground">Note proposee</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </div>

            {grade.notes ? <p className="mt-3 text-sm text-muted-foreground">{grade.notes}</p> : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={actingId === grade.id}
                onClick={() => onRespond(grade.id, true)}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Accepter
              </button>
              <button
                type="button"
                disabled={actingId === grade.id}
                onClick={() => onRespond(grade.id, false)}
                className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refuser
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function ExamsPage() {
  const [tab, setTab] = useState<Tab>('available')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const availableQuery = useAvailableExams()
  const bookingsQuery = useMyBookings()
  const gradesQuery = usePendingGrades()
  const bookExam = useBookExam()
  const cancelBooking = useCancelBooking()
  const respondToGrade = useRespondToGrade()

  const available = (availableQuery.data ?? []) as AvailableExam[]
  const bookings = (bookingsQuery.data ?? []) as Booking[]
  const grades = (gradesQuery.data ?? []) as PendingGrade[]

  const tabs = useMemo(() => [
    { key: 'available' as const, label: 'Appelli disponibili', count: available.length },
    { key: 'bookings' as const, label: 'Mes prenotations', count: bookings.length },
    { key: 'grades' as const, label: 'Notes proposees', count: grades.length },
  ], [available.length, bookings.length, grades.length])

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    window.setTimeout(() => setMessage(null), 3500)
  }

  async function handleBook(examId: string) {
    setActingId(examId)
    try {
      await bookExam.mutateAsync(examId)
      showMessage('success', 'Inscription enregistree.')
      setTab('bookings')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setActingId(null)
    }
  }

  async function handleCancel(examId: string) {
    setActingId(examId)
    try {
      await cancelBooking.mutateAsync(examId)
      showMessage('success', 'Prenotation annulee.')
      setTab('available')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Annulation impossible')
    } finally {
      setActingId(null)
    }
  }

  async function handleRespond(gradeId: string, accept: boolean) {
    setActingId(gradeId)
    try {
      await respondToGrade.mutateAsync({ gradeId, accept })
      showMessage('success', accept ? 'Note acceptee.' : 'Note refusee.')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Reponse impossible')
    } finally {
      setActingId(null)
    }
  }

  const isError = availableQuery.isError || bookingsQuery.isError || gradesQuery.isError

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Examens</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte les appelli ouverts, gere tes prenotations et reponds aux notes proposees.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 rounded-lg bg-muted p-1">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
            {item.count > 0 ? (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de charger toutes les donnees d'examens. Verifie ta session et l'API.
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      {tab === 'available' ? (
        <AvailableTab
          exams={available}
          isLoading={availableQuery.isLoading}
          onBook={handleBook}
          actingId={actingId}
        />
      ) : null}

      {tab === 'bookings' ? (
        <BookingsTab
          bookings={bookings}
          isLoading={bookingsQuery.isLoading}
          onCancel={handleCancel}
          actingId={actingId}
        />
      ) : null}

      {tab === 'grades' ? (
        <GradesTab
          grades={grades}
          isLoading={gradesQuery.isLoading}
          onRespond={handleRespond}
          actingId={actingId}
        />
      ) : null}
    </div>
  )
}
