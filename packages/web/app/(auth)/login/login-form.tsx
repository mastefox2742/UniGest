'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getRoleHome } from '@/lib/auth'
import Link from 'next/link'

const schema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
})
type FormData = z.infer<typeof schema>

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
      setServerError(
        error.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : error.message,
      )
      return
    }

    // Récupérer le rôle pour rediriger
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const home = redirectTo ?? getRoleHome(profile?.role ?? 'student')
    router.push(home)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      {/* Email */}
      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="prenom.nom@univ.fr"
          {...register('email')}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 aria-invalid:border-destructive"
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
          <Link href="/forgot-password" className="text-xs text-primary hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register('password')}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 aria-invalid:border-destructive"
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Erreur serveur */}
      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
