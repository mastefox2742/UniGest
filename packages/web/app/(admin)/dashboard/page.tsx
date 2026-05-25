import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Administration' }

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold">Secrétariat / Administration</h1>
      <p className="mt-1 text-muted-foreground">Gestion des dossiers, finances et certificats.</p>
    </main>
  )
}
