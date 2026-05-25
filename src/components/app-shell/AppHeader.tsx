import { Fragment } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { UserButton } from '~/components/auth/user-button'
import { ThemeToggle } from './ThemeToggle'

type Crumb = { label: string; href?: string }

const CRUMB_SEGMENTS = [
  'items',
  'calendar',
  'tasks',
  'billing',
  'settings',
  'members',
  'invitations',
  'general',
] as const

function buildCrumbs(
  pathname: string,
  orgSlug: string,
  orgName: string,
  t: TFunction<['nav']>,
): Array<Crumb> {
  const base = `/app/${orgSlug}`
  const tail = pathname.startsWith(base)
    ? pathname.slice(base.length).replace(/^\//, '')
    : ''
  const segments = tail ? tail.split('/') : []
  const crumbs: Array<Crumb> = [{ label: orgName, href: base }]
  let acc = base
  for (let i = 0; i < segments.length; i += 1) {
    acc += `/${segments[i]}`
    const segment = segments[i]
    const label = (CRUMB_SEGMENTS as ReadonlyArray<string>).includes(segment)
      ? t(`nav:appShell.breadcrumb.${segment}` as never)
      : segment.charAt(0).toUpperCase() + segment.slice(1)
    crumbs.push({
      label,
      href: i === segments.length - 1 ? undefined : acc,
    })
  }
  return crumbs
}

export function AppHeader({
  orgSlug,
  orgName,
  onOpenAiChat,
}: {
  orgSlug: string
  orgName: string
  onOpenAiChat: () => void
}) {
  const location = useLocation()
  const { t } = useTranslation(['nav'])
  const crumbs = buildCrumbs(location.pathname, orgSlug, orgName, t)

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => (
            <Fragment key={`${crumb.label}-${i}`}>
              <BreadcrumbItem className={i === 0 ? 'hidden md:block' : ''}>
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {i < crumbs.length - 1 && (
                <BreadcrumbSeparator
                  className={i === 0 ? 'hidden md:block' : ''}
                />
              )}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onOpenAiChat}>
          <Sparkles className="mr-1.5 size-4" />
          {t('nav:appShell.ai')}
        </Button>
        <ThemeToggle />
        <UserButton />
      </div>
    </header>
  )
}
