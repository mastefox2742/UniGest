'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useCreateQuiz, useUpdateQuiz, useDeleteQuiz, useQuiz, useCreateQuestion, useDeleteQuestion } from '@/lib/hooks/useQuiz'

type QuestionType = 'single' | 'multiple' | 'true_false' | 'open'

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single',     label: 'Choix unique' },
  { value: 'multiple',   label: 'Choix multiple' },
  { value: 'true_false', label: 'Vrai / Faux' },
  { value: 'open',       label: 'Question ouverte' },
]

function QuizEditor({ quizId, onBack }: { quizId: string; onBack: () => void }) {
  const { data: quiz, isLoading } = useQuiz(quizId)
  const updateQ    = useUpdateQuiz()
  const createQues = useCreateQuestion(quizId)
  const deleteQues = useDeleteQuestion(quizId)

  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [qForm, setQForm] = useState({
    question: '', type: 'single' as QuestionType, points: '1',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  })

  async function handleTogglePublish() {
    try {
      await updateQ.mutateAsync({ quizId, body: { isPublished: !quiz.is_published } })
      toast.success(quiz.is_published ? 'Quiz dépublié' : 'Quiz publié ✅')
    } catch (err) { toast.error((err as Error).message) }
  }

  async function handleAddQuestion() {
    if (!qForm.question.trim()) { toast.error('Question requise'); return }
    try {
      const body: {
        question: string; type: QuestionType; points?: number
        options?: { text: string; isCorrect: boolean }[]
      } = { question: qForm.question, type: qForm.type, points: Number(qForm.points) }

      if (qForm.type !== 'open') {
        const opts = qForm.options.filter(o => o.text.trim())
        if (opts.length < 2) { toast.error('Minimum 2 options requises'); return }
        body.options = opts
      }

      await createQues.mutateAsync(body)
      setQForm({
        question: '', type: 'single', points: '1',
        options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
      })
      setShowQuestionForm(false)
      toast.success('Question ajoutée')
    } catch (err) { toast.error((err as Error).message) }
  }

  if (isLoading) return <div className="h-32 animate-pulse rounded-xl bg-muted" />

  const questions: any[] = [...((quiz?.quiz_questions ?? []) as any[])].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded p-1 hover:bg-accent text-muted-foreground">← Retour</button>
        <h3 className="font-semibold flex-1">{quiz?.title}</h3>
        <span className="text-xs text-muted-foreground">{questions.length} question(s)</span>
        <button
          onClick={handleTogglePublish}
          disabled={updateQ.isPending}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            quiz?.is_published
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
          }`}
        >
          {quiz?.is_published ? '✅ Publié' : '⏸ Brouillon'}
        </button>
      </div>

      <div className="space-y-3">
        {questions.map((q: any, idx: number) => (
          <div key={q.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start gap-3">
              <span className="rounded-full bg-muted w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{q.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {QUESTION_TYPES.find(t => t.value === q.type)?.label} • {q.points} pt(s)
                </p>
                {q.type !== 'open' && (
                  <div className="mt-2 space-y-1">
                    {((q.quiz_options as any[]) ?? [])
                      .sort((a: any, b: any) => a.position - b.position)
                      .map((opt: any) => (
                        <div key={opt.id} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                          opt.is_correct ? 'bg-green-50 text-green-700' : 'text-muted-foreground'
                        }`}>
                          {opt.is_correct ? '✅' : '○'} {opt.text}
                        </div>
                      ))}
                  </div>
                )}
              </div>
              <button
                onClick={async () => {
                  try { await deleteQues.mutateAsync(q.id) }
                  catch (err) { toast.error((err as Error).message) }
                }}
                className="rounded p-1 text-red-500 hover:bg-red-50 text-xs"
              >🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire question */}
      {showQuestionForm ? (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h4 className="font-medium text-sm">Nouvelle question</h4>
          <div>
            <label className="block text-xs font-medium mb-1">Question *</label>
            <textarea
              value={qForm.question}
              onChange={e => setQForm(f => ({ ...f, question: e.target.value }))}
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1">Type</label>
              <select value={qForm.type} onChange={e => setQForm(f => ({ ...f, type: e.target.value as QuestionType }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm">
                {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Points</label>
              <input type="number" value={qForm.points} onChange={e => setQForm(f => ({ ...f, points: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
          </div>

          {qForm.type !== 'open' && (
            <div className="space-y-2">
              <label className="block text-xs font-medium">Options (cocher = bonne réponse)</label>
              {qForm.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={opt.isCorrect}
                    onChange={e => setQForm(f => ({
                      ...f,
                      options: f.options.map((o, j) => j === i ? { ...o, isCorrect: e.target.checked } : o),
                    }))}
                    className="rounded"
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={e => setQForm(f => ({
                      ...f,
                      options: f.options.map((o, j) => j === i ? { ...o, text: e.target.value } : o),
                    }))}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 rounded-md border bg-background px-3 py-1 text-sm"
                  />
                  {qForm.options.length > 2 && (
                    <button
                      onClick={() => setQForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                      className="text-red-500 text-xs hover:bg-red-50 rounded p-1"
                    >✕</button>
                  )}
                </div>
              ))}
              {qForm.options.length < 6 && (
                <button
                  onClick={() => setQForm(f => ({ ...f, options: [...f.options, { text: '', isCorrect: false }] }))}
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  + Ajouter une option
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleAddQuestion} disabled={createQues.isPending}
              className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createQues.isPending ? 'Ajout...' : 'Ajouter la question'}
            </button>
            <button onClick={() => setShowQuestionForm(false)} className="rounded-md border px-3 py-2 text-xs hover:bg-accent">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowQuestionForm(true)}
          className="w-full rounded-xl border border-dashed py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Ajouter une question
        </button>
      )}
    </div>
  )
}

export function QuizManager({ ecId, quizzes }: { ecId: string; quizzes: any[] }) {
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null)
  const [showForm, setShowForm]           = useState(false)
  const [form, setForm]                   = useState({
    title: '', passScore: '50', timeLimitMin: '', maxAttempts: '',
  })

  const createQ  = useCreateQuiz(ecId)
  const deleteQ  = useDeleteQuiz()

  async function handleCreate() {
    if (!form.title.trim()) { toast.error('Titre requis'); return }
    try {
      const body: {
        title: string; passScore?: number; timeLimitMin?: number; maxAttempts?: number
      } = { title: form.title }
      if (form.passScore)    body.passScore    = Number(form.passScore)
      if (form.timeLimitMin) body.timeLimitMin = Number(form.timeLimitMin)
      if (form.maxAttempts)  body.maxAttempts  = Number(form.maxAttempts)
      const quiz = await createQ.mutateAsync(body)
      setForm({ title: '', passScore: '50', timeLimitMin: '', maxAttempts: '' })
      setShowForm(false)
      setEditingQuizId(quiz.id)
      toast.success('Quiz créé')
    } catch (err) { toast.error((err as Error).message) }
  }

  if (editingQuizId) {
    return <QuizEditor quizId={editingQuizId} onBack={() => setEditingQuizId(null)} />
  }

  return (
    <div className="space-y-4">
      {quizzes.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucun quiz. Créez le premier !
        </div>
      )}

      {quizzes.map((q: any) => (
        <div key={q.id} className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
          <div>
            <p className="font-medium text-sm">{q.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Score minimum : {q.pass_score}%
              {q.time_limit_min ? ` • ${q.time_limit_min} min` : ''}
              {q.max_attempts   ? ` • ${q.max_attempts} tentative(s) max` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              q.is_published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {q.is_published ? '✅' : '⏸'}
            </span>
            <button
              onClick={() => setEditingQuizId(q.id)}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
            >
              Éditer
            </button>
            <button
              onClick={async () => {
                if (!confirm('Supprimer ce quiz et toutes ses questions ?')) return
                try { await deleteQ.mutateAsync(q.id) }
                catch (err) { toast.error((err as Error).message) }
              }}
              className="rounded p-1 text-red-500 hover:bg-red-50 text-xs"
            >🗑</button>
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h4 className="font-medium text-sm">Nouveau quiz</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Titre *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" placeholder="Titre du quiz" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Score minimum (%)</label>
              <input type="number" value={form.passScore} onChange={e => setForm(f => ({ ...f, passScore: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Durée limite (min)</label>
              <input type="number" value={form.timeLimitMin} onChange={e => setForm(f => ({ ...f, timeLimitMin: e.target.value }))}
                placeholder="Illimitée" className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tentatives max</label>
              <input type="number" value={form.maxAttempts} onChange={e => setForm(f => ({ ...f, maxAttempts: e.target.value }))}
                placeholder="Illimitées" className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={createQ.isPending}
              className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createQ.isPending ? 'Création...' : 'Créer le quiz'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-md border px-3 py-2 text-xs hover:bg-accent">Annuler</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Créer un quiz
        </button>
      )}
    </div>
  )
}
