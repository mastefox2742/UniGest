export type AlumniEmploymentStatus =
  | 'seeking'
  | 'employed'
  | 'self_employed'
  | 'continuing_studies'
  | 'not_available'

export interface PlacementSurveyInput {
  employmentStatus: AlumniEmploymentStatus
  companyName?: string | null
  jobTitle?: string | null
  contractType?: string | null
  salaryRange?: string | null
  employedAt?: string | null
}

export function assertEmploymentSurveyIsValid(input: PlacementSurveyInput) {
  if (input.employmentStatus === 'employed' || input.employmentStatus === 'self_employed') {
    if (!input.companyName && !input.jobTitle) {
      throw new Error('Entreprise ou poste requis pour un alumni en emploi')
    }
  }

  if (input.employedAt) {
    const employedAt = new Date(input.employedAt)
    if (Number.isNaN(employedAt.getTime())) throw new Error('Date emploi invalide')
    if (employedAt.getTime() > Date.now()) throw new Error('La date emploi ne peut pas etre future')
  }
}

export function normalizeSalaryRange(value?: string | null) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  const allowed = ['<20k', '20-30k', '30-40k', '40-60k', '60k+', 'non_disclosed']
  if (!allowed.includes(normalized)) {
    throw new Error('Tranche salariale invalide')
  }
  return normalized
}

export function employmentOutcome(rows: Array<{ employmentStatus?: string | null }>) {
  const total = rows.length
  const employed = rows.filter(row => row.employmentStatus === 'employed' || row.employmentStatus === 'self_employed').length
  const continuingStudies = rows.filter(row => row.employmentStatus === 'continuing_studies').length
  const seeking = rows.filter(row => row.employmentStatus === 'seeking').length

  return {
    total,
    employed,
    continuingStudies,
    seeking,
    employmentRate: total > 0 ? Math.round((employed / total) * 1000) / 10 : 0,
  }
}
