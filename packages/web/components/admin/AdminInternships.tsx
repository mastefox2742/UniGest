'use client'

import { useMemo, useState } from 'react'
import {
  InternshipApplication,
  InternshipApplicationStatus,
  useAdminInternshipApplications,
  useAdminInternshipOpportunities,
  useCreateInternshipOpportunity,
  useEvaluateInternship,
  useUpdateInternshipStatus,
} from '@/lib/hooks/useAdminInternships'

type Message = { type: 'success' | 'error'; text: string }

const STATUSES: Array<{ value: '' | InternshipApplicationStatus; label: string }> = [
  { value: '', label: 'Toutes' },
  { value: 'submitted', label: 'Soumises' },
  { value: 'approved', label: 'Approuvees' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'report_submitted', label: 'Rapport soumis' },
  { value: 'evaluated', label: 'Evaluees' },
  { value: 'closed', label: 'Cloturees' },
  { value: 'refused', label: 'Refusees' },
]

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

function studentName(app: InternshipApplication) {
  const profile = app.students?.profiles
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Etudiant'
}

function statusBadge(status: InternshipApplicationStatus) {
  const map: Record<InternshipApplicationStatus, string> = {
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    report_submitted: 'bg-indigo-100 text-indigo-700',
    evaluated: 'bg-green-100 text-green-700',
    closed: 'bg-slate-100 text-slate-700',
    refused: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      {STATUSES.find(item => item.value === status)?.label ?? status}
    </span>
  )
}

function nextActions(status: InternshipApplicationStatus): InternshipApplicationStatus[] {
  const map: Record<InternshipApplicationStatus, InternshipApplicationStatus[]> = {
    submitted: ['approved', 'refused'],
    approved: ['in_progress', 'refused'],
    in_progress: ['closed'],
    report_submitted: ['evaluated'],
    evaluated: ['closed'],
    closed: [],
    refused: [],
  }
  return map[status]
}

export function AdminInternships() {
  const [status, setStatus] = useState<'' | InternshipApplicationStatus>('')
  const [message, setMessage] = useState<Message | null>(null)
  const [evaluateFor, setEvaluateFor] = useState<InternshipApplication | null>(null)
  const [score, setScore] = useState(30)
  const [feedback, setFeedback] = useState('')
  const [offer, setOffer] = useState({
    title: '',
    companyName: '',
    location: '',
    description: '',
    tutorName: '',
    tutorEmail: '',
    startDate: '',
    endDate: '',
    cfu: 6,
    applicationDeadline: '',
    status: 'open' as 'draft' | 'open' | 'closed',
  })

  const applicationsQuery = useAdminInternshipApplications(status)
  const opportunitiesQuery = useAdminInternshipOpportunities()
  const createOpportunity = useCreateInternshipOpportunity()
  const updateStatus = useUpdateInternshipStatus()
  const evaluate = useEvaluateInternship()

  const applications = applicationsQuery.data ?? []
  const opportunities = opportunitiesQuery.data ?? []
  const stats = useMemo(() => ({
    submitted: applications.filter(app => app.status === 'submitted').length,
    active: applications.filter(app => ['approved', 'in_progress', 'report_submitted'].includes(app.status)).length,
    evaluated: applications.filter(app => app.status === 'evaluated').length,
    openOffers: opportunities.filter(item => item.status === 'open').length,
  }), [applications, opportunities])

  async function handleCreateOpportunity() {
    setMessage(null)
    try {
      if (!offer.title.trim() || !offer.companyName.trim()) {
        throw new Error('Titre et entreprise requis')
      }
      const payload = {
        title: offer.title.trim(),
        companyName: offer.companyName.trim(),
        status: offer.status,
        cfu: offer.cfu,
        ...(offer.location ? { location: offer.location } : {}),
        ...(offer.description ? { description: offer.description } : {}),
        ...(offer.tutorName ? { tutorName: offer.tutorName } : {}),
        ...(offer.tutorEmail ? { tutorEmail: offer.tutorEmail } : {}),
        ...(offer.startDate ? { startDate: offer.startDate } : {}),
        ...(offer.endDate ? { endDate: offer.endDate } : {}),
        ...(offer.applicationDeadline ? { applicationDeadline: offer.applicationDeadline } : {}),
      }
      await createOpportunity.mutateAsync(payload)
      setMessage({ type: 'success', text: 'Offre de stage creee.' })
      setOffer({
        title: '',
        companyName: '',
        location: '',
        description: '',
        tutorName: '',
        tutorEmail: '',
        startDate: '',
        endDate: '',
        cfu: 6,
        applicationDeadline: '',
        status: 'open',
      })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Creation impossible' })
    }
  }

  async function handleStatus(applicationId: string, nextStatus: InternshipApplicationStatus) {
    setMessage(null)
    try {
      await updateStatus.mutateAsync({ applicationId, status: nextStatus })
      setMessage({ type: 'success', text: 'Statut mis a jour.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Mise a jour impossible' })
    }
  }

  async function handleEvaluate() {
    if (!evaluateFor) return
    setMessage(null)
    try {
      const payload: { applicationId: string; score: number; feedback?: string } = {
        applicationId: evaluateFor.id,
        score,
      }
      const trimmedFeedback = feedback.trim()
      if (trimmedFeedback) payload.feedback = trimmedFeedback
      await evaluate.mutateAsync(payload)
      setMessage({ type: 'success', text: 'Stage evalue.' })
      setEvaluateFor(null)
      setFeedback('')
      setScore(30)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Evaluation impossible' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stages & Tirocini</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Offres, candidatures, rapports et evaluations de stage.
          </p>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Filtre candidatures</span>
          <select
            value={status}
            onChange={event => setStatus(event.target.value as '' | InternshipApplicationStatus)}
            className="rounded-md border bg-background px-3 py-2"
          >
            {STATUSES.map(item => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${
          message.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Offres ouvertes" value={stats.openOffers} />
        <Kpi label="Soumises" value={stats.submitted} tone="info" />
        <Kpi label="Actives" value={stats.active} tone="warn" />
        <Kpi label="Evaluees" value={stats.evaluated} tone="good" />
      </div>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="font-semibold">Creer une offre</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="Titre" value={offer.title} onChange={value => setOffer(prev => ({ ...prev, title: value }))} />
          <Input label="Entreprise" value={offer.companyName} onChange={value => setOffer(prev => ({ ...prev, companyName: value }))} />
          <Input label="Lieu" value={offer.location} onChange={value => setOffer(prev => ({ ...prev, location: value }))} />
          <Input label="Tuteur" value={offer.tutorName} onChange={value => setOffer(prev => ({ ...prev, tutorName: value }))} />
          <Input label="Email tuteur" value={offer.tutorEmail} onChange={value => setOffer(prev => ({ ...prev, tutorEmail: value }))} />
          <Input label="Deadline candidature" type="date" value={offer.applicationDeadline} onChange={value => setOffer(prev => ({ ...prev, applicationDeadline: value }))} />
          <Input label="Debut" type="date" value={offer.startDate} onChange={value => setOffer(prev => ({ ...prev, startDate: value }))} />
          <Input label="Fin" type="date" value={offer.endDate} onChange={value => setOffer(prev => ({ ...prev, endDate: value }))} />
          <label className="grid gap-1 text-sm">
            <span className="font-medium">CFU</span>
            <input
              type="number"
              min={0}
              max={60}
              value={offer.cfu}
              onChange={event => setOffer(prev => ({ ...prev, cfu: Number(event.target.value) }))}
              className="rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Statut</span>
            <select
              value={offer.status}
              onChange={event => setOffer(prev => ({ ...prev, status: event.target.value as 'draft' | 'open' | 'closed' }))}
              className="rounded-md border bg-background px-3 py-2"
            >
              <option value="draft">Brouillon</option>
              <option value="open">Ouverte</option>
              <option value="closed">Fermee</option>
            </select>
          </label>
        </div>
        <label className="mt-3 grid gap-1 text-sm">
          <span className="font-medium">Description</span>
          <textarea
            value={offer.description}
            onChange={event => setOffer(prev => ({ ...prev, description: event.target.value }))}
            rows={3}
            className="rounded-md border bg-background px-3 py-2"
          />
        </label>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCreateOpportunity}
            disabled={createOpportunity.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {createOpportunity.isPending ? 'Creation...' : 'Creer l offre'}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Candidatures</h2>
          <span className="text-sm text-muted-foreground">{applications.length} dossier(s)</span>
        </div>
        {applicationsQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Chargement...</div>
        ) : null}
        {!applicationsQuery.isLoading && applications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Aucune candidature.</div>
        ) : null}
        <div className="divide-y">
          {applications.map(app => {
            const opportunity = app.internship_opportunities
            return (
              <article key={app.id} className="p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{studentName(app)}</h3>
                      {statusBadge(app.status)}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {app.students?.matricola ?? '-'} - {app.students?.degree_programs?.name ?? 'Programme'}
                    </p>
                    <p className="mt-2 text-sm">
                      <span className="font-medium">{opportunity?.title ?? 'Stage'}</span>
                      {' '}chez {opportunity?.company_name ?? '-'}
                    </p>
                    {app.motivation ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{app.motivation}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Candidature: {formatDate(app.applied_at)}</span>
                      <span>Debut: {formatDate(opportunity?.start_date)}</span>
                      <span>Fin: {formatDate(opportunity?.end_date)}</span>
                      <span>CFU: {opportunity?.cfu ?? 0}</span>
                    </div>
                    {app.report_url ? (
                      <a href={app.report_url} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
                        Ouvrir le rapport
                      </a>
                    ) : null}
                    {app.evaluation_score !== null ? (
                      <p className="mt-2 text-sm">
                        Evaluation: <span className="font-semibold">{app.evaluation_score}/30</span>
                        {app.evaluation_feedback ? ` - ${app.evaluation_feedback}` : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {nextActions(app.status).map(next => (
                      next === 'evaluated' ? (
                        <button key={next}
                          onClick={() => setEvaluateFor(app)}
                          className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent">
                          Evaluer
                        </button>
                      ) : (
                        <button key={next}
                          onClick={() => handleStatus(app.id, next)}
                          disabled={updateStatus.isPending}
                          className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60">
                          {STATUSES.find(item => item.value === next)?.label ?? next}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {evaluateFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-background p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Evaluer le stage</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {studentName(evaluateFor)} - {evaluateFor.internship_opportunities?.title ?? 'Stage'}
            </p>
            <label className="mt-4 grid gap-1 text-sm">
              <span className="font-medium">Note /30</span>
              <input
                type="number"
                min={0}
                max={30}
                value={score}
                onChange={event => setScore(Number(event.target.value))}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="mt-3 grid gap-1 text-sm">
              <span className="font-medium">Feedback</span>
              <textarea
                value={feedback}
                onChange={event => setFeedback(event.target.value)}
                rows={4}
                className="rounded-md border bg-background px-3 py-2"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEvaluateFor(null)}
                className="rounded-md border px-3 py-2 text-sm">
                Annuler
              </button>
              <button onClick={handleEvaluate} disabled={evaluate.isPending}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {evaluate.isPending ? 'Evaluation...' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'good' | 'warn' | 'info' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'info' ? 'text-indigo-600' : 'text-rose-600'
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="rounded-md border bg-background px-3 py-2"
      />
    </label>
  )
}
