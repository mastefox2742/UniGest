'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const schema = z
  .object({
    password: z.string().min(8, 'Au moins 8 caractères'),
    confirm:  z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  })
type FormData = z.infer<typeof schema>

export function ResetPasswordForm() {
  const supabase = createClient()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { setServerError(error.message); return }
    router.push('/login?reset=success')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <label className="text-sm font-medium">Nouveau mot de passe</label>
        <input type="password" {...register('password')} placeholder="••••••••"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Confirmer</label>
        <input type="password" {...register('confirm')} placeholder="••••••••"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
      </div>
      {serverError && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>}
      <button type="submit" disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {isSubmitting ? 'Mise à jour…' : 'Changer le mot de passe'}
      </button>
    </form>
  )
}
