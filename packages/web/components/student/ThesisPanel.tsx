'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useStudentThesis, useSubmitThesis } from '@/lib/hooks/useThesis'

const STATUS_CFG: Record<string, { label: string; cls: string; icon: string }> = {
  proposed:    { label: 'Proposée',         cls: 'bg-muted text-muted-foreground',    icon: '📝' },
  submitted:   { label: 'Soumise',          cls: 'bg-blue-100 text-blue-700',          icon: '📤' },
  in_progress: { label: 'En cours',         cls: 'bg-yellow-100 text-yellow-700',      icon: '🔍' },
  approved:    { label: 'Approuvée',        cls: 'bg-green-100 text-green-700',        icon: '✅' },
  rejected:    { label: 'Refusée',          cls: 'bg-red-100 text-red-700',            icon: '❌' },
  defended:    { label: 'Soutenue ✨',      cls: 'bg-purple-100 text-purple-700',      icon: '🎓' },
}

export function ThesisPanel() {
  const { data: thesis, isLoading } = useStudentThesis()
  const submitM = useSubmitThesis()

  const [form, setForm] = useState({
    title:         '',
    abstract:      '',
    documentUrl:   '',
    advisorName:   '',
    coAdvisorName: '',
  })
  const [editing, setEditing] = useState(false)

  // Pré-remplir si thèse existante
  useEffect(() => {
    if (thesis) {
      setForm({
        title:         thesis.title         ?? '',
        abstract:      thesis.abstract      ?? '',
        documentUrl:   thesis.document_url  ?? '',
        advisorName:   thesis.advisor_name  ?? '',
        coAdvisorName: thesis.co_advisor_name ?? '',
      })
    }
  }, [thesis])

  const canEdit = !thesis || ['proposed', 'submitted', 'in_progress', 'rejected'].includes(thesis.status)

  async function handleSubmit() {
    if (!form.title.trim()) { toast.error('Titre requis'); return }
    try {
      const body: {
        title: string; abstract?: string; documentUrl?: string
        advisorName?: string; coAdvisorName?: string
      } = { title: form.title }
      if (form.abstract)      body.abstract      = form.abstract
      if (form.documentUrl)   body.documentUrl   = form.documentUrl
      if (form.advisorName)   body.advisorName   = form.advisorName
      if (form.coAdvisorName) body.coAdvisorName = form.coAdvisorName

      await submitM.mutateAsync(body)
      toast.success(thesis ? 'Thèse mise à jour ✅' : 'Thèse soumise ✅')
      setEditing(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statut actuel */}
      {thesis && !editing && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{thesis.title}</h2>
              {thesis.advisor_name && (
                <p className="text-sm text-muted-foreground mt-1">
                  Directeur : <span className="text-foreground">{thesis.advisor_name}</span>
                  {thesis.co_advisor_name && ` • Co-directeur : ${thesis.co_advisor_name}`}
                </p>
              )}
            </div>
            <div className="shrink-0">
              {(() => {
                const sc = STATUS_CFG[thesis.status]
                return sc ? (
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${sc.cls}`}>
                    {sc.icon} {sc.label}
                  </span>
                ) : null
              })()}
            </div>
          </div>

          {thesis.abstract && (
            <p className="text-sm text-muted-foreground leading-relaxed">{thesis.abstract}</p>
          )}

          {thesis.document_url && (
            <a
              href={thesis.document_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary underline hover:text-primary/80"
            >
              📄 Document joint
            </a>
          )}

          {thesis.defense_date && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 px-4 py-3">
              <p className="text-sm font-medium text-purple-700">
                🎓 Soutenance prévue le{' '}
                {new Date(thesis.defense_date).toLocaleDateString('fr-FR', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
            </div>
          )}

          {thesis.notes && (
            <div className="rounded-lg bg-muted/50 border px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Commentaire secrétariat :</p>
              <p className="text-sm">{thesis.notes}</p>
            </div>
          )}

          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              ✏️ Modifier la soumission
            </button>
          )}
        </div>
      )}

      {/* Formulaire */}
      {(!thesis || editing) && (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">
            {thesis ? 'Modifier la soumission' : 'Soumettre votre thèse'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titre de la thèse *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Titre complet de votre thèse"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Directeur de thèse</label>
                <input
                  type="text"
                  value={form.advisorName}
                  onChange={e => setForm(f => ({ ...f, advisorName: e.target.value }))}
                  placeholder="Nom du directeur"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Co-directeur (optionnel)</label>
                <input
                  type="text"
                  value={form.coAdvisorName}
                  onChange={e => setForm(f => ({ ...f, coAdvisorName: e.target.value }))}
                  placeholder="Nom du co-directeur"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Résumé / Abstract</label>
              <textarea
                value={form.abstract}
                onChange={e => setForm(f => ({ ...f, abstract: e.target.value }))}
                rows={5}
                placeholder="Résumé de votre thèse (500-1000 mots recommandés)..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Lien vers le document (URL)</label>
              <input
                type="url"
                value={form.documentUrl}
                onChange={e => setForm(f => ({ ...f, documentUrl: e.target.value }))}
                placeholder="https://drive.google.com/... ou autre lien de partage"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Partagez un lien vers votre document (Google Drive, Dropbox, etc.)
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSubmit}
              disabled={submitM.isPending}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitM.isPending ? 'Envoi...' : '📤 Soumettre la thèse'}
            </button>
            {editing && (
              <button
                onClick={() => setEditing(false)}
                className="rounded-md border px-4 py-2.5 text-sm hover:bg-accent"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      )}

      {/* Guide */}
      {!thesis && (
        <div className="rounded-xl border bg-muted/20 p-5">
          <h3 className="font-medium text-sm mb-3">📋 Processus de soutenance</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="font-bold text-foreground">1.</span> Soumettez votre titre et résumé</li>
            <li className="flex gap-2"><span className="font-bold text-foreground">2.</span> La secrétariat examine votre dossier</li>
            <li className="flex gap-2"><span className="font-bold text-foreground">3.</span> Une date de soutenance est fixée</li>
            <li className="flex gap-2"><span className="font-bold text-foreground">4.</span> Soutenance et délivrance du diplôme</li>
          </ol>
        </div>
      )}
    </div>
  )
}
