'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlumniEmploymentStatus,
  useStudentAlumniProfile,
  useSubmitPlacementSurvey,
  useUpsertStudentAlumniProfile,
} from '@/lib/hooks/useStudentAlumni'

type Message = { type: 'success' | 'error'; text: string }

const EMPLOYMENT_OPTIONS: Array<{ value: AlumniEmploymentStatus; label: string }> = [
  { value: 'seeking', label: 'En recherche' },
  { value: 'employed', label: 'En emploi' },
  { value: 'self_employed', label: 'Independant' },
  { value: 'continuing_studies', label: 'Poursuite d etudes' },
  { value: 'not_available', label: 'Non disponible' },
]

const SALARY_OPTIONS = [
  { value: '', label: 'Non renseigne' },
  { value: '<20k', label: '<20k' },
  { value: '20-30k', label: '20-30k' },
  { value: '30-40k', label: '30-40k' },
  { value: '40-60k', label: '40-60k' },
  { value: '60k+', label: '60k+' },
  { value: 'non_disclosed', label: 'Prefere ne pas dire' },
] as const

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

export function AlumniProfilePage() {
  const profileQuery = useStudentAlumniProfile()
  const upsertProfile = useUpsertStudentAlumniProfile()
  const submitSurvey = useSubmitPlacementSurvey()
  const [message, setMessage] = useState<Message | null>(null)

  const [profileForm, setProfileForm] = useState({
    graduationYear: '',
    currentCity: '',
    currentCountry: '',
    linkedinUrl: '',
    consentPlacementTracking: true,
  })

  const [surveyForm, setSurveyForm] = useState({
    employmentStatus: 'seeking' as AlumniEmploymentStatus,
    companyName: '',
    jobTitle: '',
    contractType: '',
    sector: '',
    salaryRange: '' as '' | '<20k' | '20-30k' | '30-40k' | '40-60k' | '60k+' | 'non_disclosed',
    employedAt: '',
    notes: '',
  })

  const profile = profileQuery.data
  const latestSurvey = useMemo(() => {
    return [...(profile?.placement_surveys ?? [])].sort((a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
    )[0] ?? null
  }, [profile])

  useEffect(() => {
    if (!profile) return
    setProfileForm({
      graduationYear: profile.graduation_year ? String(profile.graduation_year) : '',
      currentCity: profile.current_city ?? '',
      currentCountry: profile.current_country ?? '',
      linkedinUrl: profile.linkedin_url ?? '',
      consentPlacementTracking: profile.consent_placement_tracking,
    })
  }, [profile])

  async function handleSaveProfile() {
    setMessage(null)
    try {
      const payload: {
        graduationYear?: number
        currentCity?: string
        currentCountry?: string
        linkedinUrl?: string
        consentPlacementTracking?: boolean
      } = {
        consentPlacementTracking: profileForm.consentPlacementTracking,
      }
      if (profileForm.graduationYear) payload.graduationYear = Number(profileForm.graduationYear)
      if (profileForm.currentCity.trim()) payload.currentCity = profileForm.currentCity.trim()
      if (profileForm.currentCountry.trim()) payload.currentCountry = profileForm.currentCountry.trim()
      if (profileForm.linkedinUrl.trim()) payload.linkedinUrl = profileForm.linkedinUrl.trim()
      await upsertProfile.mutateAsync(payload)
      setMessage({ type: 'success', text: 'Profil alumni enregistre.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Sauvegarde impossible' })
    }
  }

  async function handleSubmitSurvey() {
    setMessage(null)
    try {
      const payload: {
        employmentStatus: AlumniEmploymentStatus
        companyName?: string
        jobTitle?: string
        contractType?: string
        sector?: string
        salaryRange?: '<20k' | '20-30k' | '30-40k' | '40-60k' | '60k+' | 'non_disclosed'
        employedAt?: string
        notes?: string
      } = {
        employmentStatus: surveyForm.employmentStatus,
      }
      if (surveyForm.companyName.trim()) payload.companyName = surveyForm.companyName.trim()
      if (surveyForm.jobTitle.trim()) payload.jobTitle = surveyForm.jobTitle.trim()
      if (surveyForm.contractType.trim()) payload.contractType = surveyForm.contractType.trim()
      if (surveyForm.sector.trim()) payload.sector = surveyForm.sector.trim()
      if (surveyForm.salaryRange) payload.salaryRange = surveyForm.salaryRange
      if (surveyForm.employedAt) payload.employedAt = surveyForm.employedAt
      if (surveyForm.notes.trim()) payload.notes = surveyForm.notes.trim()

      await submitSurvey.mutateAsync(payload)
      setMessage({ type: 'success', text: 'Enquete placement envoyee.' })
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Envoi impossible' })
    }
  }

  if (profileQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted" />
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Alumni</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Profil alumni & placement</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Mets a jour tes coordonnees post-diplome et partage ta situation professionnelle pour les statistiques d insertion.
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

      {latestSurvey ? (
        <section className="rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Derniere enquete</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {EMPLOYMENT_OPTIONS.find(item => item.value === latestSurvey.employment_status)?.label ?? latestSurvey.employment_status}
                {latestSurvey.company_name ? ` - ${latestSurvey.company_name}` : ''}
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {latestSurvey.survey_year}
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <span>Poste: {latestSurvey.job_title ?? '-'}</span>
            <span>Secteur: {latestSurvey.sector ?? '-'}</span>
            <span>Soumise: {formatDate(latestSurvey.submitted_at)}</span>
          </div>
        </section>
      ) : null}

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Profil alumni</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="Annee de diplome" type="number" value={profileForm.graduationYear}
            onChange={value => setProfileForm(prev => ({ ...prev, graduationYear: value }))} />
          <Input label="Ville actuelle" value={profileForm.currentCity}
            onChange={value => setProfileForm(prev => ({ ...prev, currentCity: value }))} />
          <Input label="Pays actuel" value={profileForm.currentCountry}
            onChange={value => setProfileForm(prev => ({ ...prev, currentCountry: value }))} />
          <Input label="LinkedIn" value={profileForm.linkedinUrl}
            onChange={value => setProfileForm(prev => ({ ...prev, linkedinUrl: value }))} />
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={profileForm.consentPlacementTracking}
            onChange={event => setProfileForm(prev => ({ ...prev, consentPlacementTracking: event.target.checked }))}
            className="mt-1"
          />
          J accepte que mes reponses soient utilisees pour les statistiques anonymisees de placement.
        </label>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={upsertProfile.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {upsertProfile.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold">Enquete placement annuelle</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Situation</span>
            <select
              value={surveyForm.employmentStatus}
              onChange={event => setSurveyForm(prev => ({
                ...prev,
                employmentStatus: event.target.value as AlumniEmploymentStatus,
              }))}
              className="rounded-md border bg-background px-3 py-2"
            >
              {EMPLOYMENT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <Input label="Entreprise" value={surveyForm.companyName}
            onChange={value => setSurveyForm(prev => ({ ...prev, companyName: value }))} />
          <Input label="Poste" value={surveyForm.jobTitle}
            onChange={value => setSurveyForm(prev => ({ ...prev, jobTitle: value }))} />
          <Input label="Type de contrat" value={surveyForm.contractType}
            onChange={value => setSurveyForm(prev => ({ ...prev, contractType: value }))} />
          <Input label="Secteur" value={surveyForm.sector}
            onChange={value => setSurveyForm(prev => ({ ...prev, sector: value }))} />
          <Input label="Date de prise de poste" type="date" value={surveyForm.employedAt}
            onChange={value => setSurveyForm(prev => ({ ...prev, employedAt: value }))} />
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Salaire annuel</span>
            <select
              value={surveyForm.salaryRange}
              onChange={event => setSurveyForm(prev => ({
                ...prev,
                salaryRange: event.target.value as typeof surveyForm.salaryRange,
              }))}
              className="rounded-md border bg-background px-3 py-2"
            >
              {SALARY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 grid gap-1 text-sm">
          <span className="font-medium">Notes</span>
          <textarea
            value={surveyForm.notes}
            onChange={event => setSurveyForm(prev => ({ ...prev, notes: event.target.value }))}
            rows={4}
            className="rounded-md border bg-background px-3 py-2"
          />
        </label>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmitSurvey}
            disabled={submitSurvey.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {submitSurvey.isPending ? 'Envoi...' : 'Envoyer l enquete'}
          </button>
        </div>
      </section>
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
