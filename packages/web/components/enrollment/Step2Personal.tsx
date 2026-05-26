'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  firstName:    z.string().min(2, 'Requis'),
  lastName:     z.string().min(2, 'Requis'),
  dateOfBirth:  z.string().min(1, 'Requis'),
  placeOfBirth: z.string().min(2, 'Requis'),
  nationality:  z.string().min(2, 'Requis'),
  phone:        z.string().min(8, 'Numéro invalide'),
  address:      z.string().min(5, 'Adresse requise'),
})

export type Step2Data = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<Step2Data>
  onNext: (data: Step2Data) => void
  onBack: () => void
}

export function Step2Personal({ defaultValues, onNext, onBack }: Props) {
  const { register, handleSubmit, formState: { errors } } =
    useForm<Step2Data>({ resolver: zodResolver(schema), ...(defaultValues !== undefined ? { defaultValues } : {}) })

  function Field({ id, label, type = 'text', placeholder }: {
    id: keyof Step2Data; label: string; type?: string; placeholder?: string
  }) {
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <input id={id} type={type} placeholder={placeholder} {...register(id)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
        {errors[id] && <p className="text-xs text-destructive">{errors[id]?.message}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <h2 className="text-lg font-semibold">Informations personnelles</h2>
      <div className="grid grid-cols-2 gap-3">
        <Field id="firstName" label="Prénom"  placeholder="Marie" />
        <Field id="lastName"  label="Nom"     placeholder="Dupont" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field id="dateOfBirth"  label="Date de naissance"  type="date" />
        <Field id="placeOfBirth" label="Lieu de naissance"  placeholder="Paris" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field id="nationality" label="Nationalité" placeholder="Française" />
        <Field id="phone"       label="Téléphone"   type="tel" placeholder="+33 6 00 00 00 00" />
      </div>
      <Field id="address" label="Adresse complète" placeholder="1 rue des Fleurs, 75001 Paris" />
      <div className="flex gap-3">
        <button type="button" onClick={onBack}
          className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-accent">
          ← Retour
        </button>
        <button type="submit"
          className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Suivant →
        </button>
      </div>
    </form>
  )
}
