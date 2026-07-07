export const DEFAULT_EXAM_CONFLICT_WINDOW_MINUTES = 120

export type ExistingExamBookingForRules = {
  id: string
  examSessionId: string
  courseId: string
  date: string
  status: string
}

export type ExamSessionForBookingRules = {
  id: string
  courseId: string
  date: string
  registrationDeadline: string
  maxStudents: number | null
}

export type BookingRuleInput = {
  exam: ExamSessionForBookingRules
  activeBookingsCount: number
  existingBooking?: { id: string; status: string } | null
  studentActiveBookings: ExistingExamBookingForRules[]
  now?: Date
  conflictWindowMinutes?: number
}

export function assertExamCanBeBooked(input: BookingRuleInput) {
  const now = input.now ?? new Date()
  const conflictWindowMinutes = input.conflictWindowMinutes ?? DEFAULT_EXAM_CONFLICT_WINDOW_MINUTES

  if (new Date(input.exam.registrationDeadline) < now) {
    throw new Error('La date limite de prenotation est depassee')
  }

  if (input.existingBooking?.status === 'booked') {
    throw new Error('Vous avez deja une prenotation active pour cet examen')
  }

  if (input.exam.maxStudents !== null && input.activeBookingsCount >= input.exam.maxStudents) {
    throw new Error('Aucune place disponible pour cet examen')
  }

  const requestedDate = new Date(input.exam.date).getTime()
  const conflictWindowMs = conflictWindowMinutes * 60 * 1000
  const conflictingBooking = input.studentActiveBookings.find((booking) => {
    if (booking.examSessionId === input.exam.id) return false
    const bookedDate = new Date(booking.date).getTime()
    return Math.abs(bookedDate - requestedDate) < conflictWindowMs
  })

  if (conflictingBooking) {
    throw new Error('Conflit horaire avec une autre prenotation active')
  }
}

export function assertExamBookingCanBeCancelled(registrationDeadline: string, now = new Date()) {
  if (new Date(registrationDeadline) < now) {
    throw new Error('Impossible d annuler apres la date limite')
  }
}
