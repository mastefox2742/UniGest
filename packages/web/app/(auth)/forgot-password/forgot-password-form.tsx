'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({ email: z.string().email('Email invalide') })
type FormData = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const supabase = createClient()
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true)
  }

  if (sent) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
        <p className="text-2xl">📬</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div className="space-y-1">
        <label className="text-sm font-medium">Email</label>
        <input
          type="email"
          {...register('email')}
          placeholder="votre@email.fr"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? 'Envoi…' : 'Envoyer le lien'}
      </button>
    </form>
  )
}
