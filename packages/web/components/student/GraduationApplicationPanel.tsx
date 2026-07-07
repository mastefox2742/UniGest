'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useStudentGraduationApplication, useSubmitGraduationApplication } from '@/lib/hooks/useThesis'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'En analyse', cls: 'bg-muted text-muted-foreground' },
  eligible: { label: 'Eligible', cls: 'bg-green-100 text-green-700' },
  jury_incomplete: { label: 'Jury incomplet', cls: 'bg-yellow-100 text-yellow-700' },
  jury_complete: { label: 'Jury complet', cls: 'bg-blue-100 text-blue-700' },
  defended: { label: 'Soutenue', cls: 'bg-purple-100 text-purple-700' },
  diploma_issued: { label: 'Diplome emis', cls: 'bg-green-100 text-green-700' },
  blocked: { label: 'Bloquee', cls: 'bg-red-100 text-red-700' },
}

type GraduationApplication = {
  id: string
  status: string
  cfu_acquired: number
  cfu_required: number
  balance_due: number
  thesis_title: string | null
  defense_date: string | null
  diploma_number: string | null
  diploma_issued_at: string | null
  notes: string | null
  graduation_jury_members?: Array<{ id: string; name: string; role: string; confirmed: boolean }> | null
}

function money(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

function dateLabel(value?: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
}

export function GraduationApplicationPanel() {
  const { data, isLoading, isError } = useStudentGraduationApplication()
  const submit = useSubmitGraduationApplication()
  const [thesisTitle, setThesisTitle] = useState('')

  const app = data as GraduationApplication | null | undefined
  const status = app ? STATUS_LABELS[app.status] ?? STATUS_LABELS.pending : null
  const progress = app ? Math.min(100, Math.round((Number(app.cfu_acquired) / Math.max(Number(app.cfu_required), 1)) * 100)) : 0

  async function handleSubmit() {
    try {
      await submit.mutateAsync({ thesisTitle })
      setThesisTitle('')
      toast.success('Demande de Laurea soumise.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Soumission impossible')
    }
  }

  if (isLoading) {
    return <div className="h-36 animate-pulse rounded-xl bg-muted" />
  }

  if (isError) {
    return <p className="text-sm text-destructive">Impossible de charger la demande de Laurea.</p>
  }

  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Domanda di Laurea</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Soumets ta demande finale quand ton libretto, ta these et tes paiements sont en ordre.
          </p>
        </div>
        {status ? (
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${status.cls}`}>{status.label}</span>
        ) : null}
      </div>

      {!app ? (
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Titre de these associe</label>
            <input
              type="text"
              value={thesisTitle}
              onChange={event => setThesisTitle(event.target.value)}
              placeholder="Titre de votre these"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={submit.isPending}
            onClick={handleSubmit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submit.isPending ? 'Soumission...' : 'Soumettre la demande'}
          </button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">CFU</p>
              <p className="mt-1 font-semibold">{app.cfu_acquired}/{app.cfu_required}</p>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Solde</p>
              <p className="mt-1 font-semibold">{money(Number(app.balance_due))}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Jury</p>
              <p className="mt-1 font-semibold">{app.graduation_jury_members?.length ?? 0}/3 membres</p>
            </div>
          </div>

          {app.notes ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
              {app.notes}
            </div>
          ) : null}

          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <span>These: {app.thesis_title ?? '-'}</span>
            <span>Soutenance: {dateLabel(app.defense_date) ?? 'Non planifiee'}</span>
            <span>Diplome: {app.diploma_number ?? '-'}</span>
            <span>Emission: {dateLabel(app.diploma_issued_at) ?? '-'}</span>
          </div>

          {app.graduation_jury_members && app.graduation_jury_members.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Jury</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {app.graduation_jury_members.map(member => (
                  <div key={member.id} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-muted-foreground">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
