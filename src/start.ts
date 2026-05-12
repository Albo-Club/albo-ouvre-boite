import { createMiddleware, createStart } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'

const securityHeaders = createMiddleware().server(async ({ next }) => {
  setResponseHeader('X-Frame-Options', 'DENY')
  setResponseHeader('X-Content-Type-Options', 'nosniff')
  setResponseHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  setResponseHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains',
  )
  setResponseHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  )
  // CSP: allow inline styles (Tailwind), scripts from self (TanStack bundles),
  // connections to Convex (the deployment is the only cross-origin target).
  // Tighten further per deployment if you don't use Sentry/analytics.
  setResponseHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  )
  return next()
})

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeaders],
}))
