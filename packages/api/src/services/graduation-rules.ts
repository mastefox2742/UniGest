export const GRADUATION_STATUSES = [
  'pending',
  'eligible',
  'jury_incomplete',
  'jury_complete',
  'defended',
  'diploma_issued',
  'blocked',
] as const

export type GraduationStatus = typeof GRADUATION_STATUSES[number]

export interface GraduationPrerequisites {
  cfuAcquired: number
  cfuRequired: number
  balanceDue: number
  thesisSubmitted: boolean
}

export interface GraduationEligibility {
  eligible: boolean
  status: GraduationStatus
  reasons: string[]
}

const STATUS_SET = new Set<string>(GRADUATION_STATUSES)

const ALLOWED_TRANSITIONS: Record<GraduationStatus, GraduationStatus[]> = {
  pending: ['eligible', 'blocked'],
  eligible: ['jury_incomplete', 'jury_complete', 'blocked'],
  jury_incomplete: ['eligible', 'jury_complete', 'blocked'],
  jury_complete: ['defended', 'blocked'],
  defended: ['diploma_issued'],
  diploma_issued: [],
  blocked: ['pending', 'eligible'],
}

export function assertGraduationStatus(status: string): asserts status is GraduationStatus {
  if (!STATUS_SET.has(status)) {
    throw new Error('Statut de graduation invalide')
  }
}

export function evaluateGraduationEligibility(input: GraduationPrerequisites): GraduationEligibility {
  const reasons: string[] = []

  if (input.cfuAcquired < input.cfuRequired) {
    reasons.push(`CFU insuffisants: ${input.cfuAcquired}/${input.cfuRequired}`)
  }

  if (input.balanceDue > 0) {
    reasons.push(`Solde impaye: ${input.balanceDue.toFixed(2)}`)
  }

  if (!input.thesisSubmitted) {
    reasons.push('These non soumise')
  }

  return {
    eligible: reasons.length === 0,
    status: reasons.length === 0 ? 'eligible' : 'blocked',
    reasons,
  }
}

export function assertGraduationTransition(current: GraduationStatus, next: GraduationStatus) {
  if (current === next) return
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new Error(`Transition graduation invalide: ${current} -> ${next}`)
  }
}

export function deriveJuryStatus(memberCount: number): GraduationStatus {
  if (memberCount >= 3) return 'jury_complete'
  if (memberCount > 0) return 'jury_incomplete'
  return 'eligible'
}

export function assertDiplomaCanBeIssued(input: {
  cfuAcquired: number
  cfuRequired: number
  balanceDue: number
  juryCount: number
  defenseDate?: string | null
  status: GraduationStatus
}) {
  if (input.status === 'diploma_issued') throw new Error('Diplome deja emis')
  if (input.status !== 'defended' && input.status !== 'jury_complete') {
    throw new Error('La demande doit etre soutenue ou prete pour emission')
  }
  if (input.cfuAcquired < input.cfuRequired) throw new Error('CFU insuffisants')
  if (input.balanceDue > 0) throw new Error('Solde impaye')
  if (input.juryCount < 3) throw new Error('Jury incomplet (minimum 3 membres)')
  if (!input.defenseDate) throw new Error('Date de soutenance non fixee')
}
