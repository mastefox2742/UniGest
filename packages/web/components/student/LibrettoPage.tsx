'use client'

import { useState, useMemo } from 'react'
import { useStudentCareer, type LibrettoEntry } from '@/lib/hooks/useLibretto'
import {
  gradeValue,
  gradeVariant,
  passedEntries,
  arithmeticMean,
  weightedMean,
  cfuAcquired,
  laureaNoteEstimate,
  buildPdfHtml,
} from '@/lib/utils/grades'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// ─── CFU total du parcours (à adapter selon le type de diplôme) ───────────────
const CFU_LAUREA_TRIENNALE  = 180
const CFU_LAUREA_MAGISTRALE = 120

// ─── Données démo (entrées non encore validées) ───────────────────────────────
const DEMO_ENTRIES_PASSED: LibrettoEntry[] = [
  {
    id: 'd1', matricola: 'M-2024-001', studentName: 'Demo Étudiant',
    degreeProgram: 'Informatique', degreeType: 'Laurea Triennale',
    courseCode: 'MAT001', courseName: 'Algèbre Linéaire',
    cfu: 9, courseYear: 1, semester: 1,
    grade: '28', gradeStatus: 'published',
    publishedAt: '2024-02-15', examDate: '2024-02-15', teacherName: 'Prof. Rossi Marco',
  },
  {
    id: 'd2', matricola: 'M-2024-001', studentName: 'Demo Étudiant',
    degreeProgram: 'Informatique', degreeType: 'Laurea Triennale',
    courseCode: 'INF001', courseName: 'Introduction à l\'Informatique',
    cfu: 6, courseYear: 1, semester: 1,
    grade: '30L', gradeStatus: 'published',
    publishedAt: '2024-02-20', examDate: '2024-02-20', teacherName: 'Prof. Esposito Roberto',
  },
  {
    id: 'd3', matricola: 'M-2024-001', studentName: 'Demo Étudiant',
    degreeProgram: 'Informatique', degreeType: 'Laurea Triennale',
    courseCode: 'MAT101', courseName: 'Analyse Mathématique I',
    cfu: 9, courseYear: 1, semester: 2,
    grade: '26', gradeStatus: 'published',
    publishedAt: '2024-07-10', examDate: '2024-07-10', teacherName: 'Prof. Rossi Marco',
  },
  {
    id: 'd4', matricola: 'M-2024-001', studentName: 'Demo Étudiant',
    degreeProgram: 'Informatique', degreeType: 'Laurea Triennale',
    courseCode: 'INF201', courseName: 'Programmation Orientée Objet',
    cfu: 6, courseYear: 2, semester: 1,
    grade: '30', gradeStatus: 'published',
    publishedAt: '2025-02-10', examDate: '2025-02-10', teacherName: 'Prof. Bianchi Laura',
  },
  {
    id: 'd5', matricola: 'M-2024-001', studentName: 'Demo Étudiant',
    degreeProgram: 'Informatique', degreeType: 'Laurea Triennale',
    courseCode: 'INF301', courseName: 'Bases de données',
    cfu: 6, courseYear: 2, semester: 1,
    grade: '29', gradeStatus: 'published',
    publishedAt: '2025-02-18', examDate: '2025-02-18', teacherName: 'Prof. Ferrari Anna',
  },
  {
    id: 'd6', matricola: 'M-2024-001', studentName: 'Demo Étudiant',
    degreeProgram: 'Informatique', degreeType: 'Laurea Triennale',
    courseCode: 'COM101', courseName: 'Communication Scientifique',
    cfu: 3, courseYear: 1, semester: 2,
    grade: '25', gradeStatus: 'published',
    publishedAt: '2024-07-25', examDate: '2024-07-25', teacherName: 'Prof. Moretti Chiara',
  },
]

const DEMO_ENTRIES_PENDING: Array<Omit<LibrettoEntry, 'grade' | 'gradeStatus' | 'publishedAt' | 'examDate'> & {
  grade: ''; gradeStatus: 'pending'; publishedAt: null; examDate: null; nextExam?: string
}> = [
  {
    id: 'p1', matricola: 'M-2024-001', studentName: 'Demo Étudiant',
    degreeProgram: 'Informatique', degreeType: 'Laurea Triennale',
    courseCode: 'INF302', courseName: 'Réseaux Informatiques',
    cfu: 6, courseYear: 2, semester: 2,
    grade: '', gradeStatus: 'pending', publishedAt: null, examDate: null,
    teacherName: 'Prof. Conti Paolo', nextExam: '2026-06-15',
  },
  {
    id: 'p2', matricola: 'M-2024-001', studentName: 'Demo Étudiant',
    degreeProgram: 'Informatique', degreeType: 'Laurea Triennale',
    courseCode: 'INF303', courseName: 'Systèmes d\'exploitation',
    cfu: 6, courseYear: 2, semester: 2,
    grade: '', gradeStatus: 'pending', publishedAt: null, examDate: null,
    teacherName: 'Prof. Marini Giulia', nextExam: '2026-06-28',
  },
  {
    id: 'p3', matricola: 'M-2024-001', studentName: 'Demo Étudiant',
    degreeProgram: 'Informatique', degreeType: 'Laurea Triennale',
    courseCode: 'MAT201', courseName: 'Analyse Mathématique II',
    cfu: 9, courseYear: 2, semester: 2,
    grade: '', gradeStatus: 'pending', publishedAt: null, examDate: null,
    teacherName: 'Prof. Rossi Marco', nextExam: '2026-07-03',
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterStatus = 'all' | 'passed' | 'pending'
type SortField = 'courseYear' | 'courseName' | 'grade' | 'examDate' | 'cfu'
type SortDir   = 'asc' | 'desc'

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function LibrettoSkeleton() {
  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map((i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 space-y-3 animate-pulse">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="rounded-2xl border bg-card p-5 space-y-3 animate-pulse">
        {[1,2,3,4,5,6].map((i) => (
          <div key={i} className="flex gap-4 py-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-6 w-12 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Carte KPI ────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, progress, accent,
}: {
  label: string
  value: string
  sub?: string
  progress?: { value: number; max: number }
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl border bg-card p-5 flex flex-col gap-2 transition-shadow hover:shadow-md ${accent ? 'border-primary/30 bg-primary/5' : ''}`}>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${accent ? 'text-primary' : ''}`}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      {progress && (
        <div className="space-y-1 mt-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (progress.value / progress.max) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">
            {progress.value} / {progress.max} CFU
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Badge note ───────────────────────────────────────────────────────────────
function GradeBadge({ grade }: { grade: string }) {
  if (!grade || grade === '') {
    return (
      <span className="inline-flex items-center rounded-full border border-dashed px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
        À passer
      </span>
    )
  }
  const variant = gradeVariant(grade)
  return (
    <Badge variant={variant} className="tabular-nums font-bold">
      {grade === '30L' ? '30L ✦' : grade}
    </Badge>
  )
}

// ─── Ligne tableau ────────────────────────────────────────────────────────────
function EntryRow({
  entry,
  pending,
  nextExam,
}: {
  entry: LibrettoEntry
  pending?: boolean
  nextExam?: string | undefined
}) {
  const fmtDate = (d: string | null) =>
    d ? new Intl.DateTimeFormat('fr-FR').format(new Date(d)) : '—'

  return (
    <tr className={`group transition-colors hover:bg-muted/30 ${pending ? 'opacity-70' : ''}`}>
      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
        {entry.courseCode}
      </td>
      <td className="py-3 px-4 text-sm font-medium max-w-[260px]">
        <span className="line-clamp-1">{entry.courseName}</span>
      </td>
      <td className="py-3 px-4 text-center text-sm tabular-nums">{entry.cfu}</td>
      <td className="py-3 px-4 text-center">
        <GradeBadge grade={entry.grade} />
      </td>
      <td className="py-3 px-4 text-[12px] text-muted-foreground whitespace-nowrap">
        {pending && nextExam
          ? <span className="text-amber-600 font-medium">📅 {fmtDate(nextExam)}</span>
          : fmtDate(entry.examDate)
        }
      </td>
      <td className="py-3 px-4 text-center text-[11px] text-muted-foreground">{entry.courseYear}</td>
      <td className="py-3 px-4 text-center text-[11px] text-muted-foreground">{entry.semester}</td>
    </tr>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function LibrettoPage() {
  const { data: career, isLoading } = useStudentCareer()
  const [filter,   setFilter]   = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('courseYear')
  const [sortDir,   setSortDir]   = useState<SortDir>('asc')
  const [exporting, setExporting] = useState(false)

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  // Utiliser la demo uniquement en mode demo explicite.
  const passedReal: LibrettoEntry[] =
    career?.libretto && career.libretto.length > 0
      ? passedEntries(career.libretto)
      : demoMode
      ? DEMO_ENTRIES_PASSED
      : []

  const pendingEntries = demoMode
    ? DEMO_ENTRIES_PENDING as unknown as Array<LibrettoEntry & { nextExam?: string }>
    : []

  // ── Statistiques ─────────────────────────────────────────────────────────
  const aMean  = career?.summary.arithmeticMean ?? arithmeticMean(passedReal)
  const wMean  = career?.summary.weightedMean ?? weightedMean(passedReal)
  const cfuAcq = career?.summary.totalCfuEarned ?? cfuAcquired(passedReal)
  const laurea = career?.summary.laureaStartScore ?? laureaNoteEstimate(wMean)

  // Déterminer le total CFU depuis les données (triennale = 180, magistrale = 120)
  const degreeType  = career?.student.degreeType ?? passedReal[0]?.degreeType ?? ''
  const cfuTotal    = career?.summary.totalCfu ?? (
    degreeType.toLowerCase().includes('magistrale')
      ? CFU_LAUREA_MAGISTRALE
      : CFU_LAUREA_TRIENNALE
  )

  // ── Tri ───────────────────────────────────────────────────────────────────
  const sortedPassed = useMemo(() => {
    return [...passedReal].sort((a, b) => {
      let cmp = 0
      if      (sortField === 'courseYear')  cmp = a.courseYear - b.courseYear
      else if (sortField === 'courseName')  cmp = a.courseName.localeCompare(b.courseName)
      else if (sortField === 'grade')       cmp = gradeValue(a.grade) - gradeValue(b.grade)
      else if (sortField === 'examDate')    cmp = (a.examDate ?? '').localeCompare(b.examDate ?? '')
      else if (sortField === 'cfu')         cmp = a.cfu - b.cfu
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [passedReal, sortField, sortDir])

  const sortedPending = useMemo(() => {
    return [...pendingEntries].sort((a, b) => a.courseYear - b.courseYear || a.courseName.localeCompare(b.courseName))
  }, [pendingEntries])

  // ── Lignes à afficher ─────────────────────────────────────────────────────
  const showPassed  = filter !== 'pending'
  const showPending = filter !== 'passed'

  // ── Colonne de tri ────────────────────────────────────────────────────────
  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="opacity-20">↕</span>
    return <span className="text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  function handleExport() {
    setExporting(true)
    try {
      const studentName   = passedReal[0]?.studentName   ?? 'Étudiant'
      const matricola     = passedReal[0]?.matricola     ?? '—'
      const degreeProgram = passedReal[0]?.degreeProgram ?? '—'
      const dt            = passedReal[0]?.degreeType    ?? '—'

      const html = buildPdfHtml({
        studentName,
        matricola,
        degreeProgram,
        degreeType: dt,
        entries:    passedReal,
        cfuTotal,
      })

      const win = window.open('', '_blank', 'width=900,height=700')
      if (!win) { alert('Veuillez autoriser les popups pour exporter le PDF.'); return }
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 400)
    } finally {
      setExporting(false)
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (isLoading) return <LibrettoSkeleton />

  const filterButtons: Array<{ key: FilterStatus; label: string }> = [
    { key: 'all',     label: '📋 Tous'          },
    { key: 'passed',  label: '✅ Validés'        },
    { key: 'pending', label: '📌 À passer'       },
  ]

  return (
    <div className="space-y-6 pb-8">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">📊 Libretto Universitario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Relevé de notes officiel · {passedReal.length} matière{passedReal.length > 1 ? 's' : ''} validée{passedReal.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || passedReal.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <span>📄</span>
          )}
          Exporter PDF
        </button>
      </div>

      {/* ── KPI ─────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Moyenne arithmétique"
          value={aMean > 0 ? `${aMean.toFixed(2)}` : '—'}
          sub="/ 30"
        />
        <KpiCard
          label="Moyenne pondérée"
          value={wMean > 0 ? `${wMean.toFixed(2)}` : '—'}
          sub="/ 30 · pondérée par CFU"
          accent
        />
        <KpiCard
          label="CFU validés"
          value={`${cfuAcq}`}
          progress={{ value: cfuAcq, max: cfuTotal }}
        />
        <KpiCard
          label="Note de départ Laurea"
          value={laurea > 0 ? `${laurea.toFixed(1)}` : '—'}
          sub="/ 110 · estimation"
          accent
        />
      </div>

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl bg-muted p-1 w-fit">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {showPassed && showPending
            ? `${passedReal.length} validé${passedReal.length > 1 ? 's' : ''} + ${sortedPending.length} à passer`
            : showPassed
            ? `${passedReal.length} matière${passedReal.length > 1 ? 's' : ''} validée${passedReal.length > 1 ? 's' : ''}`
            : `${sortedPending.length} matière${sortedPending.length > 1 ? 's' : ''} à passer`
          }
        </p>
      </div>

      {/* ── Tableau ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="py-3 px-4 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-[90px]">
                  Code
                </th>
                <th
                  className="py-3 px-4 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort('courseName')}
                >
                  Matière <SortIcon field="courseName" />
                </th>
                <th
                  className="py-3 px-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer hover:text-foreground select-none w-[60px]"
                  onClick={() => toggleSort('cfu')}
                >
                  CFU <SortIcon field="cfu" />
                </th>
                <th
                  className="py-3 px-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer hover:text-foreground select-none w-[90px]"
                  onClick={() => toggleSort('grade')}
                >
                  Note <SortIcon field="grade" />
                </th>
                <th
                  className="py-3 px-4 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer hover:text-foreground select-none w-[110px]"
                  onClick={() => toggleSort('examDate')}
                >
                  Date <SortIcon field="examDate" />
                </th>
                <th
                  className="py-3 px-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold cursor-pointer hover:text-foreground select-none w-[50px]"
                  onClick={() => toggleSort('courseYear')}
                >
                  An <SortIcon field="courseYear" />
                </th>
                <th className="py-3 px-4 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-[50px]">
                  Sem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Entrées validées */}
              {showPassed && sortedPassed.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}

              {/* Séparateur si les deux catégories sont visibles */}
              {showPassed && showPending && sortedPassed.length > 0 && (
                <tr>
                  <td colSpan={7} className="bg-amber-50/60 dark:bg-amber-950/20 py-2 px-4 text-[11px] font-semibold text-amber-700 dark:text-amber-400 tracking-wide">
                    📌 Matières à passer
                  </td>
                </tr>
              )}

              {/* Entrées à passer */}
              {showPending && sortedPending.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry as LibrettoEntry}
                  pending
                  nextExam={entry.nextExam}
                />
              ))}

              {/* Vide */}
              {!showPassed && sortedPending.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    Aucune matière à passer.
                  </td>
                </tr>
              )}
              {!showPending && sortedPassed.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                    Aucune matière validée.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Pied de tableau — totaux */}
            {showPassed && sortedPassed.length > 0 && (
              <tfoot>
                <tr className="border-t-2 bg-muted/30">
                  <td colSpan={2} className="py-3 px-4 text-[11px] text-muted-foreground font-medium">
                    Total — {sortedPassed.length} matière{sortedPassed.length > 1 ? 's' : ''} validée{sortedPassed.length > 1 ? 's' : ''}
                  </td>
                  <td className="py-3 px-4 text-center text-sm font-bold tabular-nums">{cfuAcq}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className="text-xs tabular-nums font-semibold">
                      ø {wMean.toFixed(2)}
                    </Badge>
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Note de bas de page ──────────────────────────────────────────── */}
      <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
        La note de départ Laurea est une estimation calculée selon la formule italienne :<br />
        <strong>Voto di Partenza = Moyenne Pondérée × (11/3)</strong> — sujet à variation selon la commission.
      </p>
    </div>
  )
}
