'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const schema = z
  .object({
    firstName: z.string().min(2, 'Prénom requis'),
    lastName:  z.string().min(2, 'Nom requis'),
    email:     z.string().email('Email invalide'),
    password:  z.string().min(8, 'Au moins 8 caractères'),
    confirm:   z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  })
type FormData = z.infer<typeof schema>

export function RegisterForm() {
  const supabase = createClient()
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const { error } = await supabase.auth.signUp({
      email:    data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name:  data.lastName,
          role:       'student',
        },
      },
    })

    if (error) {
      setServerError(error.message)
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
        <p className="text-2xl">📧</p>
        <h2 className="mt-2 font-semibold">Vérifiez votre email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Un lien de confirmation vous a été envoyé. Cliquez dessus pour activer votre compte.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">Prénom</label>
          <input
            {...register('firstName')}
            placeholder="Marie"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Nom</label>
          <input
            {...register('lastName')}
            placeholder="Dupont"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Email universitaire</label>
        <input
          type="email"
          {...register('email')}
          placeholder="m.dupont@univ.fr"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Mot de passe</label>
        <input
          type="password"
          {...register('password')}
          placeholder="••••••••"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Confirmer le mot de passe</label>
        <input
          type="password"
          {...register('confirm')}
          placeholder="••••••••"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
      </div>

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Inscription…' : "Créer mon compte"}
      </button>
    </form>
  )
}
