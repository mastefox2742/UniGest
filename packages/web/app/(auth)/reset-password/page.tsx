import type { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = { title: 'Nouveau mot de passe' }

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm text-muted-foreground">Choisissez un nouveau mot de passe sécurisé.</p>
        </div>
        <ResetPasswordForm />
      </div>
    </main>
  )
}
