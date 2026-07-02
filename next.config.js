/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Block MIME-sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Enable XSS filter in older browsers
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  // Only send referrer to same origin
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Only allow HTTPS for 1 year (includeSubDomains + preload)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  // Permissions policy: limit access to sensitive browser APIs
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Content Security Policy: restrict sources to known-good origins
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js inline scripts & Supabase realtime
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      // Supabase storage for uploaded evidence files
      "img-src 'self' data: blob: https://*.supabase.co",
      // Supabase API + realtime websocket
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live wss://ws-us3.pusher.com",
      // Fonts from self only
      "font-src 'self' data:",
      // Styles from self + inline (Tailwind)
      "style-src 'self' 'unsafe-inline'",
      // No objects (Flash etc.)
      "object-src 'none'",
      // Base URI restricted to self
      "base-uri 'self'",
      // Forms only submitted to self
      "form-action 'self'",
      // Frame ancestors — only allow embedding from same origin
      "frame-ancestors 'self'",
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') ?? '',
        'web-sage-mu-68.vercel.app',
      ].filter(Boolean),
    },
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = nextConfig
