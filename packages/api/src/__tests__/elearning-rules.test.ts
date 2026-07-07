import { describe, expect, it } from 'vitest'
import {
  assertAssignmentSubmissionInput,
  assertAnnouncementInput,
  normalizeProgressPct,
  summarizeMaterialProgress,
} from '../services/elearning-rules'

describe('elearning-rules', () => {
  it('normalizes progress percentages', () => {
    expect(normalizeProgressPct(-10)).toBe(0)
    expect(normalizeProgressPct(42.6)).toBe(43)
    expect(normalizeProgressPct(140)).toBe(100)
    expect(normalizeProgressPct(Number.NaN)).toBe(0)
  })

  it('summarizes material completion', () => {
    expect(summarizeMaterialProgress([
      { completed: true, progress_pct: 100 },
      { completed: false, progress_pct: 30 },
      { completed: true, progress_pct: 90 },
    ])).toEqual({
      total: 3,
      completed: 2,
      progressPct: 67,
      averageProgress: 73,
    })
  })

  it('handles empty progress summaries', () => {
    expect(summarizeMaterialProgress([])).toEqual({
      total: 0,
      completed: 0,
      progressPct: 0,
      averageProgress: 0,
    })
  })

  it('validates announcements', () => {
    expect(() => assertAnnouncementInput({ title: 'Info', body: 'Cours reporte.' })).not.toThrow()
    expect(() => assertAnnouncementInput({ title: '', body: 'Texte' })).toThrow('Titre')
    expect(() => assertAnnouncementInput({ title: 'Info', body: '' })).toThrow('Message')
  })

  it('validates assignment submissions', () => {
    expect(() => assertAssignmentSubmissionInput({ content: 'Mon rendu' })).not.toThrow()
    expect(() => assertAssignmentSubmissionInput({ content: '' })).toThrow('Contenu')
  })
})
