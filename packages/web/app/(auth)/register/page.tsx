import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inscription' }

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold">Inscription</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          L'inscription se fait via la secrétariat. Contactez votre université.
        </p>
      </div>
    </main>
  )
}
