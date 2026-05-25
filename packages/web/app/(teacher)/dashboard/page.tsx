import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Tableau de bord enseignant' }

export default async function TeacherDashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold">Espace Enseignant</h1>
      <p className="mt-1 text-muted-foreground">Gérez vos cours, examens et notes.</p>
    </main>
  )
}
