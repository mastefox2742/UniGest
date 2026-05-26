'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQuiz, useStartQuiz, useSubmitQuiz, useQuizAttempts } from '@/lib/hooks/useQuiz'

type Answer = {
  questionId:         string
  selectedOptionIds?: string[]
  openAnswer?:        string
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function QuizPlayer({ quiz }: { quiz: any }) {
  const { data: fullQuiz } = useQuiz(quiz.id)
  const { data: attempts }  = useQuizAttempts(quiz.id)
  const startQ   = useStartQuiz()
  const submitQ  = useSubmitQuiz()

  const [attemptId, setAttemptId]   = useState<string | null>(null)
  const [answers, setAnswers]       = useState<Record<string, Answer>>({})
  const [timeLeft, setTimeLeft]     = useState<number | null>(null)
  const [result, setResult]         = useState<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const questions: any[] = [...((fullQuiz?.quiz_questions ?? []) as any[])]
    .sort((a, b) => a.position - b.position)

  // Timer
  useEffect(() => {
    if (attemptId && quiz.time_limit_min && timeLeft === null) {
      setTimeLeft(quiz.time_limit_min * 60)
    }
  }, [attemptId, quiz.time_limit_min, timeLeft])

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && attemptId) {
      timerRef.current = setTimeout(() => setTimeLeft(t => (t ?? 1) - 1), 1000)
    } else if (timeLeft === 0 && attemptId) {
      handleSubmit()
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [timeLeft, attemptId])

  async function handleStart() {
    try {
      const attempt = await startQ.mutateAsync(quiz.id)
      setAttemptId(attempt.id)
      setAnswers({})
      setResult(null)
      if (quiz.time_limit_min) setTimeLeft(quiz.time_limit_min * 60)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleSubmit() {
    if (!attemptId) return
    try {
      const answersArray = Object.values(answers)
      const res = await submitQ.mutateAsync({ attemptId, answers: answersArray })
      setResult(res)
      setAttemptId(null)
      if (timerRef.current) clearTimeout(timerRef.current)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  function toggleOption(questionId: string, optionId: string, type: string) {
    setAnswers(prev => {
      const curr = prev[questionId] ?? { questionId, selectedOptionIds: [] }
      const ids  = curr.selectedOptionIds ?? []

      let newIds: string[]
      if (type === 'single' || type === 'true_false') {
        newIds = [optionId]
      } else {
        newIds = ids.includes(optionId) ? ids.filter(i => i !== optionId) : [...ids, optionId]
      }
      return { ...prev, [questionId]: { ...curr, selectedOptionIds: newIds } }
    })
  }

  function setOpenAnswer(questionId: string, text: string) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, openAnswer: text },
    }))
  }

  const bestAttempt = (attempts ?? []).reduce((best: any, a: any) => {
    if (!best) return a
    return (a.score_pct ?? 0) > (best.score_pct ?? 0) ? a : best
  }, null)

  // ── Résultat
  if (result) {
    const passed = result.passed
    return (
      <div className="rounded-xl border bg-card p-6 text-center space-y-3">
        <div className={`text-4xl`}>{passed ? '🎉' : '😔'}</div>
        <h3 className="text-lg font-bold">{quiz.title}</h3>
        <p className={`text-2xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
          {result.score_pct}%
        </p>
        <p className="text-sm text-muted-foreground">
          {passed ? `✅ Réussi ! Score minimum : ${quiz.pass_score}%` : `❌ Échoué. Score minimum : ${quiz.pass_score}%`}
        </p>
        <button
          onClick={() => { setResult(null); setAnswers({}) }}
          className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Fermer
        </button>
      </div>
    )
  }

  // ── En cours
  if (attemptId) {
    return (
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-muted/40 px-5 py-3">
          <h3 className="font-semibold">{quiz.title}</h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {Object.keys(answers).length}/{questions.length} répondues
            </span>
            {timeLeft !== null && (
              <span className={`font-mono text-sm font-bold ${timeLeft < 60 ? 'text-red-600' : ''}`}>
                ⏱ {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="p-5 space-y-6">
          {questions.map((q: any, idx: number) => {
            const opts = [...((q.quiz_options as any[]) ?? [])].sort((a, b) => a.position - b.position)
            const curr = answers[q.id]

            return (
              <div key={q.id} className="space-y-3">
                <div className="flex gap-3">
                  <span className="rounded-full bg-primary/10 text-primary w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {q.type === 'single' ? 'Choisissez une réponse' :
                       q.type === 'multiple' ? 'Plusieurs réponses possibles' :
                       q.type === 'true_false' ? 'Vrai ou faux ?' : 'Réponse libre'} • {q.points} pt(s)
                    </p>
                  </div>
                </div>

                {q.type === 'open' ? (
                  <textarea
                    value={curr?.openAnswer ?? ''}
                    onChange={e => setOpenAnswer(q.id, e.target.value)}
                    rows={3}
                    placeholder="Votre réponse..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm ml-10"
                  />
                ) : (
                  <div className="ml-10 space-y-2">
                    {opts.map((opt: any) => {
                      const selected = curr?.selectedOptionIds?.includes(opt.id) ?? false
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleOption(q.id, opt.id, q.type)}
                          className={`w-full flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm text-left transition-colors ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted/40'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded-${q.type === 'multiple' ? 'sm' : 'full'} border flex items-center justify-center shrink-0 ${
                            selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                          }`}>
                            {selected && <span className="text-white text-[10px]">✓</span>}
                          </span>
                          {opt.text}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitQ.isPending}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitQ.isPending ? 'Envoi...' : '✅ Soumettre le quiz'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Vue de départ
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{quiz.title}</h3>
          {quiz.description && <p className="text-xs text-muted-foreground mt-1">{quiz.description}</p>}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Score minimum : <strong>{quiz.pass_score}%</strong></span>
            {quiz.time_limit_min && <span>⏱ {quiz.time_limit_min} min</span>}
            {quiz.max_attempts   && <span>Tentatives : {quiz.max_attempts} max</span>}
          </div>
        </div>
        {bestAttempt && (
          <div className="text-right">
            <p className={`text-lg font-bold ${bestAttempt.passed ? 'text-green-600' : 'text-red-500'}`}>
              {bestAttempt.score_pct}%
            </p>
            <p className="text-xs text-muted-foreground">Meilleur score</p>
          </div>
        )}
      </div>

      <button
        onClick={handleStart}
        disabled={startQ.isPending}
        className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {startQ.isPending ? 'Chargement...' : bestAttempt ? '🔄 Rejouer' : '▶ Commencer le quiz'}
      </button>
    </div>
  )
}
