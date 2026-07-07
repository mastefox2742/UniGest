import { createClient } from '@supabase/supabase-js'
import {
  assertEmploymentSurveyIsValid,
  employmentOutcome,
  normalizeSalaryRange,
  type AlumniEmploymentStatus,
} from './alumni-rules'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface UpsertAlumniProfileInput {
  graduationYear?: number
  currentCity?: string
  currentCountry?: string
  linkedinUrl?: string
  consentPlacementTracking?: boolean
}

export interface SubmitPlacementSurveyInput {
  employmentStatus: AlumniEmploymentStatus
  companyName?: string
  jobTitle?: string
  contractType?: string
  sector?: string
  salaryRange?: string
  employedAt?: string
  notes?: string
}

export async function getAlumniProfile(userId: string) {
  const student = await resolveStudent(userId)
  if (!student) return null

  const { data, error } = await supabase
    .from('alumni_profiles')
    .select(`
      id, student_id, graduation_year, current_city, current_country,
      linkedin_url, consent_placement_tracking, created_at, updated_at,
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name, email),
        degree_programs!degree_program_id(name, code)
      ),
      placement_surveys(
        id, employment_status, company_name, job_title, contract_type, sector,
        salary_range, employed_at, notes, survey_year, submitted_at
      )
    `)
    .eq('student_id', student.id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function upsertAlumniProfile(userId: string, input: UpsertAlumniProfileInput) {
  const student = await resolveStudent(userId)
  if (!student) throw new Error('Etudiant introuvable')

  const payload: Record<string, unknown> = {
    student_id: student.id,
    updated_at: new Date().toISOString(),
  }
  if (input.graduationYear !== undefined) payload.graduation_year = input.graduationYear
  if (input.currentCity !== undefined) payload.current_city = input.currentCity || null
  if (input.currentCountry !== undefined) payload.current_country = input.currentCountry || null
  if (input.linkedinUrl !== undefined) payload.linkedin_url = input.linkedinUrl || null
  if (input.consentPlacementTracking !== undefined) {
    payload.consent_placement_tracking = input.consentPlacementTracking
  }

  const { data, error } = await supabase
    .from('alumni_profiles')
    .upsert(payload, { onConflict: 'student_id' })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Impossible de mettre a jour le profil alumni')
  return data
}

export async function submitPlacementSurvey(userId: string, input: SubmitPlacementSurveyInput) {
  const profile = await ensureAlumniProfile(userId)

  const surveyForRules: Parameters<typeof assertEmploymentSurveyIsValid>[0] = {
    employmentStatus: input.employmentStatus,
  }
  if (input.companyName !== undefined) surveyForRules.companyName = input.companyName
  if (input.jobTitle !== undefined) surveyForRules.jobTitle = input.jobTitle
  if (input.contractType !== undefined) surveyForRules.contractType = input.contractType
  if (input.salaryRange !== undefined) surveyForRules.salaryRange = input.salaryRange
  if (input.employedAt !== undefined) surveyForRules.employedAt = input.employedAt
  assertEmploymentSurveyIsValid(surveyForRules)

  const surveyYear = new Date().getFullYear()
  const { data, error } = await supabase
    .from('placement_surveys')
    .upsert({
      alumni_profile_id: profile.id,
      survey_year: surveyYear,
      employment_status: input.employmentStatus,
      company_name: input.companyName ?? null,
      job_title: input.jobTitle ?? null,
      contract_type: input.contractType ?? null,
      sector: input.sector ?? null,
      salary_range: normalizeSalaryRange(input.salaryRange),
      employed_at: input.employedAt ?? null,
      notes: input.notes ?? null,
      submitted_at: new Date().toISOString(),
    }, { onConflict: 'alumni_profile_id,survey_year' })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Impossible de soumettre l enquete placement')
  return data
}

export async function getAlumniProfiles(filters: { graduationYear?: number } = {}) {
  let query = supabase
    .from('alumni_profiles')
    .select(`
      id, graduation_year, current_city, current_country,
      linkedin_url, consent_placement_tracking, created_at, updated_at,
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name, email),
        degree_programs!degree_program_id(name, code)
      ),
      placement_surveys(
        id, employment_status, company_name, job_title, contract_type, sector,
        salary_range, employed_at, survey_year, submitted_at
      )
    `)
    .order('updated_at', { ascending: false })

  if (filters.graduationYear) query = query.eq('graduation_year', filters.graduationYear)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getPlacementStats() {
  const { data, error } = await supabase
    .from('placement_surveys')
    .select('employment_status, sector, contract_type, survey_year')

  if (error) throw new Error(error.message)
  const surveys = data ?? []
  const outcome = employmentOutcome(surveys.map(row => ({ employmentStatus: row.employment_status })))

  return {
    ...outcome,
    bySector: groupCount(surveys, row => row.sector),
    byContract: groupCount(surveys, row => row.contract_type),
    bySurveyYear: groupCount(surveys, row => String(row.survey_year ?? 'Non renseigne')),
  }
}

async function ensureAlumniProfile(userId: string) {
  const existing = await getAlumniProfile(userId)
  if (existing) return existing
  return upsertAlumniProfile(userId, { consentPlacementTracking: true })
}

async function resolveStudent(userId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

function groupCount<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = getKey(item) || 'Non renseigne'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}
