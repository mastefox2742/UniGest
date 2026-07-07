import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native'
import { useEffect, useState } from 'react'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import type { Session } from '@supabase/supabase-js'

type Profile = {
  first_name: string
  last_name:  string
}

type Student = {
  id:        string
  matricola: string | null
  status:    string
  profiles:  Profile
  degree_programs?: { name: string }
}

type Stats = {
  gradesCount:   number
  avgGrade:      number
  pendingExams:  number
  overdueFees:   number
}

export default function DashboardScreen() {
  const [session, setSession]   = useState<Session | null>(null)
  const [student, setStudent]   = useState<Student | null>(null)
  const [stats, setStats]       = useState<Stats | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) router.replace('/(auth)/login')
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    loadData()
  }, [session])

  async function loadData() {
    setLoading(true)
    try {
      // Profil étudiant
      const { data: stu } = await supabase
        .from('students')
        .select(`
          id, matricola, status,
          profiles!user_id(first_name, last_name),
          degree_programs!degree_program_id(name)
        `)
        .eq('user_id', session!.user.id)
        .single()

      setStudent(stu as any)

      if (stu) {
        // Stats en parallèle
        const [{ data: grades }, { count: pending }, { count: overdue }] = await Promise.all([
          supabase
            .from('grades')
            .select('value')
            .eq('student_id', stu.id)
            .in('status', ['accepted', 'published']),
          supabase
            .from('exam_bookings')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', stu.id)
            .eq('status', 'booked'),
          supabase
            .from('tuition_fees')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', stu.id)
            .eq('status', 'overdue'),
        ])

        const accepted    = (grades ?? []).filter(g => typeof g.value === 'number')
        const avg         = accepted.length > 0
          ? accepted.reduce((s, g) => s + (g.value ?? 0), 0) / accepted.length
          : 0

        setStats({
          gradesCount:  accepted.length,
          avgGrade:     Math.round(avg * 10) / 10,
          pendingExams: pending ?? 0,
          overdueFees:  overdue ?? 0,
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  const profile  = student?.profiles as any
  const dp       = student?.degree_programs as any
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : '…'

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.name}>{fullName} 👋</Text>
          {dp && <Text style={styles.program}>{dp.name}</Text>}
          {student?.matricola && (
            <Text style={styles.matricola}>Matr. {student.matricola}</Text>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/(student)/notifications')}
            style={styles.iconBtn}
          >
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.iconBtn}>
            <Text style={{ fontSize: 22 }}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <View style={styles.statsGrid}>
              <StatCard
                emoji="📊"
                label="Examens passés"
                value={stats.gradesCount.toString()}
                color="#6366f1"
              />
              <StatCard
                emoji="⭐"
                label="Moyenne"
                value={stats.avgGrade > 0 ? stats.avgGrade.toFixed(1) : '—'}
                color="#f59e0b"
              />
              <StatCard
                emoji="📅"
                label="Réservations"
                value={stats.pendingExams.toString()}
                color="#10b981"
              />
              <StatCard
                emoji={stats.overdueFees > 0 ? '⚠️' : '✅'}
                label="Impayés"
                value={stats.overdueFees.toString()}
                color={stats.overdueFees > 0 ? '#ef4444' : '#10b981'}
              />
            </View>
          )}

          {/* Alertes */}
          {stats && stats.overdueFees > 0 && (
            <View style={styles.alert}>
              <Text style={styles.alertText}>
                ⚠️ Vous avez {stats.overdueFees} frais en retard. Régularisez votre situation dès que possible.
              </Text>
            </View>
          )}

          {/* Actions rapides */}
          <Text style={styles.sectionTitle}>Accès rapide</Text>
          <View style={styles.quickActions}>
            <QuickAction emoji="📋" label="Mon libretto" onPress={() => router.push('/(student)/libretto')} />
            <QuickAction emoji="📝" label="Examens"      onPress={() => router.push('/(student)/exams')} />
            <QuickAction emoji="🗓️" label="Planning"    onPress={() => router.push('/(student)/schedule')} />
            <QuickAction emoji="💶" label="Frais"        onPress={() => router.push('/(student)/fees')} />
            <QuickAction emoji="ST" label="Stages"      onPress={() => router.push('/(student)/internships' as Parameters<typeof router.push>[0])} />
            <QuickAction emoji="AL" label="Alumni"      onPress={() => router.push('/(student)/alumni' as Parameters<typeof router.push>[0])} />
            <QuickAction emoji="📖" label="Ma thèse"     onPress={() => router.push('/(student)/thesis' as Parameters<typeof router.push>[0])} />
            <QuickAction emoji="🔔" label="Notifications" onPress={() => router.push('/(student)/notifications')} />
            <QuickAction emoji="👤" label="Mon profil"  onPress={() => router.push('/(student)/profile')} />
          </View>
        </>
      )}
    </ScrollView>
  )
}

function StatCard({
  emoji, label, value, color,
}: { emoji: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function QuickAction({
  emoji, label, onPress,
}: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.quickEmoji}>{emoji}</Text>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content:   { padding: 20, paddingTop: 56, paddingBottom: 32 },

  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   28,
  },
  greeting:  { fontSize: 14, color: '#6b7280' },
  name:      { fontSize: 24, fontWeight: '800', color: '#111827', marginTop: 2 },
  program:   { fontSize: 13, color: '#6b7280', marginTop: 4 },
  matricola: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  iconBtn: { padding: 8 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           12,
    marginBottom:  20,
  },
  statCard: {
    flex:            1,
    minWidth:        '45%',
    backgroundColor: '#fff',
    borderRadius:    16,
    padding:         16,
    borderTopWidth:  3,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  statEmoji: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '800', lineHeight: 32 },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  alert: {
    backgroundColor: '#fef2f2',
    borderWidth:      1,
    borderColor:      '#fecaca',
    borderRadius:     12,
    padding:          14,
    marginBottom:     20,
  },
  alertText: { fontSize: 13, color: '#991b1b', lineHeight: 18 },

  sectionTitle: {
    fontSize:     16,
    fontWeight:   '700',
    color:        '#111827',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           10,
  },
  quickAction: {
    flex:            1,
    minWidth:        '45%',
    backgroundColor: '#fff',
    borderRadius:    16,
    padding:         20,
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.06,
    shadowRadius:    4,
    elevation:       2,
  },
  quickEmoji: { fontSize: 28, marginBottom: 8 },
  quickLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
})
