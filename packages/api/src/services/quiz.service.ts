import { createClient } from '@supabase/supabase-js'
import { stripCorrectAnswers } from './quiz-rules'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ─── Quiz CRUD ────────────────────────────────────────────────────────────────

export async function createQuiz(ecId: string, input: {
  title:          string
  description?:   string
  timeLimitMin?:  number
  passScore?:     number
  maxAttempts?:   number
}) {
  const { data, error } = await supabase
    .from('elearning_quizzes')
    .insert({
      elearning_course_id: ecId,
      title:               input.title,
      description:         input.description ?? null,
      time_limit_min:      input.timeLimitMin ?? null,
      pass_score:          input.passScore ?? 50,
      max_attempts:        input.maxAttempts ?? 1,
      is_published:        false,
    })
    .select()
    .single()

  if (error || !data) throw new Error('Impossible de créer le quiz')
  return data
}

export async function updateQuiz(quizId: string, input: {
  title?:         string
  description?:   string
  timeLimitMin?:  number | null
  passScore?:     number
  maxAttempts?:   number | null
  isPublished?:   boolean
}) {
  const update: Record<string, unknown> = {}
  if (input.title         !== undefined) update.title          = input.title
  if (input.description   !== undefined) update.description    = input.description ?? null
  if (input.timeLimitMin  !== undefined) update.time_limit_min = input.timeLimitMin
  if (input.passScore     !== undefined) update.pass_score     = input.passScore
  if (input.maxAttempts   !== undefined) update.max_attempts   = input.maxAttempts
  if (input.isPublished   !== undefined) update.is_published   = input.isPublished

  const { data, error } = await supabase
    .from('elearning_quizzes')
    .update(update)
    .eq('id', quizId)
    .select()
    .single()

  if (error || !data) throw new Error('Impossible de mettre à jour le quiz')
  return data
}

export async function deleteQuiz(quizId: string) {
  await supabase.from('elearning_quizzes').delete().eq('id', quizId)
}

// ─── Questions ────────────────────────────────────────────────────────────────

export async function getQuizWithQuestions(quizId: string) {
  const { data, error } = await supabase
    .from('elearning_quizzes')
    .select(`
      id, title, description, time_limit_min, pass_score, max_attempts, is_published,
      quiz_questions(
        id, text, type, points, position,
        quiz_options(id, text, is_correct, position)
      )
    `)
    .eq('id', quizId)
    .single()

  if (error || !data) throw new Error('Quiz introuvable')
  return data
}

export async function getQuizForStudent(quizId: string) {
  const { data, error } = await supabase
    .from('elearning_quizzes')
    .select(`
      id, title, description, time_limit_min, pass_score, max_attempts, is_published,
      quiz_questions(
        id, text, type, points, position,
        quiz_options(id, text, position)
      )
    `)
    .eq('id', quizId)
    .eq('is_published', true)
    .single()

  if (error || !data) throw new Error('Quiz introuvable')
  return stripCorrectAnswers(data)
}


export async function createQuestion(quizId: string, input: {
  text:     string
  type:     'single' | 'multiple' | 'true_false' | 'open'
  points?:  number
  options?: { text: string; isCorrect: boolean }[]
}) {
  const { count } = await supabase
    .from('quiz_questions')
    .select('id', { count: 'exact', head: true })
    .eq('quiz_id', quizId)

  const { data: q, error: qErr } = await supabase
    .from('quiz_questions')
    .insert({
      quiz_id:  quizId,
      text:     input.text,
      type:     input.type,
      points:   input.points ?? 1,
      position: (count ?? 0),
    })
    .select()
    .single()

  if (qErr || !q) throw new Error('Impossible de créer la question')

  if (input.options && input.options.length > 0) {
    const opts = input.options.map((o, i) => ({
      question_id: q.id,
      text:        o.text,
      is_correct:  o.isCorrect,
      position:    i,
    }))
    await supabase.from('quiz_options').insert(opts)
  }

  return q
}

export async function deleteQuestion(questionId: string) {
  await supabase.from('quiz_questions').delete().eq('id', questionId)
}

// ─── Tentatives ───────────────────────────────────────────────────────────────

export async function startQuizAttempt(quizId: string, studentUserId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) throw new Error('Étudiant introuvable')

  const { data: quiz } = await supabase
    .from('elearning_quizzes')
    .select('max_attempts, is_published')
    .eq('id', quizId)
    .single()

  if (!quiz || !quiz.is_published) throw new Error('Quiz non disponible')

  if (quiz.max_attempts) {
    const { count } = await supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', quizId)
      .eq('student_id', student.id)
      .eq('status', 'completed')

    if ((count ?? 0) >= quiz.max_attempts) {
      throw new Error(`Nombre maximum de tentatives atteint (${quiz.max_attempts})`)
    }
  }

  // Annuler toute tentative en cours
  await supabase
    .from('quiz_attempts')
    .update({ status: 'abandoned' })
    .eq('quiz_id', quizId)
    .eq('student_id', student.id)
    .eq('status', 'in_progress')

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({
      quiz_id:    quizId,
      student_id: student.id,
      status:     'in_progress',
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error || !data) throw new Error('Impossible de démarrer la tentative')
  return data
}

export async function submitQuizAttempt(
  attemptId:     string,
  studentUserId: string,
  answers: { questionId: string; selectedOptionIds?: string[]; openAnswer?: string }[],
) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) throw new Error('Étudiant introuvable')

  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('id, quiz_id, student_id, status')
    .eq('id', attemptId)
    .single()

  if (!attempt || attempt.student_id !== student.id) throw new Error('Tentative introuvable')
  if (attempt.status !== 'in_progress') throw new Error('Tentative déjà terminée')

  const { data: questions } = await supabase
    .from('quiz_questions')
    .select('id, type, points, quiz_options(id, is_correct)')
    .eq('quiz_id', attempt.quiz_id)

  let totalScore  = 0
  let totalPoints = 0

  const responseRows: Record<string, unknown>[] = []

  for (const q of questions ?? []) {
    const answer = answers.find(a => a.questionId === q.id)
    totalPoints += q.points

    if (!answer) continue

    const opts       = (q.quiz_options as { id: string; is_correct: boolean }[]) ?? []
    let earnedPoints = 0

    if (q.type !== 'open') {
      const correctIds  = new Set(opts.filter(o => o.is_correct).map(o => o.id))
      const selectedIds = new Set(answer.selectedOptionIds ?? [])

      if (q.type === 'single' || q.type === 'true_false') {
        if (selectedIds.size === 1 && correctIds.has([...selectedIds][0]!)) {
          earnedPoints = q.points
        }
      } else if (q.type === 'multiple') {
        const allCorrect = [...correctIds].every(id => selectedIds.has(id))
        const noWrong    = [...selectedIds].every(id => correctIds.has(id))
        if (allCorrect && noWrong) earnedPoints = q.points
      }
      totalScore += earnedPoints

      // One row per selected option
      const selectedArr = answer.selectedOptionIds ?? []
      selectedArr.forEach((optId, idx) => {
        const opt = opts.find(o => o.id === optId)
        responseRows.push({
          attempt_id:    attemptId,
          question_id:   q.id,
          option_id:     optId,
          is_correct:    opt?.is_correct ?? false,
          points_earned: idx === 0 ? earnedPoints : 0,
        })
      })

      // If nothing selected, record a null-option row
      if (selectedArr.length === 0) {
        responseRows.push({
          attempt_id:    attemptId,
          question_id:   q.id,
          option_id:     null,
          is_correct:    false,
          points_earned: 0,
        })
      }
    } else {
      // Open question — record the text answer, no auto-scoring
      responseRows.push({
        attempt_id:    attemptId,
        question_id:   q.id,
        option_id:     null,
        open_answer:   answer.openAnswer ?? null,
        is_correct:    null,
        points_earned: 0,
      })
    }
  }

  if (responseRows.length > 0) {
    await supabase.from('quiz_responses').insert(responseRows)
  }

  const { data: quiz } = await supabase
    .from('elearning_quizzes')
    .select('pass_score')
    .eq('id', attempt.quiz_id)
    .single()

  const scorePct = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0
  const passed   = scorePct >= (quiz?.pass_score ?? 50)

  const { data: updated } = await supabase
    .from('quiz_attempts')
    .update({
      status:       'completed',
      score:        totalScore,
      score_pct:    scorePct,
      passed,
      submitted_at: new Date().toISOString(),
      finished_at:  new Date().toISOString(),
    })
    .eq('id', attemptId)
    .select()
    .single()

  return updated
}

export async function getStudentQuizAttempts(quizId: string, studentUserId: string) {
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', studentUserId)
    .single()

  if (!student) return []

  const { data } = await supabase
    .from('quiz_attempts')
    .select('id, status, score, score_pct, passed, started_at, submitted_at')
    .eq('quiz_id', quizId)
    .eq('student_id', student.id)
    .order('started_at', { ascending: false })

  return data ?? []
}
