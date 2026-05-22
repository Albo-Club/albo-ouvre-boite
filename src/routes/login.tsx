import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'

import { authClient } from '~/lib/auth-client'
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

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

const emailSchema = z.email('Enter a valid email first')

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: 'Sign in — albo' }] }),
})

function LoginPage() {
  useRedirectWhenAuthenticated()
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
        setSubmitError(formatAuthError(code, 'signin'))
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
      toast.error(formatAuthError(classifyAuthError(error), 'verify'))
      return
    }
    toast.success('Verification email sent — check your inbox.')
  }

  const onMagicLink = async () => {
    const email = form.getFieldValue('email')
    const parsed = emailSchema.safeParse(email)
    if (!parsed.success) {
      form.setFieldMeta('email', (prev) => ({
        ...prev,
        errors: [{ message: 'Enter a valid email first' }],
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
        setSubmitError(formatAuthError(code, 'signin'))
        return
      }
    }
    toast.success('If an account exists for that email, a link is on its way.')
  }

  const isInviteFlow = redirect?.startsWith('/accept-invite/') ?? false

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {isInviteFlow
              ? 'Sign in to continue accepting your invitation. New here? Create an account below.'
              : 'Email + password, or magic link.'}
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
                  Email <strong>{unverifiedEmail}</strong> isn't verified yet.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading && <Spinner />}
                  Resend verification email
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
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
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
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
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
              Sign in
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onMagicLink}
              disabled={magicLoading}
            >
              {magicLoading && <Spinner />}
              Email me a magic link
            </Button>
            <Link
              to="/forgot-password"
              className="text-muted-foreground text-sm underline"
            >
              Forgot your password?
            </Link>
            <p className="text-muted-foreground text-sm">
              No account?{' '}
              <Link
                to="/register"
                search={redirect ? { redirect } : undefined}
                className="underline"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
