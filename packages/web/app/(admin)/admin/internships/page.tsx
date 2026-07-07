import type { Metadata } from 'next'
import { AdminInternships } from '@/components/admin/AdminInternships'

export const metadata: Metadata = { title: 'Stages & Tirocini — UniGest Admin' }

export default function AdminInternshipsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <AdminInternships />
    </div>
  )
}
