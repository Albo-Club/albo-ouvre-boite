import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import * as React from 'react'
import { I18nextProvider } from 'react-i18next'
import type { QueryClient } from '@tanstack/react-query'
import type { Locale } from '~/lib/locale'
import appCss from '~/styles/app.css?url'
import { Toaster } from '~/components/ui/sonner'
import { ThemeProvider } from '~/components/app-shell/ThemeProvider'
import { RouterNotFound } from '~/components/RouterFallbacks'
import { getLocale } from '~/lib/locale'
import { getI18n } from '~/lib/i18n'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: (): { locale: Locale } => ({ locale: getLocale() }),
  head: () => {
    const t = getI18n(getLocale()).getFixedT(null, 'common')
    return {
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: t('appTitle'),
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
    }
  },
  notFoundComponent: RouterNotFound,
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const { locale } = Route.useRouteContext()
  const i18n = getI18n(locale)
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider>
            {children}
            <Toaster richColors closeButton />
          </ThemeProvider>
        </I18nextProvider>
        <Scripts />
      </body>
    </html>
  )
}
