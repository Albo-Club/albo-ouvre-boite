import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'

import { authClient } from '~/lib/auth-client'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'
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
})

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
  head: () => ({ meta: [{ title: 'Forgot password — albo' }] }),
})

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)

  const form = useForm({
    defaultValues: { email: '' },
    validators: { onChange: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      setSubmitError(null)
      setLoading(true)
      const { error } = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: '/reset-password',
      })
      setLoading(false)
      if (error) {
        const code = classifyAuthError(error)
        console.warn('[forgot-password]', error.code ?? error.status, error.message)
        // NETWORK / RATE_LIMITED: surface inline so the user can retry rather
        // than think a link was sent when it wasn't.
        if (code === 'NETWORK' || code === 'RATE_LIMITED') {
          setSubmitError(formatAuthError(code, 'reset'))
          return
        }
        // Other errors stay anti-enum: fall through to the confirmation screen.
      }
      setSentTo(value.email)
    },
  })

  const onResend = async () => {
    if (!sentTo) return
    setResendLoading(true)
    const { error } = await authClient.requestPasswordReset({
      email: sentTo,
      redirectTo: '/reset-password',
    })
    setResendLoading(false)
    if (error) {
      const code = classifyAuthError(error)
      console.warn('[forgot-password-resend]', error.code ?? error.status, error.message)
      if (code === 'NETWORK' || code === 'RATE_LIMITED') {
        toast.error(formatAuthError(code, 'reset'))
        return
      }
    }
    toast.success('If an account exists for that email, another link is on its way.')
  }

  if (sentTo) {
    return (
      <main className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              If an account exists for <strong>{sentTo}</strong>, we just sent a
              link to reset the password. The link expires in 1 hour.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onResend}
              disabled={resendLoading}
            >
              {resendLoading && <Spinner />}
              Resend reset link
            </Button>
            <Link to="/login" className="text-sm underline">
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a link to reset it.
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
            {submitError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
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
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Spinner />}
              Send reset link
            </Button>
            <p className="text-muted-foreground text-sm">
              <Link to="/login" className="underline">
                Back to sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
