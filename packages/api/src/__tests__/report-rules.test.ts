import { describe, expect, it } from 'vitest'
import { average, groupCount, percentage, withPercentages } from '../services/report-rules'

describe('report-rules', () => {
  it('calculates rounded percentages', () => {
    expect(percentage(1, 3)).toBe(33.3)
    expect(percentage(0, 0)).toBe(0)
  })

  it('calculates averages', () => {
    expect(average([10, 15, 20])).toBe(15)
    expect(average([])).toBe(0)
  })

  it('groups counts with fallback labels', () => {
    expect(groupCount([{ s: 'a' }, { s: 'a' }, { s: null }], item => item.s)).toEqual([
      { label: 'a', count: 2 },
      { label: 'Non renseigne', count: 1 },
    ])
  })

  it('adds percentages to grouped rows', () => {
    expect(withPercentages([{ label: 'A', count: 2 }, { label: 'B', count: 1 }])).toEqual([
      { label: 'A', count: 2, pct: 66.7 },
      { label: 'B', count: 1, pct: 33.3 },
    ])
  })
})
