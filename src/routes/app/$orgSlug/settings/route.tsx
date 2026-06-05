import {
  Link,
  Outlet,
  createFileRoute,
  useLocation,
} from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../../convex/_generated/api'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/app/$orgSlug/settings')({
  component: SettingsLayout,
})

function SettingsLayout() {
  const { t } = useTranslation(['settings'])
  const { orgSlug } = Route.useParams()
  const location = useLocation()
  const me = useConvexQuery(api.users.me)
  const role =
    me?.kind === 'ready'
      ? me.orgs.find((o) => o.slug === orgSlug)?.role
      : undefined
  const canManage = role === 'admin' || role === 'owner'

  const tabs: ReadonlyArray<{
    to:
      | '/app/$orgSlug/settings/general'
      | '/app/$orgSlug/settings/members'
      | '/app/$orgSlug/settings/invitations'
    label: string
    adminOnly?: boolean
  }> = [
    { to: '/app/$orgSlug/settings/general', label: t('settings:layout.tabs.general') },
    { to: '/app/$orgSlug/settings/members', label: t('settings:layout.tabs.members') },
    {
      to: '/app/$orgSlug/settings/invitations',
      label: t('settings:layout.tabs.invitations'),
      adminOnly: true,
    },
  ]

  return (
    <main className="flex-1 space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('settings:layout.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('settings:layout.subtitle')}
          </p>
        </div>
        <Link
          to="/app/$orgSlug"
          params={{ orgSlug }}
          className="text-muted-foreground hover:text-foreground text-sm underline"
        >
          ← {t('settings:layout.back')}
        </Link>
      </header>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="flex flex-row gap-1 md:w-48 md:shrink-0 md:flex-col">
          {tabs
            .filter((tab) => !tab.adminOnly || canManage)
            .map((tab) => {
              const active = location.pathname.startsWith(
                tab.to.replace('$orgSlug', orgSlug),
              )
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  params={{ orgSlug }}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
        </nav>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </main>
  )
}
