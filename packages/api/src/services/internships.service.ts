import { createClient } from '@supabase/supabase-js'
import {
  assertEvaluationScore,
  assertInternshipDates,
  assertInternshipTransition,
  assertOpportunityCanReceiveApplications,
  assertReportCanBeSubmitted,
  type InternshipApplicationStatus,
  type InternshipOpportunityStatus,
} from './internship-rules'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface CreateInternshipOpportunityInput {
  title: string
  companyName: string
  location?: string
  description?: string
  requirements?: string
  tutorName?: string
  tutorEmail?: string
  startDate?: string
  endDate?: string
  cfu?: number
  applicationDeadline?: string
  status?: InternshipOpportunityStatus
}

export interface ApplyInternshipInput {
  opportunityId: string
  motivation?: string
}

export interface EvaluateInternshipInput {
  score: number
  feedback?: string
}

export async function getInternshipOpportunities(filters: {
  status?: InternshipOpportunityStatus
} = {}) {
  let query = supabase
    .from('internship_opportunities')
    .select(`
      id, title, company_name, location, description, requirements,
      tutor_name, tutor_email, start_date, end_date, cfu,
      application_deadline, status, created_at
    `)
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createInternshipOpportunity(input: CreateInternshipOpportunityInput, createdBy: string) {
  assertInternshipDates(input.startDate, input.endDate)

  const { data, error } = await supabase
    .from('internship_opportunities')
    .insert({
      title: input.title,
      company_name: input.companyName,
      location: input.location ?? null,
      description: input.description ?? null,
      requirements: input.requirements ?? null,
      tutor_name: input.tutorName ?? null,
      tutor_email: input.tutorEmail ?? null,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      cfu: input.cfu ?? 0,
      application_deadline: input.applicationDeadline ?? null,
      status: input.status ?? 'draft',
      created_by: createdBy,
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Impossible de creer l offre de stage')
  return data
}

export async function applyForInternship(studentUserId: string, input: ApplyInternshipInput) {
  const student = await resolveStudent(studentUserId)
  if (!student) throw new Error('Etudiant introuvable')

  const { data: opportunity, error: opportunityError } = await supabase
    .from('internship_opportunities')
    .select('id, status, application_deadline')
    .eq('id', input.opportunityId)
    .single()

  if (opportunityError || !opportunity) throw new Error('Offre de stage introuvable')
  assertOpportunityCanReceiveApplications({
    status: opportunity.status as InternshipOpportunityStatus,
    applicationDeadline: opportunity.application_deadline,
  })

  const { data, error } = await supabase
    .from('internship_applications')
    .insert({
      opportunity_id: input.opportunityId,
      student_id: student.id,
      status: 'submitted',
      motivation: input.motivation ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    if (error?.code === '23505') throw new Error('Vous avez deja candidate a cette offre')
    throw new Error(error?.message ?? 'Impossible de candidater au stage')
  }
  return data
}

export async function getStudentInternshipApplications(studentUserId: string) {
  const student = await resolveStudent(studentUserId)
  if (!student) return []

  const { data, error } = await supabase
    .from('internship_applications')
    .select(`
      id, status, motivation, report_url, evaluation_score, evaluation_feedback,
      applied_at, approved_at, started_at, report_submitted_at, evaluated_at, closed_at,
      internship_opportunities(
        id, title, company_name, location, start_date, end_date, cfu, status
      )
    `)
    .eq('student_id', student.id)
    .order('applied_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAllInternshipApplications(filters: {
  status?: InternshipApplicationStatus
} = {}) {
  let query = supabase
    .from('internship_applications')
    .select(`
      id, status, motivation, report_url, evaluation_score, evaluation_feedback,
      applied_at, approved_at, started_at, report_submitted_at, evaluated_at, closed_at,
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name, email),
        degree_programs!degree_program_id(name, code)
      ),
      internship_opportunities(
        id, title, company_name, location, start_date, end_date, cfu
      )
    `)
    .order('applied_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function updateInternshipApplicationStatus(
  applicationId: string,
  status: InternshipApplicationStatus,
) {
  const { data: current, error: currentError } = await supabase
    .from('internship_applications')
    .select('id, status')
    .eq('id', applicationId)
    .single()

  if (currentError || !current) throw new Error('Candidature de stage introuvable')
  assertInternshipTransition(current.status as InternshipApplicationStatus, status)

  const payload: Record<string, unknown> = { status }
  const now = new Date().toISOString()
  if (status === 'approved') payload.approved_at = now
  if (status === 'in_progress') payload.started_at = now
  if (status === 'closed' || status === 'refused') payload.closed_at = now

  const { data, error } = await supabase
    .from('internship_applications')
    .update(payload)
    .eq('id', applicationId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Impossible de mettre a jour la candidature')
  return data
}

export async function submitInternshipReport(
  studentUserId: string,
  applicationId: string,
  reportUrl: string,
) {
  const student = await resolveStudent(studentUserId)
  if (!student) throw new Error('Etudiant introuvable')

  const { data: current, error: currentError } = await supabase
    .from('internship_applications')
    .select('id, status, student_id')
    .eq('id', applicationId)
    .eq('student_id', student.id)
    .single()

  if (currentError || !current) throw new Error('Candidature de stage introuvable')
  assertReportCanBeSubmitted(current.status as InternshipApplicationStatus)

  const { data, error } = await supabase
    .from('internship_applications')
    .update({
      status: 'report_submitted',
      report_url: reportUrl,
      report_submitted_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Impossible de soumettre le rapport')
  return data
}

export async function evaluateInternshipApplication(
  applicationId: string,
  evaluatedBy: string,
  input: EvaluateInternshipInput,
) {
  assertEvaluationScore(input.score)

  const { data: current, error: currentError } = await supabase
    .from('internship_applications')
    .select('id, status')
    .eq('id', applicationId)
    .single()

  if (currentError || !current) throw new Error('Candidature de stage introuvable')
  assertInternshipTransition(current.status as InternshipApplicationStatus, 'evaluated')

  const { data, error } = await supabase
    .from('internship_applications')
    .update({
      status: 'evaluated',
      evaluation_score: input.score,
      evaluation_feedback: input.feedback ?? null,
      evaluated_by: evaluatedBy,
      evaluated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Impossible d evaluer le stage')
  return data
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
