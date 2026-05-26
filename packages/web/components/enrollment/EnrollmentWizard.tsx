'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StepIndicator } from './StepIndicator'
import { Step1Account, type Step1Data } from './Step1Account'
import { Step2Personal, type Step2Data } from './Step2Personal'
import { Step3Program, type Step3Data } from './Step3Program'
import { Step4Documents, type UploadedDoc } from './Step4Documents'
import { Step5Summary } from './Step5Summary'

interface WizardData {
  step1?: Step1Data
  step2?: Step2Data
  step3?: Step3Data
  docs?:  UploadedDoc[]
  userId?:      string
  programName?: string
}

export function EnrollmentWizard() {
  const [step, setStep]     = useState(1)
  const [data, setData]     = useState<WizardData>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]       = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Étape 1 → créer le compte Supabase Auth
  async function onStep1(s1: Step1Data) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: s1.email, password: s1.password,
      options: { data: { role: 'student' } },
    })
    if (error) { alert(error.message); return }
    setData(d => ({ ...d, step1: s1, ...(authData.user?.id !== undefined ? { userId: authData.user.id } : {}) }))
    setStep(2)
  }

  async function onStep5Submit() {
    if (!data.step1 || !data.step2 || !data.step3 || !data.docs || !data.userId) return
    setSubmitting(true)

    const res = await fetch('/api/students/enrollment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId:          data.userId,
        degreeProgramId: data.step3.degreeProgramId,
        personalInfo:    data.step2,
        documents:       data.docs,
      }),
    })

    setSubmitting(false)
    if (res.ok) {
      setSuccess(true)
    } else {
      alert('Erreur lors de la soumission. Veuillez réessayer.')
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-5xl">🎉</p>
        <h2 className="text-xl font-bold">Dossier soumis avec succès !</h2>
        <p className="text-sm text-muted-foreground">
          Votre dossier est en cours d'examen. Vous recevrez un email de confirmation dans 5 jours ouvrés.
        </p>
        <button onClick={() => router.push('/login')}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Retour à la connexion
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <StepIndicator current={step} />

      {step === 1 && (
        <Step1Account
          {...(data.step1 !== undefined ? { defaultValues: data.step1 } : {})}
          onNext={onStep1}
        />
      )}

      {step === 2 && (
        <Step2Personal
          {...(data.step2 !== undefined ? { defaultValues: data.step2 } : {})}
          onNext={s2 => { setData(d => ({ ...d, step2: s2 })); setStep(3) }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <Step3Program
          {...(data.step3 !== undefined ? { defaultValues: data.step3 } : {})}
          onNext={s3 => { setData(d => ({ ...d, step3: s3 })); setStep(4) }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && data.userId && (
        <Step4Documents
          studentUserId={data.userId}
          onNext={docs => { setData(d => ({ ...d, docs })); setStep(5) }}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && data.step1 && data.step2 && data.step3 && data.docs && (
        <Step5Summary
          step1={data.step1}
          step2={data.step2}
          step3={data.step3}
          docs={data.docs}
          programName={data.programName ?? data.step3.degreeProgramId}
          onSubmit={onStep5Submit}
          onBack={() => setStep(4)}
          isSubmitting={submitting}
        />
      )}
    </div>
  )
}
