import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '~/components/ui/button'
import { Logo } from '~/components/Logo'
import { LanguageSwitcher } from '~/components/i18n/LanguageSwitcher'
import { useRedirectWhenAuthenticated } from '~/lib/auth-state'
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'

export const Route = createFileRoute('/')({
  component: Home,
  head: () => {
    const t = getI18n(getLocale()).getFixedT(null, 'landing')
    return {
      meta: [
        { title: t('metaTitle') },
        { name: 'description', content: t('metaDescription') },
      ],
    }
  },
})

function Home() {
  useRedirectWhenAuthenticated()
  const { t } = useTranslation('landing')
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-8 p-8">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Logo className="h-10" />
      <h1 className="text-4xl font-bold tracking-tight">albo</h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        {t('tagline')}
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/login">{t('signIn')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/register">{t('createAccount')}</Link>
        </Button>
      </div>
    </main>
  )
}
