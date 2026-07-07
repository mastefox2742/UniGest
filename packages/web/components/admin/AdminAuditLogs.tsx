'use client'

import { useMemo, useState } from 'react'
import { useAdminAuditLogs, type AuditLogEntry } from '@/lib/hooks/useAdminAudit'

const ACTIONS = [
  '',
  'FEE_SELF_PAY',
  'FEE_CREATE',
  'FEE_MARK_PAID',
  'FEE_WAIVE',
  'CERTIFICATE_REQUEST',
  'CERTIFICATE_ISSUE',
  'CERTIFICATE_PDF_DOWNLOAD',
  'THESIS_SUBMIT',
  'THESIS_STATUS_UPDATE',
  'GRADUATION_APPLY',
  'GRADUATION_STATUS_UPDATE',
  'GRADUATION_JURY_ADD',
  'GRADUATION_JURY_REMOVE',
  'DIPLOMA_GENERATE',
  'REPORT_STUDENTS_EXPORT',
  'ALUMNI_PROFILE_UPSERT',
  'PLACEMENT_SURVEY_SUBMIT',
  'ELEARNING_ANNOUNCEMENT_CREATE',
  'INTERNSHIP_OPPORTUNITY_CREATE',
  'INTERNSHIP_APPLY',
  'INTERNSHIP_STATUS_UPDATE',
  'INTERNSHIP_REPORT_SUBMIT',
  'INTERNSHIP_EVALUATE',
  'GDPR_EXPORT_JSON',
  'GDPR_EXPORT_CSV',
  'GDPR_DELETE_SELF',
  'GDPR_DELETE_BY_ADMIN',
]

const RESOURCES = ['', 'fees', 'certificates', 'thesis', 'graduation', 'reports', 'alumni', 'elearning', 'internships', 'gdpr']

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value))
}

function statusClass(status?: number | null) {
  if (!status) return 'bg-muted text-muted-foreground'
  if (status >= 500) return 'bg-red-100 text-red-700'
  if (status >= 400) return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

function metadataPreview(entry: AuditLogEntry) {
  const duration = entry.metadata?.durationMs
  if (typeof duration === 'number') return `${duration} ms`
  return '-'
}

function DetailRow({ entry }: { entry: AuditLogEntry }) {
  const details = useMemo(() => JSON.stringify(entry.metadata ?? {}, null, 2), [entry.metadata])

  return (
    <details className="rounded-md border bg-muted/30 p-3">
      <summary className="cursor-pointer text-sm font-medium">Details techniques</summary>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <span>Actor: {entry.actor_user_id ?? '-'}</span>
        <span>IP: {entry.ip_address ?? '-'}</span>
        <span>User-agent: {entry.user_agent ?? '-'}</span>
        <span>Resource ID: {entry.resource_id ?? '-'}</span>
      </div>
      <pre className="mt-3 max-h-56 overflow-auto rounded-md bg-background p-3 text-xs">{details}</pre>
    </details>
  )
}

export function AdminAuditLogs() {
  const [action, setAction] = useState('')
  const [resource, setResource] = useState('')
  const [limit, setLimit] = useState(100)

  const filters = useMemo(() => {
    const next: { action?: string; resource?: string; limit: number } = { limit }
    if (action) next.action = action
    if (resource) next.resource = resource
    return next
  }, [action, resource, limit])

  const { data, isLoading, isError, refetch, isFetching } = useAdminAuditLogs(filters)

  const logs = data ?? []
  const errorCount = logs.filter(log => Number(log.status_code ?? 0) >= 400).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Journal d'audit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulte les actions sensibles effectuees dans le back-office et les espaces etudiants.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {isFetching ? 'Actualisation...' : 'Actualiser'}
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Evenements</p>
          <p className="mt-1 text-2xl font-semibold">{logs.length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Erreurs</p>
          <p className="mt-1 text-2xl font-semibold text-yellow-700">{errorCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 md:col-span-2">
          <p className="text-sm text-muted-foreground">Filtre actif</p>
          <p className="mt-1 truncate text-sm font-medium">
            {[action || 'toutes actions', resource || 'toutes ressources', `${limit} lignes`].join(' / ')}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Action</span>
            <select
              value={action}
              onChange={event => setAction(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              {ACTIONS.map(item => (
                <option key={item || 'all-actions'} value={item}>{item || 'Toutes'}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Ressource</span>
            <select
              value={resource}
              onChange={event => setResource(event.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              {RESOURCES.map(item => (
                <option key={item || 'all-resources'} value={item}>{item || 'Toutes'}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Limite</span>
            <select
              value={limit}
              onChange={event => setLimit(Number(event.target.value))}
              className="w-full rounded-md border bg-background px-3 py-2"
            >
              {[50, 100, 250, 500].map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Impossible de charger le journal d'audit.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Ressource</th>
                <th className="px-4 py-3 font-medium">Acteur</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Temps</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td className="px-4 py-6 text-muted-foreground" colSpan={7}>Chargement...</td></tr>
              ) : null}
              {!isLoading && logs.length === 0 ? (
                <tr><td className="px-4 py-6 text-muted-foreground" colSpan={7}>Aucun evenement trouve.</td></tr>
              ) : null}
              {logs.map(log => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3">{log.resource}</td>
                  <td className="px-4 py-3">
                    <div>{log.actor_role ?? '-'}</div>
                    <div className="max-w-40 truncate text-xs text-muted-foreground">{log.actor_user_id ?? '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">{log.method ?? '-'} {log.path ?? '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(log.status_code)}`}>
                      {log.status_code ?? '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{metadataPreview(log)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {logs.slice(0, 5).map(log => (
        <DetailRow key={`detail-${log.id}`} entry={log} />
      ))}
    </div>
  )
}
