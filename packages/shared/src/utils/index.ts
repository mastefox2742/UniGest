import type { Grade } from '../types'
import { GRADE_MIN, GRADE_MAX } from '../constants'

/**
 * Calculate GPA (weighted average on 30-point scale) from grades.
 * Only includes accepted/published grades.
 */
export function calculateGPA(grades: Grade[]): number {
  const valid = grades.filter(
    (g) => g.status === 'accepted' || g.status === 'published',
  )
  if (valid.length === 0) return 0

  const totalWeighted = valid.reduce((sum, g) => {
    const value = g.value === 'honors' ? 30 : g.value
    return sum + value * g.cfu
  }, 0)

  const totalCfu = valid.reduce((sum, g) => sum + g.cfu, 0)
  return totalCfu > 0 ? Math.round((totalWeighted / totalCfu) * 100) / 100 : 0
}

/**
 * Format a grade value for display (e.g. 30 → "30", honors → "30L").
 */
export function formatGrade(value: number | 'honors'): string {
  return value === 'honors' ? '30L' : String(value)
}

/**
 * Check if a numeric grade is passing.
 */
export function isPassingGrade(value: number | 'honors'): boolean {
  return value === 'honors' || value >= GRADE_MIN
}

/**
 * Validate a grade value (18–30 or honors).
 */
export function isValidGrade(value: number | 'honors'): boolean {
  if (value === 'honors') return true
  return Number.isInteger(value) && value >= GRADE_MIN && value <= GRADE_MAX
}

/**
 * Calculate the total amount due for a student (pending + overdue fees).
 */
export function amountDue(
  fees: Array<{ amount: number; status: string }>,
): number {
  return fees
    .filter((f) => f.status === 'pending' || f.status === 'overdue')
    .reduce((sum, f) => sum + f.amount, 0)
}

/**
 * Calculate CFU progress as a percentage.
 */
export function cfuProgress(earned: number, total: number): number {
  if (total === 0) return 0
  return Math.min(Math.round((earned / total) * 100), 100)
}

/**
 * Generate a matricola (student ID) based on enrollment year and sequence.
 * Format: YYSSS (e.g. 24001 for year 2024, first student)
 */
export function generateMatricola(year: number, sequence: number): string {
  const yy = String(year).slice(-2)
  const seq = String(sequence).padStart(5, '0')
  return `${yy}${seq}`
}

/**
 * Format academic year (e.g. 2024 → "2024/2025").
 */
export function formatAcademicYear(startYear: number): string {
  return `${startYear}/${startYear + 1}`
}
