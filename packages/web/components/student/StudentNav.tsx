'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NAV_SECTIONS = [
  {
    items: [
      { href: '/student/dashboard', icon: '🏠', label: 'Tableau de bord' },
    ],
  },
  {
    title: 'Académique',
    items: [
      { href: '/student/schedule', icon: '📆', label: 'Emploi du temps' },
      { href: '/student/courses',  icon: '📚', label: 'Cours & Matériel' },
    ],
  },
  {
    title: 'Mon Cursus',
    items: [
      { href: '/student/libretto', icon: '📊', label: 'Libretto' },
      { href: '/student/exams',    icon: '📝', label: 'Examens' },
    ],
  },
  {
    title: 'Administratif',
    items: [
      { href: '/student/fees',         icon: '💳', label: 'Frais de scolarité' },
      { href: '/student/certificates', icon: '📜', label: 'Certificats' },
    ],
  },
  {
    title: 'Fin de parcours',
    items: [
      { href: '/student/thesis', icon: '🎓', label: 'Thèse de Laurea' },
    ],
  },
]

interface StudentNavProps {
  fullName:   string
  matricola?: string | undefined
  avatarUrl?: string | undefined
}

export function StudentNav({ fullName, matricola, avatarUrl }: StudentNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Ferme le drawer quand on navigue
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const initials = fullName
    .split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-lg text-primary-foreground">
          🎓
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight tracking-tight">UniGest</p>
          <p className="text-[11px] text-muted-foreground">Espace Étudiant</p>
        </div>
      </div>

      {/* User card */}
      <div className="mx-3 my-4 flex items-center gap-3 rounded-xl bg-muted px-3 py-3">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={fullName} width={42} height={42}
            className="h-[42px] w-[42px] rounded-full object-cover ring-2 ring-background" />
        ) : (
          <div aria-label={`Avatar de ${fullName}`}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-2 ring-background">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{fullName}</p>
          <p className="text-xs text-muted-foreground">
            {matricola ? `Matr. ${matricola}` : 'Étudiant'}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
        {NAV_SECTIONS.map((section, i) => (
          <div key={i}>
            {section.title && (
              <p className="mb-1 mt-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, icon, label }) => {
                const active = pathname === href || (href !== '/student/dashboard' && pathname.startsWith(href))
                return (
                  <Link key={href} href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      active ? 'bg-primary text-primary-foreground font-medium shadow-sm' : 'text-foreground hover:bg-accent',
                    )}>
                    <span className="text-[15px] leading-none">{icon}</span>
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bas */}
      <div className="border-t px-3 py-3 space-y-0.5">
        <Link href="/student/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
            pathname === '/student/settings'
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}>
          <span className="text-[15px] leading-none">⚙️</span>
          Paramètres
        </Link>
        <button onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <span className="text-[15px] leading-none">🚪</span>
          Déconnexion
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Barre mobile (visible < md) ─────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <span className="text-sm font-bold">UniGest</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 hover:bg-accent"
          aria-label="Ouvrir le menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ── Drawer mobile ───────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto bg-card shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 hover:bg-accent"
              aria-label="Fermer le menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── Sidebar desktop (visible >= md) ─────────────── */}
      <aside className="hidden h-full w-64 flex-col border-r bg-card md:flex">
        {sidebarContent}
      </aside>
    </>
  )
}
