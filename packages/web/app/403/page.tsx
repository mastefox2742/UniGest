import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Accès refusé' }

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-4">
      <p className="text-6xl">🚫</p>
      <h1 className="text-3xl font-bold">Accès refusé</h1>
      <p className="text-muted-foreground max-w-sm">
        Vous n'avez pas les droits nécessaires pour accéder à cette page.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Retour à l'accueil
      </Link>
    </main>
  )
}
