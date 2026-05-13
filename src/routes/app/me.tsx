import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../convex/_generated/api'
import { authClient } from '~/lib/auth-client'
import { isPasswordPwned } from '~/lib/hibp'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { PasswordInput } from '~/components/auth/password-input'
import { PasswordStrength } from '~/components/auth/password-strength'
import { ImageUpload } from '~/components/ImageUpload'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Too long'),
})

const emailSchema = z.object({
  newEmail: z.email('Invalid email'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(12, 'At least 12 characters'),
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

  const setMyAvatar = useConvexMutation(api.files.setMyAvatar)
  const removeMyAvatar = useConvexMutation(api.files.removeMyAvatar)
  const [sendingMagic, setSendingMagic] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const profileForm = useForm({
    defaultValues: { name: '' },
    validators: { onChange: profileSchema, onSubmit: profileSchema },
    onSubmit: async ({ value }) => {
      setSavingProfile(true)
      try {
        await updateProfile({ name: value.name })
        await authClient.updateUser({ name: value.name })
        toast.success('Profile updated')
      } catch (err) {
        const code = err instanceof ConvexError ? (err.data as string) : ''
        toast.error(code === 'invalid_name' ? 'Invalid name' : 'Could not save')
      } finally {
        setSavingProfile(false)
      }
    },
  })

  const emailForm = useForm({
    defaultValues: { newEmail: '' },
    validators: { onChange: emailSchema, onSubmit: emailSchema },
    onSubmit: async ({ value, formApi }) => {
      if (me?.kind !== 'ready') return
      if (value.newEmail.toLowerCase() === me.user.email.toLowerCase()) {
        toast.error('That is already your email')
        return
      }
      setSavingEmail(true)
      const { error } = await authClient.changeEmail({
        newEmail: value.newEmail,
        callbackURL: '/app',
      })
      setSavingEmail(false)
      if (error) {
        toast.error(error.message ?? 'Could not request email change')
        return
      }
      toast.success(
        `Confirmation sent to ${me.user.email}. Click the link to apply the change.`,
      )
      formApi.reset()
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
      profileForm.reset({ name: me.user.name ?? '' })
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

  async function handleMagicLink() {
    if (me?.kind !== 'ready') return
    setSendingMagic(true)
    const { error } = await authClient.signIn.magicLink({
      email: me.user.email,
      callbackURL: '/app',
    })
    setSendingMagic(false)
    if (error) {
      const msg = error.message ?? 'Could not send magic link'
      toast.error(/rate|slow/i.test(msg) ? 'Too many requests — wait a bit' : msg)
      return
    }
    toast.success(`Magic link sent to ${me.user.email}`)
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await authClient.deleteUser({ callbackURL: '/login' })
    setDeleting(false)
    if (error) {
      toast.error(error.message ?? 'Could not request deletion')
      return
    }
    toast.success(
      `Confirmation sent to ${me?.kind === 'ready' ? me.user.email : 'your email'}. Click the link to permanently delete.`,
    )
    setConfirmDelete(false)
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
                <FieldLabel>Avatar</FieldLabel>
                <ImageUpload
                  currentUrl={me.user.avatarUrl}
                  shape="circle"
                  onPicked={async (storageId) => {
                    await setMyAvatar({ storageId })
                  }}
                  onRemove={async () => {
                    await removeMyAvatar({})
                  }}
                />
                <FieldDescription>
                  PNG, JPEG, WEBP or GIF, up to 20 MB.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input id="email" value={me.user.email} disabled />
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

              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            We&apos;ll send a confirmation link to your current address.
          </CardDescription>
        </CardHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void emailForm.handleSubmit()
          }}
        >
          <CardContent>
            <FieldGroup>
              <emailForm.Field name="newEmail">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>New email</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        autoComplete="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={invalid || undefined}
                      />
                      <FieldDescription>
                        Your current email stays active until you click the
                        confirmation link.
                      </FieldDescription>
                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </emailForm.Field>
              <Button type="submit" disabled={savingEmail}>
                {savingEmail ? 'Sending…' : 'Send confirmation email'}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Magic link</CardTitle>
          <CardDescription>
            Get a one-tap sign-in link in your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleMagicLink}
            disabled={sendingMagic}
          >
            {sendingMagic ? 'Sending…' : 'Email me a magic link'}
          </Button>
        </CardContent>
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
                      <PasswordInput
                        id={field.name}
                        name={field.name}
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
              <passwordForm.Field
                name="newPassword"
                validators={{
                  onBlurAsync: async ({ value }) => {
                    if (!value || value.length < 12) return undefined
                    const { pwned } = await isPasswordPwned(value)
                    return pwned
                      ? {
                          message:
                            'This password has appeared in known data breaches. Pick another.',
                        }
                      : undefined
                  },
                }}
              >
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                      <PasswordInput
                        id={field.name}
                        name={field.name}
                        autoComplete="new-password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={invalid || undefined}
                      />
                      <PasswordStrength
                        value={field.state.value}
                        userInputs={[me.user.email, me.user.name ?? '']}
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

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Delete account</CardTitle>
          <CardDescription>
            Permanently remove your profile and all organization memberships.
            This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
          >
            Delete account…
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              We&apos;ll send a confirmation link to{' '}
              <strong>{me.user.email}</strong>. Click it to permanently delete
              your account. If you change your mind, ignore the email and
              nothing happens.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Sending…' : 'Send confirmation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
