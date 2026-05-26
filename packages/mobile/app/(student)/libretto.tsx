import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Grade = {
  id:           string
  value:        number | null
  is_honors:    boolean
  status:       string
  published_at: string | null
  exam_sessions: {
    date: string
    courses: { name: string; code: string; cfu: number }
  }
}

function gradeColor(g: number) {
  if (g === 30) return '#f59e0b'
  if (g >= 27)  return '#10b981'
  if (g >= 24)  return '#6366f1'
  return '#f97316'
}

export default function LibrettoScreen() {
  const [grades, setGrades]     = useState<Grade[]>([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function loadGrades() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!student) return

      const { data } = await supabase
        .from('grades')
        .select(`
          id, value, is_honors, status, published_at,
          exam_sessions!exam_session_id(
            date,
            courses!course_id(name, code, cfu)
          )
        `)
        .eq('student_id', student.id)
        .in('status', ['accepted', 'published'])
        .order('published_at', { ascending: false })

      setGrades((data ?? []) as any)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadGrades() }, [])

  const accepted    = grades.filter(g => ['accepted', 'published'].includes(g.status) && g.value !== null)
  const totalCfu    = accepted.reduce((s, g) => s + ((g.exam_sessions as any)?.courses?.cfu ?? 0), 0)
  const avg         = accepted.length > 0
    ? accepted.reduce((s, g) => s + (g.value ?? 0), 0) / accepted.length
    : 0

  const renderItem = ({ item }: { item: Grade }) => {
    const session = item.exam_sessions as any
    const course  = session?.courses
    const color   = item.value !== null ? gradeColor(item.value) : '#9ca3af'

    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          <View style={styles.cardInfo}>
            <Text style={styles.courseName} numberOfLines={2}>{course?.name ?? '—'}</Text>
            <Text style={styles.courseCode}>{course?.code} • {course?.cfu} CFU</Text>
            {item.published_at && (
              <Text style={styles.date}>
                {new Date(item.published_at).toLocaleDateString('fr-FR')}
              </Text>
            )}
          </View>
          <View style={[styles.gradeBox, { borderColor: color }]}>
            <Text style={[styles.grade, { color }]}>
              {item.value ?? '—'}
              {item.is_honors ? 'L' : ''}
            </Text>
            {item.is_honors && <Text style={styles.honorsLabel}>Honours</Text>}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Libretto</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <>
          {/* Résumé */}
          {accepted.length > 0 && (
            <View style={styles.summary}>
              <SumStat label="Examens" value={accepted.length.toString()} />
              <SumStat label="CFU" value={totalCfu.toString()} />
              <SumStat label="Moyenne" value={avg.toFixed(2)} />
            </View>
          )}

          <FlatList
            data={grades}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadGrades() }}
                colors={['#6366f1']}
              />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>Aucun examen enregistré.</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  )
}

function SumStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sumStat}>
      <Text style={styles.sumValue}>{value}</Text>
      <Text style={styles.sumLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header:    { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, backgroundColor: '#f9fafb' },
  title:     { fontSize: 24, fontWeight: '800', color: '#111827' },

  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 14 },

  summary: {
    flexDirection:  'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom:    12,
    borderRadius:    16,
    paddingVertical: 16,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  sumStat:  { alignItems: 'center' },
  sumValue: { fontSize: 22, fontWeight: '800', color: '#6366f1' },
  sumLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  list: { padding: 20, paddingTop: 8, gap: 10 },

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
  cardMain:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardInfo:  { flex: 1 },
  courseName:{ fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20 },
  courseCode:{ fontSize: 12, color: '#6b7280', marginTop: 3 },
  date:      { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  gradeBox: {
    width:        60,
    height:       60,
    borderRadius: 12,
    borderWidth:  2,
    alignItems:   'center',
    justifyContent: 'center',
  },
  grade:       { fontSize: 22, fontWeight: '800' },
  honorsLabel: { fontSize: 9, color: '#f59e0b', fontWeight: '700', marginTop: -2 },
})
