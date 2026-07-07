'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FeeEntry, usePayStudentFee, useStudentFees } from '@/lib/hooks/useStudentFees'

type Message = { type: 'success' | 'error'; text: string }

function money(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(value?: string | null) {
  if (!value) return 'Date inconnue'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

function outstandingAmount(fee: FeeEntry) {
  return Number(fee.amount) + Number(fee.late_fee ?? 0)
}

function academicYear(fee: FeeEntry) {
  return fee.academic_years?.label ?? 'Annee academique'
}

function statusBadge(status: FeeEntry['status']) {
  switch (status) {
    case 'paid':
      return <Badge variant="success">Paye</Badge>
    case 'overdue':
      return <Badge variant="destructive">En retard</Badge>
    case 'waived':
      return <Badge variant="outline">Exonere</Badge>
    default:
      return <Badge variant="warning">A payer</Badge>
  }
}

function LoadingFees() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-3 w-1/2" />
          <Skeleton className="mt-4 h-9 w-32" />
        </div>
      ))}
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: 'danger' | 'success' }) {
  const color = tone === 'danger' ? 'text-destructive' : tone === 'success' ? 'text-green-700' : 'text-foreground'

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${color}`}>{money(value)}</p>
    </div>
  )
}

export function FeesPage() {
  const feesQuery = useStudentFees()
  const payFee = usePayStudentFee()

  const [selectedFee, setSelectedFee] = useState<FeeEntry | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [receiptFee, setReceiptFee] = useState<FeeEntry | null>(null)

  const fees = feesQuery.data?.fees ?? []
  const totals = useMemo(() => ({
    pending: feesQuery.data?.pending ?? 0,
    overdue: feesQuery.data?.overdue ?? 0,
    paid: feesQuery.data?.paid ?? 0,
    total: feesQuery.data?.total ?? 0,
  }), [feesQuery.data])

  function showMessage(type: Message['type'], text: string) {
    setMessage({ type, text })
    window.setTimeout(() => setMessage(null), 3500)
  }

  async function handlePay() {
    if (!selectedFee) return

    const paymentRef = `PAGOPA-${Date.now()}`
    try {
      await payFee.mutateAsync({
        feeId: selectedFee.id,
        paymentRef,
        method: 'pagopa',
        amount: outstandingAmount(selectedFee),
      })
      setReceiptFee({ ...selectedFee, payment_ref: paymentRef, paid_at: new Date().toISOString(), status: 'paid' })
      setSelectedFee(null)
      showMessage('success', 'Paiement enregistre.')
    } catch (err) {
      showMessage('error', err instanceof Error ? err.message : 'Paiement impossible')
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold">Frais et paiements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte tes frais universitaires, les retards eventuels et tes paiements.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total a regler" value={totals.total} />
        <SummaryCard label="A payer" value={totals.pending} />
        <SummaryCard label="En retard" value={totals.overdue} tone="danger" />
        <SummaryCard label="Deja paye" value={totals.paid} tone="success" />
      </div>

      {feesQuery.isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de charger les frais. Verifie ta session et l'API.
        </div>
      ) : null}

      {message ? (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Mes frais</h2>
          <span className="text-sm text-muted-foreground">{fees.length} ligne(s)</span>
        </div>

        {feesQuery.isLoading ? <LoadingFees /> : null}

        {!feesQuery.isLoading && fees.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="font-medium">Aucun frais disponible</p>
            <p className="mt-1 text-sm text-muted-foreground">Les nouvelles echeances apparaitront ici.</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {fees.map((fee) => {
            const payable = fee.status === 'pending' || fee.status === 'overdue'
            const lateFee = Number(fee.late_fee ?? 0)

            return (
              <article key={fee.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(fee.status)}
                      <Badge variant="outline">{academicYear(fee)}</Badge>
                    </div>
                    <h3 className="mt-2 font-semibold">Contribution universitaire</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Echeance: {formatDate(fee.due_date)}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-semibold">{money(outstandingAmount(fee))}</p>
                    {lateFee > 0 ? (
                      <p className="text-xs text-destructive">Inclut {money(lateFee)} de retard</p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <span>Base: {money(Number(fee.amount))}</span>
                  <span>Paye le: {fee.paid_at ? formatDate(fee.paid_at) : '-'}</span>
                  <span>Reference: {fee.payment_ref ?? '-'}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {payable ? (
                    <button
                      type="button"
                      onClick={() => setSelectedFee(fee)}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                      Payer avec PagoPA
                    </button>
                  ) : null}
                  {fee.status === 'paid' ? (
                    <button
                      type="button"
                      onClick={() => setReceiptFee(fee)}
                      className="rounded-md border px-4 py-2 text-sm font-medium"
                    >
                      Voir le recu
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {selectedFee ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-5 shadow-lg">
            <h2 className="text-lg font-semibold">Confirmer le paiement</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Paiement simule PagoPA pour {academicYear(selectedFee)}. Le backend verifiera le montant exact du frais.
            </p>

            <div className="mt-4 rounded-lg border bg-muted/40 p-4 text-sm">
              <div className="flex justify-between gap-3">
                <span>Montant de base</span>
                <strong>{money(Number(selectedFee.amount))}</strong>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <span>Penalite</span>
                <strong>{money(Number(selectedFee.late_fee ?? 0))}</strong>
              </div>
              <div className="mt-3 flex justify-between gap-3 border-t pt-3 text-base">
                <span>Total</span>
                <strong>{money(outstandingAmount(selectedFee))}</strong>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedFee(null)}
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={payFee.isPending}
                onClick={handlePay}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {payFee.isPending ? 'Paiement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {receiptFee ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-background p-5 shadow-lg">
            <div id="fee-receipt" className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Recu de paiement</p>
              <h2 className="mt-1 text-xl font-semibold">Contribution universitaire</h2>
              <div className="mt-4 grid gap-2 text-sm">
                <span>Annee: {academicYear(receiptFee)}</span>
                <span>Montant: {money(outstandingAmount(receiptFee))}</span>
                <span>Date paiement: {formatDate(receiptFee.paid_at)}</span>
                <span>Reference: {receiptFee.payment_ref ?? '-'}</span>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReceiptFee(null)}
                className="rounded-md border px-4 py-2 text-sm font-medium"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Imprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
