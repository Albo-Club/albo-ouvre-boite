import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'

import { authClient } from '~/lib/auth-client'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { useRedirectWhenAuthenticated } from '~/lib/auth-state'
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

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  password: z.string().min(12, 'At least 12 characters'),
})

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/register')({
  component: RegisterPage,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: 'Create an account — albo' }] }),
})

function RegisterPage() {
  useRedirectWhenAuthenticated()
  const { redirect } = Route.useSearch()
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)

  const form = useForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onChange: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      setLoading(true)
      const { error } = await authClient.signUp.email(value)
      setLoading(false)
      if (error) {
        const code = classifyAuthError(error)
        // Anti-enumeration: surface the same "Check your inbox" screen
        // whether the email is fresh or already taken. The legitimate owner
        // can recover via /forgot-password; the attacker learns nothing.
        if (code === 'EMAIL_ALREADY_REGISTERED') {
          setSentTo(value.email)
          return
        }
        toast.error(formatAuthError(code, 'signup'))
        return
      }
      setSentTo(value.email)
    },
  })

  const isInviteFlow = redirect?.startsWith('/accept-invite/') ?? false

  const onResendVerification = async () => {
    if (!sentTo) return
    setResendLoading(true)
    const { error } = await authClient.sendVerificationEmail({
      email: sentTo,
      callbackURL: redirect ?? '/app',
    })
    setResendLoading(false)
    if (error) {
      const code = classifyAuthError(error)
      console.warn('[register-resend]', error.code ?? error.status, error.message)
      if (code === 'NETWORK' || code === 'RATE_LIMITED') {
        toast.error(formatAuthError(code, 'verify'))
        return
      }
      // Other errors: stay anti-enum, show the same neutral confirmation.
    }
    toast.success('If an account exists for that email, another link is on its way.')
  }

  if (sentTo) {
    return (
      <VerificationSentCard
        description={
          <>
            We sent a verification link to <strong>{sentTo}</strong>. Click it
            to confirm your email and sign in. The link expires in 1 hour.
            {isInviteFlow
              ? ' Your invitation will be ready right after.'
              : ''}
          </>
        }
        onResend={onResendVerification}
        resendLabel="Resend verification email"
        isResending={resendLoading}
        footer={
          <p className="text-muted-foreground text-sm">
            Didn't get it? Check spam, or{' '}
            <button
              type="button"
              className="underline"
              onClick={() => setSentTo(null)}
            >
              try a different email
            </button>
            .
          </p>
        }
      />
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            {isInviteFlow
              ? 'Create an account to accept your invitation.'
              : 'Start with email and password. We’ll email you a link to verify.'}
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
                        autoComplete="name"
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
              <form.Field
                name="password"
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
                  const isValidating = field.state.meta.isValidating
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
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
                            Checking against known data breaches…
                          </span>
                        ) : (
                          <>
                            Avoid passwords you&apos;ve used elsewhere. We check
                            against publicly leaked databases — only a short
                            hash prefix is sent, never your full password.
                          </>
                        )}
                      </FieldDescription>
                      <PasswordStrength
                        value={field.state.value}
                        userInputs={[
                          form.getFieldValue('email'),
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
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Spinner />}
              Sign up
            </Button>
            <p className="text-muted-foreground text-sm">
              Already have an account?{' '}
              <Link
                to="/login"
                search={redirect ? { redirect } : undefined}
                className="underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
