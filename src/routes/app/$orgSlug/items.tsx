import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

const itemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(120, 'Too long'),
  description: z.string().max(2000, 'Too long'),
})

const errorMessages: Record<string, string> = {
  invalid_title: 'Title is required',
  description_too_long: 'Description is too long',
  not_a_member: 'You are not a member',
  insufficient_role: 'Admins or owners only',
  not_found: 'Item not found',
}

type ItemRow = {
  _id: Id<'items'>
  title: string
  description: string | null
  createdAt: number
  createdBy: { _id: Id<'users'>; name: string | null; email: string }
}

export const Route = createFileRoute('/app/$orgSlug/items')({
  component: ItemsPage,
  head: () => ({ meta: [{ title: 'Items — albo' }] }),
})

function ItemsPage() {
  const { orgSlug } = Route.useParams()
  const org = useConvexQuery(api.organizations.bySlug, { slug: orgSlug })
  const items = useConvexQuery(
    api.items.list,
    org ? { orgId: org._id } : 'skip',
  )
  const createItem = useConvexMutation(api.items.create)
  const removeItem = useConvexMutation(api.items.remove)

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ItemRow | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<ItemRow | null>(null)

  const createForm = useForm({
    defaultValues: { title: '', description: '' },
    validators: { onChange: itemSchema, onSubmit: itemSchema },
    onSubmit: async ({ value, formApi }) => {
      if (!org) return
      setCreating(true)
      try {
        await createItem({
          orgId: org._id,
          title: value.title,
          description: value.description || undefined,
        })
        toast.success('Item created')
        formApi.reset()
      } catch (err) {
        const code = err instanceof ConvexError ? (err.data as string) : ''
        toast.error(errorMessages[code] ?? 'Could not create item')
      } finally {
        setCreating(false)
      }
    },
  })

  async function handleDelete() {
    if (!confirmDelete) return
    try {
      await removeItem({ itemId: confirmDelete._id })
      toast.success('Item deleted')
      setConfirmDelete(null)
    } catch (err) {
      const code = err instanceof ConvexError ? (err.data as string) : ''
      toast.error(errorMessages[code] ?? 'Could not delete')
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
        <p className="text-muted-foreground text-sm">
          Example resource scoped to this organization.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New item</CardTitle>
          <CardDescription>Anyone in the org can create.</CardDescription>
        </CardHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void createForm.handleSubmit()
          }}
        >
          <CardContent>
            <FieldGroup>
              <createForm.Field name="title">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={invalid || undefined}
                      />
                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </createForm.Field>
              <createForm.Field name="description">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        Description (optional)
                      </FieldLabel>
                      <textarea
                        id={field.name}
                        name={field.name}
                        rows={3}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={invalid || undefined}
                        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                      />
                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </createForm.Field>
              <Button type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create item'}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All items</CardTitle>
        </CardHeader>
        <CardContent>
          {!items ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items yet.</p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {items.map((i) => (
                <li key={i._id} className="space-y-1 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{i.title}</p>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(i)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDelete(i)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {i.description && (
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {i.description}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    by {i.createdBy.name ?? i.createdBy.email} ·{' '}
                    {new Date(i.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <EditDialog
        item={editing}
        onClose={() => setEditing(null)}
        onSaved={() => setEditing(null)}
      />

      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item?</DialogTitle>
            <DialogDescription>
              <strong>{confirmDelete?.title}</strong> will be permanently
              removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function EditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: ItemRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const updateItem = useConvexMutation(api.items.update)
  const [saving, setSaving] = useState(false)

  const form = useForm({
    defaultValues: {
      title: item?.title ?? '',
      description: item?.description ?? '',
    },
    validators: { onChange: itemSchema, onSubmit: itemSchema },
    onSubmit: async ({ value }) => {
      if (!item) return
      setSaving(true)
      try {
        await updateItem({
          itemId: item._id,
          title: value.title,
          description: value.description || undefined,
        })
        toast.success('Item updated')
        onSaved()
      } catch (err) {
        const code = err instanceof ConvexError ? (err.data as string) : ''
        toast.error(errorMessages[code] ?? 'Could not save')
      } finally {
        setSaving(false)
      }
    },
  })

  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="title">
              {(field) => {
                const invalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={`edit-${field.name}`}>
                      Title
                    </FieldLabel>
                    <Input
                      id={`edit-${field.name}`}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={invalid || undefined}
                    />
                    {invalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>
            <form.Field name="description">
              {(field) => {
                const invalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={`edit-${field.name}`}>
                      Description
                    </FieldLabel>
                    <textarea
                      id={`edit-${field.name}`}
                      rows={3}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                    />
                    {invalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
