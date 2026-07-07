import { createClient } from '@supabase/supabase-js'
import { getTeacherIdByUserId } from './courses.service'
import {
  assertExamBookingCanBeCancelled,
  assertExamCanBeBooked,
  type ExistingExamBookingForRules,
} from './exam-booking-rules'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface CreateExamSessionInput {
  courseId:             string
  date:                 string   // ISO datetime
  registrationDeadline: string   // ISO datetime
  classroomId?:         string
  maxStudents?:         number
  notes?:               string
}

function normalizeCreateExamSessionInput(input: CreateExamSessionInput) {
  const examDate = new Date(input.date)
  const registrationDeadline = new Date(input.registrationDeadline)

  if (Number.isNaN(examDate.getTime())) throw new Error('Date d examen invalide')
  if (Number.isNaN(registrationDeadline.getTime())) throw new Error('Deadline de prenotation invalide')
  if (registrationDeadline >= examDate) {
    throw new Error('La deadline de prenotation doit preceder la date de l examen')
  }
  if (input.maxStudents !== undefined && input.maxStudents < 1) {
    throw new Error('maxStudents doit etre superieur a 0')
  }
}

/**
 * POST /api/teachers/courses/:id/exams
 * Créer un appello d'examen
 */
export async function createExamSession(teacherUserId: string, input: CreateExamSessionInput) {
  normalizeCreateExamSessionInput(input)

  // Vérifier que le cours appartient bien à cet enseignant
  const teacherId = await getTeacherIdByUserId(teacherUserId)
  if (!teacherId) throw new Error('Enseignant introuvable')

  const { data: course } = await supabase
    .from('courses')
    .select('id, teacher_id')
    .eq('id', input.courseId)
    .eq('teacher_id', teacherId)
    .single()

  if (!course) throw new Error('Cours introuvable ou non autorisé')

  // Récupérer l'année académique courante
  const { data: year } = await supabase
    .from('academic_years')
    .select('id')
    .eq('is_current', true)
    .single()

  if (!year) throw new Error('Aucune année académique courante')

  const { data, error } = await supabase
    .from('exam_sessions')
    .insert({
      course_id:             input.courseId,
      academic_year_id:      year.id,
      date:                  input.date,
      registration_deadline: input.registrationDeadline,
      classroom_id:          input.classroomId ?? null,
      max_students:          input.maxStudents ?? null,
      notes:                 input.notes ?? null,
    })
    .select()
    .single()

  if (error || !data) throw new Error('Impossible de créer la session d\'examen')
  return data
}

/**
 * GET /api/teachers/courses/:id/exams
 * Sessions d'examen d'un cours (avec compteurs de réservations)
 */
export async function getExamsByCourse(courseId: string) {
  const { data, error } = await supabase
    .from('exam_sessions')
    .select(`
      id, date, registration_deadline, max_students, notes, created_at,
      classrooms!classroom_id(name, building),
      exam_bookings(count)
    `)
    .eq('course_id', courseId)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * GET /api/teachers/exams/:examId/bookings
 * Liste des prénotations pour une session (verbale)
 */
export async function getBookingsByExam(examSessionId: string) {
  const { data, error } = await supabase
    .from('exam_bookings')
    .select(`
      id, status, booked_at,
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name, email)
      ),
      grades!exam_booking_id(
        id, value, is_honors, status, notes
      )
    `)
    .eq('exam_session_id', examSessionId)
    .order('booked_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * POST /api/students/me/exams/:examId/book
 * Prénotation d'un examen par un étudiant
 */
export async function bookExam(studentUserId: string, examSessionId: string) {
  // Récupérer l'étudiant
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) throw new Error('Étudiant introuvable')

  // Vérifier que la deadline n'est pas dépassée
  const { data: exam } = await supabase
    .from('exam_sessions')
    .select('id, date, registration_deadline, max_students, course_id')
    .eq('id', examSessionId)
    .single()

  if (!exam) throw new Error('Session d\'examen introuvable')

  // Vérifier les places disponibles
  let activeBookingsCount = 0
  if (exam.max_students) {
    const { count } = await supabase
      .from('exam_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('exam_session_id', examSessionId)
      .eq('status', 'booked')

    activeBookingsCount = count ?? 0
  }

  // Créer la prénotation (ou réactiver si annulée)
  const { data: existing } = await supabase
    .from('exam_bookings')
    .select('id, status')
    .eq('student_id', student.id)
    .eq('exam_session_id', examSessionId)
    .maybeSingle()

  const { data: activeBookings, error: activeBookingsError } = await supabase
    .from('exam_bookings')
    .select(`
      id, status, exam_session_id,
      exam_sessions!exam_session_id(id, date, course_id)
    `)
    .eq('student_id', student.id)
    .eq('status', 'booked')

  if (activeBookingsError) throw new Error(activeBookingsError.message)

  assertExamCanBeBooked({
    exam: {
      id:                   exam.id,
      courseId:             exam.course_id,
      date:                 exam.date,
      registrationDeadline: exam.registration_deadline,
      maxStudents:          exam.max_students,
    },
    activeBookingsCount,
    existingBooking: existing,
    studentActiveBookings: ((activeBookings ?? []) as any[]).map((booking): ExistingExamBookingForRules => ({
      id:            booking.id,
      status:        booking.status,
      examSessionId: booking.exam_session_id,
      courseId:      booking.exam_sessions?.course_id ?? '',
      date:          booking.exam_sessions?.date ?? '',
    })),
  })

  if (existing) {
    // Réactiver
    const { data, error } = await supabase
      .from('exam_bookings')
      .update({ status: 'booked', booked_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error || !data) throw new Error('Impossible de réserver')
    return data
  }

  const { data, error } = await supabase
    .from('exam_bookings')
    .insert({
      student_id:      student.id,
      exam_session_id: examSessionId,
      status:          'booked',
    })
    .select()
    .single()

  if (error || !data) throw new Error('Impossible de créer la prénotation')
  return data
}

/**
 * DELETE /api/students/me/exams/:examId/book
 * Annulation d'une prénotation
 */
export async function cancelBooking(studentUserId: string, examSessionId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) throw new Error('Étudiant introuvable')

  const { data: exam } = await supabase
    .from('exam_sessions')
    .select('registration_deadline')
    .eq('id', examSessionId)
    .single()

  if (!exam) throw new Error('Session introuvable')

  assertExamBookingCanBeCancelled(exam.registration_deadline)

  const { error } = await supabase
    .from('exam_bookings')
    .update({ status: 'cancelled' })
    .eq('student_id', student.id)
    .eq('exam_session_id', examSessionId)
    .eq('status', 'booked')

  if (error) throw new Error(error.message)
}

/**
 * GET /api/students/me/exams/available
 * Examens disponibles à la prénotation pour l'étudiant
 */
export async function getStudentAvailableExams(studentUserId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id, degree_program_id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) return []

  const now = new Date().toISOString()

  // Examens des cours du programme de l'étudiant, avec deadline non dépassée
  const { data, error } = await supabase
    .from('exam_sessions')
    .select(`
      id, date, registration_deadline, max_students, notes,
      courses!course_id(
        id, name, code, year, semester, cfu,
        degree_program_id,
        teachers!teacher_id(
          profiles!user_id(first_name, last_name)
        )
      ),
      classrooms!classroom_id(name, building),
      exam_bookings!inner(count)
    `)
    .gte('registration_deadline', now)
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)

  // Filtrer sur le degree_program de l'étudiant
  const filtered = (data ?? []).filter((es: any) =>
    es.courses?.degree_program_id === student.degree_program_id,
  )

  // Récupérer les prénotations déjà actives de l'étudiant
  const { data: myBookings } = await supabase
    .from('exam_bookings')
    .select('exam_session_id')
    .eq('student_id', student.id)
    .eq('status', 'booked')

  const bookedIds = new Set((myBookings ?? []).map((b: any) => b.exam_session_id))

  return filtered.map((es: any) => ({
    ...es,
    is_booked: bookedIds.has(es.id),
  }))
}

/**
 * GET /api/students/me/exams/bookings
 * Prénotations actives de l'étudiant
 */
export async function getStudentBookings(studentUserId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) return []

  const { data, error } = await supabase
    .from('exam_bookings')
    .select(`
      id, status, booked_at,
      exam_sessions!exam_session_id(
        id, date, registration_deadline, notes,
        courses!course_id(name, code, cfu),
        classrooms!classroom_id(name, building)
      )
    `)
    .eq('student_id', student.id)
    .in('status', ['booked', 'present', 'graded'])
    .order('booked_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}
