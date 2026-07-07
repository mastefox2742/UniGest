import { createClient } from '@supabase/supabase-js'
import {
  assertDiplomaCanBeIssued,
  assertGraduationStatus,
  assertGraduationTransition,
  deriveJuryStatus,
  evaluateGraduationEligibility,
  type GraduationStatus,
} from './graduation-rules'
import { createScenarioNotificationForStudent } from './notifications.service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface AddJuryMemberInput {
  applicationId: string
  teacherId?: string
  name: string
  role: 'president' | 'rapporteur' | 'examiner' | 'supervisor' | 'external'
}

export async function getAllApplications(filters: { status?: string } = {}) {
  let query = supabase
    .from('graduation_applications')
    .select(`
      id, student_id, status, cfu_acquired, cfu_required, balance_due,
      thesis_title, defense_date, diploma_issued_at, diploma_number, notes,
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name),
        degree_programs!degree_program_id(name, code, total_cfu)
      ),
      graduation_jury_members(id, name, role, confirmed, teacher_id)
    `)
    .order('created_at', { ascending: false })

  if (filters.status) {
    assertGraduationStatus(filters.status)
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getApplicationById(applicationId: string) {
  const { data, error } = await supabase
    .from('graduation_applications')
    .select(`
      id, student_id, status, cfu_acquired, cfu_required, balance_due,
      thesis_title, defense_date, diploma_issued_at, diploma_number, notes,
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name, phone),
        degree_programs!degree_program_id(name, code, total_cfu)
      ),
      graduation_jury_members(id, name, role, confirmed, teacher_id)
    `)
    .eq('id', applicationId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getStudentApplication(studentUserId: string) {
  const student = await resolveStudentForGraduation(studentUserId)
  if (!student) return null

  const { data, error } = await supabase
    .from('graduation_applications')
    .select(`
      id, student_id, status, cfu_acquired, cfu_required, balance_due,
      thesis_title, defense_date, diploma_issued_at, diploma_number, notes,
      graduation_jury_members(id, name, role, confirmed, teacher_id)
    `)
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function submitGraduationApplication(studentUserId: string, input: { thesisTitle?: string } = {}) {
  const student = await resolveStudentForGraduation(studentUserId)
  if (!student) throw new Error('Etudiant introuvable')

  const existing = await getStudentApplication(studentUserId)
  if (existing && existing.status !== 'blocked') {
    throw new Error('Une demande de Laurea est deja ouverte')
  }

  const prerequisites = await computeStudentPrerequisites(student.id)
  const eligibility = evaluateGraduationEligibility(prerequisites)
  const notes = eligibility.reasons.length > 0 ? eligibility.reasons.join(' | ') : null
  const academicYearId = await resolveCurrentAcademicYearId()

  const payload = {
    student_id: student.id,
    academic_year_id: academicYearId,
    status: eligibility.status,
    cfu_acquired: prerequisites.cfuAcquired,
    cfu_required: prerequisites.cfuRequired,
    balance_due: prerequisites.balanceDue,
    thesis_title: input.thesisTitle ?? null,
    notes,
  }

  const { data, error } = await supabase
    .from('graduation_applications')
    .insert(payload)
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Impossible de soumettre la demande de Laurea')
  await createScenarioNotificationForStudent(student.id, {
    topic: 'graduation',
    event: 'applied',
    message: eligibility.eligible
      ? 'Votre demande de Laurea est eligible.'
      : `Votre demande de Laurea est bloquee: ${eligibility.reasons.join(', ')}.`,
    link: '/student/thesis',
  }).catch(err => console.error('[notifications] graduation apply:', err.message))
  return data
}

export async function updateApplicationStatus(
  applicationId: string,
  status: GraduationStatus,
  notes?: string,
) {
  assertGraduationStatus(status)

  const { data: current } = await supabase
    .from('graduation_applications')
    .select('status, student_id')
    .eq('id', applicationId)
    .single()

  if (!current) throw new Error('Demande introuvable')
  assertGraduationTransition(current.status as GraduationStatus, status)

  const updateData: Record<string, unknown> = { status }
  if (notes !== undefined) updateData.notes = notes
  if (status === 'diploma_issued') updateData.diploma_issued_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('graduation_applications')
    .update(updateData)
    .eq('id', applicationId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  if (data?.student_id) {
    await createScenarioNotificationForStudent(data.student_id, {
      topic: 'graduation',
      event: 'status',
      message: `Votre demande de Laurea est maintenant: ${status}.`,
      link: '/student/thesis',
    }).catch(err => console.error('[notifications] graduation status:', err.message))
  }
  return data
}

export async function setDefenseDate(
  applicationId: string,
  defenseDate: string,
  roomId?: string,
) {
  const app = await getApplicationById(applicationId)
  const status = app.status as GraduationStatus

  if (status !== 'jury_complete' && status !== 'defended') {
    throw new Error('La date de soutenance requiert un jury complet')
  }

  const updateData: Record<string, unknown> = { defense_date: defenseDate }
  if (roomId) updateData.defense_room_id = roomId

  const { data, error } = await supabase
    .from('graduation_applications')
    .update(updateData)
    .eq('id', applicationId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function addJuryMember(input: AddJuryMemberInput) {
  const app = await getApplicationById(input.applicationId)
  const status = app.status as GraduationStatus
  if (status === 'diploma_issued' || status === 'defended') {
    throw new Error('Le jury ne peut plus etre modifie')
  }

  const { data, error } = await supabase
    .from('graduation_jury_members')
    .insert({
      application_id: input.applicationId,
      teacher_id: input.teacherId,
      name: input.name,
      role: input.role,
      confirmed: false,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await recalcApplicationStatus(input.applicationId)
  return data
}

export async function removeJuryMember(juryMemberId: string, applicationId: string) {
  const app = await getApplicationById(applicationId)
  const status = app.status as GraduationStatus
  if (status === 'diploma_issued' || status === 'defended') {
    throw new Error('Le jury ne peut plus etre modifie')
  }

  const { error } = await supabase
    .from('graduation_jury_members')
    .delete()
    .eq('id', juryMemberId)

  if (error) throw new Error(error.message)

  await recalcApplicationStatus(applicationId)
}

export async function generateDiploma(applicationId: string): Promise<string> {
  const app = await getApplicationById(applicationId)
  if (!app) throw new Error('Demande introuvable')

  const juryCount = (app.graduation_jury_members as { id: string }[] | null)?.length ?? 0
  assertDiplomaCanBeIssued({
    cfuAcquired: Number(app.cfu_acquired),
    cfuRequired: Number(app.cfu_required),
    balanceDue: Number(app.balance_due),
    juryCount,
    defenseDate: app.defense_date,
    status: app.status as GraduationStatus,
  })

  const diplomaNumber = await generateUniqueDiplomaNumber()

  const { error } = await supabase
    .from('graduation_applications')
    .update({
      status: 'diploma_issued',
      diploma_number: diplomaNumber,
      diploma_issued_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (error) throw new Error(error.message)
  if (app.student_id) {
    await createScenarioNotificationForStudent(app.student_id, {
      topic: 'graduation',
      event: 'status',
      message: `Votre diplome a ete emis: ${diplomaNumber}.`,
      link: '/student/certificates',
    }).catch(err => console.error('[notifications] diploma issued:', err.message))
  }
  return diplomaNumber
}

async function recalcApplicationStatus(applicationId: string) {
  const { data: app } = await supabase
    .from('graduation_applications')
    .select('status')
    .eq('id', applicationId)
    .single()

  if (!app || app.status === 'diploma_issued' || app.status === 'defended' || app.status === 'blocked') return

  const { data: members } = await supabase
    .from('graduation_jury_members')
    .select('id')
    .eq('application_id', applicationId)

  const newStatus = deriveJuryStatus(members?.length ?? 0)
  await supabase
    .from('graduation_applications')
    .update({ status: newStatus })
    .eq('id', applicationId)
}

async function resolveStudentForGraduation(studentUserId: string) {
  const { data } = await supabase
    .from('students')
    .select('id, total_cfu_earned, degree_programs!degree_program_id(total_cfu)')
    .eq('user_id', studentUserId)
    .single()

  return data as null | {
    id: string
    total_cfu_earned: number | null
    degree_programs?: { total_cfu?: number | null } | null
  }
}

async function computeStudentPrerequisites(studentId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('total_cfu_earned, degree_programs!degree_program_id(total_cfu)')
    .eq('id', studentId)
    .single()

  if (!student) throw new Error('Etudiant introuvable')

  const { data: fees } = await supabase
    .from('tuition_fees')
    .select('amount, late_fee, status')
    .eq('student_id', studentId)
    .in('status', ['pending', 'overdue'])

  const { data: thesis } = await supabase
    .from('theses')
    .select('id, status')
    .eq('student_id', studentId)
    .maybeSingle()

  const balanceDue = (fees ?? []).reduce(
    (sum, fee) => sum + Number(fee.amount) + Number(fee.late_fee ?? 0),
    0,
  )
  const program = student.degree_programs as { total_cfu?: number | null } | null

  return {
    cfuAcquired: Number(student.total_cfu_earned ?? 0),
    cfuRequired: Number(program?.total_cfu ?? 180),
    balanceDue,
    thesisSubmitted: Boolean(thesis && ['submitted', 'approved', 'in_progress', 'defended'].includes(thesis.status)),
  }
}

async function resolveCurrentAcademicYearId() {
  const { data, error } = await supabase
    .from('academic_years')
    .select('id')
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) throw new Error('Annee academique introuvable')
  return data.id as string
}

async function generateUniqueDiplomaNumber() {
  const year = new Date().getFullYear()

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const rand = Math.floor(Math.random() * 90000) + 10000
    const diplomaNumber = `DIPL-${year}-${rand}`
    const { data } = await supabase
      .from('graduation_applications')
      .select('id')
      .eq('diploma_number', diplomaNumber)
      .maybeSingle()

    if (!data) return diplomaNumber
  }

  throw new Error('Impossible de generer un numero de diplome unique')
}
