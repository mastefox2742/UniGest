export type CareerGradeForRules = {
  grade: string
  cfu: number
}

export function numericGrade(grade: string): number {
  if (grade === '30L') return 30
  const value = Number(grade)
  return Number.isFinite(value) ? value : 0
}

export function passedCareerGrades(entries: CareerGradeForRules[]) {
  return entries.filter((entry) => numericGrade(entry.grade) >= 18 && entry.cfu > 0)
}

export function arithmeticMean(entries: CareerGradeForRules[]) {
  const passed = passedCareerGrades(entries)
  if (passed.length === 0) return 0
  return passed.reduce((sum, entry) => sum + numericGrade(entry.grade), 0) / passed.length
}

export function weightedMean(entries: CareerGradeForRules[]) {
  const passed = passedCareerGrades(entries)
  const totalCfu = passed.reduce((sum, entry) => sum + entry.cfu, 0)
  if (totalCfu === 0) return 0
  const weightedSum = passed.reduce((sum, entry) => sum + numericGrade(entry.grade) * entry.cfu, 0)
  return weightedSum / totalCfu
}

export function cfuEarned(entries: CareerGradeForRules[]) {
  return passedCareerGrades(entries).reduce((sum, entry) => sum + entry.cfu, 0)
}

export function cfuProgress(earned: number, total: number) {
  if (total <= 0) return 0
  return Math.min(100, Math.round((earned / total) * 1000) / 10)
}

export function laureaStartScore(weightedAverage: number) {
  if (weightedAverage <= 0) return 0
  return weightedAverage * (11 / 3)
}
