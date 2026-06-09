import { useEffect } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { ErrorComponentProps } from '@tanstack/react-router'

import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Sentry } from '~/lib/sentry'

export function RouterErrorFallback({ error }: ErrorComponentProps) {
  const { t } = useTranslation('common')
  const router = useRouter()

  useEffect(() => {
    // The router boundary swallows the throw, so Sentry's global handler
    // never sees it — report explicitly (no-op when Sentry isn't configured).
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('errorBoundary.title')}</CardTitle>
          <CardDescription>{t('errorBoundary.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {import.meta.env.DEV && (
            <pre className="bg-muted overflow-auto rounded-md p-3 text-xs">
              {error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <Button onClick={() => void router.invalidate()}>
              {t('actions.retry')}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">{t('errorBoundary.goHome')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function RouterNotFound() {
  const { t } = useTranslation('common')
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-5xl font-bold tracking-tight">
            404
          </CardTitle>
          <CardDescription>{t('notFoundPage.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">{t('notFoundPage.goHome')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
