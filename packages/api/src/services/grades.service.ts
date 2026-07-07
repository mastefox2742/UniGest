import { createClient } from '@supabase/supabase-js'
import { getTeacherIdByUserId } from './courses.service'
import {
  assertGradeCanBeEdited,
  assertGradeInputIsValid,
  assertVerbaleCanBePublished,
  type BookingGradeStateForRules,
} from './grade-rules'
import { createScenarioNotificationForStudent } from './notifications.service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface ProposeGradeInput {
  examSessionId: string
  bookingId:  string
  value:      number   // 18-30
  isHonors:   boolean  // true = 30L (value doit être 30)
  notes?:     string
}

/**
 * GET /api/teachers/exams/:examId/verbale
 * Verbale : toutes les prénotations + notes proposées
 */
export async function getVerbale(examSessionId: string) {
  const { data: session, error: se } = await supabase
    .from('exam_sessions')
    .select(`
      id, date, notes,
      courses!course_id(id, name, code, cfu,
        teachers!teacher_id(id, profiles!user_id(first_name, last_name))
      )
    `)
    .eq('id', examSessionId)
    .single()

  if (se || !session) throw new Error('Session introuvable')

  const { data: bookings, error: be } = await supabase
    .from('exam_bookings')
    .select(`
      id, status, booked_at,
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name, email)
      ),
      grades!exam_booking_id(
        id, value, is_honors, status, notes, accepted_at, rejected_at, published_at
      )
    `)
    .eq('exam_session_id', examSessionId)
    .order('booked_at', { ascending: true })

  if (be) throw new Error(be.message)

  return {
    session,
    bookings: bookings ?? [],
  }
}

/**
 * POST /api/teachers/exams/:examId/grades
 * L'enseignant propose une note pour un booking
 */
export async function proposeGrade(teacherUserId: string, input: ProposeGradeInput) {
  const teacherId = await getTeacherIdByUserId(teacherUserId)
  if (!teacherId) throw new Error('Enseignant introuvable')
  assertGradeInputIsValid({ value: input.value, isHonors: input.isHonors })

  // Validation de la note
  if (!input.isHonors && (input.value < 18 || input.value > 30)) {
    throw new Error('La note doit être comprise entre 18 et 30')
  }
  if (input.isHonors && input.value !== 30) {
    throw new Error('30L nécessite une note de 30')
  }

  // Récupérer le booking
  const { data: booking } = await supabase
    .from('exam_bookings')
    .select('id, student_id, exam_session_id, status')
    .eq('id', input.bookingId)
    .single()

  if (!booking) throw new Error('Prénotation introuvable')

  // Récupérer la session et le cours
  const { data: examSession } = await supabase
    .from('exam_sessions')
    .select('course_id, courses!course_id(id, cfu, teacher_id)')
    .eq('id', booking.exam_session_id)
    .single()

  if (!examSession) throw new Error('Session introuvable')

  const course = examSession.courses as any
  if (booking.exam_session_id !== input.examSessionId) {
    throw new Error('La prenotation ne correspond pas a cette session')
  }
  if (course.teacher_id !== teacherId) throw new Error('Non autorisé')

  // Créer ou mettre à jour la note
  const { data: existing } = await supabase
    .from('grades')
    .select('id, status')
    .eq('exam_booking_id', input.bookingId)
    .maybeSingle()

  assertGradeCanBeEdited(existing?.status)

  const gradePayload = {
    student_id:      booking.student_id,
    course_id:       course.id,
    exam_session_id: booking.exam_session_id,
    exam_booking_id: input.bookingId,
    value:           input.value,
    is_honors:       input.isHonors,
    cfu:             course.cfu,
    status:          'proposed' as const,
    proposed_by:     teacherId,
    notes:           input.notes ?? null,
  }

  let grade
  if (existing) {
    const { data, error } = await supabase
      .from('grades')
      .update({ value: gradePayload.value, is_honors: gradePayload.is_honors, notes: gradePayload.notes, status: 'proposed' })
      .eq('id', existing.id)
      .select()
      .single()
    if (error || !data) throw new Error('Impossible de mettre à jour la note')
    grade = data
  } else {
    const { data, error } = await supabase
      .from('grades')
      .insert(gradePayload)
      .select()
      .single()
    if (error || !data) throw new Error('Impossible de créer la note')
    grade = data
  }

  // Mettre à jour le statut de la prénotation → 'graded'
  await supabase
    .from('exam_bookings')
    .update({ status: 'graded' })
    .eq('id', input.bookingId)

  await createScenarioNotificationForStudent(booking.student_id, {
    topic: 'grade',
    event: 'status',
    message: 'Une nouvelle note est en attente de votre reponse.',
    link: '/student/exams',
  }).catch(err => console.error('[notifications] grade proposed:', err.message))

  return grade
}

/**
 * POST /api/teachers/exams/:examId/publish
 * Publier le verbale (toutes les notes proposées → published)
 * Immutable après publication
 */
export async function publishVerbale(examSessionId: string, teacherUserId: string) {
  const teacherId = await getTeacherIdByUserId(teacherUserId)
  if (!teacherId) throw new Error('Enseignant introuvable')

  // Vérifier propriété du cours
  const { data: session } = await supabase
    .from('exam_sessions')
    .select('courses!course_id(teacher_id)')
    .eq('id', examSessionId)
    .single()

  const { data: bookings, error: bookingsError } = await supabase
    .from('exam_bookings')
    .select(`
      id, status,
      grades!exam_booking_id(status)
    `)
    .eq('exam_session_id', examSessionId)

  if (bookingsError) throw new Error(bookingsError.message)

  assertVerbaleCanBePublished(((bookings ?? []) as any[]).map((booking): BookingGradeStateForRules => ({
    bookingId:     booking.id,
    bookingStatus: booking.status,
    gradeStatus:   booking.grades?.[0]?.status ?? null,
  })))

  const course = (session?.courses as any)
  if (!session || course?.teacher_id !== teacherId) throw new Error('Non autorisé')

  // Passer toutes les notes 'proposed' → 'published'
  const now = new Date().toISOString()
  const { data: affectedGrades } = await supabase
    .from('grades')
    .select('student_id')
    .eq('exam_session_id', examSessionId)
    .in('status', ['proposed', 'accepted'])
  const { error } = await supabase
    .from('grades')
    .update({ status: 'published', published_at: now })
    .eq('exam_session_id', examSessionId)
    .in('status', ['proposed', 'accepted'])

  if (error) throw new Error(error.message)

  await notifyPublishedGrades(affectedGrades ?? null)

  return { message: 'Verbale publié avec succès' }
}

/**
 * POST /api/students/me/grades/:gradeId/accept
 * L'étudiant accepte la note proposée
 */
async function notifyPublishedGrades(affectedGrades: Array<{ student_id: string }> | null) {
  for (const grade of affectedGrades ?? []) {
    await createScenarioNotificationForStudent(grade.student_id, {
      topic: 'grade',
      event: 'status',
      message: 'Une note a ete publiee dans votre libretto.',
      link: '/student/libretto',
    }).catch(err => console.error('[notifications] grade published:', err.message))
  }
}

export async function acceptGrade(gradeId: string, studentUserId: string) {
  // Récupérer l'étudiant
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) throw new Error('Étudiant introuvable')

  const { data: grade } = await supabase
    .from('grades')
    .select('id, student_id, status')
    .eq('id', gradeId)
    .eq('student_id', student.id)
    .single()

  if (!grade) throw new Error('Note introuvable')
  if (grade.status !== 'proposed') throw new Error('Cette note ne peut pas être acceptée')

  const { data, error } = await supabase
    .from('grades')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', gradeId)
    .select()
    .single()

  if (error || !data) throw new Error('Impossible d\'accepter la note')
  return data
}

/**
 * POST /api/students/me/grades/:gradeId/refuse
 * L'étudiant refuse la note proposée
 */
export async function refuseGrade(gradeId: string, studentUserId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) throw new Error('Étudiant introuvable')

  const { data: grade } = await supabase
    .from('grades')
    .select('id, student_id, status')
    .eq('id', gradeId)
    .eq('student_id', student.id)
    .single()

  if (!grade) throw new Error('Note introuvable')
  if (grade.status !== 'proposed') throw new Error('Cette note ne peut pas être refusée')

  const { error } = await supabase
    .from('grades')
    .update({ status: 'rejected', rejected_at: new Date().toISOString() })
    .eq('id', gradeId)

  if (error) throw new Error(error.message)
}

/**
 * GET /api/students/me/grades/pending
 * Notes proposées en attente d'acceptation par l'étudiant
 */
export async function getStudentPendingGrades(studentUserId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) return []

  const { data, error } = await supabase
    .from('grades')
    .select(`
      id, value, is_honors, status, notes, created_at,
      courses!course_id(name, code, cfu),
      exam_sessions!exam_session_id(date)
    `)
    .eq('student_id', student.id)
    .eq('status', 'proposed')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}
