export type GradeStatusForRules = 'proposed' | 'accepted' | 'rejected' | 'published'

export type GradeInputForRules = {
  value: number
  isHonors: boolean
}

export type BookingGradeStateForRules = {
  bookingId: string
  bookingStatus: string
  gradeStatus?: GradeStatusForRules | null
}

export function assertGradeInputIsValid(input: GradeInputForRules) {
  if (!Number.isInteger(input.value)) {
    throw new Error('La note doit etre un entier')
  }
  if (input.value < 18 || input.value > 30) {
    throw new Error('La note doit etre comprise entre 18 et 30')
  }
  if (input.isHonors && input.value !== 30) {
    throw new Error('30L necessite une note de 30')
  }
}

export function assertGradeCanBeEdited(existingStatus?: string | null) {
  if (existingStatus === 'published') {
    throw new Error('Une note publiee ne peut plus etre modifiee')
  }
  if (existingStatus === 'accepted') {
    throw new Error('Une note acceptee par l etudiant ne peut plus etre modifiee')
  }
}

export function assertVerbaleCanBePublished(bookings: BookingGradeStateForRules[]) {
  const activeBookings = bookings.filter((booking) =>
    ['booked', 'present', 'graded'].includes(booking.bookingStatus),
  )

  if (activeBookings.length === 0) {
    throw new Error('Aucune prenotation active a publier')
  }

  const missingGrade = activeBookings.find((booking) => !booking.gradeStatus)
  if (missingGrade) {
    throw new Error('Toutes les prenotations actives doivent avoir une note')
  }

  const rejectedGrade = activeBookings.find((booking) => booking.gradeStatus === 'rejected')
  if (rejectedGrade) {
    throw new Error('Le verbale contient une note refusee')
  }

  const alreadyPublished = activeBookings.every((booking) => booking.gradeStatus === 'published')
  if (alreadyPublished) {
    throw new Error('Le verbale est deja publie')
  }
}
