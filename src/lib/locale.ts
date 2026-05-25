import { createIsomorphicFn } from '@tanstack/react-start'
import {
  getCookie,
  getRequestHeader,
  setCookie,
} from '@tanstack/react-start/server'

export const LOCALES = ['en', 'fr'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'lang'
const ONE_YEAR = 60 * 60 * 24 * 365

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'fr'
}

/**
 * Resolve a locale from an Accept-Language header (or a single navigator tag).
 * English is the default; French wins only when a French variant (fr, fr-CA,
 * fr-BE, …) is the highest-priority language the client asked for.
 */
export function localeFromAcceptLanguage(
  header: string | null | undefined,
): Locale {
  if (!header) return DEFAULT_LOCALE
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const qParam = params.find((p) => p.trim().startsWith('q='))
      const q = qParam ? Number.parseFloat(qParam.split('=')[1]) : 1
      return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { tag } of ranked) {
    if (tag === 'fr' || tag.startsWith('fr-')) return 'fr'
    if (tag === 'en' || tag.startsWith('en-')) return 'en'
  }
  return DEFAULT_LOCALE
}

function readLocaleCookie(): Locale | null {
  const match = document.cookie.match(/(?:^|;\s*)lang=(en|fr)\b/)
  return match ? (match[1] as Locale) : null
}

/**
 * Resolve the active locale, isomorphically and synchronously.
 *
 * Server: cookie wins (the switcher writes it), else Accept-Language. The
 * resolved value is written back to the `lang` cookie so the client reads the
 * exact same value at hydration — no flash, no mismatch.
 *
 * Client: cookie (set by the server above or the switcher), else
 * navigator.language. No network round-trip on navigation.
 */
export const getLocale = createIsomorphicFn()
  .server((): Locale => {
    const cookie = getCookie(LOCALE_COOKIE)
    if (isLocale(cookie)) return cookie
    const resolved = localeFromAcceptLanguage(
      getRequestHeader('accept-language'),
    )
    setCookie(LOCALE_COOKIE, resolved, {
      path: '/',
      maxAge: ONE_YEAR,
      sameSite: 'lax',
    })
    return resolved
  })
  .client((): Locale => {
    return readLocaleCookie() ?? localeFromAcceptLanguage(navigator.language)
  })

/** Persist a locale choice in the cookie (client-side, used by the switcher). */
export function writeLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`
}
