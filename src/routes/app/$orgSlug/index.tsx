import { createFileRoute, Link } from '@tanstack/react-router'
import { useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

export const Route = createFileRoute('/app/$orgSlug/')({
  component: OrgDashboard,
})

function OrgDashboard() {
  const { orgSlug } = Route.useParams()
  const me = useConvexQuery(api.users.me)
  const org = useConvexQuery(api.organizations.bySlug, { slug: orgSlug })

  const myRole =
    me?.kind === 'ready'
      ? me.orgs.find((o) => o.slug === orgSlug)?.role
      : undefined

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {org?.name ?? orgSlug}
          </h1>
          <p className="text-muted-foreground text-sm">
            Role: <code>{myRole ?? '—'}</code>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/app/$orgSlug/settings" params={{ orgSlug }}>
            Settings
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            This is your organization dashboard. Items, AI chat and more land
            later in phase 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Use the <strong>Settings</strong> button above to manage members and
          invitations.
        </CardContent>
      </Card>
    </main>
  )
}
