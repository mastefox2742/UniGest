import type { Metadata } from 'next'
import { AlumniProfilePage } from '@/components/student/AlumniProfilePage'

export const metadata: Metadata = { title: 'Alumni & Placement — Etudiant' }

export default function StudentAlumniPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <AlumniProfilePage />
    </div>
  )
}
