import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { Trans, useTranslation } from 'react-i18next'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'

import { api } from '../../../convex/_generated/api'
import { authClient } from '~/lib/auth-client'
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'
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
import { LinkedAccounts } from '~/components/auth/linked-accounts'

export const Route = createFileRoute('/app/me')({
  component: ProfilePage,
  head: () => ({
    meta: [
      {
        title: `${getI18n(getLocale()).getFixedT(null, 'account')('page.title')} — albo`,
      },
    ],
  }),
})

function ProfilePage() {
  const { t } = useTranslation(['account', 'validation', 'errors', 'common'])
  const te = (k: string) => t(`errors:${k}`)
  const profileSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, t('validation:name.required'))
          .max(80, t('validation:name.tooLong')),
      }),
    [t],
  )
  const emailSchema = useMemo(
    () => z.object({ newEmail: z.email(t('validation:email.invalid')) }),
    [t],
  )
  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(1, t('validation:required')),
          newPassword: z.string().min(12, t('validation:password.min12')),
        })
        .refine((v) => v.currentPassword !== v.newPassword, {
          message: t('validation:password.different'),
          path: ['newPassword'],
        }),
    [t],
  )
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
        toast.success(t('account:profile.updated'))
      } catch (err) {
        const code = err instanceof ConvexError ? (err.data as string) : ''
        toast.error(
          code === 'invalid_name'
            ? t('account:profile.invalidName')
            : t('account:profile.couldNotSave'),
        )
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
        toast.error(t('account:email.alreadyYours'))
        return
      }
      setSavingEmail(true)
      const { error } = await authClient.changeEmail({
        newEmail: value.newEmail,
        callbackURL: '/app',
      })
      setSavingEmail(false)
      if (error) {
        toast.error(formatAuthError(classifyAuthError(error), 'change', te))
        return
      }
      toast.success(
        t('account:email.confirmationSent', { email: me.user.email }),
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
        toast.error(formatAuthError(classifyAuthError(error), 'change', te))
        return
      }
      // Fire-and-forget: post-event notification email. Never await — a
      // notification failure must not surface as a password-change failure.
      notifyPasswordChanged({}).catch((err) => {
        console.warn('[notifyPasswordChanged]', err)
      })
      toast.success(t('account:password.changed'))
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
      toast.error(formatAuthError(classifyAuthError(error), 'signin', te))
      return
    }
    toast.success(t('account:magic.sent', { email: me.user.email }))
  }

  async function handleDelete() {
    setDeleting(true)
    const { error } = await authClient.deleteUser({ callbackURL: '/login' })
    setDeleting(false)
    if (error) {
      toast.error(formatAuthError(classifyAuthError(error), 'change', te))
      return
    }
    toast.success(
      t('account:danger.confirmationSent', {
        email: me?.kind === 'ready' ? me.user.email : 'your email',
      }),
    )
    setConfirmDelete(false)
  }

  const backTo = me.user.lastOrgSlug ?? null

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('account:page.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('account:page.subtitle')}
          </p>
        </div>
        {backTo ? (
          <Button asChild variant="outline">
            <Link to="/app/$orgSlug" params={{ orgSlug: backTo }}>
              {t('account:page.back')}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link to="/app">{t('account:page.back')}</Link>
          </Button>
        )}
      </header>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            {t('account:page.tabs.profile')}
          </TabsTrigger>
          <TabsTrigger value="security">
            {t('account:page.tabs.security')}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            {t('account:page.tabs.sessions')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('account:profile.title')}</CardTitle>
          <CardDescription>{t('account:profile.description')}</CardDescription>
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
                <FieldLabel>{t('account:profile.avatar')}</FieldLabel>
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
                  {t('account:profile.avatarHint')}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="email">
                  {t('account:profile.email')}
                </FieldLabel>
                <Input id="email" value={me.user.email} disabled />
              </Field>

              <profileForm.Field name="name">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        {t('account:profile.name')}
                      </FieldLabel>
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
                {t('account:profile.save')}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('account:email.title')}</CardTitle>
          <CardDescription>{t('account:email.description')}</CardDescription>
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
                      <FieldLabel htmlFor={field.name}>
                        {t('account:email.newEmail')}
                      </FieldLabel>
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
                        {t('account:email.hint')}
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
                {t('account:email.send')}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

        </TabsContent>

        <TabsContent value="security" className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('account:magic.title')}</CardTitle>
          <CardDescription>{t('account:magic.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleMagicLink}
            disabled={sendingMagic}
          >
            {sendingMagic && <Spinner />}
            {t('account:magic.send')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('account:connected.title')}</CardTitle>
          <CardDescription>{t('account:connected.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LinkedAccounts />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('account:password.title')}</CardTitle>
          <CardDescription>{t('account:password.description')}</CardDescription>
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
                        {t('account:password.current')}
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
                      ? { message: t('validation:password.pwned') }
                      : undefined
                  },
                }}
              >
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        {t('account:password.new')}
                      </FieldLabel>
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
                        {t('account:password.hint')}
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
                {t('account:password.change')}
              </Button>
            </FieldGroup>
          </CardContent>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('account:signout.title')}</CardTitle>
          <CardDescription>{t('account:signout.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut && <Spinner />}
            {t('account:signout.action')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">
            {t('account:danger.title')}
          </CardTitle>
          <CardDescription>{t('account:danger.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={deleting}
          >
            {t('account:danger.action')}
          </Button>
        </CardContent>
      </Card>

        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('account:activeSessions.title')}</CardTitle>
              <CardDescription>
                {t('account:activeSessions.description')}
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
            <DialogTitle>{t('account:danger.dialogTitle')}</DialogTitle>
            <DialogDescription>
              <Trans
                t={t}
                i18nKey="account:danger.dialogDescription"
                values={{ email: me.user.email }}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Spinner />}
              {t('account:danger.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
