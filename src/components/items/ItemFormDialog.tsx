import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation } from '@convex-dev/react-query'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'
import {
  Dialog,
  DialogContent,
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

export type EditableItem = {
  _id: Id<'items'>
  title: string
  description: string | null
}

export function ItemFormDialog({
  open,
  mode,
  item,
  orgId,
  onClose,
}: {
  open: boolean
  mode: 'create' | 'edit'
  item: EditableItem | null
  orgId: Id<'organizations'> | undefined
  onClose: () => void
}) {
  const createItem = useConvexMutation(api.items.create)
  const updateItem = useConvexMutation(api.items.update)
  const [saving, setSaving] = useState(false)

  const form = useForm({
    defaultValues: {
      title: item?.title ?? '',
      description: item?.description ?? '',
    },
    validators: { onChange: itemSchema, onSubmit: itemSchema },
    onSubmit: async ({ value, formApi }) => {
      setSaving(true)
      try {
        if (mode === 'create') {
          if (!orgId) return
          await createItem({
            orgId,
            title: value.title,
            description: value.description || undefined,
          })
          toast.success('Item created')
          formApi.reset()
        } else {
          if (!item) return
          await updateItem({
            itemId: item._id,
            title: value.title,
            description: value.description || undefined,
          })
          toast.success('Item updated')
        }
        onClose()
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
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New item' : 'Edit item'}
          </DialogTitle>
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
                    <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                    <Input
                      id={field.name}
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
                    <FieldLabel htmlFor={field.name}>
                      Description (optional)
                    </FieldLabel>
                    <textarea
                      id={field.name}
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
              {saving
                ? 'Saving…'
                : mode === 'create'
                  ? 'Create'
                  : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
