import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native'
import { useEffect, useState } from 'react'
import { cachedApiFetch } from '@/lib/offlineCache'
import { colors, radius, shadow, spacing, typography } from '@/lib/theme'

type LibrettoEntry = {
  id: string
  courseCode: string
  courseName: string
  cfu: number
  courseYear: number
  semester: number
  grade: string
  gradeStatus: string
  publishedAt: string | null
  examDate: string | null
  teacherName: string
}

type StudentCareer = {
  student: {
    matricola: string | null
    fullName: string
    status: string
    currentYear: number
    degreeProgram: string
    degreeType: string
    totalCfu: number
  }
  summary: {
    passedExams: number
    totalCfuEarned: number
    totalCfu: number
    cfuProgressPct: number
    arithmeticMean: number
    weightedMean: number
    laureaStartScore: number
  }
  libretto: LibrettoEntry[]
}

function gradeColor(grade: string) {
  if (grade === '30L') return colors.gradeExcellent
  const value = Number(grade)
  if (value >= 27) return colors.gradeGood
  if (value >= 24) return colors.gradeOk
  return colors.gradeLow
}

function formatDate(value: string | null) {
  if (!value) return 'Date a confirmer'
  return new Date(value).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function LibrettoScreen() {
  const [career, setCareer] = useState<StudentCareer | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheInfo, setCacheInfo] = useState<{ fromCache: boolean; updatedAt: string | null } | null>(null)

  async function loadCareer() {
    try {
      setError(null)
      const result = await cachedApiFetch<StudentCareer>('student:career', '/api/students/me/career')
      setCareer(result.data ?? null)
      setCacheInfo({ fromCache: result.fromCache, updatedAt: result.updatedAt })
      if (result.fromCache) setError(`Mode hors ligne - donnees du ${formatDateTime(result.updatedAt)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { loadCareer() }, [])

  const entries = career?.libretto ?? []
  const summary = career?.summary
  const cfuPct = summary?.cfuProgressPct ?? 0

  const renderItem = ({ item }: { item: LibrettoEntry }) => {
    const color = gradeColor(item.grade)

    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          <View style={styles.cardInfo}>
            <Text style={styles.courseName} numberOfLines={2}>{item.courseName}</Text>
            <Text style={styles.courseCode}>
              {item.courseCode} - {item.cfu} CFU - An {item.courseYear}, Sem. {item.semester}
            </Text>
            <Text style={styles.teacher} numberOfLines={1}>{item.teacherName}</Text>
            <Text style={styles.date}>{formatDate(item.examDate ?? item.publishedAt)}</Text>
          </View>
          <View style={[styles.gradeBox, { borderColor: color }]}>
            <Text style={[styles.grade, { color }]}>{item.grade}</Text>
            {item.grade === '30L' && <Text style={styles.honorsLabel}>Lode</Text>}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Libretto</Text>
        <Text style={styles.subtitle}>
          {career?.student.degreeProgram ?? 'Carriere etudiante'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadCareer() }}
              colors={[colors.primary]}
            />
          }
          ListHeaderComponent={
            <View>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              {cacheInfo?.fromCache && (
                <View style={styles.cacheBox}>
                  <Text style={styles.cacheText}>Copie locale affichee. Tirez pour reessayer la synchronisation.</Text>
                </View>
              )}

              {summary && (
                <View style={styles.summary}>
                  <View style={styles.summaryTop}>
                    <View>
                      <Text style={styles.studentName}>{career?.student.fullName}</Text>
                      <Text style={styles.studentMeta}>
                        {career?.student.matricola ?? 'Matricola'} - Annee {career?.student.currentYear}
                      </Text>
                    </View>
                    <View style={styles.statusPill}>
                      <Text style={styles.statusText}>{career?.student.status}</Text>
                    </View>
                  </View>

                  <View style={styles.cfuBlock}>
                    <View style={styles.cfuHeader}>
                      <Text style={styles.cfuLabel}>Progression CFU</Text>
                      <Text style={styles.cfuValue}>
                        {summary.totalCfuEarned} / {summary.totalCfu}
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.min(cfuPct, 100)}%` as `${number}%` }]} />
                    </View>
                    <Text style={styles.progressPct}>{cfuPct.toFixed(1)}%</Text>
                  </View>

                  <View style={styles.statsGrid}>
                    <SumStat label="Examens" value={String(summary.passedExams)} />
                    <SumStat label="Moy. pond." value={summary.weightedMean > 0 ? summary.weightedMean.toFixed(2) : '-'} />
                    <SumStat label="Moy. arith." value={summary.arithmeticMean > 0 ? summary.arithmeticMean.toFixed(2) : '-'} />
                    <SumStat label="Laurea" value={summary.laureaStartScore > 0 ? summary.laureaStartScore.toFixed(1) : '-'} />
                  </View>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Aucune note publiee dans le libretto.</Text>
            </View>
          }
        />
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

function formatDateTime(value: string | null) {
  if (!value) return 'derniere synchronisation inconnue'
  return new Date(value).toLocaleString('fr-FR')
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 56,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  title: { ...typography['2xl'], fontWeight: '800', color: colors.text },
  subtitle: { ...typography.sm, color: colors.textSecond, marginTop: 2 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { ...typography.base, color: colors.textMuted, textAlign: 'center' },

  list: { padding: spacing.xl, paddingTop: spacing.sm, gap: spacing.md },

  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.sm, color: colors.errorDark },
  cacheBox: {
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cacheText: { ...typography.sm, color: colors.infoDark },

  summary: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  studentName: { ...typography.md, fontWeight: '800', color: colors.text },
  studentMeta: { ...typography.xs, color: colors.textSecond, marginTop: 2 },
  statusPill: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: { ...typography.xs, color: colors.primaryDark, fontWeight: '700' },

  cfuBlock: { marginTop: spacing.lg },
  cfuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cfuLabel: { ...typography.sm, color: colors.textSecond, fontWeight: '600' },
  cfuValue: { ...typography.sm, color: colors.text, fontWeight: '800' },
  progressTrack: {
    height: 8,
    backgroundColor: colors.borderLight,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  progressPct: { ...typography.xs, color: colors.primary, fontWeight: '700', marginTop: spacing.xs, textAlign: 'right' },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  sumStat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  sumValue: { ...typography.xl, fontWeight: '800', color: colors.primary },
  sumLabel: { ...typography.xs, color: colors.textMuted, marginTop: 2 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.sm,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardInfo: { flex: 1 },
  courseName: { ...typography.base, fontWeight: '800', color: colors.text },
  courseCode: { ...typography.sm, color: colors.textSecond, marginTop: 3 },
  teacher: { ...typography.xs, color: colors.textMuted, marginTop: 2 },
  date: { ...typography.xs, color: colors.textMuted, marginTop: 2 },

  gradeBox: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grade: { fontSize: 21, fontWeight: '900' },
  honorsLabel: { ...typography.xs, color: colors.gradeExcellent, fontWeight: '800', marginTop: -2 },
})
