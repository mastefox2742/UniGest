import type { Metadata } from 'next'
import { AdminAuditLogs } from '@/components/admin/AdminAuditLogs'

export const metadata: Metadata = { title: 'Audit trail - UniGest Admin' }

export default function AdminAuditPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <AdminAuditLogs />
    </div>
  )
}
