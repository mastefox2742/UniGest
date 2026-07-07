import { describe, expect, it } from 'vitest'
import {
  arithmeticMean,
  cfuEarned,
  cfuProgress,
  laureaStartScore,
  numericGrade,
  weightedMean,
} from '../services/career-rules'

describe('career rules', () => {
  const entries = [
    { grade: '30L', cfu: 6 },
    { grade: '24', cfu: 12 },
    { grade: '17', cfu: 9 },
    { grade: '', cfu: 6 },
  ]

  it('normalizes grades including 30L', () => {
    expect(numericGrade('30L')).toBe(30)
    expect(numericGrade('28')).toBe(28)
    expect(numericGrade('')).toBe(0)
  })

  it('computes arithmetic mean on passed grades only', () => {
    expect(arithmeticMean(entries)).toBe(27)
  })

  it('computes weighted mean by CFU on passed grades only', () => {
    expect(weightedMean(entries)).toBe(26)
  })

  it('computes earned CFU on passed grades only', () => {
    expect(cfuEarned(entries)).toBe(18)
  })

  it('computes progress percentage with one decimal', () => {
    expect(cfuProgress(39, 180)).toBe(21.7)
    expect(cfuProgress(20, 0)).toBe(0)
  })

  it('computes laurea start score on 110 scale', () => {
    expect(laureaStartScore(27)).toBe(99)
  })
})
