'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronDown } from 'lucide-react'

// ─── Données démo ─────────────────────────────────────────────────────────────
const STUDENT = {
  firstName:  'Demo',
  lastName:   'Étudiant',
  fullName:   'Demo Étudiant',
  matricola:  'M-2024-001',
  degree:     'Sciences de l\'Informatique',
  degreeCode: 'L-31',
  year:       2,
  email:      'demo.etudiant@unigest.fr',
  phone:      '+33 6 12 34 56 78',
  address:    '12 Rue de l\'Université, 75005 Paris',
}

const LIBRETTO = {
  cfuEarned:    39,
  cfuTotal:     180,
  weightedMean: 28.08,
  laureaEst:    102.9,
  examsCount:   5,
  yearAcad:     '2025/2026',
  anneeReg:     '2024',
  enrollment:   'actif',
  dateImmat:    '11/12/2024',
}

const TODAY_SLOTS = [
  { id: 'c1', startTime: '08:30', endTime: '10:30', course: 'Analyse Mathématique II',  code: 'MAT201', teacher: 'Prof. Rossi Marco',   room: 'Salle B201', mode: 'presential' as const },
  { id: 'c2', startTime: '11:00', endTime: '13:00', course: 'Réseaux Informatiques',    code: 'INF302', teacher: 'Prof. Conti Paolo',   room: null,         mode: 'online'     as const },
  { id: 'c3', startTime: '14:30', endTime: '16:30', course: 'Bases de données (TD)',    code: 'INF301', teacher: 'Prof. Ferrari Anna',  room: 'Salle D102', mode: 'presential' as const },
]

const DEADLINES = [
  { id: 'd1', label: 'Fermeture — Analyse Mathématique II', detail: 'Inscriptions examen (session juin)', daysLeft: 2,  href: '/student/exams', type: 'exam_reg' as const },
  { id: 'd2', label: '2ème tranche 2025/2026 — 450 €',      detail: 'Date limite paiement des frais',   daysLeft: 5,  href: '/student/fees',  type: 'payment'  as const },
  { id: 'd3', label: 'Fermeture — Réseaux Informatiques',   detail: 'Inscriptions examen (session juin)', daysLeft: 6,  href: '/student/exams', type: 'exam_reg' as const },
  { id: 'd4', label: 'Rendu projet — Prog. Avancée',         detail: 'Dépôt du projet final',             daysLeft: 14, href: '/student/courses', type: 'project' as const },
]

const ANNOUNCEMENTS = [
  { id: 'a1', from: 'Prof. Conti Paolo', role: 'teacher' as const, msg: 'Le cours de Réseaux de demain se déroulera en visioconférence uniquement.', ago: 'il y a 2 h', urgent: true },
  { id: 'a2', from: 'Secrétariat',       role: 'admin'   as const, msg: 'Rappel : la session de juin ouvre les inscriptions aux examens le 25 mai.', ago: 'il y a 1 j', urgent: false },
  { id: 'a3', from: 'Prof. Ferrari',     role: 'teacher' as const, msg: 'La correction du TP3 est disponible dans l\'espace cours INF301.', ago: 'il y a 3 j', urgent: false },
]

// ─── Section accordéon ────────────────────────────────────────────────────────
interface SectionProps {
  title:    string
  badge?:   string
  badgeRed?: boolean
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, badge, badgeRed, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-0 py-4 text-left hover:bg-transparent group"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[15px]">{title}</span>
          {badge && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${
              badgeRed
                ? 'bg-red-100 text-red-700 border-red-200'
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground group-hover:text-primary transition-colors">
          <span>{open ? 'Masquer les détails' : 'Voir les détails'}</span>
          {open
            ? <ChevronDown className="h-3.5 w-3.5" />
            : <ChevronRight className="h-3.5 w-3.5" />
          }
        </div>
      </button>

      {open && (
        <div className="pb-5">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Contenu : Profil ─────────────────────────────────────────────────────────
function ProfilContent() {
  const rows = [
    { label: 'Nom complet',   value: STUDENT.fullName    },
    { label: 'Matricule',     value: STUDENT.matricola   },
    { label: 'Email',         value: STUDENT.email       },
    { label: 'Téléphone',     value: STUDENT.phone       },
    { label: 'Adresse',       value: STUDENT.address     },
  ]
  return (
    <div className="space-y-2">
      {rows.map(r => (
        <div key={r.label} className="flex gap-3 text-sm">
          <span className="w-32 shrink-0 text-muted-foreground">{r.label}</span>
          <span className="font-medium">{r.value}</span>
        </div>
      ))}
      <div className="pt-2">
        <Link href="/student/settings" className="text-[12px] text-primary hover:underline underline-offset-2">
          Modifier mes informations →
        </Link>
      </div>
    </div>
  )
}

// ─── Contenu : Status étudiant ────────────────────────────────────────────────
function StatusContent() {
  const pct = Math.round((LIBRETTO.cfuEarned / LIBRETTO.cfuTotal) * 100)
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {[
          { label: 'Année académique',    value: LIBRETTO.yearAcad },
          { label: 'Année de règlement',  value: LIBRETTO.anneeReg },
          { label: 'Statut de carrière',  value: <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /><strong>actif</strong> pour Immatriculation</span> },
          { label: 'Diplôme',             value: <strong>{LIBRETTO.cfuEarned} CFU sur {LIBRETTO.cfuTotal}</strong> },
          { label: 'Date immatriculation', value: LIBRETTO.dateImmat },
        ].map((r, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <span className="w-44 shrink-0 text-muted-foreground">{r.label}</span>
            <span>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Barre progression */}
      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
          <span>Progression du cursus</span>
          <span className="font-semibold">{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Résumé examens */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Résumé des examens</p>
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-2xl font-black text-primary">{LIBRETTO.examsCount}</p>
            <p className="text-[11px] text-muted-foreground">Enregistrés</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-primary">{LIBRETTO.weightedMean.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">Moy. pond. / 30</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-primary">{LIBRETTO.laureaEst.toFixed(1)}</p>
            <p className="text-[11px] text-muted-foreground">Est. Laurea / 110</p>
          </div>
        </div>
      </div>

      <Link href="/student/libretto" className="text-[12px] text-primary hover:underline underline-offset-2">
        Aller à mon libretto →
      </Link>
    </div>
  )
}

// ─── Contenu : Cours du jour ──────────────────────────────────────────────────
function CoursContent() {
  if (TODAY_SLOTS.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun cours prévu aujourd'hui.</p>
    )
  }
  return (
    <div className="space-y-2">
      {TODAY_SLOTS.map(slot => (
        <div key={slot.id} className="flex items-start gap-4 rounded-xl border bg-muted/20 px-4 py-3">
          <div className="shrink-0 text-center min-w-[48px]">
            <p className="text-[11px] font-bold tabular-nums">{slot.startTime}</p>
            <div className="my-0.5 h-px w-3 bg-border mx-auto" />
            <p className="text-[10px] text-muted-foreground tabular-nums">{slot.endTime}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{slot.course}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {slot.teacher}{slot.room && ` · ${slot.room}`}
            </p>
            {slot.mode === 'online' && (
              <span className="mt-1 inline-flex items-center rounded-full bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 text-[10px] font-bold">
                En ligne
              </span>
            )}
          </div>
        </div>
      ))}
      <Link href="/student/schedule" className="text-[12px] text-primary hover:underline underline-offset-2">
        Voir l'emploi du temps complet →
      </Link>
    </div>
  )
}

// ─── Contenu : Échéances ──────────────────────────────────────────────────────
function EcheancesContent() {
  const icons = { exam_reg: '📅', payment: '💰', project: '📋', exam: '📝' }
  return (
    <div className="space-y-2">
      {DEADLINES.map(dl => {
        const urgent = dl.daysLeft <= 2
        return (
          <Link
            key={dl.id}
            href={dl.href}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 hover:brightness-95 transition-all group ${
              urgent
                ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                : 'border-border bg-muted/20'
            }`}
          >
            <span className="text-base shrink-0">{icons[dl.type]}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-tight truncate ${urgent ? 'text-red-800 dark:text-red-400' : ''}`}>
                {dl.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{dl.detail}</p>
            </div>
            <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${
              urgent
                ? 'bg-red-100 text-red-800 border-red-200'
                : dl.daysLeft <= 7
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-muted text-muted-foreground border-border'
            }`}>
              {dl.daysLeft <= 1 ? 'Demain !' : `J−${dl.daysLeft}`}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Contenu : Messagerie ─────────────────────────────────────────────────────
function MessagerieContent() {
  return (
    <div className="space-y-2">
      {ANNOUNCEMENTS.map(ann => (
        <div key={ann.id} className="flex items-start gap-3 rounded-xl border bg-muted/20 px-4 py-3">
          <div className={`mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            ann.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {ann.role === 'admin' ? '🏛' : '👤'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[11px] font-semibold">{ann.from}</p>
              {ann.urgent && (
                <span className="rounded-full bg-orange-100 text-orange-700 px-1.5 py-0.5 text-[9px] font-bold">Urgent</span>
              )}
              <span className="text-[10px] text-muted-foreground ml-auto">{ann.ago}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">{ann.msg}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function StudentDashboard() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const hour = time.getHours()
  const hello = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const urgentCount = DEADLINES.filter(d => d.daysLeft <= 2).length
  const unreadCount = ANNOUNCEMENTS.filter(a => a.urgent).length

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── En-tête de bienvenue ──────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground mb-1">{hello},</p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight uppercase">
          {STUDENT.fullName}
        </h1>
        <div className="mt-1 h-1 w-12 rounded-full bg-primary" />
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Bienvenue dans votre espace étudiant. Utilisez les sections ci-dessous pour accéder à vos informations.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Pour modifier votre mot de passe{' '}
          <Link href="/student/settings" className="text-primary underline underline-offset-2">cliquez ici</Link>.
        </p>
      </div>

      {/* ── Sections accordéon ───────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card shadow-sm divide-y overflow-hidden">
        <div className="px-5">

          <Section title="Données personnelles">
            <ProfilContent />
          </Section>

          <Section
            title="Statut étudiant"
            badge={`${LIBRETTO.examsCount} examens`}
            defaultOpen
          >
            <StatusContent />
          </Section>

          <Section
            title="Cours du jour"
            badge={`${TODAY_SLOTS.length} cours`}
          >
            <CoursContent />
          </Section>

          <Section
            title="Prochaines échéances"
            badge={urgentCount > 0 ? `${urgentCount} urgent${urgentCount > 1 ? 's' : ''}` : `${DEADLINES.length} à venir`}
            badgeRed={urgentCount > 0}
          >
            <EcheancesContent />
          </Section>

          <Section
            title="Messagerie"
            badge={unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : undefined}
            badgeRed={unreadCount > 0}
          >
            <MessagerieContent />
          </Section>

        </div>
      </div>

      {/* ── Liens rapides ────────────────────────────────────────────────── */}
      <div className="mt-6 text-center">
        <p className="text-[12px] text-muted-foreground">
          Accédez aux autres services via le menu de navigation.
        </p>
      </div>

    </div>
  )
}
