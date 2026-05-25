import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// Routes publiques — pas besoin d'être connecté
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']

// Routes réservées par rôle
const ROLE_ROUTES: Record<string, string[]> = {
  '/student': ['student'],
  '/teacher': ['teacher'],
  '/admin':   ['secretary', 'admin'],
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Laisser passer les routes publiques
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    // Si déjà connecté, rediriger vers home
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // Non connecté → login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Vérification du rôle pour les routes protégées
  const matchedPrefix = Object.keys(ROLE_ROUTES).find((prefix) =>
    pathname.startsWith(prefix),
  )

  if (matchedPrefix) {
    const allowedRoles = ROLE_ROUTES[matchedPrefix]!

    // Lire le rôle depuis le cookie de session Supabase
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      },
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !allowedRoles.includes(profile.role as string)) {
      return NextResponse.redirect(new URL('/403', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
