import { createFileRoute } from '@tanstack/react-router'
import { useConvexQuery } from '@convex-dev/react-query'
import { Package, Users, Mail, DollarSign } from 'lucide-react'

import { api } from '../../../../convex/_generated/api'
import { KpiCard } from '~/components/dashboard/KpiCard'
import { ActivityChart } from '~/components/dashboard/ActivityChart'
import { RoleBreakdownChart } from '~/components/dashboard/RoleBreakdownChart'
import { RecentItemsCard } from '~/components/dashboard/RecentItemsCard'

export const Route = createFileRoute('/app/$orgSlug/')({
  component: OrgDashboard,
  head: () => ({ meta: [{ title: 'Dashboard — albo' }] }),
})

function OrgDashboard() {
  const { orgSlug } = Route.useParams()
  const me = useConvexQuery(api.users.me)
  const org = useConvexQuery(api.organizations.bySlug, { slug: orgSlug })

  const myRole =
    me?.kind === 'ready'
      ? me.orgs.find((o) => o.slug === orgSlug)?.role
      : undefined
  const isAdmin = myRole === 'admin' || myRole === 'owner'

  const items = useConvexQuery(
    api.items.list,
    org ? { orgId: org._id } : 'skip',
  )
  const members = useConvexQuery(
    api.organizations.listMembers,
    org ? { orgId: org._id } : 'skip',
  )
  const invitations = useConvexQuery(
    api.invitations.listForOrg,
    org && isAdmin ? { orgId: org._id } : 'skip',
  )

  const itemsCount = items?.length ?? 0
  const membersCount = members?.length ?? 0
  const pendingInvites = invitations?.length ?? 0

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {org?.name ?? orgSlug}
        </h1>
        <p className="text-muted-foreground text-sm">
          Overview of your workspace
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total items"
          value={itemsCount}
          delta={12}
          hint="vs last month"
          icon={Package}
        />
        <KpiCard
          label="Active members"
          value={membersCount}
          hint={isAdmin ? `${pendingInvites} pending invites` : undefined}
          icon={Users}
        />
        <KpiCard
          label="Pending invitations"
          value={isAdmin ? pendingInvites : '—'}
          hint={isAdmin ? undefined : 'admin only'}
          icon={Mail}
        />
        <KpiCard
          label="MRR"
          value="$2,847"
          delta={8.2}
          hint="demo · vs last month"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <RoleBreakdownChart members={members} />
      </div>

      <RecentItemsCard items={items} orgSlug={orgSlug} />
    </main>
  )
}
