import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Redirection selon le rôle
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  switch (profile?.role) {
    case 'student':
      redirect('/student/dashboard')
    case 'teacher':
      redirect('/teacher/dashboard')
    case 'secretary':
    case 'admin':
      redirect('/admin/dashboard')
    default:
      redirect('/login')
  }
}
