'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Données ──────────────────────────────────────────────────────────────────
const STUDENT = {
  fullName:   'Miche Fresneil Zlat Mboni Obambi',
  realName:   'MICHE FRESNEIL',
  matricula:  'M-2024-001',
  degree:     'Sciences de l\'informatique',
  degreeCode: 'L-31',
  year:       1,
  email:      'miche.fresneil@etudiant.unigest.fr',
  phone:      '+33 6 12 34 56 78',
  address:    '12 Rue de l\'Université, 75005 Paris',
}

const LIVRET = {
  cfuEarned:    39,
  cfuTotal:     180,
  weightedMean: 28.08,
  laureaEst:    102.9,
  examsCount:   5,
  yearAcad:     '2025/2026',
  anneeReg:     '2024',
  dateImmat:    '11/12/2024',
}

const TODAY_SLOTS = [
  { id: 'c1', startTime: '08:30', endTime: '10:30', course: 'Analyse Mathématique II',  teacher: 'Prof. Rossi Marco',  room: 'Salle B201', mode: 'presential' as const },
  { id: 'c2', startTime: '11:00', endTime: '13:00', course: 'Réseaux Informatiques',    teacher: 'Prof. Conti Paolo',  room: null,          mode: 'online'     as const },
  { id: 'c3', startTime: '14:30', endTime: '16:30', course: 'Bases de données (TD)',    teacher: 'Prof. Ferrari Anna', room: 'Salle D102',  mode: 'presential' as const },
]

const DEADLINES = [
  { id: 'd1', label: 'Clôture — Analyse Mathématique II', detail: 'Inscription examen (session juin)',   daysLeft: 2,  href: '/student/exams',   type: 'exam_reg' as const },
  { id: 'd2', label: '2ème tranche 2025/2026 — 450 €',    detail: 'Date limite paiement des frais',     daysLeft: 5,  href: '/student/fees',    type: 'payment'  as const },
  { id: 'd3', label: 'Clôture — Réseaux Informatiques',   detail: 'Inscription examen (session juin)',   daysLeft: 6,  href: '/student/exams',   type: 'exam_reg' as const },
  { id: 'd4', label: 'Remise projet — Prog. Avancée',      detail: 'Dépôt du projet final sur la plateforme', daysLeft: 14, href: '/student/courses', type: 'project' as const },
]

const ANNOUNCEMENTS = [
  { id: 'a1', from: 'Prof. Conti Paolo', role: 'teacher' as const, msg: 'Le cours de Réseaux de demain se déroulera exclusivement en visioconférence.', ago: 'il y a 2 h', urgent: true  },
  { id: 'a2', from: 'Secrétariat',       role: 'admin'   as const, msg: 'Rappel : la session de juin ouvre les inscriptions aux examens le 25 mai.',    ago: 'il y a 1 j', urgent: false },
  { id: 'a3', from: 'Prof. Ferrari',     role: 'teacher' as const, msg: "La correction du TP3 est disponible dans l'espace cours INF301.",              ago: 'il y a 3 j', urgent: false },
]

// ─── Section accordéon style ALICE ────────────────────────────────────────────
interface SectionProps {
  title:        string
  subtitle?:    string
  badge?:       string | undefined
  badgeRed?:    boolean
  children:     React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, subtitle, badge, badgeRed, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`border-b border-border last:border-b-0 transition-colors duration-150 ${open ? 'bg-card' : 'bg-muted/20 hover:bg-muted/40'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-[15px] text-left cursor-pointer"
        aria-expanded={open}
      >
        {/* Titre + badge + sous-titre */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[17px] font-semibold leading-tight tracking-tight">{title}</span>
            {badge && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                badgeRed
                  ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800'
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[12px] text-muted-foreground mt-0.5 font-normal">{subtitle}</p>
          )}
        </div>

        {/* Visualizza dettagli ▶ */}
        <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground select-none">
          <span className="text-[12px] hidden sm:inline">
            {open ? 'Masquer les détails' : 'Voir les détails'}
          </span>
          <span className={`text-[9px] font-black transition-transform duration-150 ${open ? 'rotate-90' : ''}`}>▶</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border bg-card px-4 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Contenu : Données personnelles ──────────────────────────────────────────
function ProfilContent() {
  return (
    <div className="space-y-2.5">
      {[
        { label: 'Nom complet', value: STUDENT.fullName  },
        { label: 'Matricule',   value: STUDENT.matricula },
        { label: 'Email',       value: STUDENT.email     },
        { label: 'Téléphone',   value: STUDENT.phone     },
        { label: 'Adresse',     value: STUDENT.address   },
      ].map(r => (
        <div key={r.label} className="flex gap-3 text-sm">
          <span className="w-32 shrink-0 text-muted-foreground">{r.label}</span>
          <span className="font-medium break-all">{r.value}</span>
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

// ─── Contenu : Statut étudiant ────────────────────────────────────────────────
function StatusContent() {
  const pct = Math.round((LIVRET.cfuEarned / LIVRET.cfuTotal) * 100)
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {[
          { label: 'Année académique',      value: <strong>{LIVRET.yearAcad}</strong> },
          { label: 'Année de règlement',    value: <strong>{LIVRET.anneeReg}</strong> },
          { label: 'Statut de carrière',    value: (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <strong>actif</strong>&nbsp;pour&nbsp;<strong>Immatriculation</strong>
              </span>
            )
          },
          { label: 'Diplôme',               value: <strong>L-31 — Sciences de l'informatique</strong> },
          { label: "Date d'immatriculation", value: <strong>{LIVRET.dateImmat}</strong> },
        ].map((r, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <span className="w-44 shrink-0 text-muted-foreground">{r.label}</span>
            <span>{r.value}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>Progression du cursus</span>
          <span className="font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Récapitulatif des examens</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { val: LIVRET.examsCount,              lbl: 'Examens enregistrés' },
            { val: LIVRET.weightedMean.toFixed(2), lbl: 'Moy. pond. / 30'    },
            { val: LIVRET.laureaEst.toFixed(1),    lbl: 'Est. Laurea / 110'   },
          ].map(s => (
            <div key={s.lbl}>
              <p className="text-xl font-black text-primary tabular-nums">{s.val}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.lbl}</p>
            </div>
          ))}
        </div>
      </div>

      <Link href="/student/libretto" className="text-[12px] text-primary hover:underline underline-offset-2">
        Aller à mon livret →
      </Link>
    </div>
  )
}

// ─── Contenu : Cours du jour ──────────────────────────────────────────────────
function CoursContent() {
  if (TODAY_SLOTS.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun cours prévu aujourd'hui.</p>
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
              <span className="mt-1.5 inline-flex items-center rounded-full bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800 px-2 py-0.5 text-[10px] font-bold">
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

// ─── Contenu : Prochaines échéances ──────────────────────────────────────────
function EcheancesContent() {
  const icons: Record<string, string> = { exam_reg: '📅', payment: '💰', project: '📋', exam: '📝' }
  return (
    <div className="space-y-2">
      {DEADLINES.map(dl => {
        const urgent = dl.daysLeft <= 2
        return (
          <Link
            key={dl.id}
            href={dl.href}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 hover:brightness-95 transition-all ${
              urgent
                ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800'
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
                ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800'
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
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <p className="text-[11px] font-semibold">{ann.from}</p>
              {ann.urgent && (
                <span className="rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 px-1.5 py-0.5 text-[9px] font-bold">
                  Urgent
                </span>
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
  const urgentCount = DEADLINES.filter(d => d.daysLeft <= 2).length
  const unreadCount = ANNOUNCEMENTS.filter(a => a.urgent).length

  const h     = new Date().getHours()
  const greet = h < 12 ? 'Bonjour,' : h < 18 ? 'Bon après-midi,' : 'Bonsoir,'

  return (
    <div className="max-w-6xl mx-auto">
      <div className="lg:grid lg:grid-cols-5 lg:gap-12 lg:items-start">

        {/* ── Gauche : bienvenue + textes institutionnels (60%) ────────── */}
        <div className="lg:col-span-3 mb-8 lg:mb-0">

          <p className="text-sm text-muted-foreground mb-2">{greet}</p>

          {/* Nom en grandes capitales — comme ALICE */}
          <h1 className="text-[26px] sm:text-[34px] lg:text-[40px] font-black leading-[1.1] tracking-tight uppercase text-foreground break-words">
            Bienvenue {STUDENT.fullName.toUpperCase()}
          </h1>

          {/* Barre d'accent orange/or épaisse */}
          <div className="mt-3 mb-6 h-[5px] w-28 rounded-sm bg-amber-500" />

          {/* Paragraphes institutionnels */}
          <div className="space-y-4 text-sm leading-relaxed text-foreground/80 max-w-lg">
            <p>
              Bienvenue dans votre espace réservé : utilisez le menu en haut à droite pour naviguer dans le portail.
            </p>
            <p>
              Si vous souhaitez modifier votre mot de passe{' '}
              <Link href="/student/settings" className="text-primary underline underline-offset-2 hover:no-underline">
                cliquez ici
              </Link>.
            </p>
            <p>
              Si vous souhaitez utiliser les autres services en ligne de l'université{' '}
              <Link href="/student/settings" className="text-primary underline underline-offset-2 hover:no-underline">
                cliquez ici
              </Link>.
            </p>
            <p>
              Si vous vous êtes connecté(e) avec SPID ou CIE et que vous ne vous souvenez pas de vos identifiants universitaires — indispensables pour accéder aux autres services en ligne — vous pouvez les récupérer{' '}
              <Link href="/student/settings" className="text-primary underline underline-offset-2 hover:no-underline">
                en cliquant ici
              </Link>.
            </p>
          </div>
        </div>

        {/* ── Droite : accordéons ALICE (40%) ──────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">

            <Section
              title="Données personnelles"
              subtitle={`Nom légal : ${STUDENT.realName}`}
            >
              <ProfilContent />
            </Section>

            <Section
              title="Statut étudiant"
              badge={`${LIVRET.examsCount} examens`}
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

      </div>
    </div>
  )
}
