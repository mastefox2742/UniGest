import { createClient } from '@supabase/supabase-js'
import { createScenarioNotificationForStudent } from './notifications.service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export type ThesisStatus = 'proposed' | 'submitted' | 'in_progress' | 'approved' | 'rejected' | 'defended'

// ─── Étudiant ─────────────────────────────────────────────────────────────────

export async function getStudentThesis(studentUserId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) return null

  const { data } = await supabase
    .from('theses')
    .select(`
      id, title, abstract, document_url, status, notes,
      submitted_at, defense_date, updated_at,
      advisor_name, co_advisor_name
    `)
    .eq('student_id', student.id)
    .maybeSingle()

  return data
}

export async function submitThesis(studentUserId: string, input: {
  title:          string
  abstract?:      string
  documentUrl?:   string
  advisorName?:   string
  coAdvisorName?: string
}) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) throw new Error('Étudiant introuvable')

  // Vérifier si une thèse existe déjà
  const { data: existing } = await supabase
    .from('theses')
    .select('id, status')
    .eq('student_id', student.id)
    .maybeSingle()

  if (existing) {
    // Ne pas permettre la modification si déjà approuvée ou défendue
    if (['approved', 'defended'].includes(existing.status)) {
      throw new Error('Votre thèse ne peut plus être modifiée dans son état actuel')
    }

    const update: Record<string, unknown> = {
      title:  input.title,
      status: 'submitted',
    }
    if (input.abstract      !== undefined) update.abstract      = input.abstract
    if (input.documentUrl   !== undefined) update.document_url  = input.documentUrl
    if (input.advisorName   !== undefined) update.advisor_name  = input.advisorName
    if (input.coAdvisorName !== undefined) update.co_advisor_name = input.coAdvisorName

    const { data, error } = await supabase
      .from('theses')
      .update(update)
      .eq('id', existing.id)
      .select()
      .single()

    if (error || !data) throw new Error('Impossible de mettre à jour la thèse')
    await createScenarioNotificationForStudent(student.id, {
      topic: 'thesis',
      event: 'submitted',
      message: 'Votre soumission de these a ete mise a jour.',
      link: '/student/thesis',
    }).catch(err => console.error('[notifications] thesis update:', err.message))
    return data
  }

  const insert: Record<string, unknown> = {
    student_id:   student.id,
    title:        input.title,
    status:       'submitted',
    submitted_at: new Date().toISOString(),
  }
  if (input.abstract      !== undefined) insert.abstract       = input.abstract
  if (input.documentUrl   !== undefined) insert.document_url   = input.documentUrl
  if (input.advisorName   !== undefined) insert.advisor_name   = input.advisorName
  if (input.coAdvisorName !== undefined) insert.co_advisor_name = input.coAdvisorName

  const { data, error } = await supabase
    .from('theses')
    .insert(insert)
    .select()
    .single()

  if (error || !data) throw new Error('Impossible de soumettre la thèse')
  await createScenarioNotificationForStudent(student.id, {
    topic: 'thesis',
    event: 'submitted',
    message: 'Votre these a ete soumise au secretariat.',
    link: '/student/thesis',
  }).catch(err => console.error('[notifications] thesis submit:', err.message))
  return data
}

// ─── Admin / Secrétaire ───────────────────────────────────────────────────────

export async function getAllTheses(filter?: { status?: string }) {
  let query = supabase
    .from('theses')
    .select(`
      id, title, abstract, document_url, status, notes,
      submitted_at, defense_date, advisor_name, co_advisor_name,
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name, email)
      )
    `)
    .order('submitted_at', { ascending: false })

  if (filter?.status) {
    query = query.eq('status', filter.status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function updateThesisStatus(
  thesisId: string,
  status:   ThesisStatus,
  notes?:   string,
  defenseDate?: string,
) {
  const { data: thesis } = await supabase
    .from('theses')
    .select('student_id')
    .eq('id', thesisId)
    .single()

  const update: Record<string, unknown> = { status }
  if (notes       !== undefined) update.notes        = notes
  if (defenseDate !== undefined) update.defense_date = defenseDate

  const { error } = await supabase
    .from('theses')
    .update(update)
    .eq('id', thesisId)

  if (error) throw new Error(error.message)

  if (thesis?.student_id) {
    await createScenarioNotificationForStudent(thesis.student_id, {
      topic: 'thesis',
      event: 'status',
      message: `Le statut de votre these est maintenant: ${status}.`,
      link: '/student/thesis',
    }).catch(err => console.error('[notifications] thesis status:', err.message))
  }
}
