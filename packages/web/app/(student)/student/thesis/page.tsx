import type { Metadata } from 'next'
import { GraduationApplicationPanel } from '@/components/student/GraduationApplicationPanel'
import { ThesisPanel } from '@/components/student/ThesisPanel'

export const metadata: Metadata = { title: 'Thèse de Laurea — Étudiant' }

export default function StudentThesisPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold">These de Laurea</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gere ta these, puis suis ta demande finale de diplomation.
        </p>
      </div>
      <ThesisPanel />
      <GraduationApplicationPanel />
    </div>
  )
}
