import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, RefreshControl, TextInput, Alert,
} from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { apiFetch } from '@/lib/api'
import { colors, spacing, radius, shadow, typography } from '@/lib/theme'

type Material = {
  id: string
  title: string
  type: string
  url: string | null
  content: string | null
  duration_s: number | null
  position: number
}

type Section = {
  id: string
  title: string
  description: string | null
  position: number
  elearning_materials: Material[]
}

type Announcement = {
  id: string
  title: string
  body: string
  is_pinned: boolean
  published_at: string
  created_at: string
}

type Assignment = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  max_score: number
  my_submission: AssignmentSubmission | null
}

type AssignmentSubmission = {
  id: string
  content: string | null
  file_url: string | null
  score: number | null
  feedback: string | null
  submitted_at: string
  graded_at: string | null
}

type QuizSummary = {
  id: string
  title: string
  description: string | null
  is_published: boolean
  time_limit_min: number | null
  pass_score: number
  max_attempts: number | null
}

type QuizOption = {
  id: string
  text: string
  position: number
}

type QuizQuestion = {
  id: string
  text: string
  type: 'single' | 'multiple' | 'true_false' | 'open'
  points: number
  position: number
  quiz_options: QuizOption[]
}

type QuizDetail = QuizSummary & {
  quiz_questions: QuizQuestion[]
}

type QuizAttempt = {
  id: string
  status: string
  score: number | null
  score_pct: number | null
  passed: boolean | null
  started_at: string
  submitted_at: string | null
}

type ForumPost = {
  id: string
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string | null
  parent_id: string | null
  profiles: { first_name: string; last_name: string; avatar_url: string | null } | null
}

type CourseDetail = {
  ec: {
    id: string
    welcome_message: string | null
    courses: { name: string; code: string; cfu: number; semester: number } | null
    elearning_sections: Section[]
    elearning_announcements: Announcement[]
    elearning_assignments: Assignment[]
    elearning_quizzes: QuizSummary[]
  }
  progress: Record<string, { completed: boolean; progress_pct: number }>
  progressSummary: { total: number; completed: number; progressPct: number; averageProgress: number }
}

type Tab = 'content' | 'announcements' | 'assignments' | 'quizzes' | 'forum'

function fmtDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('fr-FR')
}

export default function CourseDetailScreen() {
  const { ecId } = useLocalSearchParams<{ ecId?: string }>()
  const [data, setData] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<Tab>('content')
  const [quizAttempts, setQuizAttempts] = useState<Record<string, QuizAttempt[]>>({})
  const [activeQuiz, setActiveQuiz] = useState<QuizDetail | null>(null)
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, { selectedOptionIds: string[]; openAnswer: string }>>({})
  const [quizBusy, setQuizBusy] = useState<string | null>(null)
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([])
  const [forumContent, setForumContent] = useState('')
  const [replyTo, setReplyTo] = useState<ForumPost | null>(null)
  const [postingForum, setPostingForum] = useState(false)
  const [assignmentForms, setAssignmentForms] = useState<Record<string, { content: string; fileUrl: string }>>({})
  const [submittingAssignment, setSubmittingAssignment] = useState<string | null>(null)

  async function loadData() {
    if (!ecId) return
    try {
      const detail = await apiFetch<CourseDetail>(`/api/elearning/student/courses/${ecId}`)
      setData(detail)
      await loadQuizAttempts(detail.ec.elearning_quizzes ?? [])
      await loadForumPosts(detail.ec.id)
    } catch (err) {
      console.error('[CourseDetail]', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadForumPosts(courseEcId = ecId) {
    if (!courseEcId) return
    try {
      const posts = await apiFetch<ForumPost[]>(`/api/forum/courses/${courseEcId}`)
      setForumPosts(posts ?? [])
    } catch (err) {
      console.error('[CourseDetail] forum', err)
    }
  }

  async function submitForumPost() {
    if (!data || !forumContent.trim()) return
    setPostingForum(true)
    try {
      const payload: { content: string; parentId?: string } = { content: forumContent.trim() }
      if (replyTo) payload.parentId = replyTo.id
      await apiFetch(`/api/forum/courses/${data.ec.id}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setForumContent('')
      setReplyTo(null)
      await loadForumPosts(data.ec.id)
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Publication impossible')
    } finally {
      setPostingForum(false)
    }
  }

  async function submitAssignment(assignment: Assignment) {
    const form = assignmentForms[assignment.id]
    const content = form?.content?.trim() || assignment.my_submission?.content?.trim() || ''
    const fileUrl = form?.fileUrl?.trim() || assignment.my_submission?.file_url?.trim() || ''

    if (!content) {
      Alert.alert('Rendu vide', 'Ajoutez un contenu avant de soumettre le devoir.')
      return
    }

    setSubmittingAssignment(assignment.id)
    try {
      const body: { content: string; fileUrl?: string } = { content }
      if (fileUrl) body.fileUrl = fileUrl
      await apiFetch(`/api/elearning/assignments/${assignment.id}/submit`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      setAssignmentForms(prev => ({ ...prev, [assignment.id]: { content: '', fileUrl: '' } }))
      Alert.alert('Devoir soumis', 'Votre rendu a ete enregistre.')
      await loadData()
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Soumission impossible')
    } finally {
      setSubmittingAssignment(null)
    }
  }

  function setAssignmentForm(assignmentId: string, key: 'content' | 'fileUrl', value: string) {
    setAssignmentForms(prev => ({
      ...prev,
      [assignmentId]: {
        content: prev[assignmentId]?.content ?? '',
        fileUrl: prev[assignmentId]?.fileUrl ?? '',
        [key]: value,
      },
    }))
  }

  async function loadQuizAttempts(quizzes: QuizSummary[]) {
    const pairs = await Promise.all(
      quizzes.map(async quiz => {
        try {
          const attempts = await apiFetch<QuizAttempt[]>(`/api/quiz/${quiz.id}/attempts`)
          return [quiz.id, attempts ?? []] as const
        } catch {
          return [quiz.id, []] as const
        }
      }),
    )
    setQuizAttempts(Object.fromEntries(pairs))
  }

  async function startQuiz(quizId: string) {
    setQuizBusy(quizId)
    try {
      const [attempt, quiz] = await Promise.all([
        apiFetch<QuizAttempt>(`/api/quiz/${quizId}/start`, { method: 'POST' }),
        apiFetch<QuizDetail>(`/api/quiz/${quizId}`),
      ])
      setActiveAttemptId(attempt.id)
      setActiveQuiz(quiz)
      setAnswers({})
    } catch (err) {
      Alert.alert('Quiz indisponible', err instanceof Error ? err.message : 'Impossible de demarrer le quiz')
    } finally {
      setQuizBusy(null)
    }
  }

  async function submitQuiz() {
    if (!activeQuiz || !activeAttemptId) return
    setQuizBusy(activeQuiz.id)
    try {
      const payload = activeQuiz.quiz_questions.map(question => {
        const answer = answers[question.id]
        return {
          questionId: question.id,
          selectedOptionIds: answer?.selectedOptionIds ?? [],
          openAnswer: answer?.openAnswer ?? '',
        }
      })
      const result = await apiFetch<QuizAttempt>(`/api/quiz/attempts/${activeAttemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers: payload }),
      })
      Alert.alert('Quiz termine', `Score: ${result.score_pct ?? 0}%`)
      setActiveQuiz(null)
      setActiveAttemptId(null)
      setAnswers({})
      await loadData()
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Soumission impossible')
    } finally {
      setQuizBusy(null)
    }
  }

  function toggleOption(question: QuizQuestion, optionId: string) {
    setAnswers(prev => {
      const current = prev[question.id]?.selectedOptionIds ?? []
      const selectedOptionIds = question.type === 'multiple'
        ? current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId]
        : [optionId]
      return {
        ...prev,
        [question.id]: {
          selectedOptionIds,
          openAnswer: prev[question.id]?.openAnswer ?? '',
        },
      }
    })
  }

  function setOpenAnswer(questionId: string, value: string) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        selectedOptionIds: prev[questionId]?.selectedOptionIds ?? [],
        openAnswer: value,
      },
    }))
  }

  async function markDone(materialId: string) {
    try {
      await apiFetch(`/api/elearning/materials/${materialId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ progressPct: 100, completed: true }),
      })
      await loadData()
    } catch (err) {
      console.error('[CourseDetail] progress', err)
    }
  }

  useEffect(() => { loadData() }, [ecId])

  const sections = useMemo(() => {
    return [...(data?.ec.elearning_sections ?? [])].sort((a, b) => a.position - b.position)
  }, [data])

  const announcements = useMemo(() => {
    return [...(data?.ec.elearning_announcements ?? [])].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime()
    })
  }, [data])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Cours introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const course = data.ec.courses

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>{course?.name ?? 'Cours'}</Text>
        <Text style={styles.subtitle}>{course?.code ?? '-'} - {course?.cfu ?? 0} CFU - Sem. {course?.semester ?? '-'}</Text>

        <View style={styles.progressBox}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>Progression globale</Text>
            <Text style={styles.progressPct}>{data.progressSummary.progressPct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${data.progressSummary.progressPct}%` as `${number}%` }]} />
          </View>
          <Text style={styles.progressMeta}>
            {data.progressSummary.completed}/{data.progressSummary.total} ressources terminees
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {([
          ['content', 'Contenu'],
          ['announcements', 'Annonces'],
          ['assignments', 'Devoirs'],
          ['quizzes', 'Quiz'],
          ['forum', 'Forum'],
        ] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.tab, tab === key && styles.tabActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData() }}
            colors={[colors.primary]}
          />
        }
      >
        {tab === 'content' && (
          <View style={styles.stack}>
            {data.ec.welcome_message ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>{data.ec.welcome_message}</Text>
              </View>
            ) : null}
            {sections.length === 0 ? <Empty text="Aucun contenu publie." /> : null}
            {sections.map(section => (
              <View key={section.id} style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.description ? <Text style={styles.sectionDesc}>{section.description}</Text> : null}
                {[...(section.elearning_materials ?? [])]
                  .sort((a, b) => a.position - b.position)
                  .map(material => {
                    const prog = data.progress[material.id]
                    const done = prog?.completed ?? false
                    return (
                      <View key={material.id} style={styles.materialRow}>
                        <View style={styles.materialMain}>
                          <Text style={styles.materialTitle}>{material.title}</Text>
                          <Text style={styles.materialMeta}>{material.type} - {prog?.progress_pct ?? 0}%</Text>
                          {material.content ? <Text style={styles.materialContent} numberOfLines={3}>{material.content}</Text> : null}
                        </View>
                        <View style={styles.materialActions}>
                          {material.url ? (
                            <TouchableOpacity onPress={() => Linking.openURL(material.url!)} style={styles.smallBtn}>
                              <Text style={styles.smallBtnText}>Ouvrir</Text>
                            </TouchableOpacity>
                          ) : null}
                          <TouchableOpacity
                            onPress={() => markDone(material.id)}
                            disabled={done}
                            style={[styles.smallBtn, done && styles.doneBtn]}
                          >
                            <Text style={[styles.smallBtnText, done && styles.doneBtnText]}>
                              {done ? 'Fait' : 'Terminer'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  })}
              </View>
            ))}
          </View>
        )}

        {tab === 'announcements' && (
          <View style={styles.stack}>
            {announcements.length === 0 ? <Empty text="Aucune annonce." /> : null}
            {announcements.map(item => (
              <View key={item.id} style={styles.announcementCard}>
                <View style={styles.announcementTop}>
                  <Text style={styles.announcementTitle}>{item.title}</Text>
                  {item.is_pinned ? <Text style={styles.pin}>Epinglee</Text> : null}
                </View>
                <Text style={styles.announcementBody}>{item.body}</Text>
                <Text style={styles.announcementDate}>{fmtDate(item.published_at ?? item.created_at)}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'assignments' && (
          <View style={styles.stack}>
            {(data.ec.elearning_assignments ?? []).length === 0 ? <Empty text="Aucun devoir." /> : null}
            {(data.ec.elearning_assignments ?? []).map(item => (
              <View key={item.id} style={styles.assignmentCard}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
                {item.description ? <Text style={styles.sectionDesc}>{item.description}</Text> : null}
                <Text style={styles.materialMeta}>Deadline: {fmtDate(item.due_date)} - Max {item.max_score}</Text>
                {item.my_submission ? (
                  <View style={styles.submissionBox}>
                    <Text style={styles.submissionTitle}>Dernier rendu</Text>
                    <Text style={styles.materialMeta}>Soumis le {fmtDate(item.my_submission.submitted_at)}</Text>
                    {item.my_submission.score !== null ? (
                      <Text style={styles.submissionScore}>Note: {item.my_submission.score}/{item.max_score}</Text>
                    ) : (
                      <Text style={styles.materialMeta}>En attente de correction</Text>
                    )}
                    {item.my_submission.feedback ? <Text style={styles.feedbackText}>{item.my_submission.feedback}</Text> : null}
                    {item.my_submission.file_url ? (
                      <TouchableOpacity onPress={() => Linking.openURL(item.my_submission!.file_url!)} style={styles.smallBtn}>
                        <Text style={styles.smallBtnText}>Ouvrir le fichier rendu</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
                <TextInput
                  value={assignmentForms[item.id]?.content ?? item.my_submission?.content ?? ''}
                  onChangeText={value => setAssignmentForm(item.id, 'content', value)}
                  multiline
                  placeholder="Redigez votre rendu"
                  style={styles.answerInput}
                />
                <TextInput
                  value={assignmentForms[item.id]?.fileUrl ?? item.my_submission?.file_url ?? ''}
                  onChangeText={value => setAssignmentForm(item.id, 'fileUrl', value)}
                  placeholder="URL fichier optionnelle"
                  autoCapitalize="none"
                  style={styles.urlInput}
                />
                <TouchableOpacity
                  onPress={() => submitAssignment(item)}
                  disabled={submittingAssignment === item.id}
                  style={[styles.primaryBtn, submittingAssignment === item.id && styles.disabledBtn]}
                >
                  <Text style={styles.primaryBtnText}>
                    {submittingAssignment === item.id ? 'Envoi...' : item.my_submission ? 'Mettre a jour le rendu' : 'Soumettre le devoir'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {tab === 'quizzes' && (
          <View style={styles.stack}>
            {activeQuiz ? (
              <View style={styles.quizRunner}>
                <View style={styles.cardTop}>
                  <Text style={styles.sectionTitle}>{activeQuiz.title}</Text>
                  <TouchableOpacity
                    onPress={() => { setActiveQuiz(null); setActiveAttemptId(null); setAnswers({}) }}
                    style={styles.secondaryMiniBtn}
                  >
                    <Text style={styles.secondaryMiniBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </View>
                {activeQuiz.description ? <Text style={styles.sectionDesc}>{activeQuiz.description}</Text> : null}
                {[...(activeQuiz.quiz_questions ?? [])].sort((a, b) => a.position - b.position).map((question, index) => (
                  <View key={question.id} style={styles.questionCard}>
                    <Text style={styles.questionTitle}>{index + 1}. {question.text}</Text>
                    <Text style={styles.materialMeta}>{question.points} point(s)</Text>
                    {question.type === 'open' ? (
                      <TextInput
                        value={answers[question.id]?.openAnswer ?? ''}
                        onChangeText={value => setOpenAnswer(question.id, value)}
                        multiline
                        placeholder="Votre reponse"
                        style={styles.answerInput}
                      />
                    ) : (
                      <View style={styles.optionStack}>
                        {[...(question.quiz_options ?? [])].sort((a, b) => a.position - b.position).map(option => {
                          const selected = answers[question.id]?.selectedOptionIds.includes(option.id) ?? false
                          return (
                            <TouchableOpacity
                              key={option.id}
                              onPress={() => toggleOption(question, option.id)}
                              style={[styles.optionRow, selected && styles.optionRowSelected]}
                            >
                              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.text}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    )}
                  </View>
                ))}
                <TouchableOpacity
                  onPress={submitQuiz}
                  disabled={quizBusy === activeQuiz.id}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>{quizBusy === activeQuiz.id ? 'Soumission...' : 'Soumettre le quiz'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {(data.ec.elearning_quizzes ?? []).length === 0 ? <Empty text="Aucun quiz." /> : null}
            {(data.ec.elearning_quizzes ?? []).map(quiz => {
              const attempts = quizAttempts[quiz.id] ?? []
              const latest = attempts[0]
              const completedCount = attempts.filter(attempt => attempt.status === 'completed').length
              const maxAttempts = quiz.max_attempts ?? 1
              const locked = completedCount >= maxAttempts
              return (
                <View key={quiz.id} style={styles.assignmentCard}>
                  <Text style={styles.sectionTitle}>{quiz.title}</Text>
                  {quiz.description ? <Text style={styles.sectionDesc}>{quiz.description}</Text> : null}
                  <Text style={styles.materialMeta}>
                    Seuil {quiz.pass_score}% - Tentatives {completedCount}/{maxAttempts}
                    {quiz.time_limit_min ? ` - ${quiz.time_limit_min} min` : ''}
                  </Text>
                  {latest ? (
                    <Text style={styles.quizResult}>
                      Dernier resultat: {latest.status === 'completed' ? `${latest.score_pct ?? 0}% ${latest.passed ? 'reussi' : 'a reprendre'}` : latest.status}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    onPress={() => startQuiz(quiz.id)}
                    disabled={locked || quizBusy === quiz.id || !!activeQuiz}
                    style={[styles.smallBtn, (locked || !!activeQuiz) && styles.disabledBtn]}
                  >
                    <Text style={styles.smallBtnText}>
                      {locked ? 'Tentatives terminees' : quizBusy === quiz.id ? 'Ouverture...' : 'Demarrer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        )}

        {tab === 'forum' && (
          <View style={styles.stack}>
            <View style={styles.forumComposer}>
              {replyTo ? (
                <View style={styles.replyBanner}>
                  <Text style={styles.replyText}>Reponse a {authorName(replyTo)}</Text>
                  <TouchableOpacity onPress={() => setReplyTo(null)}>
                    <Text style={styles.replyCancel}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <TextInput
                value={forumContent}
                onChangeText={setForumContent}
                multiline
                placeholder="Partager une question ou une reponse"
                style={styles.forumInput}
              />
              <TouchableOpacity
                onPress={submitForumPost}
                disabled={postingForum || !forumContent.trim()}
                style={[styles.primaryBtn, (!forumContent.trim() || postingForum) && styles.disabledBtn]}
              >
                <Text style={styles.primaryBtnText}>{postingForum ? 'Publication...' : replyTo ? 'Repondre' : 'Publier'}</Text>
              </TouchableOpacity>
            </View>

            {forumThreads(forumPosts).length === 0 ? <Empty text="Aucun message dans le forum." /> : null}
            {forumThreads(forumPosts).map(thread => (
              <View key={thread.id} style={styles.forumCard}>
                <View style={styles.announcementTop}>
                  <Text style={styles.forumAuthor}>{authorName(thread)}</Text>
                  {thread.is_pinned ? <Text style={styles.pin}>Epingle</Text> : null}
                </View>
                <Text style={styles.forumDate}>{fmtDate(thread.created_at)}</Text>
                <Text style={styles.forumContent}>{thread.content}</Text>
                <TouchableOpacity onPress={() => setReplyTo(thread)} style={styles.secondaryMiniBtn}>
                  <Text style={styles.secondaryMiniBtnText}>Repondre</Text>
                </TouchableOpacity>

                {forumReplies(forumPosts, thread.id).map(reply => (
                  <View key={reply.id} style={styles.replyCard}>
                    <Text style={styles.forumAuthor}>{authorName(reply)}</Text>
                    <Text style={styles.forumDate}>{fmtDate(reply.created_at)}</Text>
                    <Text style={styles.forumContent}>{reply.content}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  )
}

function authorName(post: ForumPost) {
  const profile = post.profiles
  if (!profile) return 'Utilisateur'
  return `${profile.first_name} ${profile.last_name}`.trim() || 'Utilisateur'
}

function forumThreads(posts: ForumPost[]) {
  return posts.filter(post => !post.parent_id)
}

function forumReplies(posts: ForumPost[], parentId: string) {
  return posts.filter(post => post.parent_id === parentId)
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  header: { paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  backText: { ...typography.sm, color: colors.primary, fontWeight: '700' },
  title: { ...typography.xl, color: colors.text, fontWeight: '800' },
  subtitle: { ...typography.sm, color: colors.textMuted, marginTop: 2 },
  progressBox: { marginTop: spacing.md, gap: spacing.xs },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { ...typography.xs, color: colors.textMuted },
  progressPct: { ...typography.xs, color: colors.primary, fontWeight: '800' },
  progressTrack: { height: 8, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  progressMeta: { ...typography.xs, color: colors.textMuted, textAlign: 'right' },
  tabs: { flexDirection: 'row', padding: spacing.sm, gap: spacing.xs, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primaryLight },
  tabText: { ...typography.sm, color: colors.textSecond, fontWeight: '600' },
  tabTextActive: { color: colors.primary },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  stack: { gap: spacing.md },
  infoCard: { backgroundColor: colors.infoBg, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.info },
  infoText: { ...typography.sm, color: colors.infoDark },
  sectionCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  sectionTitle: { ...typography.base, fontWeight: '800', color: colors.text },
  sectionDesc: { ...typography.sm, color: colors.textMuted, marginTop: 2 },
  materialRow: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md, gap: spacing.sm },
  materialMain: { gap: 2 },
  materialTitle: { ...typography.sm, color: colors.text, fontWeight: '700' },
  materialMeta: { ...typography.xs, color: colors.textMuted },
  materialContent: { ...typography.sm, color: colors.textSecond, marginTop: spacing.xs },
  materialActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  smallBtn: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.primaryLight },
  smallBtnText: { ...typography.xs, color: colors.primary, fontWeight: '800' },
  doneBtn: { backgroundColor: colors.successBg },
  doneBtnText: { color: colors.successDark },
  announcementCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  announcementTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  announcementTitle: { ...typography.base, color: colors.text, fontWeight: '800', flex: 1 },
  announcementBody: { ...typography.sm, color: colors.textSecond, marginTop: spacing.sm },
  announcementDate: { ...typography.xs, color: colors.textMuted, marginTop: spacing.sm },
  pin: { ...typography.xs, color: colors.warningDark, backgroundColor: colors.warningBg, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  assignmentCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, ...shadow.sm },
  quizRunner: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  questionCard: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md, gap: spacing.sm },
  questionTitle: { ...typography.sm, color: colors.text, fontWeight: '800' },
  optionStack: { gap: spacing.sm },
  optionRow: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  optionRowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionText: { ...typography.sm, color: colors.textSecond },
  optionTextSelected: { color: colors.primary, fontWeight: '800' },
  answerInput: { minHeight: 96, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, textAlignVertical: 'top' },
  urlInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text },
  quizResult: { ...typography.sm, color: colors.textSecond, marginTop: spacing.xs },
  submissionBox: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs, marginTop: spacing.md },
  submissionTitle: { ...typography.sm, color: colors.text, fontWeight: '800' },
  submissionScore: { ...typography.sm, color: colors.successDark, fontWeight: '800' },
  feedbackText: { ...typography.sm, color: colors.textSecond, fontStyle: 'italic' },
  disabledBtn: { opacity: 0.55 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, alignItems: 'center' },
  primaryBtnText: { ...typography.sm, color: '#fff', fontWeight: '800' },
  secondaryMiniBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  secondaryMiniBtnText: { ...typography.xs, color: colors.textSecond, fontWeight: '800' },
  forumComposer: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, ...shadow.sm },
  forumInput: { minHeight: 96, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, textAlignVertical: 'top' },
  forumCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, ...shadow.sm },
  forumAuthor: { ...typography.sm, color: colors.text, fontWeight: '800' },
  forumDate: { ...typography.xs, color: colors.textMuted },
  forumContent: { ...typography.sm, color: colors.textSecond, lineHeight: 20 },
  replyCard: { marginTop: spacing.sm, marginLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: spacing.md, gap: spacing.xs },
  replyBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.sm },
  replyText: { ...typography.xs, color: colors.primary, fontWeight: '800' },
  replyCancel: { ...typography.xs, color: colors.primaryDark, fontWeight: '800' },
  emptyBox: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', backgroundColor: colors.card },
  emptyText: { ...typography.sm, color: colors.textMuted },
  emptyTitle: { ...typography.lg, color: colors.text, fontWeight: '800' },
  secondaryBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  secondaryBtnText: { ...typography.sm, color: colors.textSecond, fontWeight: '700' },
})
