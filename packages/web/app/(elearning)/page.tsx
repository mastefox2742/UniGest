import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'E-Learning' }

export default function ELearningPage() {
  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold">E-Learning</h1>
      <p className="mt-1 text-muted-foreground">Cours, vidéos, devoirs et quiz en ligne.</p>
    </main>
  )
}
