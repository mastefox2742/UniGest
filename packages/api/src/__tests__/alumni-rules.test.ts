import { describe, expect, it, vi } from 'vitest'
import {
  assertEmploymentSurveyIsValid,
  employmentOutcome,
  normalizeSalaryRange,
} from '../services/alumni-rules'

describe('alumni-rules', () => {
  it('requires job information for employed alumni', () => {
    expect(() => assertEmploymentSurveyIsValid({
      employmentStatus: 'employed',
      companyName: 'ACME',
    })).not.toThrow()

    expect(() => assertEmploymentSurveyIsValid({
      employmentStatus: 'employed',
    })).toThrow('Entreprise ou poste requis')
  })

  it('rejects future employment dates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T10:00:00Z'))

    expect(() => assertEmploymentSurveyIsValid({
      employmentStatus: 'self_employed',
      jobTitle: 'Consultant',
      employedAt: '2026-07-01',
    })).not.toThrow()

    expect(() => assertEmploymentSurveyIsValid({
      employmentStatus: 'self_employed',
      jobTitle: 'Consultant',
      employedAt: '2026-08-01',
    })).toThrow('future')

    vi.useRealTimers()
  })

  it('normalizes salary ranges', () => {
    expect(normalizeSalaryRange(' 30-40K ')).toBe('30-40k')
    expect(normalizeSalaryRange()).toBeNull()
    expect(() => normalizeSalaryRange('100-200')).toThrow('salariale')
  })

  it('summarizes placement outcomes', () => {
    expect(employmentOutcome([
      { employmentStatus: 'employed' },
      { employmentStatus: 'self_employed' },
      { employmentStatus: 'seeking' },
      { employmentStatus: 'continuing_studies' },
    ])).toEqual({
      total: 4,
      employed: 2,
      continuingStudies: 1,
      seeking: 1,
      employmentRate: 50,
    })
  })
})
