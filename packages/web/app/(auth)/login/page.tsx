import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Connexion' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const { redirectTo } = await searchParams

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">🎓 UniGest</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connectez-vous à votre espace universitaire
          </p>
        </div>
        <LoginForm {...(redirectTo !== undefined ? { redirectTo } : {})} />
      </div>
    </main>
  )
}
