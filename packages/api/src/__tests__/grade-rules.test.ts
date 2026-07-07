import { describe, expect, it } from 'vitest'
import {
  assertGradeCanBeEdited,
  assertGradeInputIsValid,
  assertVerbaleCanBePublished,
} from '../services/grade-rules'

describe('grade rules', () => {
  it('accepts a regular passing grade', () => {
    expect(() => assertGradeInputIsValid({ value: 24, isHonors: false })).not.toThrow()
  })

  it('rejects grades outside 18-30', () => {
    expect(() => assertGradeInputIsValid({ value: 17, isHonors: false })).toThrow('18 et 30')
    expect(() => assertGradeInputIsValid({ value: 31, isHonors: false })).toThrow('18 et 30')
  })

  it('rejects honors unless value is 30', () => {
    expect(() => assertGradeInputIsValid({ value: 29, isHonors: true })).toThrow('30L')
  })

  it('rejects editing accepted or published grades', () => {
    expect(() => assertGradeCanBeEdited('accepted')).toThrow('acceptee')
    expect(() => assertGradeCanBeEdited('published')).toThrow('publiee')
  })

  it('allows publishing proposed and accepted grades', () => {
    expect(() => assertVerbaleCanBePublished([
      { bookingId: 'b1', bookingStatus: 'graded', gradeStatus: 'proposed' },
      { bookingId: 'b2', bookingStatus: 'graded', gradeStatus: 'accepted' },
    ])).not.toThrow()
  })

  it('rejects publishing when an active booking has no grade', () => {
    expect(() => assertVerbaleCanBePublished([
      { bookingId: 'b1', bookingStatus: 'booked', gradeStatus: null },
    ])).toThrow('doivent avoir une note')
  })

  it('rejects publishing rejected grades', () => {
    expect(() => assertVerbaleCanBePublished([
      { bookingId: 'b1', bookingStatus: 'graded', gradeStatus: 'rejected' },
    ])).toThrow('note refusee')
  })

  it('rejects publishing an already published verbale', () => {
    expect(() => assertVerbaleCanBePublished([
      { bookingId: 'b1', bookingStatus: 'graded', gradeStatus: 'published' },
    ])).toThrow('deja publie')
  })
})
