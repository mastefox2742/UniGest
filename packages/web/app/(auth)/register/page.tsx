import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from './register-form'

export const metadata: Metadata = { title: 'Inscription' }

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">🎓 UniGest</h1>
          <p className="mt-2 text-sm text-muted-foreground">Créez votre espace étudiant</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  )
}
