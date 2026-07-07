import { describe, expect, it } from 'vitest'
import {
  assertDiplomaCanBeIssued,
  assertGraduationStatus,
  assertGraduationTransition,
  deriveJuryStatus,
  evaluateGraduationEligibility,
} from '../services/graduation-rules'

describe('graduation-rules', () => {
  it('evaluates eligible applications', () => {
    expect(evaluateGraduationEligibility({
      cfuAcquired: 180,
      cfuRequired: 180,
      balanceDue: 0,
      thesisSubmitted: true,
    })).toEqual({ eligible: true, status: 'eligible', reasons: [] })
  })

  it('lists blocking prerequisites', () => {
    const result = evaluateGraduationEligibility({
      cfuAcquired: 170,
      cfuRequired: 180,
      balanceDue: 42,
      thesisSubmitted: false,
    })

    expect(result.eligible).toBe(false)
    expect(result.status).toBe('blocked')
    expect(result.reasons).toHaveLength(3)
  })

  it('validates statuses and transitions', () => {
    expect(() => assertGraduationStatus('eligible')).not.toThrow()
    expect(() => assertGraduationStatus('draft')).toThrow('invalide')
    expect(() => assertGraduationTransition('eligible', 'jury_incomplete')).not.toThrow()
    expect(() => assertGraduationTransition('pending', 'diploma_issued')).toThrow('Transition graduation invalide')
  })

  it('derives jury status from member count', () => {
    expect(deriveJuryStatus(0)).toBe('eligible')
    expect(deriveJuryStatus(1)).toBe('jury_incomplete')
    expect(deriveJuryStatus(3)).toBe('jury_complete')
  })

  it('guards diploma issuance', () => {
    expect(() => assertDiplomaCanBeIssued({
      cfuAcquired: 180,
      cfuRequired: 180,
      balanceDue: 0,
      juryCount: 3,
      defenseDate: '2026-07-10',
      status: 'defended',
    })).not.toThrow()

    expect(() => assertDiplomaCanBeIssued({
      cfuAcquired: 180,
      cfuRequired: 180,
      balanceDue: 1,
      juryCount: 3,
      defenseDate: '2026-07-10',
      status: 'defended',
    })).toThrow('Solde impaye')
  })
})
