import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../convex/_generated/api'
import { authClient } from '~/lib/auth-client'
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

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Too long'),
  avatarUrl: z.union([z.literal(''), z.url('Invalid URL')]),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'At least 8 characters'),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'New password must be different',
    path: ['newPassword'],
  })

export const Route = createFileRoute('/app/me')({
  component: ProfilePage,
  head: () => ({ meta: [{ title: 'Your profile — albo' }] }),
})

function ProfilePage() {
  const navigate = useNavigate()
  const me = useConvexQuery(api.users.me)
  const updateProfile = useConvexMutation(api.users.updateProfile)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const profileForm = useForm({
    defaultValues: { name: '', avatarUrl: '' },
    validators: { onChange: profileSchema, onSubmit: profileSchema },
    onSubmit: async ({ value }) => {
      setSavingProfile(true)
      try {
        await updateProfile({
          name: value.name,
          avatarUrl: value.avatarUrl || undefined,
        })
        await authClient.updateUser({
          name: value.name,
          image: value.avatarUrl || undefined,
        })
        toast.success('Profile updated')
      } catch (err) {
        const code = err instanceof ConvexError ? (err.data as string) : ''
        toast.error(code === 'invalid_name' ? 'Invalid name' : 'Could not save')
      } finally {
        setSavingProfile(false)
      }
    },
  })

  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '' },
    validators: { onChange: passwordSchema, onSubmit: passwordSchema },
    onSubmit: async ({ value, formApi }) => {
      setChangingPassword(true)
      const { error } = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: true,
      })
      setChangingPassword(false)
      if (error) {
        toast.error(error.message ?? 'Could not change password')
        return
      }
      toast.success('Password changed')
      formApi.reset()
    },
  })

  useEffect(() => {
    if (me?.kind === 'ready') {
      profileForm.reset({
        name: me.user.name ?? '',
        avatarUrl: me.user.avatarUrl ?? '',
      })
    }
  }, [me, profileForm])

  if (!me || me.kind !== 'ready') {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    )
  }

  async function handleSignOut() {
    setSigningOut(true)
    await authClient.signOut()
    navigate({ to: '/login' })
  }

  const backTo = me.user.lastOrgSlug ?? null

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your profile
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your account.
          </p>
        </div>
        {backTo ? (
          <Button asChild variant="outline">
            <Link to="/app/$orgSlug" params={{ orgSlug: backTo }}>
              ← Back
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/app">← Back</Link>
          </Button>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Name and avatar shown to teammates.</CardDescription>
        </CardHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void profileForm.handleSubmit()
          }}
        >
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" value={me.user.email} disabled />
                <FieldDescription>
                  Email changes aren&apos;t supported yet — contact support.
                </FieldDescription>
              </Field>

              <profileForm.Field name="name">
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
                        aria-invalid={invalid || undefined}
                      />
                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </profileForm.Field>

              <profileForm.Field name="avatarUrl">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>Avatar URL</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="url"
                        placeholder="https://…"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={invalid || undefined}
                      />
                      <FieldDescription>
                        Optional. Paste a public image URL.
                      </FieldDescription>
                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </profileForm.Field>

              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Other sessions will be signed out after a change.
          </CardDescription>
        </CardHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void passwordForm.handleSubmit()
          }}
        >
          <CardContent>
            <FieldGroup>
              <passwordForm.Field name="currentPassword">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        Current password
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        autoComplete="current-password"
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
              </passwordForm.Field>
              <passwordForm.Field name="newPassword">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        autoComplete="new-password"
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
              </passwordForm.Field>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? 'Changing…' : 'Change password'}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>End your current session.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
