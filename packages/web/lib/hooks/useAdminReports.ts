'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const API  = process.env.NEXT_PUBLIC_API_URL ?? ''
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

async function getToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_REPORT = {
  totalStudents:    1247,
  activeStudents:   1198,
  graduated:        312,
  withdrawn:        78,
  avgPassRate:      79.2,
  abandonRate:      6.2,
  encadrementRatio: '1/26',
  totalRevenue:     2_840_000,
  outstandingFees:  187_500,
  missionBudget:    6_300,
  nationalities: [
    { label: 'Française',      count: 856, pct: 69 },
    { label: 'Européenne (UE)',count: 248, pct: 20 },
    { label: 'Hors UE',        count: 112, pct: 9  },
    { label: 'Non renseignée', count: 31,  pct: 2  },
  ],
  dropoutReasons: [
    { label: 'Réorientation',          pct: 34 },
    { label: 'Difficultés financières',pct: 22 },
    { label: 'Échec académique',       pct: 28 },
    { label: 'Autres',                 pct: 16 },
  ],
  enrollmentTrend: [
    { year: '2022-23', count: 1084 },
    { year: '2023-24', count: 1158 },
    { year: '2024-25', count: 1209 },
    { year: '2025-26', count: 1247 },
  ],
  programKpis: [
    { name: 'Licence Informatique',  code: 'LIC-INFO', total_students: 342, retention_rate: 78, pass_rate: 74, avg_grad_years: 3.4 },
    { name: 'Master Informatique',   code: 'MST-INFO', total_students: 156, retention_rate: 85, pass_rate: 81, avg_grad_years: 2.1 },
    { name: 'Licence Mathématiques', code: 'LIC-MATH', total_students: 201, retention_rate: 72, pass_rate: 69, avg_grad_years: 3.6 },
    { name: 'Master Sc. Données',    code: 'MST-DS',   total_students:  89, retention_rate: 91, pass_rate: 88, avg_grad_years: 2.0 },
    { name: 'Licence Génie Civil',   code: 'LIC-GC',   total_students: 178, retention_rate: 68, pass_rate: 71, avg_grad_years: 3.8 },
    { name: 'Doctorat Informatique', code: 'DOC-INFO', total_students:  24, retention_rate: 94, pass_rate: 96, avg_grad_years: 4.2 },
  ],
  teachersByDept: [
    { department: 'Informatique',  count: 18 },
    { department: 'Mathématiques', count: 11 },
    { department: 'Génie Civil',   count:  9 },
    { department: 'Physique',      count:  7 },
    { department: 'Langues',       count:  3 },
  ],
  passRatesByCourse: [
    { name: 'Algorithmique',       code: 'INFO101', rate: 76, alert: false },
    { name: 'Réseaux & Protocoles',code: 'INFO201', rate: 44, alert: true  },
    { name: 'BDD Avancées',        code: 'INFO305', rate: 82, alert: false },
    { name: 'Analyse L1',          code: 'MATH101', rate: 61, alert: false },
    { name: 'Algèbre Linéaire',    code: 'MATH102', rate: 58, alert: false },
  ],
  feeBreakdown: [
    { label: 'Frais de scolarité payés',  amount: 2_640_000 },
    { label: 'Frais administratifs',      amount:   200_000 },
    { label: 'Impayés en attente',        amount:   150_000 },
    { label: 'Impayés en retard',         amount:    37_500 },
  ],
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useAnnualReport(universityId = 'demo-uni', academicYearId?: string) {
  return useQuery({
    queryKey: ['admin-annual-report', universityId, academicYearId],
    queryFn:  async () => {
      if (DEMO) return DEMO_REPORT
      const token = await getToken()
      if (!token) return null
      const params = new URLSearchParams({ universityId })
      if (academicYearId) params.set('academicYearId', academicYearId)
      const res = await fetch(`${API}/api/reports/annual?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur chargement rapport')
      return (await res.json()).data
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useOverviewReport() {
  return useQuery({
    queryKey: ['admin-overview-report'],
    queryFn: async () => {
      if (DEMO) return DEMO_REPORT
      const token = await getToken()
      if (!token) return null
      const res = await fetch(`${API}/api/reports/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur chargement synthese')
      return (await res.json()).data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useProgramReport(programId: string | null) {
  return useQuery({
    queryKey: ['admin-program-report', programId],
    enabled:  !!programId,
    queryFn:  async () => {
      if (DEMO) return null
      const token = await getToken()
      if (!token) return null
      const res = await fetch(`${API}/api/reports/programs/${programId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Erreur chargement rapport filière')
      return (await res.json()).data
    },
    staleTime: 1000 * 60 * 10,
  })
}

/**
 * Déclenche le téléchargement CSV directement depuis le navigateur.
 * En mode démo, génère un CSV basique côté client.
 */
export async function downloadStudentsCsv(filters: { programId?: string; status?: string } = {}) {
  if (DEMO) {
    const header = 'Matricule;Nom;Prénom;Filière;Statut;Année;CFU;Moyenne;Promo'
    const rows = [
      'MAT20220011;Gros;Amélie;Master Informatique;active;2;120;14.5;2022',
      'MAT20220034;Ait Youssef;Mohamed;Master Informatique;active;2;120;13.2;2022',
      'MAT20220078;Bertrand;Louise;Master Sc. Données;active;2;118;15.8;2022',
    ]
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'etudiants.csv'; a.click()
    URL.revokeObjectURL(url)
    return
  }

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Non authentifié')

  const params = new URLSearchParams()
  if (filters.programId) params.set('programId', filters.programId)
  if (filters.status)    params.set('status', filters.status)

  const res = await fetch(`${API}/api/reports/export/students?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Erreur export CSV')

  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'etudiants.csv'; a.click()
  URL.revokeObjectURL(url)
}
