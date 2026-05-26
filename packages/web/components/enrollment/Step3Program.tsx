'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({ degreeProgramId: z.string().uuid('Sélectionnez une filière') })
export type Step3Data = z.infer<typeof schema>

interface DegreeProgram { id: string; name: string; type: string; duration_years: number; total_cfu: number; description: string | null }
interface Department    { id: string; name: string; degree_programs: DegreeProgram[] }
interface Faculty       { id: string; name: string; departments: Department[] }

interface Props {
  defaultValues?: Partial<Step3Data>
  onNext: (data: Step3Data) => void
  onBack: () => void
}

export function Step3Program({ defaultValues, onNext, onBack }: Props) {
  const supabase = createClient()
  const [faculties,   setFaculties]   = useState<Faculty[]>([])
  const [selectedFac, setSelectedFac] = useState('')
  const [selectedDep, setSelectedDep] = useState('')
  const [selectedPrg, setSelectedPrg] = useState(defaultValues?.degreeProgramId ?? '')
  const [preview,     setPreview]     = useState<DegreeProgram | null>(null)

  const { handleSubmit, setValue, formState: { errors } } =
    useForm<Step3Data>({ resolver: zodResolver(schema), ...(defaultValues !== undefined ? { defaultValues } : {}) })

  useEffect(() => {
    supabase
      .from('faculties')
      .select(`id, name, departments(id, name, degree_programs(id, name, type, duration_years, total_cfu, description))`)
      .then(({ data }) => { if (data) setFaculties(data as Faculty[]) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const faculty    = faculties.find(f => f.id === selectedFac)
  const department = faculty?.departments.find(d => d.id === selectedDep)
  const programs   = department?.degree_programs ?? []

  function selectProgram(id: string) {
    setSelectedPrg(id)
    setValue('degreeProgramId', id)
    setPreview(programs.find(p => p.id === id) ?? null)
  }

  const degreeLabel: Record<string, string> = {
    bachelor: 'Licence (3 ans)', master: 'Master (2 ans)',
    phd: 'Doctorat (3 ans)', single_cycle: 'Cycle unique (5 ans)',
  }

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <h2 className="text-lg font-semibold">Choisir votre filière</h2>

      {/* Faculté */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Faculté</label>
        <select value={selectedFac} onChange={e => { setSelectedFac(e.target.value); setSelectedDep(''); setSelectedPrg('') }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
          <option value="">-- Sélectionnez une faculté --</option>
          {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Département */}
      {faculty && (
        <div className="space-y-1">
          <label className="text-sm font-medium">Département</label>
          <select value={selectedDep} onChange={e => { setSelectedDep(e.target.value); setSelectedPrg('') }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
            <option value="">-- Sélectionnez un département --</option>
            {faculty.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}

      {/* Programmes */}
      {programs.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Programme</label>
          <div className="grid gap-2">
            {programs.map(p => (
              <button key={p.id} type="button" onClick={() => selectProgram(p.id)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors hover:border-primary ${selectedPrg === p.id ? 'border-primary bg-primary/5' : ''}`}>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{degreeLabel[p.type] ?? p.type} · {p.total_cfu} CFU</p>
              </button>
            ))}
          </div>
          {errors.degreeProgramId && <p className="text-xs text-destructive">{errors.degreeProgramId.message}</p>}
        </div>
      )}

      {/* Preview */}
      {preview?.description && (
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          {preview.description}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 rounded-md border px-4 py-2 text-sm hover:bg-accent">← Retour</button>
        <button type="submit" className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Suivant →</button>
      </div>
    </form>
  )
}
