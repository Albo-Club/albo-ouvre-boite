import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router'
import { useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../../convex/_generated/api'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/app/$orgSlug/settings')({
  component: SettingsLayout,
})

function SettingsLayout() {
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
    { to: '/app/$orgSlug/settings/general', label: 'General' },
    { to: '/app/$orgSlug/settings/members', label: 'Members' },
    {
      to: '/app/$orgSlug/settings/invitations',
      label: 'Invitations',
      adminOnly: true,
    },
  ]

  return (
    <main className="flex-1 space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Manage your organization.
          </p>
        </div>
        <Link
          to="/app/$orgSlug"
          params={{ orgSlug }}
          className="text-muted-foreground hover:text-foreground text-sm underline"
        >
          ← Back
        </Link>
      </header>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="flex flex-row gap-1 md:w-48 md:shrink-0 md:flex-col">
          {tabs
            .filter((t) => !t.adminOnly || canManage)
            .map((t) => {
              const active = location.pathname.startsWith(
                t.to.replace('$orgSlug', orgSlug),
              )
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  params={{ orgSlug }}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  {t.label}
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
