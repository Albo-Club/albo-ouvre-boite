import { Check, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useConvexAuth } from 'convex/react'
import { useConvexMutation } from '@convex-dev/react-query'

import { api } from '../../../convex/_generated/api'
import { LOCALES, writeLocaleCookie, type Locale } from '~/lib/locale'
import { Button } from '~/components/ui/button'
import { SidebarMenuButton } from '~/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'

export function LanguageSwitcher({
  variant = 'default',
}: {
  variant?: 'default' | 'sidebar'
}) {
  const { t, i18n } = useTranslation('common')
  const { isAuthenticated } = useConvexAuth()
  const setPreferredLanguage = useConvexMutation(api.users.setPreferredLanguage)
  const current = (LOCALES as ReadonlyArray<string>).includes(i18n.language)
    ? (i18n.language as Locale)
    : 'en'

  function change(next: Locale) {
    if (next === current) return
    void i18n.changeLanguage(next)
    writeLocaleCookie(next)
    if (isAuthenticated) void setPreferredLanguage({ language: next })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'sidebar' ? (
          <SidebarMenuButton tooltip={t('language.label')}>
            <Languages />
            <span>{t('language.label')}</span>
            <span className="text-muted-foreground ml-auto text-xs uppercase">
              {current}
            </span>
          </SidebarMenuButton>
        ) : (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Languages className="size-4" />
            <span className="uppercase">{current}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onSelect={() => change(locale)}
            className="gap-2"
          >
            <span>{t(`language.${locale}`)}</span>
            {locale === current && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
