import { describe, expect, it } from 'vitest'
import {
  assertFeeCanBePaid,
  assertPaymentAmountMatches,
  calculateLateFee,
  calculateOutstandingAmount,
  roundMoney,
} from '../services/fee-rules'

describe('fee-rules', () => {
  it('rounds monetary values to cents', () => {
    expect(roundMoney(10.005)).toBe(10.01)
    expect(roundMoney(10.004)).toBe(10)
  })

  it('calculates a 5 percent late fee', () => {
    expect(calculateLateFee(1000)).toBe(50)
    expect(calculateLateFee(123.45)).toBe(6.17)
  })

  it('calculates outstanding amount with late fee', () => {
    expect(calculateOutstandingAmount({ amount: 1000, late_fee: 50 })).toBe(1050)
    expect(calculateOutstandingAmount({ amount: 1000, late_fee: null })).toBe(1000)
  })

  it('blocks paid and waived fees from payment', () => {
    expect(() => assertFeeCanBePaid({ amount: 100, late_fee: 0, status: 'paid' })).toThrow('deja paye')
    expect(() => assertFeeCanBePaid({ amount: 100, late_fee: 0, status: 'waived' })).toThrow('exonere')
  })

  it('requires the exact outstanding payment amount', () => {
    const fee = { amount: 100, late_fee: 5 }

    expect(() => assertPaymentAmountMatches(fee, 105)).not.toThrow()
    expect(() => assertPaymentAmountMatches(fee, 100)).toThrow('attendu 105.00')
  })
})
