import i18next, { type i18n as I18nInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

import type { Locale } from './locale'
import { DEFAULT_LOCALE } from './locale'

import enCommon from '~/locales/en/common.json'
import enAuth from '~/locales/en/auth.json'
import enErrors from '~/locales/en/errors.json'
import enValidation from '~/locales/en/validation.json'
import enLanding from '~/locales/en/landing.json'
import enNav from '~/locales/en/nav.json'
import enDashboard from '~/locales/en/dashboard.json'
import enItems from '~/locales/en/items.json'
import enAccount from '~/locales/en/account.json'
import enOrg from '~/locales/en/org.json'
import enSettings from '~/locales/en/settings.json'
import enChat from '~/locales/en/chat.json'

import frCommon from '~/locales/fr/common.json'
import frAuth from '~/locales/fr/auth.json'
import frErrors from '~/locales/fr/errors.json'
import frValidation from '~/locales/fr/validation.json'
import frLanding from '~/locales/fr/landing.json'
import frNav from '~/locales/fr/nav.json'
import frDashboard from '~/locales/fr/dashboard.json'
import frItems from '~/locales/fr/items.json'
import frAccount from '~/locales/fr/account.json'
import frOrg from '~/locales/fr/org.json'
import frSettings from '~/locales/fr/settings.json'
import frChat from '~/locales/fr/chat.json'

export const NAMESPACES = [
  'common',
  'auth',
  'errors',
  'validation',
  'landing',
  'nav',
  'dashboard',
  'items',
  'account',
  'org',
  'settings',
  'chat',
] as const

export const defaultNS = 'common'

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    errors: enErrors,
    validation: enValidation,
    landing: enLanding,
    nav: enNav,
    dashboard: enDashboard,
    items: enItems,
    account: enAccount,
    org: enOrg,
    settings: enSettings,
    chat: enChat,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    errors: frErrors,
    validation: frValidation,
    landing: frLanding,
    nav: frNav,
    dashboard: frDashboard,
    items: frItems,
    account: frAccount,
    org: frOrg,
    settings: frSettings,
    chat: frChat,
  },
} as const

/**
 * One instance per server request (no shared singleton → no locale leak across
 * concurrent SSR requests). Resources are bundled, so init is synchronous: the
 * first render already has the right language, no Suspense, no flash.
 */
export function createI18n(locale: Locale): I18nInstance {
  const instance = i18next.createInstance()
  void instance.use(initReactI18next).init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    ns: NAMESPACES,
    defaultNS,
    resources,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  return instance
}

const serverCache = new Map<Locale, I18nInstance>()
let clientInstance: I18nInstance | null = null

/**
 * Get the i18n instance for a locale. On the server, instances are cached per
 * locale and never mutated (no `changeLanguage`), so they're safe to share
 * across concurrent requests. On the client, a single instance is reused and
 * switched via `changeLanguage`, so the active language can change without a
 * reload.
 */
export function getI18n(locale: Locale): I18nInstance {
  if (typeof window === 'undefined') {
    let instance = serverCache.get(locale)
    if (!instance) {
      instance = createI18n(locale)
      serverCache.set(locale, instance)
    }
    return instance
  }
  if (!clientInstance) {
    clientInstance = createI18n(locale)
  } else if (clientInstance.language !== locale) {
    void clientInstance.changeLanguage(locale)
  }
  return clientInstance
}
