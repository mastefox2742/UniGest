'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useStudentElearningCourse, useUpsertProgress, useSubmitAssignment } from '@/lib/hooks/useElearning'
import { useForumPosts, useCreateForumPost } from '@/lib/hooks/useForum'
import { QuizPlayer } from './QuizPlayer'

type Tab = 'content' | 'assignments' | 'quizzes' | 'forum' | 'announcements'

function MaterialViewer({
  material,
  progress,
  onProgress,
}: {
  material:   any
  progress:   { completed: boolean; progress_pct: number } | undefined
  onProgress: (pct: number, done: boolean) => void
}) {
  const isCompleted = progress?.completed ?? false

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{material.title}</h3>
        <button
          onClick={() => onProgress(100, true)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            isCompleted
              ? 'bg-green-100 text-green-700'
              : 'bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-700'
          }`}
        >
          {isCompleted ? '✅ Terminé' : 'Marquer comme terminé'}
        </button>
      </div>

      {/* Rendu selon le type */}
      {material.type === 'video' && material.url && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          {material.url.includes('youtube.com') || material.url.includes('youtu.be') ? (
            <iframe
              src={material.url.replace('watch?v=', 'embed/')}
              className="w-full h-full"
              allowFullScreen
            />
          ) : (
            <video
              src={material.url}
              controls
              className="w-full h-full"
              onEnded={() => onProgress(100, true)}
            />
          )}
        </div>
      )}

      {material.type === 'pdf' && material.url && (
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/40 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">📄 Document PDF</span>
            <a
              href={material.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline hover:text-primary/80"
              onClick={() => onProgress(100, true)}
            >
              Ouvrir / Télécharger ↗
            </a>
          </div>
          <iframe src={material.url} className="w-full h-[500px]" title={material.title} />
        </div>
      )}

      {material.type === 'slide' && material.url && (
        <div className="rounded-xl border overflow-hidden">
          <div className="bg-muted/40 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">📊 Présentation</span>
            <a href={material.url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary underline" onClick={() => onProgress(100, true)}>
              Ouvrir ↗
            </a>
          </div>
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(material.url)}&embedded=true`}
            className="w-full h-[500px]"
          />
        </div>
      )}

      {material.type === 'link' && material.url && (
        <div className="rounded-xl border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Ressource externe</p>
          <a
            href={material.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onProgress(100, true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            🔗 Ouvrir la ressource ↗
          </a>
        </div>
      )}

      {material.type === 'text' && material.content && (
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{material.content}</p>
        </div>
      )}

      {/* Barre de progression */}
      {!isCompleted && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progression</span>
            <span>{progress?.progress_pct ?? 0}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress?.progress_pct ?? 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ForumPanel({ ecId }: { ecId: string }) {
  const { data: posts, isLoading } = useForumPosts(ecId)
  const createPost = useCreateForumPost(ecId)
  const [content, setContent]     = useState('')
  const [replyTo, setReplyTo]     = useState<string | null>(null)

  async function handleSubmit(parentId?: string) {
    if (!content.trim()) return
    try {
      const body: { content: string; parentId?: string } = { content }
      if (parentId) body.parentId = parentId
      await createPost.mutateAsync(body)
      setContent('')
      setReplyTo(null)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const rootPosts   = (posts ?? []).filter((p: any) => !p.parent_id)
  const getReplies  = (parentId: string) =>
    (posts ?? []).filter((p: any) => p.parent_id === parentId)

  return (
    <div className="space-y-4">
      {/* Zone de saisie principale */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Posez une question ou partagez un commentaire..."
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={createPost.isPending || !content.trim()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {createPost.isPending ? 'Envoi...' : 'Publier'}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : rootPosts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          Aucune discussion. Soyez le premier à poser une question !
        </p>
      ) : (
        <div className="space-y-4">
          {rootPosts.map((post: any) => {
            const profile  = post.profiles as any
            const replies  = getReplies(post.id)
            return (
              <div key={post.id} className="rounded-xl border bg-card overflow-hidden">
                {post.is_pinned && (
                  <div className="bg-yellow-50 px-4 py-1.5 text-xs font-medium text-yellow-700">
                    📌 Épinglé
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                      {profile?.first_name?.[0] ?? '?'}{profile?.last_name?.[0] ?? ''}
                    </div>
                    <span className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                  <button
                    onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
                    className="mt-2 text-xs text-muted-foreground hover:text-primary"
                  >
                    Répondre
                  </button>
                </div>

                {/* Réponses */}
                {replies.length > 0 && (
                  <div className="border-t bg-muted/20 divide-y">
                    {replies.map((reply: any) => {
                      const rp = reply.profiles as any
                      return (
                        <div key={reply.id} className="px-6 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                              {rp?.first_name?.[0] ?? '?'}
                            </div>
                            <span className="text-xs font-medium">{rp?.first_name} {rp?.last_name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Zone réponse */}
                {replyTo === post.id && (
                  <div className="border-t p-4 flex gap-2">
                    <input
                      type="text"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Votre réponse..."
                      className="flex-1 rounded-md border bg-background px-3 py-1.5 text-sm"
                      onKeyDown={e => e.key === 'Enter' && handleSubmit(post.id)}
                    />
                    <button
                      onClick={() => handleSubmit(post.id)}
                      disabled={createPost.isPending || !content.trim()}
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      Répondre
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AssignmentsTab({ assignments, ecId }: { assignments: any[]; ecId: string }) {
  const submit = useSubmitAssignment()
  const [forms, setForms] = useState<Record<string, string>>({})

  async function handleSubmit(assignmentId: string) {
    const content = forms[assignmentId]
    if (!content?.trim()) { toast.error('Rendu vide'); return }
    try {
      await submit.mutateAsync({ assignmentId, content })
      toast.success('Devoir soumis ✅')
      setForms(f => ({ ...f, [assignmentId]: '' }))
    } catch (err) { toast.error((err as Error).message) }
  }

  if (assignments.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">Aucun devoir pour ce cours.</p>
  }

  return (
    <div className="space-y-4">
      {assignments.map((a: any) => (
        <div key={a.id} className="rounded-xl border bg-card p-5 space-y-3">
          <div>
            <h3 className="font-semibold text-sm">{a.title}</h3>
            {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
            {a.due_date && (
              <p className="text-xs text-muted-foreground">
                📅 À rendre avant le {new Date(a.due_date).toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
          <textarea
            value={forms[a.id] ?? ''}
            onChange={e => setForms(f => ({ ...f, [a.id]: e.target.value }))}
            placeholder="Rédigez votre rendu ici..."
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
          />
          <button
            onClick={() => handleSubmit(a.id)}
            disabled={submit.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submit.isPending ? 'Envoi...' : '📤 Soumettre le devoir'}
          </button>
        </div>
      ))}
    </div>
  )
}

export function CoursePlayer({ ecId }: { ecId: string }) {
  const { data, isLoading } = useStudentElearningCourse(ecId)
  const upsertProg          = useUpsertProgress()

  const [activeTab, setActiveTab]         = useState<Tab>('content')
  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex gap-6">
        <div className="w-64 space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />)}
        </div>
        <div className="flex-1 h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!data) return <div className="text-center py-12 text-muted-foreground">Cours introuvable.</div>

  const { ec, progress } = data as any
  const course    = ec.courses as any
  const sections  = [...((ec.elearning_sections as any[]) ?? [])].sort((a, b) => a.position - b.position)
  const allMats   = sections.flatMap((s: any) =>
    [...((s.elearning_materials as any[]) ?? [])].sort((a, b) => a.position - b.position)
  )
  const completedCount = allMats.filter(m => (progress as any)[m.id]?.completed).length
  const totalCount     = allMats.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const activeMaterial = allMats.find(m => m.id === activeMaterialId) ?? allMats[0] ?? null

  async function handleProgress(materialId: string, pct: number, completed: boolean) {
    try {
      await upsertProg.mutateAsync({ materialId, progressPct: pct, completed })
    } catch (_) { /* silent */ }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'content',     label: '📚 Contenu' },
    { id: 'assignments', label: '📝 Devoirs' },
    { id: 'quizzes',     label: '🧠 Quiz' },
    { id: 'announcements', label: 'Annonces' },
    { id: 'forum',       label: '💬 Forum' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold">{course?.name}</h1>
            <p className="text-xs text-muted-foreground">{course?.code} • {course?.cfu} CFU</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{pct}% terminé</p>
              <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} matériaux</p>
            </div>
            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              activeTab === t.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === 'content' && (
        <div className="flex gap-4">
          {/* Sidebar navigation */}
          <div className="w-64 shrink-0 space-y-2">
            {sections.map((section: any) => {
              const mats = [...((section.elearning_materials as any[]) ?? [])].sort((a, b) => a.position - b.position)
              return (
                <div key={section.id} className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 text-xs font-semibold">{section.title}</div>
                  {mats.map((mat: any) => {
                    const done    = (progress as any)[mat.id]?.completed ?? false
                    const active  = mat.id === (activeMaterial?.id ?? null)
                    return (
                      <button
                        key={mat.id}
                        onClick={() => setActiveMaterialId(mat.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors border-t ${
                          active
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                          done ? 'bg-green-500 text-white' : 'border border-muted-foreground/40'
                        }`}>
                          {done ? '✓' : ''}
                        </span>
                        <span className="truncate">{mat.title}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Lecteur */}
          <div className="flex-1 min-w-0">
            {activeMaterial ? (
              <MaterialViewer
                material={activeMaterial}
                progress={(progress as any)[activeMaterial.id]}
                onProgress={(pct, done) => handleProgress(activeMaterial.id, pct, done)}
              />
            ) : (
              <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
                Sélectionnez un matériau pour commencer.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <AssignmentsTab
          assignments={(ec.elearning_assignments as any[]) ?? []}
          ecId={ecId}
        />
      )}

      {activeTab === 'quizzes' && (
        <div className="space-y-4">
          {((ec.elearning_quizzes as any[]) ?? [])
            .filter((q: any) => q.is_published)
            .map((q: any) => (
              <QuizPlayer key={q.id} quiz={q} />
            ))}
          {((ec.elearning_quizzes as any[]) ?? []).filter((q: any) => q.is_published).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucun quiz disponible.</p>
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="space-y-3">
          {((ec.elearning_announcements as any[]) ?? [])
            .sort((a: any, b: any) => {
              if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
              return new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime()
            })
            .map((announcement: any) => (
              <article key={announcement.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold">{announcement.title}</h3>
                  {announcement.is_pinned ? (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      Epinglee
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{announcement.body}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {new Date(announcement.published_at ?? announcement.created_at).toLocaleDateString('fr-FR')}
                </p>
              </article>
            ))}
          {((ec.elearning_announcements as any[]) ?? []).length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Aucune annonce pour ce cours.</p>
          )}
        </div>
      )}

      {activeTab === 'forum' && <ForumPanel ecId={ecId} />}
    </div>
  )
}
