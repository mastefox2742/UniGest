import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AdminNav } from '@/components/admin/AdminNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return (
      <div className="flex h-screen flex-col overflow-hidden md:flex-row">
        <AdminNav fullName="Admin Demo" role="admin" />
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

  if (!profile || !['admin', 'secretary'].includes(profile.role as string)) redirect('/403')

  // ─── Vérification MFA ───────────────────────────────────────────────────────
  // Vérifie si l'utilisateur a le MFA activé et a complété le challenge
  const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const hasMFAEnrolled  = (await supabase.auth.mfa.listFactors()).data?.totp?.some(f => f.status === 'verified') ?? false
  const mfaCompleted    = mfaData?.currentLevel === 'aal2'
  // Affiche une bannière si MFA non configuré (avertissement, pas blocage)
  const showMFAWarning  = process.env.REQUIRE_MFA === 'true'
    ? (!hasMFAEnrolled || !mfaCompleted)
    : !hasMFAEnrolled

  const fullName = `${profile.first_name} ${profile.last_name}`.trim()

  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <AdminNav fullName={fullName} role={profile.role as string} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ─── Bannière MFA ─────────────────────────────────────────── */}
        {showMFAWarning && (
          <div className="flex items-center justify-between bg-amber-50 border-b border-amber-200 px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <span>⚠️</span>
              <span className="font-medium">
                {hasMFAEnrolled && !mfaCompleted
                  ? 'Votre session nécessite une vérification MFA.'
                  : 'Sécurisez votre compte en activant l\'authentification à deux facteurs (MFA).'}
              </span>
            </div>
            <Link
              href="/admin/settings"
              className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              Configurer →
            </Link>
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
