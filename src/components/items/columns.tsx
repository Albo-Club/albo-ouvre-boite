import type { ColumnDef } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'

import type { Id } from '../../../convex/_generated/dataModel'
import { Checkbox } from '~/components/ui/checkbox'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { DataTableColumnHeader } from '~/components/data-table/DataTableColumnHeader'

export type ItemRow = {
  _id: Id<'items'>
  title: string
  description: string | null
  createdAt: number
  createdBy: { _id: Id<'users'>; name: string | null; email: string }
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function buildColumns({
  onEdit,
  onDelete,
}: {
  onEdit: (item: ItemRow) => void
  onDelete: (item: ItemRow) => void
}): ColumnDef<ItemRow>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Title" />
      ),
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate font-medium">
          {row.original.title}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="text-muted-foreground max-w-[420px] truncate text-sm">
          {row.original.description ?? '—'}
        </div>
      ),
      enableSorting: false,
    },
    {
      id: 'createdByLabel',
      accessorFn: (row) => row.createdBy.name ?? row.createdBy.email,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created by" />
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.createdBy.name ?? row.original.createdBy.email}
        </div>
      ),
      filterFn: (row, _id, value) => {
        if (!Array.isArray(value) || value.length === 0) return true
        const label = row.original.createdBy.email
        return value.includes(label)
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created at" />
      ),
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm tabular-nums">
          {formatDateTime(row.original.createdAt)}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(row.original)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => onDelete(row.original)}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ]
}
