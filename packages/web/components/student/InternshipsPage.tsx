'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  InternshipApplication,
  InternshipOpportunity,
  useApplyForInternship,
  useInternshipOpportunities,
  useStudentInternshipApplications,
  useSubmitInternshipReport,
} from '@/lib/hooks/useStudentInternships'

type Message = { type: 'success' | 'error'; text: string }

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

function statusBadge(status: InternshipApplication['status']) {
  switch (status) {
    case 'approved':
      return <Badge variant="success">Approuve</Badge>
    case 'in_progress':
      return <Badge variant="warning">En cours</Badge>
    case 'report_submitted':
      return <Badge variant="outline">Rapport soumis</Badge>
    case 'evaluated':
      return <Badge variant="success">Evalue</Badge>
    case 'closed':
      return <Badge variant="outline">Cloture</Badge>
    case 'refused':
      return <Badge variant="destructive">Refuse</Badge>
    default:
      return <Badge variant="outline">Soumis</Badge>
  }
}

function LoadingList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(item => (
        <div key={item} className="rounded-lg border bg-card p-4">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-3 w-2/3" />
          <Skeleton className="mt-4 h-9 w-36" />
        </div>
      ))}
    </div>
  )
}

export function InternshipsPage() {
  const opportunitiesQuery = useInternshipOpportunities()
  const applicationsQuery = useStudentInternshipApplications()
  const apply = useApplyForInternship()
  const submitReport = useSubmitInternshipReport()

  const [selectedOpportunity, setSelectedOpportunity] = useState<InternshipOpportunity | null>(null)
  const [motivation, setMotivation] = useState('')
  const [reportFor, setReportFor] = useState<InternshipApplication | null>(null)
  const [reportUrl, setReportUrl] = useState('')
  const [message, setMessage] = useState<Message | null>(null)

  const applications = applicationsQuery.data ?? []
  const appliedOpportunityIds = useMemo(
    () => new Set(applications.map(app => app.internship_opportunities?.id).filter(Boolean)),
    [applications],
  )

  async function handleApply() {
    if (!selectedOpportunity) return
    setMessage(null)
    try {
      const payload: { opportunityId: string; motivation?: string } = {
        opportunityId: selectedOpportunity.id,
      }
      const trimmedMotivation = motivation.trim()
      if (trimmedMotivation) payload.motivation = trimmedMotivation
      await apply.mutateAsync(payload)
      setMessage({ type: 'success', text: 'Candidature envoyee.' })
      setSelectedOpportunity(null)
      setMotivation('')
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Candidature impossible' })
    }
  }

  async function handleSubmitReport() {
    if (!reportFor) return
    setMessage(null)
    try {
      await submitReport.mutateAsync({ applicationId: reportFor.id, reportUrl })
      setMessage({ type: 'success', text: 'Rapport soumis.' })
      setReportFor(null)
      setReportUrl('')
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Depot impossible' })
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Stage / Tirocini</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Stages et candidatures</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Consulte les offres ouvertes, candidate, puis suis le rapport et l evaluation.
        </p>
      </header>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${
          message.type === 'success'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Candidatures</p>
          <p className="mt-2 text-2xl font-semibold">{applications.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">En cours</p>
          <p className="mt-2 text-2xl font-semibold">
            {applications.filter(app => ['approved', 'in_progress', 'report_submitted'].includes(app.status)).length}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">CFU stage</p>
          <p className="mt-2 text-2xl font-semibold">
            {applications.reduce((sum, app) => sum + Number(app.internship_opportunities?.cfu ?? 0), 0)}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Offres ouvertes</h2>
          <span className="text-sm text-muted-foreground">{opportunitiesQuery.data?.length ?? 0} offre(s)</span>
        </div>

        {opportunitiesQuery.isLoading ? <LoadingList /> : null}
        {opportunitiesQuery.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Chargement des offres impossible.
          </div>
        ) : null}

        {!opportunitiesQuery.isLoading && (opportunitiesQuery.data ?? []).length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucune offre ouverte pour le moment.
          </div>
        ) : null}

        <div className="grid gap-3">
          {(opportunitiesQuery.data ?? []).map(opportunity => {
            const alreadyApplied = appliedOpportunityIds.has(opportunity.id)
            return (
              <article key={opportunity.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{opportunity.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {opportunity.company_name}
                      {opportunity.location ? ` - ${opportunity.location}` : ''}
                    </p>
                  </div>
                  <Badge variant="success">Ouverte</Badge>
                </div>
                {opportunity.description && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{opportunity.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Debut: {formatDate(opportunity.start_date)}</span>
                  <span>Fin: {formatDate(opportunity.end_date)}</span>
                  <span>CFU: {opportunity.cfu}</span>
                  <span>Deadline: {formatDate(opportunity.application_deadline)}</span>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={alreadyApplied}
                    onClick={() => setSelectedOpportunity(opportunity)}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {alreadyApplied ? 'Candidature envoyee' : 'Candidater'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mes candidatures</h2>
        {applicationsQuery.isLoading ? <LoadingList /> : null}
        {!applicationsQuery.isLoading && applications.length === 0 ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucune candidature envoyee.
          </div>
        ) : null}

        <div className="grid gap-3">
          {applications.map(application => {
            const opportunity = application.internship_opportunities
            const canSubmitReport = ['approved', 'in_progress'].includes(application.status)
            return (
              <article key={application.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{opportunity?.title ?? 'Stage'}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {opportunity?.company_name ?? 'Entreprise'} - candidature du {formatDate(application.applied_at)}
                    </p>
                  </div>
                  {statusBadge(application.status)}
                </div>
                {application.evaluation_score !== null && (
                  <p className="mt-3 text-sm">
                    Evaluation: <span className="font-semibold">{application.evaluation_score}/30</span>
                    {application.evaluation_feedback ? ` - ${application.evaluation_feedback}` : ''}
                  </p>
                )}
                {application.report_url && (
                  <a href={application.report_url} target="_blank" rel="noopener noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
                    Voir le rapport
                  </a>
                )}
                {canSubmitReport && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setReportFor(application)}
                      className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      Soumettre le rapport
                    </button>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>

      {selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-background p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Candidater a {selectedOpportunity.title}</h2>
            <textarea
              value={motivation}
              onChange={event => setMotivation(event.target.value)}
              rows={5}
              className="mt-4 w-full rounded-md border bg-background p-3 text-sm"
              placeholder="Motivation ou message pour le service stages"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSelectedOpportunity(null)}
                className="rounded-md border px-3 py-2 text-sm">
                Annuler
              </button>
              <button type="button" onClick={handleApply} disabled={apply.isPending}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {apply.isPending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-background p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Soumettre le rapport</h2>
            <input
              value={reportUrl}
              onChange={event => setReportUrl(event.target.value)}
              className="mt-4 w-full rounded-md border bg-background p-3 text-sm"
              placeholder="https://..."
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReportFor(null)}
                className="rounded-md border px-3 py-2 text-sm">
                Annuler
              </button>
              <button type="button" onClick={handleSubmitReport} disabled={submitReport.isPending || !reportUrl}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {submitReport.isPending ? 'Depot...' : 'Soumettre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
