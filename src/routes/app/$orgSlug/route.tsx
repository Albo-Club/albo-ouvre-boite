import { useEffect } from 'react'
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from '@tanstack/react-router'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../convex/_generated/api'
import { authClient } from '~/lib/auth-client'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Logo } from '~/components/Logo'

export const Route = createFileRoute('/app/$orgSlug')({
  component: OrgLayout,
})

function OrgLayout() {
  const { orgSlug } = Route.useParams()
  const navigate = useNavigate()
  const me = useConvexQuery(api.users.me)
  const setLastOrg = useConvexMutation(api.organizations.setLastOrg)

  useEffect(() => {
    if (me?.kind !== 'ready') return
    const member = me.orgs.find((o) => o.slug === orgSlug)
    if (!member) {
      navigate({ to: '/app' })
      return
    }
    if (me.user.lastOrgSlug !== orgSlug) {
      void setLastOrg({ slug: orgSlug })
    }
  }, [me, orgSlug, navigate, setLastOrg])

  if (!me || me.kind !== 'ready') {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    )
  }
  const member = me.orgs.find((o) => o.slug === orgSlug)
  if (!member) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Redirecting…</p>
      </main>
    )
  }

  async function handleSignOut() {
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  const displayName = me.user.name ?? me.user.email
  const initials =
    (me.user.name ?? me.user.email).slice(0, 2).toUpperCase() || '?'

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Link
            to="/app/$orgSlug"
            params={{ orgSlug }}
            className="flex items-center gap-2"
          >
            <Logo className="h-6 w-auto" />
            <span className="text-muted-foreground text-sm">
              / {member.name}
            </span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <span className="bg-muted text-muted-foreground flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium">
                  {initials}
                </span>
                <span className="hidden sm:inline">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                {me.user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app/me">Your profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/app">Switch organization</Link>
              </DropdownMenuItem>
              {me.user.superAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/app/admin">Super-admin</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleSignOut}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
