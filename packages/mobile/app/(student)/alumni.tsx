import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, Switch,
} from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { router } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { colors, spacing, radius, shadow, typography } from '@/lib/theme'

type EmploymentStatus = 'seeking' | 'employed' | 'self_employed' | 'continuing_studies' | 'not_available'

type AlumniProfile = {
  id: string
  graduation_year: number | null
  current_city: string | null
  current_country: string | null
  linkedin_url: string | null
  consent_placement_tracking: boolean
  placement_surveys: Array<{
    id: string
    employment_status: EmploymentStatus
    company_name: string | null
    job_title: string | null
    sector: string | null
    salary_range: string | null
    survey_year: number
    submitted_at: string
  }>
} | null

const STATUS_OPTIONS: Array<{ value: EmploymentStatus; label: string }> = [
  { value: 'seeking', label: 'En recherche' },
  { value: 'employed', label: 'En emploi' },
  { value: 'self_employed', label: 'Independant' },
  { value: 'continuing_studies', label: 'Poursuite etudes' },
  { value: 'not_available', label: 'Non disponible' },
]

function fmtDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR')
}

export default function AlumniScreen() {
  const [profile, setProfile] = useState<AlumniProfile>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [surveying, setSurveying] = useState(false)

  const [profileForm, setProfileForm] = useState({
    graduationYear: '',
    currentCity: '',
    currentCountry: '',
    linkedinUrl: '',
    consentPlacementTracking: true,
  })
  const [surveyForm, setSurveyForm] = useState({
    employmentStatus: 'seeking' as EmploymentStatus,
    companyName: '',
    jobTitle: '',
    contractType: '',
    sector: '',
    salaryRange: '',
    employedAt: '',
    notes: '',
  })

  async function loadData() {
    try {
      const data = await apiFetch<AlumniProfile>('/api/alumni/me')
      setProfile(data)
      if (data) {
        setProfileForm({
          graduationYear: data.graduation_year ? String(data.graduation_year) : '',
          currentCity: data.current_city ?? '',
          currentCountry: data.current_country ?? '',
          linkedinUrl: data.linkedin_url ?? '',
          consentPlacementTracking: data.consent_placement_tracking,
        })
      }
    } catch (err) {
      console.error('[Alumni]', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const latestSurvey = useMemo(() => {
    return [...(profile?.placement_surveys ?? [])].sort((a, b) =>
      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime(),
    )[0] ?? null
  }, [profile])

  async function saveProfile() {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        consentPlacementTracking: profileForm.consentPlacementTracking,
      }
      if (profileForm.graduationYear) payload.graduationYear = Number(profileForm.graduationYear)
      if (profileForm.currentCity.trim()) payload.currentCity = profileForm.currentCity.trim()
      if (profileForm.currentCountry.trim()) payload.currentCountry = profileForm.currentCountry.trim()
      if (profileForm.linkedinUrl.trim()) payload.linkedinUrl = profileForm.linkedinUrl.trim()
      await apiFetch('/api/alumni/me', { method: 'PUT', body: JSON.stringify(payload) })
      await loadData()
      Alert.alert('Profil enregistre', 'Votre profil alumni a ete sauvegarde.')
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Sauvegarde impossible')
    } finally {
      setSaving(false)
    }
  }

  async function submitSurvey() {
    setSurveying(true)
    try {
      const payload: Record<string, unknown> = {
        employmentStatus: surveyForm.employmentStatus,
      }
      if (surveyForm.companyName.trim()) payload.companyName = surveyForm.companyName.trim()
      if (surveyForm.jobTitle.trim()) payload.jobTitle = surveyForm.jobTitle.trim()
      if (surveyForm.contractType.trim()) payload.contractType = surveyForm.contractType.trim()
      if (surveyForm.sector.trim()) payload.sector = surveyForm.sector.trim()
      if (surveyForm.salaryRange.trim()) payload.salaryRange = surveyForm.salaryRange.trim()
      if (surveyForm.employedAt) payload.employedAt = surveyForm.employedAt
      if (surveyForm.notes.trim()) payload.notes = surveyForm.notes.trim()
      await apiFetch('/api/alumni/me/surveys', { method: 'POST', body: JSON.stringify(payload) })
      await loadData()
      Alert.alert('Enquete envoyee', 'Merci, votre situation a ete transmise.')
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setSurveying(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Alumni & Placement</Text>
        <Text style={styles.subtitle}>Profil post-diplome et enquete insertion</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData() }}
            colors={[colors.primary]}
          />
        }
      >
        {latestSurvey ? (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>Derniere enquete</Text>
              <Text style={styles.badge}>{latestSurvey.survey_year}</Text>
            </View>
            <Text style={styles.meta}>
              {STATUS_OPTIONS.find(item => item.value === latestSurvey.employment_status)?.label ?? latestSurvey.employment_status}
              {latestSurvey.company_name ? ` - ${latestSurvey.company_name}` : ''}
            </Text>
            <Text style={styles.meta}>Poste: {latestSurvey.job_title ?? '-'} - Secteur: {latestSurvey.sector ?? '-'}</Text>
            <Text style={styles.meta}>Soumise le {fmtDate(latestSurvey.submitted_at)}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profil alumni</Text>
          <Input label="Annee de diplome" value={profileForm.graduationYear} onChangeText={value => setProfileForm(p => ({ ...p, graduationYear: value }))} keyboardType="number-pad" />
          <Input label="Ville actuelle" value={profileForm.currentCity} onChangeText={value => setProfileForm(p => ({ ...p, currentCity: value }))} />
          <Input label="Pays actuel" value={profileForm.currentCountry} onChangeText={value => setProfileForm(p => ({ ...p, currentCountry: value }))} />
          <Input label="LinkedIn" value={profileForm.linkedinUrl} onChangeText={value => setProfileForm(p => ({ ...p, linkedinUrl: value }))} autoCapitalize="none" />
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Utiliser mes reponses pour les statistiques anonymisees</Text>
            <Switch
              value={profileForm.consentPlacementTracking}
              onValueChange={value => setProfileForm(p => ({ ...p, consentPlacementTracking: value }))}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={profileForm.consentPlacementTracking ? colors.primary : colors.textMuted}
            />
          </View>
          <TouchableOpacity onPress={saveProfile} disabled={saving} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{saving ? 'Sauvegarde...' : 'Sauvegarder'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enquete placement annuelle</Text>
          <Text style={styles.label}>Situation</Text>
          <View style={styles.statusGrid}>
            {STATUS_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setSurveyForm(p => ({ ...p, employmentStatus: option.value }))}
                style={[
                  styles.statusChip,
                  surveyForm.employmentStatus === option.value && styles.statusChipActive,
                ]}
              >
                <Text style={[
                  styles.statusChipText,
                  surveyForm.employmentStatus === option.value && styles.statusChipTextActive,
                ]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Input label="Entreprise" value={surveyForm.companyName} onChangeText={value => setSurveyForm(p => ({ ...p, companyName: value }))} />
          <Input label="Poste" value={surveyForm.jobTitle} onChangeText={value => setSurveyForm(p => ({ ...p, jobTitle: value }))} />
          <Input label="Contrat" value={surveyForm.contractType} onChangeText={value => setSurveyForm(p => ({ ...p, contractType: value }))} />
          <Input label="Secteur" value={surveyForm.sector} onChangeText={value => setSurveyForm(p => ({ ...p, sector: value }))} />
          <Input label="Salaire annuel (<20k, 20-30k, 30-40k, 40-60k, 60k+, non_disclosed)" value={surveyForm.salaryRange} onChangeText={value => setSurveyForm(p => ({ ...p, salaryRange: value }))} autoCapitalize="none" />
          <Input label="Date de prise de poste (YYYY-MM-DD)" value={surveyForm.employedAt} onChangeText={value => setSurveyForm(p => ({ ...p, employedAt: value }))} />
          <Text style={styles.label}>Notes</Text>
          <TextInput
            value={surveyForm.notes}
            onChangeText={value => setSurveyForm(p => ({ ...p, notes: value }))}
            multiline
            style={styles.textArea}
          />
          <TouchableOpacity onPress={submitSurvey} disabled={surveying} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{surveying ? 'Envoi...' : 'Envoyer l enquete'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

function Input({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  keyboardType?: 'default' | 'number-pad'
  autoCapitalize?: 'none'
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize}
        style={styles.input}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  backText: { ...typography.sm, color: colors.primary, fontWeight: '700' },
  title: { ...typography.xl, color: colors.text, fontWeight: '800' },
  subtitle: { ...typography.sm, color: colors.textMuted, marginTop: 2 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { ...typography.base, color: colors.text, fontWeight: '800' },
  badge: { ...typography.xs, color: colors.primary, fontWeight: '800', backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  meta: { ...typography.sm, color: colors.textSecond },
  inputGroup: { gap: spacing.xs },
  label: { ...typography.xs, color: colors.textMuted, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.card },
  textArea: { minHeight: 100, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  switchText: { ...typography.sm, color: colors.textSecond, flex: 1 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  statusChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  statusChipText: { ...typography.xs, color: colors.textSecond, fontWeight: '700' },
  statusChipTextActive: { color: colors.primary },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, alignItems: 'center' },
  primaryBtnText: { ...typography.sm, color: '#fff', fontWeight: '800' },
})
