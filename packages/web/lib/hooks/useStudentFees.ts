'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const API = process.env.NEXT_PUBLIC_API_URL ?? ''

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

export interface FeeEntry {
  id:           string
  amount:       number
  due_date:     string
  status:       'pending' | 'paid' | 'overdue' | 'waived'
  paid_at:      string | null
  payment_ref:  string | null
  late_fee:     number | null
  created_at:   string
  academic_years: { label: string } | null
}

export interface FeesSummary {
  fees:    FeeEntry[]
  pending: number
  overdue: number
  paid:    number
  total:   number
}

export function useStudentFees() {
  return useQuery<FeesSummary>({
    queryKey: ['student-fees'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) return { fees: [], pending: 0, overdue: 0, paid: 0, total: 0 }

      const res = await fetch(`${API}/api/fees/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur chargement frais')
      const json = await res.json()
      return json.data
    },
    staleTime: 1000 * 60,
  })
}

export function usePayStudentFee() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      feeId,
      paymentRef,
      method,
      amount,
    }: {
      feeId: string
      paymentRef: string
      method: 'pagopa' | 'bank_transfer' | 'card' | 'cash' | 'check' | 'online' | 'mobile_money'
      amount: number
    }) => {
      const token = await getToken()
      if (!token) throw new Error('Non authentifie')

      const res = await fetch(`${API}/api/fees/${feeId}/self-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentRef, method, amount }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Paiement impossible')
      }

      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-fees'] })
      qc.invalidateQueries({ queryKey: ['student-dashboard'] })
    },
  })
}
