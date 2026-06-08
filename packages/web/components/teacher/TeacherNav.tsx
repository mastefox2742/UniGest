'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

type IC = { className?: string | undefined }
const IconHome      = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
const IconCalendar  = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
const IconBook      = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
const IconClipboard = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7l2 2 4-4"/></svg>
const IconGradCap   = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>
const IconFileText  = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
const IconCoins     = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
const IconPlane     = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
const IconCog       = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
const IconLogout    = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
const IconMenu      = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
const IconX         = ({ className }: IC) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>

type NavItem = { href: string; label: string; Icon: (p: IC) => React.ReactElement }

const NAV: Array<{ section: string; items: NavItem[] }> = [
  { section: 'Général', items: [
    { href: '/teacher/dashboard', label: 'Tableau de bord', Icon: IconHome },
  ]},
  { section: 'Enseignement', items: [
    { href: '/teacher/planning', label: 'Emploi du temps & RDV',  Icon: IconCalendar  },
    { href: '/teacher/courses',  label: 'Mes cours & Matériel',   Icon: IconBook      },
    { href: '/teacher/exams',    label: 'Gestion des examens',    Icon: IconClipboard },
  ]},
  { section: 'Encadrement', items: [
    { href: '/teacher/thesis', label: 'Thèses dirigées', Icon: IconGradCap },
  ]},
  { section: 'Recherche & Carrière', items: [
    { href: '/teacher/research/publications', label: 'Mes publications',  Icon: IconFileText },
    { href: '/teacher/research/budget',       label: 'Budgets & Projets', Icon: IconCoins    },
    { href: '/teacher/missions',              label: 'Ordres de mission', Icon: IconPlane    },
  ]},
]

function NavLink({ href, label, Icon, active }: NavItem & { active: boolean }) {
  return (
    <Link href={href} className={cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
      active
        ? 'bg-indigo-600 text-white shadow-sm'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
    )}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function TeacherNav({ fullName, title, department }: {
  fullName:    string
  title?:      string | undefined
  department?: string | undefined
}) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const initials = fullName.split(' ').filter(Boolean).map(n => n.charAt(0)).slice(0, 2).join('').toUpperCase()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    return href === '/teacher/dashboard' ? pathname === href : pathname.startsWith(href)
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="mb-5 flex items-center gap-2.5 px-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">UG</div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">UniGest</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Espace Enseignant</p>
        </div>
      </div>

      {/* Profile card */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {title ? `${title} ` : ''}{fullName}
            </p>
            {department && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{department}</p>}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Enseignant-Chercheur
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-4 overflow-y-auto">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">{section}</p>
            <div className="space-y-0.5">
              {items.map(item => <NavLink key={item.href} {...item} active={isActive(item.href)} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="mt-4 space-y-0.5 border-t border-slate-200 pt-4 dark:border-slate-800">
        <Link href="/teacher/settings" className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          pathname.startsWith('/teacher/settings')
            ? 'bg-indigo-600 text-white'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
        )}>
          <IconCog className="h-4 w-4 shrink-0" />
          Paramètres RH
        </Link>
        <button onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950 dark:hover:text-red-400">
          <IconLogout className="h-4 w-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Barre mobile */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-[11px] font-bold text-white">UG</div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">UniGest</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" aria-label="Ouvrir le menu">
          <IconMenu className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto border-r border-slate-200 bg-white px-3 py-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fermer">
              <IconX className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside className="hidden h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white px-3 py-5 dark:border-slate-800 dark:bg-slate-900 md:flex">
        {sidebarContent}
      </aside>
    </>
  )
}
