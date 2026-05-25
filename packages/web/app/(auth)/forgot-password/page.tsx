import type { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-password-form'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Mot de passe oublié' }

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Réinitialiser le mot de passe</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entrez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">← Retour à la connexion</Link>
        </p>
      </div>
    </main>
  )
}
