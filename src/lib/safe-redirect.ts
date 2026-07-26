import { z } from 'zod'

// A `?redirect=` return URL must stay inside this app. Anything else is an open
// redirect: an attacker shares `/login?redirect=https://evil.com`, the victim
// signs in on our real domain with real credentials, and we hand them off to
// the attacker at the exact moment they have proven they trust the page.
//
// Resolve against a throwaway origin and require the result to stay on it,
// rather than pattern-matching the raw string. The URL parser applies the same
// normalisation the browser will apply when navigating, which a regex does not:
// per the WHATWG URL spec, ASCII tab and newline are *stripped*, so
// `/\t/evil.com` becomes `//evil.com` — protocol-relative, off-site — while
// still looking like a rooted path. The parser catches that; `/^\/(?![/\\])/`
// does not. Same for `\/evil.com`, `///evil.com` and `javascript:` (origin
// `null`).
//
// `startsWith('/')` is still needed: a bare `app` resolves onto the base origin
// and would otherwise pass, but it is not a rooted internal path.
//
// Better Auth validates `callbackURL` / `errorCallbackURL` against
// `trustedOrigins` (`convex/auth.ts`), so only the redirects *we* navigate to
// ourselves need this guard. See KNOWN_ISSUES.md.
const PROBE_ORIGIN = 'https://internal.invalid'

const isInternalPath = (value: string) => {
  if (!value.startsWith('/')) return false
  try {
    return new URL(value, PROBE_ORIGIN).origin === PROBE_ORIGIN
  } catch {
    return false
  }
}

// Zod field for a return-URL search param. A hostile value collapses to
// `undefined` instead of throwing, so the page renders normally and falls back
// to its default destination — an error screen would just advertise the attempt.
export const internalRedirectSearch = z
  .string()
  .refine(isInternalPath)
  .optional()
  .catch(undefined)
