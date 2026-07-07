import { createClient } from '@supabase/supabase-js'
import {
  assertFeeCanBePaid,
  assertPaymentAmountMatches,
  calculateLateFee,
  calculateOutstandingAmount,
} from './fee-rules'
import { createScenarioNotificationForStudent } from './notifications.service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export interface CreateFeeInput {
  studentId: string
  academicYearId: string
  amount: number
  dueDate: string
  description?: string
}

export interface PayFeeInput {
  feeId: string
  paymentRef: string
  method: string
  amount: number
}

export async function getStudentFees(studentUserId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) return []

  await markOverdueFees(student.id)

  const { data, error } = await supabase
    .from('tuition_fees')
    .select(`
      id, amount, due_date, status, paid_at, payment_ref, late_fee, created_at,
      academic_years!academic_year_id(label)
    `)
    .eq('student_id', student.id)
    .order('due_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getStudentFeesSummary(studentUserId: string) {
  const fees = await getStudentFees(studentUserId)

  const pending = fees
    .filter(f => f.status === 'pending')
    .reduce((sum, f) => sum + calculateOutstandingAmount({ amount: Number(f.amount), late_fee: Number(f.late_fee ?? 0) }), 0)

  const overdue = fees
    .filter(f => f.status === 'overdue')
    .reduce((sum, f) => sum + calculateOutstandingAmount({ amount: Number(f.amount), late_fee: Number(f.late_fee ?? 0) }), 0)

  const paid = fees
    .filter(f => f.status === 'paid')
    .reduce((sum, f) => sum + Number(f.amount), 0)

  return { fees, pending, overdue, paid, total: pending + overdue }
}

export async function getAllFees(filters: {
  status?: string
  academicYearId?: string
} = {}) {
  let query = supabase
    .from('tuition_fees')
    .select(`
      id, amount, due_date, status, paid_at, payment_ref, late_fee, created_at,
      academic_years!academic_year_id(label),
      students!student_id(
        id, matricola,
        profiles!user_id(first_name, last_name, email)
      )
    `)
    .order('due_date', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.academicYearId) query = query.eq('academic_year_id', filters.academicYearId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function markFeePaid(input: PayFeeInput) {
  await markFeeOverdueIfNeeded(input.feeId)

  const { data: fee } = await supabase
    .from('tuition_fees')
    .select('id, student_id, amount, status, late_fee')
    .eq('id', input.feeId)
    .single()

  if (!fee) throw new Error('Frais introuvable')

  const normalizedFee = {
    amount: Number(fee.amount),
    late_fee: Number(fee.late_fee ?? 0),
    status: fee.status,
  }

  assertFeeCanBePaid(normalizedFee)
  assertPaymentAmountMatches(normalizedFee, input.amount)

  const now = new Date().toISOString()
  const amount = calculateOutstandingAmount(normalizedFee)

  const { error: updateError } = await supabase.from('tuition_fees').update({
    status: 'paid',
    paid_at: now,
    payment_ref: input.paymentRef,
  }).eq('id', input.feeId)
  if (updateError) throw new Error(updateError.message)

  const { error: paymentError } = await supabase.from('payments').insert({
    student_id: fee.student_id,
    fee_id: input.feeId,
    amount,
    method: input.method,
    reference: input.paymentRef,
    paid_at: now,
  })
  if (paymentError) throw new Error(paymentError.message)

  await createScenarioNotificationForStudent(fee.student_id, {
    topic: 'fee',
    event: 'paid',
    message: `Votre paiement de ${amount.toFixed(2)} EUR a ete enregistre.`,
    link: '/student/fees',
  }).catch(err => console.error('[notifications] fee paid:', err.message))
}

export async function payStudentFee(studentUserId: string, input: PayFeeInput) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) throw new Error('Etudiant introuvable')

  const { data: fee } = await supabase
    .from('tuition_fees')
    .select('id')
    .eq('id', input.feeId)
    .eq('student_id', student.id)
    .single()

  if (!fee) throw new Error('Frais introuvable pour cet etudiant')

  await markFeePaid(input)
}

export async function waiveFee(feeId: string, reason?: string) {
  const { data: fee } = await supabase
    .from('tuition_fees')
    .select('id, status')
    .eq('id', feeId)
    .single()

  if (!fee) throw new Error('Frais introuvable')
  if (fee.status === 'paid') throw new Error('Ce frais est deja paye')

  const { error } = await supabase.from('tuition_fees').update({
    status: 'waived',
    payment_ref: reason ?? 'Exoneration',
  }).eq('id', feeId)

  if (error) throw new Error(error.message)
}

export async function createFee(input: CreateFeeInput) {
  const { data, error } = await supabase
    .from('tuition_fees')
    .insert({
      student_id: input.studentId,
      academic_year_id: input.academicYearId,
      amount: input.amount,
      due_date: input.dueDate,
      status: 'pending',
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Impossible de creer le frais')

  await createScenarioNotificationForStudent(input.studentId, {
    topic: 'fee',
    event: 'created',
    message: `Un nouveau frais de ${Number(input.amount).toFixed(2)} EUR est disponible. Echeance: ${input.dueDate}.`,
    link: '/student/fees',
  }).catch(err => console.error('[notifications] fee created:', err.message))

  return data
}

async function markOverdueFees(studentId: string) {
  const today = new Date().toISOString().slice(0, 10)

  const { data: overdueItems } = await supabase
    .from('tuition_fees')
    .select('id, amount')
    .eq('student_id', studentId)
    .eq('status', 'pending')
    .lt('due_date', today)

  if (!overdueItems || overdueItems.length === 0) return

  for (const fee of overdueItems) {
    const lateFee = calculateLateFee(Number(fee.amount))
    await supabase.from('tuition_fees').update({
      status: 'overdue',
      late_fee: lateFee,
    }).eq('id', fee.id)
  }
}

async function markFeeOverdueIfNeeded(feeId: string) {
  const today = new Date().toISOString().slice(0, 10)

  const { data: fee } = await supabase
    .from('tuition_fees')
    .select('id, amount, due_date, status')
    .eq('id', feeId)
    .single()

  if (!fee || fee.status !== 'pending' || fee.due_date >= today) return

  const lateFee = calculateLateFee(Number(fee.amount))
  const { error } = await supabase
    .from('tuition_fees')
    .update({ status: 'overdue', late_fee: lateFee })
    .eq('id', feeId)

  if (error) throw new Error(error.message)
}
