import { createFileRoute } from '@tanstack/react-router'
import { useConvexQuery } from '@convex-dev/react-query'
import { useTranslation } from 'react-i18next'

import { api } from '../../../../convex/_generated/api'
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'
import { Skeleton } from '~/components/ui/skeleton'
import { ItemsDataTable } from '~/components/items/ItemsDataTable'

export const Route = createFileRoute('/app/$orgSlug/items')({
  component: ItemsPage,
  head: () => ({
    meta: [{ title: getI18n(getLocale()).getFixedT(null, 'items')('metaTitle') }],
  }),
})

function ItemsPage() {
  const { t } = useTranslation(['items', 'common'])
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
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('items:page.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('items:page.subtitle')}
        </p>
      </div>

      {items === undefined ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-9 w-28" />
          </div>
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
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
