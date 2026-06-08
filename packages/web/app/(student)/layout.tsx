import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StudentNav } from '@/components/student/StudentNav'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return (
      <div className="flex h-screen flex-col overflow-hidden md:flex-row">
        <StudentNav fullName="Alex Dupont" matricola="M-2024-001" />
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">{children}</main>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'student') redirect('/403')

  const { data: student } = await supabase
    .from('students')
    .select('matricola')
    .eq('user_id', user.id)
    .single()

  const fullName  = `${profile.first_name as string} ${profile.last_name as string}`.trim()
  const avatarUrl = (profile.avatar_url as string | null) ?? undefined

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <StudentNav fullName={fullName} matricola={student?.matricola ?? undefined} avatarUrl={avatarUrl} />
      <main className="flex-1 overflow-y-auto bg-background p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
