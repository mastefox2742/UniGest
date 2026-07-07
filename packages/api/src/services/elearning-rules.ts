export function normalizeProgressPct(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function summarizeMaterialProgress(rows: Array<{ completed?: boolean | null; progress_pct?: number | null }>) {
  const total = rows.length
  const completed = rows.filter(row => row.completed).length
  const averageProgress = total === 0
    ? 0
    : normalizeProgressPct(
      rows.reduce((sum, row) => sum + normalizeProgressPct(Number(row.progress_pct ?? 0)), 0) / total,
    )

  return {
    total,
    completed,
    progressPct: total === 0 ? 0 : normalizeProgressPct((completed / total) * 100),
    averageProgress,
  }
}

export function assertAnnouncementInput(input: { title: string; body: string }) {
  if (!input.title.trim()) throw new Error('Titre annonce requis')
  if (input.title.length > 200) throw new Error('Titre annonce trop long')
  if (!input.body.trim()) throw new Error('Message annonce requis')
  if (input.body.length > 5_000) throw new Error('Message annonce trop long')
}

export function assertAssignmentSubmissionInput(input: { content: string; fileUrl?: string }) {
  if (!input.content.trim()) throw new Error('Contenu du rendu requis')
  if (input.content.length > 10_000) throw new Error('Contenu du rendu trop long')
  if (input.fileUrl && input.fileUrl.length > 1_000) throw new Error('URL du fichier trop longue')
}
