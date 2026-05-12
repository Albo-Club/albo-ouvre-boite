import { createFileRoute } from '@tanstack/react-router'
import { useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../convex/_generated/api'
import { ItemsDataTable } from '~/components/items/ItemsDataTable'

export const Route = createFileRoute('/app/$orgSlug/items')({
  component: ItemsPage,
  head: () => ({ meta: [{ title: 'Items — albo' }] }),
})

function ItemsPage() {
  const { orgSlug } = Route.useParams()
  const me = useConvexQuery(api.users.me)
  const org = useConvexQuery(api.organizations.bySlug, { slug: orgSlug })
  const items = useConvexQuery(
    api.items.list,
    org ? { orgId: org._id } : 'skip',
  )

  const myRole =
    me?.kind === 'ready'
      ? me.orgs.find((o) => o.slug === orgSlug)?.role
      : undefined
  const canBulkDelete = myRole === 'admin' || myRole === 'owner'

  return (
    <main className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
        <p className="text-muted-foreground text-sm">
          Example resource scoped to this organization.
        </p>
      </div>

      {items === undefined ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <ItemsDataTable
          items={items}
          orgId={org?._id}
          canBulkDelete={canBulkDelete}
        />
      )}
    </main>
  )
}
