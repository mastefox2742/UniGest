const CENTS = 100
const LATE_FEE_RATE = 0.05

export type PayableFeeStatus = 'pending' | 'overdue' | 'paid' | 'waived'

export interface PayableFee {
  amount: number
  late_fee?: number | null
  status: PayableFeeStatus
}

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * CENTS) / CENTS
}

export function calculateLateFee(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Le montant du frais doit etre positif')
  }
  return roundMoney(amount * LATE_FEE_RATE)
}

export function calculateOutstandingAmount(fee: Pick<PayableFee, 'amount' | 'late_fee'>) {
  return roundMoney(Number(fee.amount) + Number(fee.late_fee ?? 0))
}

export function assertFeeCanBePaid(fee: PayableFee) {
  if (fee.status === 'paid') throw new Error('Ce frais est deja paye')
  if (fee.status === 'waived') throw new Error('Ce frais a ete exonere')
  if (fee.status !== 'pending' && fee.status !== 'overdue') {
    throw new Error('Statut de frais non payable')
  }
}

export function assertPaymentAmountMatches(fee: Pick<PayableFee, 'amount' | 'late_fee'>, paidAmount: number) {
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new Error('Le montant du paiement doit etre positif')
  }

  const expected = calculateOutstandingAmount(fee)
  if (roundMoney(paidAmount) !== expected) {
    throw new Error(`Montant paiement invalide: attendu ${expected.toFixed(2)}`)
  }
}
