import { useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation } from '@convex-dev/react-query'
import { Trans, useTranslation } from 'react-i18next'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { DataTablePagination } from '~/components/data-table/DataTablePagination'
import { buildColumns, type ItemRow } from './columns'
import { ItemFormDialog, type EditableItem } from './ItemFormDialog'

export function ItemsDataTable({
  items,
  orgId,
  canBulkDelete,
}: {
  items: ItemRow[]
  orgId: Id<'organizations'> | undefined
  canBulkDelete: boolean
}) {
  const { t } = useTranslation(['items', 'common'])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<EditableItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ItemRow | null>(null)
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const removeItem = useConvexMutation(api.items.remove)

  const columns = useMemo(
    () =>
      buildColumns({
        onEdit: (item) =>
          setEditing({
            _id: item._id,
            title: item.title,
            description: item.description,
          }),
        onDelete: (item) => setConfirmDelete(item),
        t,
      }),
    [t],
  )

  const table = useReactTable({
    data: items,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, value) => {
      if (!value) return true
      const q = String(value).toLowerCase()
      const it = row.original
      return (
        it.title.toLowerCase().includes(q) ||
        (it.description ?? '').toLowerCase().includes(q) ||
        (it.createdBy.name ?? '').toLowerCase().includes(q) ||
        it.createdBy.email.toLowerCase().includes(q)
      )
    },
    initialState: { pagination: { pageSize: 10 } },
  })

  const errorMessages: Record<string, string> = {
    not_a_member: t('items:errors.not_a_member'),
    insufficient_role: t('items:errors.insufficient_role'),
    not_found: t('items:errors.not_found'),
  }

  async function deleteSingle() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await removeItem({ itemId: confirmDelete._id })
      toast.success(t('items:table.deleted'))
      setConfirmDelete(null)
    } catch (err) {
      const code = err instanceof ConvexError ? (err.data as string) : ''
      toast.error(errorMessages[code] ?? t('items:errors.couldNotDelete'))
    } finally {
      setDeleting(false)
    }
  }

  async function deleteSelected() {
    const selected = table
      .getFilteredSelectedRowModel()
      .rows.map((r) => r.original._id)
    if (selected.length === 0) return
    setDeleting(true)
    try {
      const results = await Promise.allSettled(
        selected.map((id) => removeItem({ itemId: id })),
      )
      const failed = results.filter((r) => r.status === 'rejected').length
      if (failed > 0) {
        toast.error(t('items:table.bulkDeleteFailed', { count: failed }))
      } else {
        toast.success(
          t('items:table.bulkDeleted', { count: selected.length }),
        )
      }
      setRowSelection({})
      setConfirmBulkDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const selectedCount = table.getFilteredSelectedRowModel().rows.length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder={t('items:table.filterPlaceholder')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
          {globalFilter && (
            <button
              type="button"
              onClick={() => setGlobalFilter('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
              aria-label={t('items:table.clearFilter')}
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {selectedCount > 0 && canBulkDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmBulkDelete(true)}
          >
            <Trash2 className="mr-1.5 size-4" />
            {t('items:table.deleteSelected', { count: selectedCount })}
          </Button>
        )}
        <div className="ml-auto" />
        <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!orgId}>
          <Plus className="mr-1.5 size-4" />
          {t('items:table.newItem')}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  {t('items:table.noItems')}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />

      <ItemFormDialog
        open={createOpen}
        mode="create"
        item={null}
        orgId={orgId}
        onClose={() => setCreateOpen(false)}
      />
      <ItemFormDialog
        open={!!editing}
        mode="edit"
        item={editing}
        orgId={orgId}
        onClose={() => setEditing(null)}
      />

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('items:table.deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              <Trans
                t={t}
                i18nKey="items:table.deleteDialog.description"
                values={{ title: confirmDelete?.title ?? '' }}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSingle}
              disabled={deleting}
            >
              {deleting
                ? t('common:loadingEllipsis')
                : t('common:actions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmBulkDelete}
        onOpenChange={(o) => !o && setConfirmBulkDelete(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('items:table.bulkDeleteDialog.title', { count: selectedCount })}
            </DialogTitle>
            <DialogDescription>
              {t('items:table.bulkDeleteDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmBulkDelete(false)}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSelected}
              disabled={deleting}
            >
              {deleting
                ? t('common:loadingEllipsis')
                : t('items:table.deleteSelected', { count: selectedCount })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
