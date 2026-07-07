'use client'

import { useMemo, useState } from 'react'
import {
  AlumniProfile,
  useAdminAlumniProfiles,
  usePlacementStats,
} from '@/lib/hooks/useAdminAlumni'

function pct(value: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

function fullName(profile: AlumniProfile) {
  const p = profile.students?.profiles
  return [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Alumni'
}

function latestSurvey(profile: AlumniProfile) {
  return [...(profile.placement_surveys ?? [])].sort((a, b) =>
    new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
  )[0] ?? null
}

function statusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    seeking: 'En recherche',
    employed: 'En emploi',
    self_employed: 'Independant',
    continuing_studies: 'Poursuite etudes',
    not_available: 'Non disponible',
  }
  return status ? labels[status] ?? status : '-'
}

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'warn' | 'info' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'info' ? 'text-indigo-600' : 'text-rose-600'
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Breakdown({ title, rows }: { title: string; rows: Array<{ label: string; count: number }> }) {
  const max = Math.max(...rows.map(row => row.count), 1)
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnee.</p> : null}
        {rows.map(row => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span>{row.label}</span>
              <span className="font-semibold">{row.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-rose-600" style={{ width: `${(row.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminAlumniPlacement() {
  const [graduationYear, setGraduationYear] = useState('')
  const yearFilter = graduationYear ? Number(graduationYear) : undefined
  const profilesQuery = useAdminAlumniProfiles(yearFilter)
  const statsQuery = usePlacementStats()

  const profiles = profilesQuery.data ?? []
  const years = useMemo(() => {
    const current = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, index) => current - index)
  }, [])

  if (profilesQuery.isLoading || statsQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />
  }

  if (profilesQuery.isError || statsQuery.isError) {
    return <p className="text-sm text-destructive">Impossible de charger les donnees alumni.</p>
  }

  const stats = statsQuery.data

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alumni & Placement</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivi des anciens et des resultats d insertion professionnelle.
          </p>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Promotion</span>
          <select
            value={graduationYear}
            onChange={event => setGraduationYear(event.target.value)}
            className="rounded-md border bg-background px-3 py-2"
          >
            <option value="">Toutes</option>
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Reponses placement" value={stats?.total ?? 0} tone="info" />
        <Kpi label="Taux emploi" value={pct(stats?.employmentRate ?? 0)} tone="good" />
        <Kpi label="En emploi" value={stats?.employed ?? 0} tone="good" />
        <Kpi label="En recherche" value={stats?.seeking ?? 0} tone="warn" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="Secteurs" rows={stats?.bySector ?? []} />
        <Breakdown title="Contrats" rows={stats?.byContract ?? []} />
        <Breakdown title="Annees enquete" rows={stats?.bySurveyYear ?? []} />
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Profils alumni</h2>
          <span className="text-sm text-muted-foreground">{profiles.length} profil(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Alumni</th>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Promotion</th>
                <th className="px-4 py-3">Situation</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Derniere enquete</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {profiles.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-muted-foreground" colSpan={6}>
                    Aucun profil alumni.
                  </td>
                </tr>
              ) : null}
              {profiles.map(profile => {
                const survey = latestSurvey(profile)
                return (
                  <tr key={profile.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{fullName(profile)}</p>
                      <p className="text-xs text-muted-foreground">{profile.students?.matricola ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{profile.students?.degree_programs?.name ?? '-'}</p>
                      <p className="text-xs text-muted-foreground">{profile.students?.degree_programs?.code ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3">{profile.graduation_year ?? '-'}</td>
                    <td className="px-4 py-3">{statusLabel(survey?.employment_status)}</td>
                    <td className="px-4 py-3">
                      <p>{survey?.company_name ?? '-'}</p>
                      <p className="text-xs text-muted-foreground">{survey?.job_title ?? ''}</p>
                    </td>
                    <td className="px-4 py-3">{formatDate(survey?.submitted_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
