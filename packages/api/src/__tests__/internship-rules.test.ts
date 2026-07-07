import { describe, expect, it, vi } from 'vitest'
import {
  assertEvaluationScore,
  assertInternshipDates,
  assertInternshipTransition,
  assertOpportunityCanReceiveApplications,
  assertReportCanBeSubmitted,
} from '../services/internship-rules'

describe('internship-rules', () => {
  it('allows applications only for open opportunities before deadline', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T10:00:00Z'))

    expect(() => assertOpportunityCanReceiveApplications({
      status: 'open',
      applicationDeadline: '2026-07-10',
    })).not.toThrow()

    expect(() => assertOpportunityCanReceiveApplications({
      status: 'draft',
      applicationDeadline: '2026-07-10',
    })).toThrow('pas ouverte')

    expect(() => assertOpportunityCanReceiveApplications({
      status: 'open',
      applicationDeadline: '2026-07-01',
    })).toThrow('depassee')

    vi.useRealTimers()
  })

  it('validates internship date ranges', () => {
    expect(() => assertInternshipDates('2026-07-01', '2026-08-31')).not.toThrow()
    expect(() => assertInternshipDates('2026-09-01', '2026-08-31')).toThrow('date de fin')
  })

  it('guards application status transitions', () => {
    expect(() => assertInternshipTransition('submitted', 'approved')).not.toThrow()
    expect(() => assertInternshipTransition('approved', 'in_progress')).not.toThrow()
    expect(() => assertInternshipTransition('report_submitted', 'evaluated')).not.toThrow()
    expect(() => assertInternshipTransition('submitted', 'evaluated')).toThrow('Transition stage invalide')
    expect(() => assertInternshipTransition('closed', 'approved')).toThrow('Transition stage invalide')
  })

  it('allows reports only after approval or start', () => {
    expect(() => assertReportCanBeSubmitted('approved')).not.toThrow()
    expect(() => assertReportCanBeSubmitted('in_progress')).not.toThrow()
    expect(() => assertReportCanBeSubmitted('submitted')).toThrow('rapport')
  })

  it('validates evaluation scores', () => {
    expect(() => assertEvaluationScore(30)).not.toThrow()
    expect(() => assertEvaluationScore(18)).not.toThrow()
    expect(() => assertEvaluationScore(31)).toThrow('entre 0 et 30')
    expect(() => assertEvaluationScore(18.5)).toThrow('entre 0 et 30')
  })
})
