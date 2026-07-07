import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useEffect, useState } from 'react'
import { cachedApiFetch } from '@/lib/offlineCache'

type FeesSummary = {
  fees:    Fee[]
  pending: number
  overdue: number
  paid:    number
  total:   number
}

type Fee = {
  id:            string
  amount:        number
  late_fee:      number | null
  due_date:      string
  paid_at:       string | null
  status:        string
  academic_years?: { label: string }
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'En attente', color: '#92400e', bg: '#fef3c7' },
  overdue: { label: 'En retard',  color: '#991b1b', bg: '#fee2e2' },
  paid:    { label: 'Payé',       color: '#065f46', bg: '#d1fae5' },
  waived:  { label: 'Exonéré',    color: '#1e40af', bg: '#dbeafe' },
}

export default function FeesScreen() {
  const [data, setData]         = useState<FeesSummary | null>(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null)

  async function loadData() {
    try {
      const result = await cachedApiFetch<FeesSummary>('student:fees', '/api/fees/me')
      setData(result.data)
      setOfflineNotice(result.fromCache ? `Mode hors ligne - donnees du ${formatDateTime(result.updatedAt)}` : null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const renderItem = ({ item }: { item: Fee }) => {
    const sc     = STATUS_CFG[item.status] ?? { label: item.status, color: '#374151', bg: '#f3f4f6' }
    const total  = Number(item.amount) + Number(item.late_fee ?? 0)
    const ay     = item.academic_years as any

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={styles.year}>{ay?.label ?? '—'}</Text>
            <Text style={styles.due}>
              Échéance : {new Date(item.due_date).toLocaleDateString('fr-FR')}
            </Text>
            {item.paid_at && (
              <Text style={styles.paid}>
                ✅ Payé le {new Date(item.paid_at).toLocaleDateString('fr-FR')}
              </Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.amount}>{total.toFixed(2)} €</Text>
            {(item.late_fee ?? 0) > 0 && (
              <Text style={styles.lateFee}>
                +{Number(item.late_fee).toFixed(2)} € pénalité
              </Text>
            )}
            <View style={[styles.badge, { backgroundColor: sc.bg }]}>
              <Text style={[styles.badgeText, { color: sc.color }]}>{sc.label}</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>💶 Frais</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <>
          {/* Résumé */}
          {data && (
            <View style={styles.summary}>
              <SumCard
                label="En attente"
                value={data.pending}
                color="#f59e0b"
                urgent={false}
              />
              <SumCard
                label="En retard"
                value={data.overdue}
                color="#ef4444"
                urgent={data.overdue > 0}
              />
              <SumCard
                label="Payés"
                value={data.paid}
                color="#10b981"
                urgent={false}
              />
            </View>
          )}

          {offlineNotice && (
            <View style={styles.offlineBox}>
              <Text style={styles.offlineText}>{offlineNotice}</Text>
            </View>
          )}

          {/* Alerte retard */}
          {data && data.overdue > 0 && (
            <View style={styles.alert}>
              <Text style={styles.alertText}>
                ⚠️ {data.overdue} frais en retard. Des pénalités s'appliquent. Contactez le secrétariat.
              </Text>
            </View>
          )}

          {/* Liste */}
          <FlatList
            data={data?.fees ?? []}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadData() }}
                colors={['#6366f1']}
              />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>Aucun frais.</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return 'cache local'
  return new Date(value).toLocaleString('fr-FR')
}

function SumCard({
  label, value, color, urgent,
}: { label: string; value: number; color: string; urgent: boolean }) {
  return (
    <View style={[styles.sumCard, urgent && { borderColor: color, borderWidth: 2 }]}>
      <Text style={[styles.sumValue, { color }]}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header:    { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  title:     { fontSize: 24, fontWeight: '800', color: '#111827' },

  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 14 },

  summary: {
    flexDirection:    'row',
    gap:              10,
    paddingHorizontal: 20,
    marginBottom:     12,
  },
  sumCard: {
    flex:            1,
    backgroundColor: '#fff',
    borderRadius:    14,
    padding:         14,
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  sumValue: { fontSize: 22, fontWeight: '800' },
  sumLabel: { fontSize: 11, color: '#9ca3af', marginTop: 3 },

  alert: {
    backgroundColor: '#fef2f2',
    borderWidth:      1,
    borderColor:      '#fecaca',
    borderRadius:     12,
    marginHorizontal: 20,
    marginBottom:     12,
    padding:          12,
  },
  alertText: { fontSize: 13, color: '#991b1b', lineHeight: 18 },
  offlineBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
  },
  offlineText: { fontSize: 13, color: '#1e40af', lineHeight: 18 },

  list: { padding: 16, gap: 10 },

  card: {
    backgroundColor: '#fff',
    borderRadius:    16,
    padding:         16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  cardRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, gap: 3 },
  cardRight:{ alignItems: 'flex-end', gap: 4 },

  year:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  due:      { fontSize: 12, color: '#6b7280' },
  paid:     { fontSize: 12, color: '#059669' },
  amount:   { fontSize: 18, fontWeight: '800', color: '#111827' },
  lateFee:  { fontSize: 11, color: '#ef4444' },

  badge: {
    borderRadius:    20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', overflow: 'hidden' },
})
