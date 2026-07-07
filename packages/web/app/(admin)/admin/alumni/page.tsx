import type { Metadata } from 'next'
import { AdminAlumniPlacement } from '@/components/admin/AdminAlumniPlacement'

export const metadata: Metadata = { title: 'Alumni & Placement — UniGest Admin' }

export default function AdminAlumniPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <AdminAlumniPlacement />
    </div>
  )
}
