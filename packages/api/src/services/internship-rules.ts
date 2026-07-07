export type InternshipApplicationStatus =
  | 'submitted'
  | 'approved'
  | 'in_progress'
  | 'report_submitted'
  | 'evaluated'
  | 'closed'
  | 'refused'

export type InternshipOpportunityStatus = 'draft' | 'open' | 'closed'

const APPLICATION_TRANSITIONS: Record<InternshipApplicationStatus, InternshipApplicationStatus[]> = {
  submitted: ['approved', 'refused'],
  approved: ['in_progress', 'refused'],
  in_progress: ['report_submitted', 'closed'],
  report_submitted: ['evaluated'],
  evaluated: ['closed'],
  closed: [],
  refused: [],
}

export function assertOpportunityCanReceiveApplications(input: {
  status: InternshipOpportunityStatus
  applicationDeadline?: string | null
}) {
  if (input.status !== 'open') {
    throw new Error('Cette offre de stage n est pas ouverte')
  }

  if (input.applicationDeadline) {
    const deadline = new Date(input.applicationDeadline)
    if (Number.isNaN(deadline.getTime())) throw new Error('Date limite de candidature invalide')
    if (deadline.getTime() < Date.now()) {
      throw new Error('La date limite de candidature est depassee')
    }
  }
}

export function assertInternshipDates(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Dates de stage invalides')
  }
  if (start.getTime() > end.getTime()) {
    throw new Error('La date de fin doit suivre la date de debut')
  }
}

export function assertInternshipTransition(
  current: InternshipApplicationStatus,
  next: InternshipApplicationStatus,
) {
  if (current === next) return
  if (!APPLICATION_TRANSITIONS[current]?.includes(next)) {
    throw new Error(`Transition stage invalide: ${current} -> ${next}`)
  }
}

export function assertReportCanBeSubmitted(status: InternshipApplicationStatus) {
  if (status !== 'in_progress' && status !== 'approved') {
    throw new Error('Le rapport ne peut etre soumis que pour un stage approuve ou en cours')
  }
}

export function assertEvaluationScore(score: number) {
  if (!Number.isInteger(score) || score < 0 || score > 30) {
    throw new Error('La note d evaluation doit etre un entier entre 0 et 30')
  }
}
