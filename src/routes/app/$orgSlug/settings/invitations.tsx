import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../../../convex/_generated/api'
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

const KNOWN_INVITE_ERRORS = [
  'already_invited',
  'invalid_email',
  'insufficient_role',
  'not_a_member',
  'rate_limited',
]

function errorCode(err: unknown): string | null {
  if (!(err instanceof ConvexError)) return null
  const data = err.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object' && 'code' in data) {
    return (data as { code: string }).code
  }
  return null
}

export const Route = createFileRoute('/app/$orgSlug/settings/invitations')({
  component: InvitationsSettings,
})

function InvitationsSettings() {
  const { t } = useTranslation(['settings', 'validation', 'common'])
  const inviteSchema = useMemo(
    () =>
      z.object({
        email: z.email(t('validation:email.invalid')),
        role: z.enum(['member', 'admin']),
      }),
    [t],
  )
  const { orgSlug } = Route.useParams()
  const me = useConvexQuery(api.users.me)
  const org = useConvexQuery(api.organizations.bySlug, { slug: orgSlug })
  const role =
    me?.kind === 'ready'
      ? me.orgs.find((o) => o.slug === orgSlug)?.role
      : undefined
  const canInvite = role === 'admin' || role === 'owner'
  const pending = useConvexQuery(
    api.invitations.listForOrg,
    org && canInvite ? { orgId: org._id } : 'skip',
  )
  const createInvite = useConvexMutation(api.invitations.create)
  const revokeInvite = useConvexMutation(api.invitations.revoke)
  const [sending, setSending] = useState(false)

  const form = useForm({
    defaultValues: { email: '', role: 'member' as 'member' | 'admin' },
    validators: { onChange: inviteSchema, onSubmit: inviteSchema },
    onSubmit: async ({ value, formApi }) => {
      if (!org) return
      setSending(true)
      try {
        await createInvite({ orgId: org._id, ...value })
        toast.success(t('settings:invitations.sent', { email: value.email }))
        formApi.reset()
      } catch (err) {
        const code = errorCode(err) ?? ''
        toast.error(
          t(
            KNOWN_INVITE_ERRORS.includes(code)
              ? `settings:invitations.errors.${code}`
              : 'settings:invitations.errors.default',
          ),
        )
      } finally {
        setSending(false)
      }
    },
  })

  if (!canInvite) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:invitations.noAccessTitle')}</CardTitle>
          <CardDescription>
            {t('settings:invitations.noAccessDescription')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings:invitations.inviteTitle')}</CardTitle>
          <CardDescription>
            {t('settings:invitations.inviteDescription')}
          </CardDescription>
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
              <form.Field name="email">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        {t('settings:invitations.email')}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
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
              </form.Field>
              <form.Field name="role">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {t('settings:invitations.role')}
                    </FieldLabel>
                    <select
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value as 'member' | 'admin',
                        )
                      }
                      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="member">
                        {t('common:roles.member')}
                      </option>
                      <option value="admin">{t('common:roles.admin')}</option>
                    </select>
                  </Field>
                )}
              </form.Field>
              <Button type="submit" disabled={sending}>
                {sending
                  ? t('settings:invitations.sending')
                  : t('settings:invitations.send')}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings:invitations.pendingTitle')}</CardTitle>
          <CardDescription>
            {t('settings:invitations.pendingDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!pending ? (
            <p className="text-muted-foreground text-sm">
              {t('settings:invitations.loading')}
            </p>
          ) : pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('settings:invitations.empty')}
            </p>
          ) : (
            <ul className="divide-border divide-y text-sm">
              {pending.map((inv) => (
                <li
                  key={inv._id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.email}</p>
                    <p className="text-muted-foreground text-xs">
                      {t('settings:invitations.expiresOn', {
                        role: t(`common:roles.${inv.role}`),
                        date: new Date(inv.expiresAt).toLocaleDateString(),
                      })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await revokeInvite({ invitationId: inv._id })
                        toast.success(t('settings:invitations.revoked'))
                      } catch {
                        toast.error(t('settings:invitations.revokeFailed'))
                      }
                    }}
                  >
                    {t('settings:invitations.revoke')}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
