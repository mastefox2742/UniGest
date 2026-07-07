import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Alert, Linking,
} from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { router } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { colors, spacing, radius, shadow, typography } from '@/lib/theme'

type Opportunity = {
  id: string
  title: string
  company_name: string
  location: string | null
  description: string | null
  start_date: string | null
  end_date: string | null
  cfu: number
  application_deadline: string | null
  status: 'draft' | 'open' | 'closed'
}

type Application = {
  id: string
  status: 'submitted' | 'approved' | 'in_progress' | 'report_submitted' | 'evaluated' | 'closed' | 'refused'
  motivation: string | null
  report_url: string | null
  evaluation_score: number | null
  evaluation_feedback: string | null
  applied_at: string
  internship_opportunities: {
    id: string
    title: string
    company_name: string
    location: string | null
    start_date: string | null
    end_date: string | null
    cfu: number
  } | null
}

const STATUS: Record<Application['status'], { label: string; bg: string; color: string }> = {
  submitted: { label: 'Soumise', bg: colors.infoBg, color: colors.infoDark },
  approved: { label: 'Approuvee', bg: colors.successBg, color: colors.successDark },
  in_progress: { label: 'En cours', bg: colors.warningBg, color: colors.warningDark },
  report_submitted: { label: 'Rapport soumis', bg: colors.primaryLight, color: colors.primaryDark },
  evaluated: { label: 'Evaluee', bg: colors.successBg, color: colors.successDark },
  closed: { label: 'Cloturee', bg: colors.borderLight, color: colors.textSecond },
  refused: { label: 'Refusee', bg: colors.errorBg, color: colors.errorDark },
}

function fmtDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR')
}

export default function InternshipsScreen() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [motivationFor, setMotivationFor] = useState<Opportunity | null>(null)
  const [motivation, setMotivation] = useState('')
  const [reportFor, setReportFor] = useState<Application | null>(null)
  const [reportUrl, setReportUrl] = useState('')

  async function loadData() {
    try {
      const [offers, apps] = await Promise.all([
        apiFetch<Opportunity[]>('/api/internships/opportunities?status=open'),
        apiFetch<Application[]>('/api/internships/me'),
      ])
      setOpportunities(offers ?? [])
      setApplications(apps ?? [])
    } catch (err) {
      console.error('[Internships]', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const appliedIds = useMemo(() => {
    return new Set(applications.map(app => app.internship_opportunities?.id).filter(Boolean))
  }, [applications])

  async function submitApplication() {
    if (!motivationFor) return
    try {
      const body: { opportunityId: string; motivation?: string } = { opportunityId: motivationFor.id }
      if (motivation.trim()) body.motivation = motivation.trim()
      await apiFetch('/api/internships/apply', { method: 'POST', body: JSON.stringify(body) })
      setMotivation('')
      setMotivationFor(null)
      await loadData()
      Alert.alert('Candidature envoyee', 'Votre demande de stage a ete transmise.')
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Candidature impossible')
    }
  }

  async function submitReport() {
    if (!reportFor || !reportUrl.trim()) return
    try {
      await apiFetch(`/api/internships/applications/${reportFor.id}/report`, {
        method: 'POST',
        body: JSON.stringify({ reportUrl: reportUrl.trim() }),
      })
      setReportFor(null)
      setReportUrl('')
      await loadData()
      Alert.alert('Rapport soumis', 'Votre rapport a ete enregistre.')
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Depot impossible')
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
        <Text style={styles.title}>Stages & Tirocini</Text>
        <Text style={styles.subtitle}>Candidatures, suivi et rapports de stage</Text>
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
        <View style={styles.summaryRow}>
          <Kpi label="Candidatures" value={applications.length} color={colors.primary} />
          <Kpi label="Actives" value={applications.filter(a => ['approved', 'in_progress', 'report_submitted'].includes(a.status)).length} color={colors.warning} />
          <Kpi label="Offres" value={opportunities.length} color={colors.success} />
        </View>

        <Text style={styles.sectionTitle}>Offres ouvertes</Text>
        {opportunities.length === 0 ? <Empty text="Aucune offre ouverte." /> : null}
        {opportunities.map(offer => {
          const alreadyApplied = appliedIds.has(offer.id)
          return (
            <View key={offer.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{offer.title}</Text>
                  <Text style={styles.cardMeta}>{offer.company_name}{offer.location ? ` - ${offer.location}` : ''}</Text>
                </View>
                <Text style={styles.cfu}>{offer.cfu} CFU</Text>
              </View>
              {offer.description ? <Text style={styles.description} numberOfLines={3}>{offer.description}</Text> : null}
              <Text style={styles.dates}>Du {fmtDate(offer.start_date)} au {fmtDate(offer.end_date)} - deadline {fmtDate(offer.application_deadline)}</Text>
              <TouchableOpacity
                disabled={alreadyApplied}
                onPress={() => setMotivationFor(offer)}
                style={[styles.primaryBtn, alreadyApplied && styles.disabledBtn]}
              >
                <Text style={styles.primaryBtnText}>{alreadyApplied ? 'Deja candidate' : 'Candidater'}</Text>
              </TouchableOpacity>
            </View>
          )
        })}

        <Text style={styles.sectionTitle}>Mes candidatures</Text>
        {applications.length === 0 ? <Empty text="Aucune candidature." /> : null}
        {applications.map(app => {
          const st = STATUS[app.status]
          const canReport = ['approved', 'in_progress'].includes(app.status)
          return (
            <View key={app.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{app.internship_opportunities?.title ?? 'Stage'}</Text>
                  <Text style={styles.cardMeta}>{app.internship_opportunities?.company_name ?? '-'}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.dates}>Candidate le {fmtDate(app.applied_at)}</Text>
              {app.report_url ? (
                <TouchableOpacity onPress={() => Linking.openURL(app.report_url!)} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Ouvrir le rapport</Text>
                </TouchableOpacity>
              ) : null}
              {app.evaluation_score !== null ? (
                <Text style={styles.description}>Evaluation: {app.evaluation_score}/30{app.evaluation_feedback ? ` - ${app.evaluation_feedback}` : ''}</Text>
              ) : null}
              {canReport ? (
                <TouchableOpacity onPress={() => setReportFor(app)} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Soumettre le rapport</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        })}
      </ScrollView>

      {motivationFor ? (
        <ModalBox title="Candidature" onClose={() => setMotivationFor(null)}>
          <Text style={styles.modalText}>{motivationFor.title} - {motivationFor.company_name}</Text>
          <TextInput
            value={motivation}
            onChangeText={setMotivation}
            placeholder="Motivation"
            multiline
            style={styles.textArea}
          />
          <TouchableOpacity onPress={submitApplication} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Envoyer</Text>
          </TouchableOpacity>
        </ModalBox>
      ) : null}

      {reportFor ? (
        <ModalBox title="Rapport de stage" onClose={() => setReportFor(null)}>
          <Text style={styles.modalText}>{reportFor.internship_opportunities?.title ?? 'Stage'}</Text>
          <TextInput
            value={reportUrl}
            onChangeText={setReportUrl}
            placeholder="https://..."
            autoCapitalize="none"
            style={styles.input}
          />
          <TouchableOpacity onPress={submitReport} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Soumettre</Text>
          </TouchableOpacity>
        </ModalBox>
      ) : null}
    </View>
  )
}

function ModalBox({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.modalTop}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Fermer</Text>
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </View>
  )
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
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
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  kpi: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', ...shadow.sm },
  kpiValue: { ...typography.xl, fontWeight: '800' },
  kpiLabel: { ...typography.xs, color: colors.textMuted },
  sectionTitle: { ...typography.base, color: colors.text, fontWeight: '800', marginTop: spacing.sm },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, alignItems: 'flex-start' },
  cardTitle: { ...typography.base, color: colors.text, fontWeight: '800' },
  cardMeta: { ...typography.sm, color: colors.textMuted, marginTop: 2 },
  cfu: { ...typography.xs, color: colors.primary, fontWeight: '800', backgroundColor: colors.primaryLight, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  description: { ...typography.sm, color: colors.textSecond },
  dates: { ...typography.xs, color: colors.textMuted },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { ...typography.xs, fontWeight: '800' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, alignItems: 'center' },
  primaryBtnText: { ...typography.sm, color: '#fff', fontWeight: '800' },
  disabledBtn: { backgroundColor: colors.border },
  secondaryBtn: { alignSelf: 'flex-start', borderRadius: radius.full, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, backgroundColor: colors.primaryLight },
  secondaryBtnText: { ...typography.xs, color: colors.primary, fontWeight: '800' },
  empty: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyText: { ...typography.sm, color: colors.textMuted },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: spacing.lg },
  modal: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, ...shadow.lg },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...typography.lg, color: colors.text, fontWeight: '800' },
  close: { ...typography.sm, color: colors.primary, fontWeight: '700' },
  modalText: { ...typography.sm, color: colors.textSecond },
  textArea: { minHeight: 110, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, textAlignVertical: 'top', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text },
})
