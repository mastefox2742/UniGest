'use client'

import { useState } from 'react'
import Link from 'next/link'

// ─── Données ──────────────────────────────────────────────────────────────────
const STUDENT = {
  fullName:   'Miche Fresneil Zlat Mboni Obambi',
  realName:   'MICHE FRESNEIL',
  matricola:  'M-2024-001',
  degree:     'Scienze e tecnologie informatiche',
  degreeCode: 'L-31',
  year:       1,
  email:      'miche.fresneil@studenti.unigest.it',
  phone:      '+39 333 123 4567',
  address:    "Via dell'Università 1, 56126 Pisa PI",
}

const LIBRETTO = {
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
  { id: 'c1', startTime: '08:30', endTime: '10:30', course: 'Analisi Matematica II',  teacher: 'Prof. Rossi Marco',  room: 'Aula B201', mode: 'presential' as const },
  { id: 'c2', startTime: '11:00', endTime: '13:00', course: 'Reti Informatiche',       teacher: 'Prof. Conti Paolo',  room: null,         mode: 'online'     as const },
  { id: 'c3', startTime: '14:30', endTime: '16:30', course: 'Basi di dati (TD)',       teacher: 'Prof. Ferrari Anna', room: 'Aula D102',  mode: 'presential' as const },
]

const DEADLINES = [
  { id: 'd1', label: 'Chiusura — Analisi Matematica II', detail: 'Iscrizione esame (sessione giugno)', daysLeft: 2,  href: '/student/exams',   type: 'exam_reg' as const },
  { id: 'd2', label: "2ª rata 2025/2026 — 450 €",        detail: 'Scadenza pagamento tasse',           daysLeft: 5,  href: '/student/fees',    type: 'payment'  as const },
  { id: 'd3', label: 'Chiusura — Reti Informatiche',      detail: 'Iscrizione esame (sessione giugno)', daysLeft: 6,  href: '/student/exams',   type: 'exam_reg' as const },
  { id: 'd4', label: 'Consegna progetto — Prog. Avanzata', detail: 'Caricamento progetto finale',       daysLeft: 14, href: '/student/courses', type: 'project'  as const },
]

const ANNOUNCEMENTS = [
  { id: 'a1', from: 'Prof. Conti Paolo', role: 'teacher' as const, msg: "Il corso di Reti di domani si terrà esclusivamente in videoconferenza.", ago: '2 ore fa',     urgent: true  },
  { id: 'a2', from: 'Segreteria',        role: 'admin'   as const, msg: "Promemoria: la sessione di giugno apre le iscrizioni agli esami il 25 maggio.", ago: '1 giorno fa', urgent: false },
  { id: 'a3', from: 'Prof. Ferrari',     role: 'teacher' as const, msg: "La correzione del TP3 è disponibile nello spazio corso INF301.",            ago: '3 giorni fa', urgent: false },
]

// ─── Section accordéon style ALICE ────────────────────────────────────────────
interface SectionProps {
  title:        string
  subtitle?:    string
  badge?:       string
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
            {open ? 'Nascondi dettagli' : 'Visualizza dettagli'}
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

// ─── Contenu : Dati personali ─────────────────────────────────────────────────
function ProfilContent() {
  return (
    <div className="space-y-2.5">
      {[
        { label: 'Nome completo', value: STUDENT.fullName  },
        { label: 'Matricola',     value: STUDENT.matricola },
        { label: 'Email',         value: STUDENT.email     },
        { label: 'Telefono',      value: STUDENT.phone     },
        { label: 'Indirizzo',     value: STUDENT.address   },
      ].map(r => (
        <div key={r.label} className="flex gap-3 text-sm">
          <span className="w-32 shrink-0 text-muted-foreground">{r.label}</span>
          <span className="font-medium break-all">{r.value}</span>
        </div>
      ))}
      <div className="pt-2">
        <Link href="/student/settings" className="text-[12px] text-primary hover:underline underline-offset-2">
          Modifica le mie informazioni →
        </Link>
      </div>
    </div>
  )
}

// ─── Contenu : Status studente ────────────────────────────────────────────────
function StatusContent() {
  const pct = Math.round((LIBRETTO.cfuEarned / LIBRETTO.cfuTotal) * 100)
  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {[
          { label: 'Anno Accademico',       value: <strong>{LIBRETTO.yearAcad}</strong> },
          { label: 'Anno di Regolamento',   value: <strong>{LIBRETTO.anneeReg}</strong> },
          { label: 'Stato Carriera',        value: (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <strong>attivo</strong>&nbsp;per&nbsp;<strong>Immatricolazione</strong>
              </span>
            )
          },
          { label: 'Classe laurea',         value: <strong>L-31 — Scienze e tecnologie informatiche</strong> },
          { label: 'Data immatricolazione', value: <strong>{LIBRETTO.dateImmat}</strong> },
        ].map((r, i) => (
          <div key={i} className="flex gap-3 text-sm">
            <span className="w-44 shrink-0 text-muted-foreground">{r.label}</span>
            <span>{r.value}</span>
          </div>
        ))}
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
          <span>Progressione del percorso</span>
          <span className="font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Riepilogo Esami</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { val: LIBRETTO.examsCount,              lbl: 'Esami registrati'  },
            { val: LIBRETTO.weightedMean.toFixed(2), lbl: 'Media pond. / 30'  },
            { val: LIBRETTO.laureaEst.toFixed(1),    lbl: 'Stima laurea / 110' },
          ].map(s => (
            <div key={s.lbl}>
              <p className="text-xl font-black text-primary tabular-nums">{s.val}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.lbl}</p>
            </div>
          ))}
        </div>
      </div>

      <Link href="/student/libretto" className="text-[12px] text-primary hover:underline underline-offset-2">
        Vai al mio libretto →
      </Link>
    </div>
  )
}

// ─── Contenu : Corsi del giorno ───────────────────────────────────────────────
function CorsiContent() {
  if (TODAY_SLOTS.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun corso previsto oggi.</p>
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
                Online
              </span>
            )}
          </div>
        </div>
      ))}
      <Link href="/student/schedule" className="text-[12px] text-primary hover:underline underline-offset-2">
        Vedi orario delle lezioni →
      </Link>
    </div>
  )
}

// ─── Contenu : Prossime scadenze ──────────────────────────────────────────────
function ScadenzeContent() {
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
              {dl.daysLeft <= 1 ? 'Domani!' : `G−${dl.daysLeft}`}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Contenu : Messageria ─────────────────────────────────────────────────────
function MessageriaContent() {
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
                  Urgente
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

  const h    = new Date().getHours()
  const greet = h < 12 ? 'Buongiorno,' : h < 18 ? 'Buon pomeriggio,' : 'Buona sera,'

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
              Benvenuto nella tua area riservata: utilizza il menu in alto a destra per navigare nel portale.
            </p>
            <p>
              Se vuoi modificare la tua password{' '}
              <Link href="/student/settings" className="text-primary underline underline-offset-2 hover:no-underline">
                clicca qui
              </Link>.
            </p>
            <p>
              Se vuoi utilizzare gli altri servizi on line dell'ateneo{' '}
              <Link href="/student/settings" className="text-primary underline underline-offset-2 hover:no-underline">
                clicca qui
              </Link>.
            </p>
            <p>
              Se hai effettuato l'accesso con SPID o CIE e non ricordi le credenziali di ateneo — che sono
              indispensabili per accedere agli altri servizi on line — le puoi recuperare{' '}
              <Link href="/student/settings" className="text-primary underline underline-offset-2 hover:no-underline">
                cliccando qui
              </Link>.
            </p>
          </div>
        </div>

        {/* ── Droite : accordéons ALICE (40%) ──────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">

            <Section
              title="Dati personali"
              subtitle={`Reale name: ${STUDENT.realName}`}
            >
              <ProfilContent />
            </Section>

            <Section
              title="Status studente"
              badge={`${LIBRETTO.examsCount} esami`}
              defaultOpen
            >
              <StatusContent />
            </Section>

            <Section
              title="Corsi del giorno"
              badge={`${TODAY_SLOTS.length} corsi`}
            >
              <CorsiContent />
            </Section>

            <Section
              title="Prossime scadenze"
              badge={urgentCount > 0 ? `${urgentCount} urgente` : `${DEADLINES.length} in arrivo`}
              badgeRed={urgentCount > 0}
            >
              <ScadenzeContent />
            </Section>

            <Section
              title="Messageria"
              badge={unreadCount > 0 ? `${unreadCount} non letto` : undefined}
              badgeRed={unreadCount > 0}
            >
              <MessageriaContent />
            </Section>

          </div>
        </div>

      </div>
    </div>
  )
}
