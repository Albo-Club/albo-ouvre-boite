import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../convex/_generated/api'
import { authClient } from '~/lib/auth-client'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { isPasswordPwned } from '~/lib/hibp'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Skeleton } from '~/components/ui/skeleton'
import { Spinner } from '~/components/ui/spinner'
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '~/components/ui/tabs'
import { ActiveSessions } from '~/components/auth/active-sessions'

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
  const notifyPasswordChanged = useConvexMutation(
    api.notifications.notifyPasswordChanged,
  )
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
        toast.error(formatAuthError(classifyAuthError(error), 'change'))
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
        toast.error(formatAuthError(classifyAuthError(error), 'change'))
        return
      }
      // Fire-and-forget: post-event notification email. Never await — a
      // notification failure must not surface as a password-change failure.
      notifyPasswordChanged({}).catch((err) => {
        console.warn('[notifyPasswordChanged]', err)
      })
      toast.success('Password changed. Other sessions have been signed out.')
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
      <main className="mx-auto max-w-2xl space-y-6 p-6">
        <header className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-20" />
        </header>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
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
      toast.error(formatAuthError(classifyAuthError(error), 'signin'))
      return
    }
    toast.success(`Magic link sent to ${me.user.email}`)
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await authClient.deleteUser({ callbackURL: '/login' })
    setDeleting(false)
    if (error) {
      toast.error(formatAuthError(classifyAuthError(error), 'change'))
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

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
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
                {savingProfile && <Spinner />}
                Save changes
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
                {savingEmail && <Spinner />}
                Send confirmation email
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

        </TabsContent>

        <TabsContent value="security" className="space-y-6">
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
            {sendingMagic && <Spinner />}
            Email me a magic link
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
                      <FieldDescription>
                        Avoid passwords you&apos;ve used elsewhere. The meter
                        below shows real-time strength.
                      </FieldDescription>
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
                {changingPassword && <Spinner />}
                Change password
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
            {signingOut && <Spinner />}
            Sign out
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

        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active sessions</CardTitle>
              <CardDescription>
                Devices currently signed in to your account. Revoke any that
                you don&apos;t recognize.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActiveSessions />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              {deleting && <Spinner />}
              Send confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
