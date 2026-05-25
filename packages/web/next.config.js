/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@unigest/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
}

module.exports = nextConfig
