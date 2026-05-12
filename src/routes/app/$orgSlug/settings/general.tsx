import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Field,
  FieldDescription,
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

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Too long'),
  logoUrl: z.union([z.literal(''), z.url('Invalid URL')]),
})

export const Route = createFileRoute('/app/$orgSlug/settings/general')({
  component: GeneralSettings,
})

function GeneralSettings() {
  const { orgSlug } = Route.useParams()
  const me = useConvexQuery(api.users.me)
  const org = useConvexQuery(api.organizations.bySlug, { slug: orgSlug })
  const update = useConvexMutation(api.organizations.updateGeneral)
  const [saving, setSaving] = useState(false)

  const role =
    me?.kind === 'ready'
      ? me.orgs.find((o) => o.slug === orgSlug)?.role
      : undefined
  const canManage = role === 'admin' || role === 'owner'

  const form = useForm({
    defaultValues: { name: '', logoUrl: '' },
    validators: { onChange: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      if (!org) return
      setSaving(true)
      try {
        await update({
          orgId: org._id,
          name: value.name,
          logoUrl: value.logoUrl || undefined,
        })
        toast.success('Organization updated')
      } catch (err) {
        const code = err instanceof ConvexError ? (err.data as string) : ''
        toast.error(
          code === 'insufficient_role'
            ? 'Admins or owners only'
            : code === 'invalid_name'
              ? 'Invalid name'
              : 'Could not save',
        )
      } finally {
        setSaving(false)
      }
    },
  })

  useEffect(() => {
    if (org) {
      form.reset({ name: org.name, logoUrl: org.logoUrl ?? '' })
    }
  }, [org, form])

  if (!org) {
    return <p className="text-muted-foreground text-sm">Loading…</p>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Name and logo of your organization.</CardDescription>
      </CardHeader>
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          void form.handleSubmit()
        }}
      >
        <CardContent>
          <FieldGroup>
            <form.Field name="name">
              {(field) => {
                const invalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={!canManage}
                      aria-invalid={invalid || undefined}
                    />
                    {invalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>

            <Field>
              <FieldLabel htmlFor="slug">Slug</FieldLabel>
              <Input id="slug" value={org.slug} disabled />
              <FieldDescription>
                The slug is permanent — it appears in URLs.
              </FieldDescription>
            </Field>

            <form.Field name="logoUrl">
              {(field) => {
                const invalid =
                  field.state.meta.isTouched && !field.state.meta.isValid
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Logo URL</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="url"
                      placeholder="https://…"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled={!canManage}
                      aria-invalid={invalid || undefined}
                    />
                    <FieldDescription>
                      Optional. Paste a public image URL.
                    </FieldDescription>
                    {invalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                )
              }}
            </form.Field>

            {canManage && (
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            )}
          </FieldGroup>
        </CardContent>
      </form>
    </Card>
  )
}
