import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TeacherNav } from '@/components/teacher/TeacherNav'

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return (
      <div className="flex h-screen flex-col overflow-hidden md:flex-row">
        <TeacherNav fullName="Prof. Demo" title="Dr." department="Informatique" />
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'teacher') redirect('/403')

  // Récupérer les infos enseignant
  const { data: teacher } = await supabase
    .from('teachers')
    .select('title, departments!department_id(name)')
    .eq('user_id', user.id)
    .single()

  const fullName   = `${profile.first_name} ${profile.last_name}`.trim()
  const title      = (teacher as any)?.title ?? undefined
  const department = (teacher as any)?.departments?.name ?? undefined

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <TeacherNav fullName={fullName} title={title} department={department} />
      <main className="flex-1 overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  )
}
