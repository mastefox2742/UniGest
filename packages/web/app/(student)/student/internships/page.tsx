import type { Metadata } from 'next'
import { InternshipsPage } from '@/components/student/InternshipsPage'

export const metadata: Metadata = { title: 'Stages — Etudiant' }

export default function StudentInternshipsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <InternshipsPage />
    </div>
  )
}
