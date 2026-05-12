import { Link } from '@tanstack/react-router'

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
  const recent = (items ?? []).slice(0, 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Recent items</CardTitle>
          <CardDescription>The 5 most recent items in this org</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/app/$orgSlug/items" params={{ orgSlug }}>
            View all
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {!items ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Loading…
          </p>
        ) : recent.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No items yet.{' '}
            <Link
              to="/app/$orgSlug/items"
              params={{ orgSlug }}
              className="underline"
            >
              Create one
            </Link>
            .
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
