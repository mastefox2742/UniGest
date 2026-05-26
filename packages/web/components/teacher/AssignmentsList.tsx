'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { useCreateAssignment, useSubmissions, useGradeSubmission } from '@/lib/hooks/useElearning'

function SubmissionsModal({
  assignmentId,
  onClose,
}: { assignmentId: string; onClose: () => void }) {
  const { data: subs, isLoading } = useSubmissions(assignmentId)
  const gradeM = useGradeSubmission()
  const [scores, setScores]       = useState<Record<string, string>>({})
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({})

  async function handleGrade(subId: string) {
    const score = Number(scores[subId])
    if (isNaN(score)) { toast.error('Score invalide'); return }
    try {
      const fb = feedbacks[subId]
      await gradeM.mutateAsync({
        id: subId,
        score,
        ...(fb !== undefined ? { feedback: fb } : {}),
      })
      toast.success('Note enregistrée')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold">Rendus étudiants</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}
            </div>
          ) : !subs || subs.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Aucun rendu.</p>
          ) : (
            subs.map((sub: any) => {
              const student = sub.students
              const profile = student?.profiles
              return (
                <div key={sub.id} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">
                        {profile?.first_name} {profile?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{student?.matricola}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Rendu le {format(new Date(sub.submitted_at), 'd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    </div>
                    {sub.score !== null && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                        {sub.score}/{sub.max_score ?? 100}
                      </span>
                    )}
                  </div>

                  {sub.content && (
                    <p className="text-sm bg-muted/40 rounded-lg p-3 whitespace-pre-wrap line-clamp-4">
                      {sub.content}
                    </p>
                  )}
                  {sub.file_url && (
                    <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary underline">📎 Voir le fichier joint</a>
                  )}

                  {/* Notation */}
                  <div className="flex gap-2 items-center pt-1">
                    <input
                      type="number"
                      placeholder={`Note /100`}
                      value={scores[sub.id] ?? (sub.score?.toString() ?? '')}
                      onChange={e => setScores(s => ({ ...s, [sub.id]: e.target.value }))}
                      className="w-24 rounded-md border bg-background px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Commentaire..."
                      value={feedbacks[sub.id] ?? (sub.feedback ?? '')}
                      onChange={e => setFeedbacks(f => ({ ...f, [sub.id]: e.target.value }))}
                      className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => handleGrade(sub.id)}
                      disabled={gradeM.isPending}
                      className="rounded bg-primary px-3 py-1 text-xs text-white hover:bg-primary/90 disabled:opacity-50"
                    >
                      Noter
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export function AssignmentsList({ ecId, assignments }: { ecId: string; assignments: any[] }) {
  const [showForm, setShowForm]         = useState(false)
  const [selectedSub, setSelectedSub]   = useState<string | null>(null)
  const [form, setForm]                 = useState({
    title: '', description: '', dueDate: '', maxScore: '100',
  })

  const createA = useCreateAssignment(ecId)

  async function handleCreate() {
    if (!form.title.trim()) { toast.error('Titre requis'); return }
    try {
      const body: {
        title: string; description?: string; dueDate?: string; maxScore?: number
      } = { title: form.title }
      if (form.description) body.description = form.description
      if (form.dueDate)     body.dueDate     = form.dueDate
      if (form.maxScore)    body.maxScore    = Number(form.maxScore)
      await createA.mutateAsync(body)
      setForm({ title: '', description: '', dueDate: '', maxScore: '100' })
      setShowForm(false)
      toast.success('Devoir créé')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      {selectedSub && (
        <SubmissionsModal assignmentId={selectedSub} onClose={() => setSelectedSub(null)} />
      )}

      {assignments.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Aucun devoir. Créez le premier !
        </div>
      )}

      {assignments.map((a: any) => (
        <div key={a.id} className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4">
          <div>
            <p className="font-medium text-sm">{a.title}</p>
            {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
            {a.due_date && (
              <p className="text-xs text-muted-foreground mt-1">
                📅 Rendu le {format(new Date(a.due_date), 'd MMM yyyy', { locale: fr })}
              </p>
            )}
            <p className="text-xs text-muted-foreground">Note max : {a.max_score}</p>
          </div>
          <button
            onClick={() => setSelectedSub(a.id)}
            className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent whitespace-nowrap"
          >
            Voir les rendus
          </button>
        </div>
      ))}

      {showForm ? (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h4 className="font-medium text-sm">Nouveau devoir</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1">Titre *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" placeholder="Titre du devoir" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Note max</label>
              <input type="number" value={form.maxScore} onChange={e => setForm(f => ({ ...f, maxScore: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Date limite</label>
              <input type="datetime-local" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Description</label>
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full rounded-md border bg-background px-3 py-1.5 text-sm" placeholder="Optionnel" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreate} disabled={createA.isPending}
              className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {createA.isPending ? 'Création...' : 'Créer le devoir'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-md border px-3 py-2 text-xs hover:bg-accent">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Ajouter un devoir
        </button>
      )}
    </div>
  )
}
