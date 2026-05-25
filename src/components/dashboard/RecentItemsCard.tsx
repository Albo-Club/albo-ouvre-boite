import { Link } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

type ItemRow = {
  _id: string
  title: string
  description: string | null
  createdAt: number
  createdBy: { name: string | null; email: string }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

export function RecentItemsCard({
  items,
  orgSlug,
}: {
  items: Array<ItemRow> | undefined
  orgSlug: string
}) {
  const { t } = useTranslation(['dashboard', 'common'])
  const recent = (items ?? []).slice(0, 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>{t('dashboard:recent.title')}</CardTitle>
          <CardDescription>{t('dashboard:recent.description')}</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/$orgSlug/items" params={{ orgSlug }}>
            {t('dashboard:recent.viewAll')}
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!items ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {t('common:loadingEllipsis')}
          </p>
        ) : recent.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            <Trans
              t={t}
              i18nKey="dashboard:recent.empty"
              components={{
                link: (
                  <Link
                    to="/app/$orgSlug/items"
                    params={{ orgSlug }}
                    className="underline"
                  />
                ),
              }}
            />
          </p>
        ) : (
          <ul className="divide-y">
            {recent.map((item) => (
              <li
                key={item._id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {item.title}
                  </div>
                  {item.description ? (
                    <div className="text-muted-foreground truncate text-xs">
                      {item.description}
                    </div>
                  ) : null}
                </div>
                <div className="text-muted-foreground hidden text-xs sm:block">
                  {item.createdBy.name ?? item.createdBy.email}
                </div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {formatDate(item.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
