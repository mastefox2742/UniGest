/** @type {import('next').NextConfig} */
const path = require('path')

// ─── Content Security Policy ──────────────────────────────────────────────────
// Adapté pour Next.js + Supabase + fonts Google + Sonner (toasts)
const cspDirectives = {
  'default-src':     ["'self'"],
  'script-src':      ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  // unsafe-inline + unsafe-eval requis par Next.js App Router (hydration)
  // À durcir progressivement via nonce une fois l'app stabilisée
  'style-src':       ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src':        ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'img-src':         ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
  'connect-src':     [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',           // Supabase Realtime WebSocket
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  ],
  'media-src':       ["'self'", 'https://*.supabase.co'],
  'object-src':      ["'none'"],
  'frame-ancestors': ["'none'"],     // Empêche le clickjacking
  'base-uri':        ["'self'"],
  'form-action':     ["'self'"],
  'upgrade-insecure-requests': [],   // Force HTTPS sur les ressources
}

const csp = Object.entries(cspDirectives)
  .map(([key, values]) => `${key} ${values.join(' ')}`)
  .join('; ')

// ─── Security Headers ─────────────────────────────────────────────────────────
const securityHeaders = [
  // Force HTTPS pendant 1 an, inclut les sous-domaines
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // Empêche le sniffing du Content-Type
  {
    key:   'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Empêche le chargement dans une iframe (clickjacking)
  {
    key:   'X-Frame-Options',
    value: 'DENY',
  },
  // Limite les informations du Referer envoyées aux sites externes
  {
    key:   'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Désactive les features navigateur non utilisées
  {
    key:   'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
  // Content Security Policy
  {
    key:   'Content-Security-Policy',
    value: csp,
  },
  // Protection XSS legacy (vieux navigateurs)
  {
    key:   'X-XSS-Protection',
    value: '1; mode=block',
  },
  // Empêche le DNS prefetching
  {
    key:   'X-DNS-Prefetch-Control',
    value: 'off',
  },
]

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['@unigest/shared'],
  // Required for Vercel monorepo: tells Next.js file tracer to include
  // the workspace root so @unigest/shared is bundled into serverless functions
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
        // Note: /public/** remplacé par /** pour inclure les URLs signées également
      },
    ],
  },

  // ─── Appliquer les headers de sécurité à toutes les routes ──────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  experimental: {},
}

module.exports = nextConfig
