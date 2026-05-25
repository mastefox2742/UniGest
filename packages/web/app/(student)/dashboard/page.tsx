import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Tableau de bord étudiant' }

export default async function StudentDashboardPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p className="mt-1 text-muted-foreground">Bienvenue sur votre espace étudiant.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="CFU obtenus" value="—" />
        <StatCard label="Moyenne (GPA)" value="—" />
        <StatCard label="Prochain examen" value="—" />
        <StatCard label="Frais en attente" value="—" />
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  )
}
