'use client'

import { useState } from 'react'
import { downloadStudentsCsv, useOverviewReport } from '@/lib/hooks/useAdminReports'

type ReportSection = 'students' | 'results' | 'finance' | 'graduation' | 'placement'

type BreakdownRow = { label: string; count: number; pct: number }
type TrendRow = { year: string; count: number }
type ProgramKpi = {
  total_students?: number
  retention_rate?: number
  pass_rate?: number
  avg_grad_years?: number
  at_risk_count?: number
  degree_programs?: { name?: string; code?: string; type?: string } | null
}

type OverviewReport = {
  totalStudents: number
  activeStudents: number
  graduated: number
  withdrawn: number
  teacherCount: number
  graduationReady: number
  diplomasIssued: number
  avgGpa: number
  avgGrade: number
  avgPassRate: number
  abandonRate: number
  encadrementRatio: string
  totalRevenue: number
  outstandingFees: number
  paymentCollectionRate: number
  examPresenceRate: number
  nationalities: BreakdownRow[]
  studentStatusBreakdown: BreakdownRow[]
  enrollmentTrend: TrendRow[]
  feeBreakdown: BreakdownRow[]
  graduationBreakdown: BreakdownRow[]
  placementSurveyCount: number
  employedAlumni: number
  continuingStudies: number
  seekingEmployment: number
  employmentRate: number
  placementBreakdown: BreakdownRow[]
  placementSectors: BreakdownRow[]
  placementContracts: BreakdownRow[]
  programKpis: ProgramKpi[]
}

function money(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

function pct(value: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

function Sparkbar({ value, max = 100, color = 'bg-rose-600' }: { value: number; max?: number; color?: string }) {
  const width = Math.min(100, max > 0 ? (value / max) * 100 : 0)
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="w-12 text-right text-xs font-semibold">{pct(value)}</span>
    </div>
  )
}

function KpiCard({ label, value, tone }: { label: string; value: string | number; tone?: 'good' | 'warn' | 'info' }) {
  const color = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'info' ? 'text-indigo-600' : 'text-rose-600'
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Breakdown({ title, rows, color }: { title: string; rows: BreakdownRow[]; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="space-y-3">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Aucune donnee.</p> : null}
        {rows.map(row => (
          <div key={row.label}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span>{row.label}</span>
              <span className="font-semibold">{row.count} ({pct(row.pct)})</span>
            </div>
            <Sparkbar value={row.pct} color={color} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminReports() {
  const [section, setSection] = useState<ReportSection>('students')
  const [exporting, setExporting] = useState(false)
  const { data, isLoading, isError } = useOverviewReport()
  const report = data as OverviewReport | null

  async function handleExport() {
    setExporting(true)
    try {
      await downloadStudentsCsv()
    } finally {
      setExporting(false)
    }
  }

  const tabs: { key: ReportSection; label: string }[] = [
    { key: 'students', label: 'Effectifs' },
    { key: 'results', label: 'Resultats' },
    { key: 'finance', label: 'Finance' },
    { key: 'graduation', label: 'Laurea' },
    { key: 'placement', label: 'Placement' },
  ]

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted" />
  }

  if (isError || !report) {
    return <p className="text-sm text-destructive">Impossible de charger les rapports.</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reporting decisionnel</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Synthese academique, finance et diplomation.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          {exporting ? 'Export...' : 'Exporter etudiants CSV'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Etudiants actifs" value={report.activeStudents} tone="info" />
        <KpiCard label="Taux reussite moyen" value={pct(report.avgPassRate)} tone="good" />
        <KpiCard label="Taux abandon" value={pct(report.abandonRate)} tone="warn" />
        <KpiCard label="Encadrement" value={report.encadrementRatio} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSection(tab.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              section === tab.key ? 'border-rose-600 text-rose-600' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'students' ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h3 className="mb-4 font-semibold">Evolution des inscriptions</h3>
            <div className="flex h-36 items-end gap-4">
              {report.enrollmentTrend.map(row => {
                const max = Math.max(...report.enrollmentTrend.map(item => item.count), 1)
                const height = Math.max(12, (row.count / max) * 100)
                return (
                  <div key={row.year} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-bold text-indigo-600">{row.count.toLocaleString('fr-FR')}</span>
                    <div className="w-full rounded-t-lg bg-indigo-500" style={{ height: `${height}%` }} />
                    <span className="text-[10px] text-muted-foreground">{row.year}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Breakdown title="Statuts etudiants" rows={report.studentStatusBreakdown} color="bg-indigo-500" />
            <Breakdown title="Nationalites" rows={report.nationalities} color="bg-rose-500" />
          </div>
        </div>
      ) : null}

      {section === 'results' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Moyenne GPA" value={report.avgGpa} tone="info" />
            <KpiCard label="Moyenne notes" value={report.avgGrade} tone="good" />
            <KpiCard label="Presence examens" value={pct(report.examPresenceRate)} tone="warn" />
            <KpiCard label="Diplomes emis" value={report.diplomasIssued} />
          </div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Etudiants</th>
                  <th className="px-4 py-3">Reussite</th>
                  <th className="px-4 py-3">Retention</th>
                  <th className="px-4 py-3">A risque</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.programKpis.map((row, index) => (
                  <tr key={`${row.degree_programs?.code ?? 'program'}-${index}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.degree_programs?.name ?? 'Programme'}</p>
                      <p className="text-xs text-muted-foreground">{row.degree_programs?.code ?? '-'}</p>
                    </td>
                    <td className="px-4 py-3">{row.total_students ?? 0}</td>
                    <td className="px-4 py-3">{pct(Number(row.pass_rate ?? 0))}</td>
                    <td className="px-4 py-3">{pct(Number(row.retention_rate ?? 0))}</td>
                    <td className="px-4 py-3">{row.at_risk_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {section === 'finance' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Encaisse" value={money(report.totalRevenue)} tone="good" />
            <KpiCard label="Reste du" value={money(report.outstandingFees)} tone="warn" />
            <KpiCard label="Taux recouvrement" value={pct(report.paymentCollectionRate)} tone="info" />
            <KpiCard label="Enseignants" value={report.teacherCount} />
          </div>
          <Breakdown title="Statut des frais" rows={report.feeBreakdown} color="bg-emerald-500" />
        </div>
      ) : null}

      {section === 'graduation' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Candidats prets" value={report.graduationReady} tone="good" />
            <KpiCard label="Diplomes emis" value={report.diplomasIssued} tone="info" />
            <KpiCard label="Diplomes totaux" value={report.graduated} />
            <KpiCard label="Abandons" value={report.withdrawn} tone="warn" />
          </div>
          <Breakdown title="Demandes de Laurea par statut" rows={report.graduationBreakdown} color="bg-violet-500" />
        </div>
      ) : null}

      {section === 'placement' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Reponses placement" value={report.placementSurveyCount ?? 0} tone="info" />
            <KpiCard label="Taux emploi" value={pct(report.employmentRate ?? 0)} tone="good" />
            <KpiCard label="En emploi" value={report.employedAlumni ?? 0} tone="good" />
            <KpiCard label="En recherche" value={report.seekingEmployment ?? 0} tone="warn" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Breakdown title="Situation alumni" rows={report.placementBreakdown ?? []} color="bg-emerald-500" />
            <Breakdown title="Secteurs" rows={report.placementSectors ?? []} color="bg-indigo-500" />
            <Breakdown title="Contrats" rows={report.placementContracts ?? []} color="bg-rose-500" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
