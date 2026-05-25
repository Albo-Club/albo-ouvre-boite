import { useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { Trans, useTranslation } from 'react-i18next'
import { z } from 'zod'
import { toast } from 'sonner'

import { authClient } from '~/lib/auth-client'
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { useRedirectWhenAuthenticated } from '~/lib/auth-state'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'
import { PasswordInput } from '~/components/auth/password-input'
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: getI18n(getLocale()).getFixedT(null, 'auth')('signIn.metaTitle') }],
  }),
})

function LoginPage() {
  useRedirectWhenAuthenticated()
  const { t } = useTranslation(['auth', 'validation', 'errors'])
  const te = (k: string) => t(`errors:${k}`)
  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('validation:email.invalid')),
        password: z.string().min(1, t('validation:password.required')),
      }),
    [t],
  )
  const emailSchema = useMemo(() => z.email(t('validation:email.enterValid')), [t])
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onChange: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      setLoading(true)
      const { error } = await authClient.signIn.email(value)
      setLoading(false)
      if (error) {
        const code = classifyAuthError(error)
        if (code === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedEmail(value.email)
          return
        }
        setSubmitError(formatAuthError(code, 'signin', te))
        return
      }
      setUnverifiedEmail(null)
      if (redirect) window.location.replace(redirect)
      else navigate({ to: '/app' })
    },
  })

  const onResendVerification = async () => {
    if (!unverifiedEmail) return
    setResendLoading(true)
    const { error } = await authClient.sendVerificationEmail({
      email: unverifiedEmail,
      callbackURL: redirect ?? '/app',
    })
    setResendLoading(false)
    if (error) {
      toast.error(formatAuthError(classifyAuthError(error), 'verify', te))
      return
    }
    toast.success(t('auth:signIn.verificationResent'))
  }

  const onMagicLink = async () => {
    const email = form.getFieldValue('email')
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      form.setFieldMeta('email', (prev) => ({
        ...prev,
        errors: [{ message: t('validation:email.enterValid') }],
      }))
      return
    }
    setSubmitError(null)
    setMagicLoading(true)
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: redirect ?? '/app',
    })
    setMagicLoading(false)
    if (error) {
      const code = classifyAuthError(error)
      console.warn('[magic-link]', error.code ?? error.status, error.message)
      // NETWORK / RATE_LIMITED: surface so the user knows the link wasn't sent.
      // Other codes stay anti-enum and fall through to the neutral success toast.
      if (code === 'NETWORK' || code === 'RATE_LIMITED') {
        setSubmitError(formatAuthError(code, 'signin', te))
        return
      }
    }
    toast.success(t('auth:signIn.magicSent'))
  }

  const isInviteFlow = redirect?.startsWith('/accept-invite/') ?? false

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('auth:signIn.title')}</CardTitle>
          <CardDescription>
            {isInviteFlow
              ? t('auth:signIn.descriptionInvite')
              : t('auth:signIn.description')}
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
            {submitError && !unverifiedEmail && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            {unverifiedEmail && (
              <div className="border-border bg-muted/50 text-foreground mb-4 rounded-md border p-3 text-sm">
                <p className="mb-2">
                  <Trans
                    t={t}
                    i18nKey="auth:signIn.unverified"
                    values={{ email: unverifiedEmail }}
                  />
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading && <Spinner />}
                  {t('auth:signIn.resendVerification')}
                </Button>
              </div>
            )}
            <FieldGroup>
              <form.Field name="email">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        {t('auth:fields.email')}
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
                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </form.Field>
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
              {t('auth:signIn.submit')}
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
            <Link
              to="/forgot-password"
              className="text-muted-foreground text-sm underline"
            >
              {t('auth:signIn.forgot')}
            </Link>
            <p className="text-muted-foreground text-sm">
              <Trans
                t={t}
                i18nKey="auth:signIn.noAccount"
                components={{
                  signup: (
                    <Link
                      to="/register"
                      search={redirect ? { redirect } : undefined}
                      className="underline"
                    />
                  ),
                }}
              />
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
