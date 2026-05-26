'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
})

export type Step1Data = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<Step1Data>
  onNext: (data: Step1Data) => void
}

export function Step1Account({ defaultValues, onNext }: Props) {
  const { register, handleSubmit, formState: { errors } } =
    useForm<Step1Data>({ resolver: zodResolver(schema), ...(defaultValues !== undefined ? { defaultValues } : {}) })

  const Field = ({ id, label, type = 'text', placeholder, error }: {
    id: keyof Step1Data; label: string; type?: string; placeholder?: string; error?: string | undefined
  }) => (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <input id={id} type={type} placeholder={placeholder} {...register(id)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <h2 className="text-lg font-semibold">Créer votre compte</h2>
      <Field id="email"    label="Email universitaire" type="email"    placeholder="prenom.nom@univ.fr" error={errors.email?.message} />
      <Field id="password" label="Mot de passe"         type="password" placeholder="Min. 8 caractères"  error={errors.password?.message} />
      <Field id="confirm"  label="Confirmer"            type="password" placeholder="••••••••"           error={errors.confirm?.message} />
      <button type="submit" className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Suivant →
      </button>
    </form>
  )
}
