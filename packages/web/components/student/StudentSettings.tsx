'use client'

import { useState } from 'react'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
} from '@/lib/hooks/useNotifications'

const DEFAULT_PREFS: NotificationPreferences = {
  general: true,
  exam: true,
  fee: true,
  grade: true,
  certificate: true,
  thesis: true,
  graduation: true,
  elearning: true,
  internship: true,
  alumni: true,
}

export function StudentSettings() {
  const [language, setLanguage] = useState<'fr' | 'it' | 'en'>('fr')
  const prefsQuery = useNotificationPreferences()
  const updatePrefs = useUpdateNotificationPreferences()
  const prefs = prefsQuery.data ?? DEFAULT_PREFS

  function togglePreference(key: keyof NotificationPreferences) {
    updatePrefs.mutate({ [key]: !prefs[key] })
  }

  const notificationRows: Array<{
    id: string
    label: string
    desc: string
    key: keyof NotificationPreferences
  }> = [
    { id: 'general', label: 'Notifications generales', desc: "Actualites et annonces de l'universite", key: 'general' },
    { id: 'exam', label: "Rappels d'examens", desc: 'Appelli, prenotations et changements de planning', key: 'exam' },
    { id: 'fee', label: 'Alertes de frais', desc: 'Echeances, retards et confirmations de paiement', key: 'fee' },
    { id: 'grade', label: 'Notes et libretto', desc: 'Notes proposees, acceptees ou publiees', key: 'grade' },
    { id: 'certificate', label: 'Certificats', desc: 'Documents officiels disponibles', key: 'certificate' },
    { id: 'thesis', label: 'These', desc: 'Soumission et changements de statut de these', key: 'thesis' },
    { id: 'graduation', label: 'Laurea', desc: 'Demande finale, jury, soutenance et diplome', key: 'graduation' },
    { id: 'elearning', label: 'Cours en ligne', desc: 'Annonces, ressources et devoirs LMS', key: 'elearning' },
    { id: 'internship', label: 'Stages', desc: 'Candidatures, rapports et evaluations', key: 'internship' },
    { id: 'alumni', label: 'Alumni', desc: 'Enquetes de placement et suivi post-diplome', key: 'alumni' },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Parametres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere tes preferences de notification et d'affichage.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="text-base font-semibold">Mon compte</h2>
        <div className="flex items-center justify-between border-b py-3">
          <div>
            <p className="text-sm font-medium">Photo de profil</p>
            <p className="text-xs text-muted-foreground">Visible dans la sidebar et vos interactions</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            DE
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">Adresse e-mail</p>
            <p className="text-xs text-muted-foreground">demo.etudiant@unigest.fr</p>
          </div>
          <button className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent">
            Modifier
          </button>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <div>
          <h2 className="text-base font-semibold">Notifications</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Les preferences sont sauvegardees et appliquees aux notifications in-app et push.
          </p>
        </div>

        {prefsQuery.isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        ) : null}

        {notificationRows.map(({ id, label, desc, key }) => {
          const value = prefs[key]
          return (
            <div key={id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
              <div className="pr-4">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={value}
                disabled={updatePrefs.isPending}
                onClick={() => togglePreference(key)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                  value ? 'bg-primary' : 'bg-input'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    value ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-6">
        <h2 className="text-base font-semibold">Langue d'affichage</h2>
        <div className="flex flex-wrap gap-2">
          {(['fr', 'it', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                language === lang ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              {lang === 'fr' ? 'Francais' : lang === 'it' ? 'Italiano' : 'English'}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-base font-semibold text-destructive">Zone sensible</h2>
        <p className="text-xs text-muted-foreground">
          Ces actions sont irreversibles. Contacte l'administration si tu as besoin d'aide.
        </p>
        <button className="rounded-lg border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
          Demander la suppression du compte
        </button>
      </section>
    </div>
  )
}
