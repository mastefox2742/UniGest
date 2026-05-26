import {
  View, Text, StyleSheet, SectionList,
  TouchableOpacity, ActivityIndicator,
  RefreshControl, Alert,
} from 'react-native'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'

type Booking = {
  id:            string
  status:        string
  exam_sessions: {
    id:                    string
    date:                  string
    registration_deadline: string
    courses:               { name: string; code: string }
    classrooms?:           { name: string; building: string }
  }
}

type AvailableExam = {
  id:                    string
  date:                  string
  registration_deadline: string
  notes:                 string | null
  max_students:          number | null
  courses:               { name: string; code: string; cfu: number }
  classrooms?:           { name: string; building: string }
}

export default function ExamsScreen() {
  const [tab, setTab]             = useState<'available' | 'bookings'>('bookings')
  const [available, setAvailable] = useState<AvailableExam[]>([])
  const [bookings, setBookings]   = useState<Booking[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acting, setActing]       = useState<string | null>(null)

  async function loadData() {
    try {
      const [avail, bkgs] = await Promise.all([
        apiFetch<AvailableExam[]>('/api/exams/available'),
        apiFetch<Booking[]>('/api/exams/my-bookings'),
      ])
      setAvailable(avail ?? [])
      setBookings(bkgs ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function handleBook(examId: string) {
    setActing(examId)
    try {
      await apiFetch(`/api/exams/${examId}/book`, { method: 'POST' })
      Alert.alert('✅ Inscription enregistrée')
      loadData()
    } catch (err: any) {
      Alert.alert('Erreur', err.message)
    } finally {
      setActing(null)
    }
  }

  async function handleCancel(examId: string) {
    Alert.alert(
      'Annuler l\'inscription ?',
      'Cette action est irréversible.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Annuler l\'inscription',
          style: 'destructive',
          onPress: async () => {
            setActing(examId)
            try {
              await apiFetch(`/api/exams/${examId}/book`, { method: 'DELETE' })
              loadData()
            } catch (err: any) {
              Alert.alert('Erreur', err.message)
            } finally {
              setActing(null)
            }
          },
        },
      ],
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📅 Examens</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'bookings' && styles.tabActive]}
            onPress={() => setTab('bookings')}
          >
            <Text style={[styles.tabText, tab === 'bookings' && styles.tabTextActive]}>
              Mes inscriptions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'available' && styles.tabActive]}
            onPress={() => setTab('available')}
          >
            <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>
              Disponibles
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : tab === 'bookings' ? (
        <SectionList
          sections={[{ title: '', data: bookings }]}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} colors={['#6366f1']} />
          }
          renderItem={({ item: b }) => {
            const es = b.exam_sessions as any
            const course = es?.courses
            const room   = es?.classrooms
            const isPast = new Date(es?.date) < new Date()

            return (
              <View style={[styles.card, b.status === 'cancelled' && styles.cardCancelled]}>
                <Text style={styles.courseName}>{course?.name}</Text>
                <Text style={styles.courseCode}>{course?.code}</Text>
                <Text style={styles.date}>
                  📅 {new Date(es?.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                {room && <Text style={styles.room}>📍 {room.name} — {room.building}</Text>}
                <View style={styles.row}>
                  <Text style={[styles.badge, b.status === 'cancelled' ? styles.badgeCancelled : styles.badgeActive]}>
                    {b.status === 'cancelled' ? 'Annulée' : 'Inscrit ✅'}
                  </Text>
                  {b.status === 'booked' && !isPast && (
                    <TouchableOpacity
                      onPress={() => handleCancel(es?.id)}
                      disabled={acting === es?.id}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Aucune inscription.</Text>
            </View>
          }
        />
      ) : (
        <SectionList
          sections={[{ title: '', data: available }]}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData() }} colors={['#6366f1']} />
          }
          renderItem={({ item: ex }) => {
            const course = ex.courses as any
            const room   = ex.classrooms as any
            return (
              <View style={styles.card}>
                <Text style={styles.courseName}>{course?.name}</Text>
                <Text style={styles.courseCode}>{course?.code} • {course?.cfu} CFU</Text>
                <Text style={styles.date}>
                  📅 {new Date(ex.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <Text style={styles.deadline}>
                  ⏰ Clôture : {new Date(ex.registration_deadline).toLocaleDateString('fr-FR')}
                </Text>
                {room && <Text style={styles.room}>📍 {room.name} — {room.building}</Text>}
                {ex.notes && <Text style={styles.notes}>{ex.notes}</Text>}
                <TouchableOpacity
                  style={[styles.bookBtn, acting === ex.id && styles.bookBtnDisabled]}
                  onPress={() => handleBook(ex.id)}
                  disabled={acting === ex.id}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bookBtnText}>
                    {acting === ex.id ? 'Inscription...' : "S'inscrire"}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Aucun examen disponible.</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header:    { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 4, backgroundColor: '#f9fafb' },
  title:     { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 12 },

  tabs: {
    flexDirection:   'row',
    backgroundColor: '#e5e7eb',
    borderRadius:    10,
    padding:         3,
    marginBottom:    8,
  },
  tab:          { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive:    { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  tabText:      { fontSize: 13, color: '#6b7280' },
  tabTextActive:{ fontWeight: '700', color: '#111827' },

  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 14 },

  list: { padding: 16, gap: 10 },

  card: {
    backgroundColor: '#fff',
    borderRadius:    16,
    padding:         16,
    gap:             6,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  cardCancelled: { opacity: 0.6 },

  courseName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  courseCode: { fontSize: 12, color: '#6b7280' },
  date:       { fontSize: 13, color: '#374151' },
  deadline:   { fontSize: 12, color: '#f59e0b' },
  room:       { fontSize: 12, color: '#6b7280' },
  notes:      { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },

  row:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: '600', overflow: 'hidden' },
  badgeActive:    { backgroundColor: '#d1fae5', color: '#065f46' },
  badgeCancelled: { backgroundColor: '#fee2e2', color: '#991b1b' },

  cancelBtn:     { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  cancelBtnText: { fontSize: 12, color: '#6b7280' },

  bookBtn:         { backgroundColor: '#6366f1', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
})
