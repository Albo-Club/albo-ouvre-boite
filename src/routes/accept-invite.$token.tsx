import { useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'
import { useForm } from '@tanstack/react-form'
import { Trans, useTranslation } from 'react-i18next'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'

import { api } from '../../convex/_generated/api'
import { authClient } from '~/lib/auth-client'
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { isPasswordPwned } from '~/lib/hibp'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'
import { PasswordInput } from '~/components/auth/password-input'
import { PasswordStrength } from '~/components/auth/password-strength'
import { VerificationSentCard } from '~/components/auth/verification-sent'
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

export const Route = createFileRoute('/accept-invite/$token')({
  component: AcceptInvitePage,
  head: () => ({
    meta: [
      {
        title: getI18n(getLocale()).getFixedT(
          null,
          'auth',
        )('acceptInvite.metaTitle'),
      },
    ],
  }),
})

type Preview = NonNullable<
  ReturnType<typeof useConvexQuery<typeof api.invitations.preview>>
>

function AcceptInvitePage() {
  const { t } = useTranslation('auth')
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth()
  const preview = useConvexQuery(api.invitations.preview, { token })
  const me = useConvexQuery(api.users.me, isAuthenticated ? {} : 'skip')
  const acceptMutation = useConvexMutation(api.invitations.accept)
  const triedAccept = useRef(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  useEffect(() => {
    if (!preview || preview.kind !== 'ok') return
    if (authLoading || !isAuthenticated) return
    if (me?.kind !== 'ready' && me?.kind !== 'unprovisioned') return
    const myEmail = me.kind === 'ready' ? me.user.email : null
    if (myEmail && myEmail.toLowerCase() !== preview.email.toLowerCase()) return
    if (triedAccept.current) return
    triedAccept.current = true
    ;(async () => {
      try {
        const { orgSlug } = await acceptMutation({ token })
        toast.success(t('acceptInvite.accepted'))
        navigate({ to: '/app/$orgSlug', params: { orgSlug } })
      } catch (err) {
        const code = err instanceof ConvexError ? (err.data as string) : ''
        const known = ['not_found', 'already_accepted', 'expired', 'email_mismatch']
        setAcceptError(
          known.includes(code)
            ? t(`acceptInvite.errors.${code}`)
            : t('acceptInvite.errors.generic'),
        )
        triedAccept.current = false
      }
    })()
  }, [preview, authLoading, isAuthenticated, me, token, navigate, acceptMutation])

  if (!preview)
    return <LoadingCard message={t('acceptInvite.loadingInvitation')} />
  if (preview.kind === 'not_found') {
    return (
      <InfoCard
        title={t('acceptInvite.notFound.title')}
        message={t('acceptInvite.notFound.message')}
      />
    )
  }
  if (preview.kind === 'expired') {
    return (
      <InfoCard
        title={t('acceptInvite.expired.title')}
        message={t('acceptInvite.expired.message')}
      />
    )
  }
  if (preview.kind === 'already_accepted') {
    return (
      <InfoCard
        title={t('acceptInvite.alreadyAccepted.title')}
        message={t('acceptInvite.alreadyAccepted.message')}
      />
    )
  }

  if (authLoading) return <LoadingCard />

  if (isAuthenticated) {
    if (me?.kind !== 'ready' && me?.kind !== 'unprovisioned') {
      return <LoadingCard />
    }
    const myEmail = me.kind === 'ready' ? me.user.email : null
    const isMismatch =
      myEmail && myEmail.toLowerCase() !== preview.email.toLowerCase()
    if (isMismatch) {
      return <SwitchAccountCard preview={preview} currentEmail={myEmail} />
    }
    return (
      <LoadingCard
        message={
          acceptError ?? t('acceptInvite.joining', { orgName: preview.orgName })
        }
        error={!!acceptError}
      />
    )
  }

  return preview.accountExists ? (
    <SignInToAccept preview={preview} />
  ) : (
    <SignUpToAccept preview={preview} />
  )
}

function LoadingCard({
  message,
  error = false,
}: {
  message?: string
  error?: boolean
}) {
  const { t } = useTranslation(['auth', 'common'])
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {error ? t('auth:acceptInvite.holdOn') : t('auth:acceptInvite.oneMoment')}
          </CardTitle>
          <CardDescription>
            {message ?? t('common:loadingEllipsis')}
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  )
}

function InfoCard({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  )
}

function SwitchAccountCard({
  preview,
  currentEmail,
}: {
  preview: Extract<Preview, { kind: 'ok' }>
  currentEmail: string
}) {
  const { t } = useTranslation('auth')
  const [loading, setLoading] = useState(false)
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('acceptInvite.wrongAccount.title')}</CardTitle>
          <CardDescription>
            <span className="block break-all">
              <Trans
                t={t}
                i18nKey="acceptInvite.wrongAccount.signedInAs"
                values={{ email: currentEmail }}
              />
            </span>
            <span className="mt-2 block break-all">
              <Trans
                t={t}
                i18nKey="acceptInvite.wrongAccount.invitationFor"
                values={{ email: preview.email }}
              />
            </span>
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-3">
          <Button
            className="w-full"
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              await authClient.signOut()
              window.location.reload()
            }}
          >
            {loading && <Spinner />}
            {t('acceptInvite.wrongAccount.switch')}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

function SignInToAccept({
  preview,
}: {
  preview: Extract<Preview, { kind: 'ok' }>
}) {
  const { t } = useTranslation(['auth', 'validation', 'errors'])
  const te = (k: string) => t(`errors:${k}`)
  const signInSchema = useMemo(
    () =>
      z.object({
        password: z.string().min(1, t('validation:password.required')),
      }),
    [t],
  )
  const [loading, setLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)

  const form = useForm({
    defaultValues: { password: '' },
    validators: { onChange: signInSchema, onSubmit: signInSchema },
    onSubmit: async ({ value }) => {
      setLoading(true)
      const { error } = await authClient.signIn.email({
        email: preview.email,
        password: value.password,
      })
      setLoading(false)
      if (error) {
        toast.error(formatAuthError(classifyAuthError(error), 'signin', te))
        return
      }
      // useConvexAuth flips → auto-accept effect fires in parent
    },
  })

  const onMagicLink = async () => {
    setMagicLoading(true)
    const { error } = await authClient.signIn.magicLink({
      email: preview.email,
      callbackURL: window.location.pathname,
    })
    setMagicLoading(false)
    if (error) {
      toast.error(formatAuthError(classifyAuthError(error), 'signin', te))
      return
    }
    toast.success(t('auth:magic.sentInbox'))
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {t('auth:acceptInvite.join', { orgName: preview.orgName })}
          </CardTitle>
          <CardDescription>
            <Trans
              t={t}
              i18nKey="auth:acceptInvite.signInDescription"
              values={{ email: preview.email }}
            />
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
              <Field>
                <FieldLabel htmlFor="invite-email">
                  {t('auth:fields.email')}
                </FieldLabel>
                <Input
                  id="invite-email"
                  type="email"
                  value={preview.email}
                  readOnly
                  disabled
                />
              </Field>
              <form.Field name="password">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        {t('auth:fields.password')}
                      </FieldLabel>
                      <PasswordInput
                        id={field.name}
                        name={field.name}
                        autoComplete="current-password"
                        autoFocus
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
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Spinner />}
              {t('auth:acceptInvite.accept')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onMagicLink}
              disabled={magicLoading}
            >
              {magicLoading && <Spinner />}
              {t('auth:signIn.magicLink')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}

function SignUpToAccept({
  preview,
}: {
  preview: Extract<Preview, { kind: 'ok' }>
}) {
  const { t } = useTranslation(['auth', 'validation', 'errors'])
  const te = (k: string) => t(`errors:${k}`)
  const signUpSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('validation:name.required')),
        password: z.string().min(12, t('validation:password.min12')),
      }),
    [t],
  )
  const [loading, setLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  const form = useForm({
    defaultValues: { name: '', password: '' },
    validators: { onChange: signUpSchema, onSubmit: signUpSchema },
    onSubmit: async ({ value }) => {
      setLoading(true)
      const { error } = await authClient.signUp.email({
        email: preview.email,
        password: value.password,
        name: value.name,
      })
      setLoading(false)
      if (error) {
        toast.error(formatAuthError(classifyAuthError(error), 'signup', te))
        return
      }
      setVerificationSent(true)
      // After verification click → useConvexAuth flips → auto-accept fires
    },
  })

  if (verificationSent) {
    return (
      <VerificationSentCard
        description={
          <Trans
            t={t}
            i18nKey="auth:acceptInvite.verifyDescription"
            values={{ email: preview.email, orgName: preview.orgName }}
          />
        }
      />
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {t('auth:acceptInvite.join', { orgName: preview.orgName })}
          </CardTitle>
          <CardDescription>
            <Trans
              t={t}
              i18nKey="auth:acceptInvite.signUpDescription"
              values={{ email: preview.email }}
            />
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
              <Field>
                <FieldLabel htmlFor="invite-email">
                  {t('auth:fields.email')}
                </FieldLabel>
                <Input
                  id="invite-email"
                  type="email"
                  value={preview.email}
                  readOnly
                  disabled
                />
              </Field>
              <form.Field name="name">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        {t('auth:fields.yourName')}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        autoComplete="name"
                        autoFocus
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
              <form.Field
                name="password"
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
                  const isValidating = field.state.meta.isValidating
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        {t('auth:fields.password')}
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
                        {isValidating ? (
                          <span
                            className="flex items-center gap-1.5"
                            aria-live="polite"
                          >
                            <Spinner className="size-3" />
                            {t('auth:password.checking')}
                          </span>
                        ) : (
                          t('auth:password.hint')
                        )}
                      </FieldDescription>
                      <PasswordStrength
                        value={field.state.value}
                        userInputs={[
                          preview.email,
                          form.getFieldValue('name'),
                        ]}
                      />
                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </form.Field>
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Spinner />}
              {t('auth:acceptInvite.accept')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
