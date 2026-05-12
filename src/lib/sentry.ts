import * as Sentry from '@sentry/react'

let initialized = false

export function initSentry() {
  if (initialized) return
  const dsn = (import.meta as { env: Record<string, string | undefined> }).env
    .VITE_SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    environment: (import.meta as { env: Record<string, string | undefined> })
      .env.MODE,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
  })
  initialized = true
}

export { Sentry }
