import { useEffect } from 'react'
import {
  createFileRoute,
  Link,
  useNavigate,
} from '@tanstack/react-router'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

export const Route = createFileRoute('/app/admin')({
  component: AdminPage,
  head: () => ({ meta: [{ title: 'Super-admin — albo' }] }),
})

function AdminPage() {
  const navigate = useNavigate()
  const me = useConvexQuery(api.users.me)
  const overview = useConvexQuery(
    api.admin.overview,
    me?.kind === 'ready' && me.user.superAdmin ? {} : 'skip',
  )
  const orgs = useConvexQuery(
    api.admin.listOrgs,
    me?.kind === 'ready' && me.user.superAdmin ? {} : 'skip',
  )
  const users = useConvexQuery(
    api.admin.listUsers,
    me?.kind === 'ready' && me.user.superAdmin ? {} : 'skip',
  )
  const setSuperAdmin = useConvexMutation(api.admin.setSuperAdmin)

  useEffect(() => {
    if (me?.kind === 'ready' && !me.user.superAdmin) {
      navigate({ to: '/app' })
    }
  }, [me, navigate])

  if (!me || me.kind !== 'ready') {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    )
  }

  if (!me.user.superAdmin) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Redirecting…</p>
      </main>
    )
  }

  async function handleToggle(userId: string, value: boolean) {
    try {
      await setSuperAdmin({ userId: userId as never, value })
      toast.success(value ? 'Granted super-admin' : 'Revoked super-admin')
    } catch (err) {
      const code = err instanceof ConvexError ? (err.data as string) : ''
      toast.error(
        code === 'last_super_admin'
          ? 'You are the last super-admin'
          : 'Action failed',
      )
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Super-admin</h1>
          <p className="text-muted-foreground text-sm">
            Deployment-wide view of users and organizations.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/app">← Back</Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Users" value={overview?.userCount} />
        <Stat label="Organizations" value={overview?.orgCount} />
        <Stat label="Memberships" value={overview?.memberCount} />
        <Stat label="Pending invites" value={overview?.pendingInvitations} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>All orgs across the deployment.</CardDescription>
        </CardHeader>
        <CardContent>
          {!orgs ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : orgs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No organizations.</p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {orgs.map((o) => (
                <li
                  key={o._id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      /{o.slug} · {o.memberCount} member
                      {o.memberCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Toggle super-admin to grant deployment-wide access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!users ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users.</p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {users.map((u) => {
                const isSelf = u._id === me.user._id
                return (
                  <li
                    key={u._id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {u.name ?? u.email}
                        {isSelf && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {u.email} · {u.orgCount} org
                        {u.orgCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={u.superAdmin ? 'default' : 'outline'}
                      onClick={() => handleToggle(u._id, !u.superAdmin)}
                    >
                      {u.superAdmin ? 'Super-admin' : 'Make super-admin'}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value ?? '—'}</p>
      </CardContent>
    </Card>
  )
}
