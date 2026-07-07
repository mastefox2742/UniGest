import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
  RefreshControl, Linking, Alert,
} from 'react-native'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { cachedApiFetch } from '@/lib/offlineCache'
import { colors, spacing, radius, shadow, typography } from '@/lib/theme'

// ─── Types ────────────────────────────────────────────────────────────────────

type CertType = 'enrollment' | 'transcript' | 'degree' | 'attendance' | 'other'

type Certificate = {
  id:            string
  type:          CertType
  issued_at:     string
  expires_at:    string | null
  serial_number: string | null
  file_url:      string | null
  secretaries:   { profiles: { first_name: string; last_name: string } | null } | null
}

const CERT_CFG: Record<CertType, { label: string; icon: string; color: string; bg: string }> = {
  enrollment: { label: 'Certificat de scolarité',    icon: '🎓', color: colors.infoDark,    bg: colors.infoBg    },
  transcript:  { label: 'Relevé de notes officiel',  icon: '📋', color: colors.primaryDark, bg: colors.primaryBg },
  degree:      { label: 'Diplôme',                   icon: '🏅', color: '#92400e',           bg: '#fef3c7'        },
  attendance:  { label: 'Attestation de présence',   icon: '📅', color: colors.successDark,  bg: colors.successBg },
  other:       { label: 'Document officiel',         icon: '📄', color: colors.textSecond,   bg: colors.border    },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CertificatesScreen() {
  const [certs, setCerts]           = useState<Certificate[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null)

  async function loadCertificates() {
    try {
      const result = await cachedApiFetch<Certificate[]>('student:certificates', '/api/certificates/me')
      setCerts(result.data ?? [])
      setOfflineNotice(result.fromCache ? `Mode hors ligne - donnees du ${formatDateTime(result.updatedAt)}` : null)
    } catch (err) {
      console.error('[Certificates]', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadCertificates() }, [])

  async function handleDownload(cert: Certificate) {
    if (!cert.file_url) {
      Alert.alert(
        'Document en cours de traitement',
        'Ce certificat n\'est pas encore disponible en téléchargement. Revenez dans quelques instants.',
      )
      return
    }

    const canOpen = await Linking.canOpenURL(cert.file_url)
    if (canOpen) {
      await Linking.openURL(cert.file_url)
    } else {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le document.')
    }
  }

  async function handleRequestCert(type: CertType) {
    Alert.alert(
      `Demander un ${CERT_CFG[type].label.toLowerCase()}`,
      'Votre demande sera transmise au secrétariat. Le document sera disponible sous 48h.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer la demande',
          onPress: async () => {
            setRequesting(true)
            try {
              await apiFetch('/api/certificates/request', {
                method: 'POST',
                body: JSON.stringify({ type }),
              })
              Alert.alert('✅ Demande envoyée', 'Le secrétariat traitera votre demande sous 48 heures ouvrées.')
              loadCertificates()
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Erreur lors de la demande'
              Alert.alert('Erreur', msg)
            } finally {
              setRequesting(false)
            }
          },
        },
      ],
    )
  }

  const valid   = certs.filter(c => !c.expires_at || new Date(c.expires_at) >= new Date())
  const expired = certs.filter(c => c.expires_at && new Date(c.expires_at) < new Date())

  const renderCert = ({ item: cert }: { item: Certificate }) => {
    const cfg        = CERT_CFG[cert.type] ?? CERT_CFG.other!
    const isExpired  = cert.expires_at ? new Date(cert.expires_at) < new Date() : false
    const issuedDate = new Date(cert.issued_at).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    const sec = cert.secretaries?.profiles

    return (
      <View style={[styles.card, isExpired && styles.cardExpired]}>
        <View style={styles.cardRow}>
          {/* Icône */}
          <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
            <Text style={styles.iconText}>{cfg.icon}</Text>
          </View>

          {/* Infos */}
          <View style={styles.cardContent}>
            <Text style={[styles.certType, { color: cfg.color }]}>{cfg.label}</Text>
            <Text style={styles.certDate}>Émis le {issuedDate}</Text>
            {cert.serial_number && (
              <Text style={styles.certSerial}>N° {cert.serial_number}</Text>
            )}
            {sec && (
              <Text style={styles.certBy}>
                Par {sec.first_name} {sec.last_name}
              </Text>
            )}
            {cert.expires_at && (
              <Text style={[styles.certExpiry, isExpired && styles.certExpired]}>
                {isExpired ? '⚠️ Expiré le ' : '📅 Valide jusqu\'au '}
                {new Date(cert.expires_at).toLocaleDateString('fr-FR')}
              </Text>
            )}
          </View>

          {/* Bouton télécharger */}
          {!isExpired && (
            <TouchableOpacity
              style={[styles.downloadBtn, !cert.file_url && styles.downloadBtnDisabled]}
              onPress={() => handleDownload(cert)}
              activeOpacity={0.7}
            >
              <Text style={styles.downloadIcon}>
                {cert.file_url ? '⬇️' : '⏳'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📄 Mes certificats</Text>
        <Text style={styles.subtitle}>Documents officiels délivrés par le secrétariat</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={[...valid, ...expired]}
          keyExtractor={item => item.id}
          renderItem={renderCert}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadCertificates() }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* Compteurs */}
              {offlineNotice && (
                <View style={styles.offlineBox}>
                  <Text style={styles.offlineText}>{offlineNotice}</Text>
                </View>
              )}

              {certs.length > 0 && (
                <View style={styles.stats}>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNum, { color: colors.primary }]}>{valid.length}</Text>
                    <Text style={styles.statLabel}>Valides</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNum, { color: colors.error }]}>{expired.length}</Text>
                    <Text style={styles.statLabel}>Expirés</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={[styles.statNum, { color: colors.text }]}>{certs.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>
              )}

              {/* Demander un nouveau certificat */}
              <View style={styles.requestSection}>
                <Text style={styles.requestTitle}>Demander un document</Text>
                <View style={styles.requestGrid}>
                  {(['enrollment', 'transcript', 'attendance'] as CertType[]).map(type => {
                    const cfg = CERT_CFG[type]!
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.requestBtn, requesting && styles.requestBtnDisabled]}
                        onPress={() => handleRequestCert(type)}
                        disabled={requesting}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.requestBtnIcon}>{cfg.icon}</Text>
                        <Text style={styles.requestBtnLabel} numberOfLines={2}>{cfg.label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
                <Text style={styles.requestNote}>
                  ⏱️ Délai de traitement : 48h ouvrées
                </Text>
              </View>

              {certs.length > 0 && (
                <Text style={styles.sectionLabel}>Mes documents</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={styles.emptyTitle}>Aucun certificat émis</Text>
              <Text style={styles.emptySubtitle}>
                Utilisez les boutons ci-dessus pour demander vos documents au secrétariat.
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return 'cache local'
  return new Date(value).toLocaleString('fr-FR')
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingTop:        56,
    paddingHorizontal: spacing.xl,
    paddingBottom:     spacing.md,
    backgroundColor:   colors.background,
  },
  title:    { ...typography['2xl'], fontWeight: '800', color: colors.text },
  subtitle: { ...typography.sm, color: colors.textMuted, marginTop: 3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  list: { padding: spacing.xl, paddingBottom: 32, gap: spacing.md },
  offlineBox: {
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  offlineText: { ...typography.sm, color: colors.infoDark },

  stats: {
    flexDirection: 'row',
    gap:           spacing.sm,
    marginBottom:  spacing.xl,
  },
  statCard: {
    flex:            1,
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    alignItems:      'center',
    ...shadow.sm,
  },
  statNum:   { ...typography.xl, fontWeight: '800' },
  statLabel: { ...typography.xs, color: colors.textMuted, marginTop: 2 },

  requestSection: {
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    padding:         spacing.lg,
    marginBottom:    spacing.xl,
    ...shadow.sm,
  },
  requestTitle: {
    ...typography.base,
    fontWeight:   '700',
    color:        colors.text,
    marginBottom: spacing.md,
  },
  requestGrid: {
    flexDirection: 'row',
    gap:           spacing.sm,
  },
  requestBtn: {
    flex:            1,
    backgroundColor: colors.background,
    borderRadius:    radius.md,
    padding:         spacing.md,
    alignItems:      'center',
    gap:             spacing.xs,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  requestBtnDisabled: { opacity: 0.5 },
  requestBtnIcon:     { fontSize: 22 },
  requestBtnLabel:    { ...typography.xs, fontWeight: '600', color: colors.text, textAlign: 'center' },
  requestNote:        { ...typography.xs, color: colors.textMuted, marginTop: spacing.md, textAlign: 'center' },

  sectionLabel: {
    ...typography.sm,
    fontWeight:   '700',
    color:        colors.textMuted,
    textTransform:'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    ...shadow.sm,
  },
  cardExpired: { opacity: 0.6 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  iconBox: {
    width:          48,
    height:         48,
    borderRadius:   radius.md,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  iconText: { fontSize: 22 },

  cardContent:  { flex: 1, gap: 3 },
  certType:     { ...typography.base, fontWeight: '700' },
  certDate:     { ...typography.sm, color: colors.textSecond },
  certSerial:   { ...typography.xs, color: colors.textMuted, fontFamily: 'monospace' },
  certBy:       { ...typography.xs, color: colors.textMuted },
  certExpiry:   { ...typography.xs, color: colors.success, marginTop: 2 },
  certExpired:  { color: colors.error },

  downloadBtn: {
    width:           42,
    height:          42,
    borderRadius:    radius.md,
    backgroundColor: colors.primaryBg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  downloadBtnDisabled: { backgroundColor: colors.background },
  downloadIcon:        { fontSize: 20 },

  emptyContainer: {
    alignItems:    'center',
    paddingTop:    spacing['3xl'],
    paddingBottom: spacing.xl,
  },
  emptyEmoji:    { fontSize: 48, marginBottom: spacing.md },
  emptyTitle:    { ...typography.lg, fontWeight: '700', color: colors.text },
  emptySubtitle: { ...typography.base, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
})
