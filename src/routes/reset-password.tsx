import { useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { Check } from 'lucide-react'
import { z } from 'zod'
import { toast } from 'sonner'

import { authClient } from '~/lib/auth-client'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { isPasswordPwned } from '~/lib/hibp'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { PasswordInput } from '~/components/auth/password-input'
import { PasswordStrength } from '~/components/auth/password-strength'
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

const schema = z
  .object({
    newPassword: z.string().min(12, 'At least 12 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// Better Auth redirects here with ?token=... when the user clicks the email
// link. If `error` is present (e.g. INVALID_TOKEN) we surface it. Any other
// search param is ignored.
const searchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: 'Reset password — albo' }] }),
})

function ResetPasswordPage() {
  const { token, error } = Route.useSearch()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const form = useForm({
    defaultValues: { newPassword: '', confirmPassword: '' },
    validators: { onChange: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      if (!token) return
      setLoading(true)
      const { error: resetError } = await authClient.resetPassword({
        newPassword: value.newPassword,
        token,
      })
      setLoading(false)
      if (resetError) {
        toast.error(formatAuthError(classifyAuthError(resetError), 'reset'))
        return
      }
      toast.success('Password updated. Sign in with your new password.')
      navigate({ to: '/login' })
    },
  })

  if (!token || error) {
    return (
      <main className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Invalid or expired link</CardTitle>
            <CardDescription>
              This reset link is no longer valid. Request a new one to continue.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col gap-3">
            <Link
              to="/forgot-password"
              className="text-sm underline"
            >
              Send a new reset link
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
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>
            Pick something you haven't used before. At least 12 characters, and not one
            that has appeared in a known data breach.
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
              <form.Field
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
                      <PasswordStrength value={field.state.value} />
                      {invalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </form.Field>
              <form.Field name="confirmPassword">
                {(field) => (
                  <form.Subscribe
                    selector={(s) => ({
                      newPw: s.values.newPassword,
                      confirmPw: s.values.confirmPassword,
                    })}
                  >
                    {({ newPw, confirmPw }) => {
                      // Cross-field match feedback. Stays silent while the
                      // user is still typing (confirm shorter than new); kicks
                      // in once they've typed enough to potentially match.
                      const match =
                        newPw.length > 0 &&
                        confirmPw.length > 0 &&
                        newPw === confirmPw
                      const readyToCompare =
                        newPw.length > 0 && confirmPw.length >= newPw.length
                      const mismatch =
                        readyToCompare && confirmPw.length > 0 && !match
                      return (
                        <Field data-invalid={mismatch || undefined}>
                          <FieldLabel htmlFor={field.name}>
                            Confirm password
                          </FieldLabel>
                          <PasswordInput
                            id={field.name}
                            name={field.name}
                            autoComplete="new-password"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) =>
                              field.handleChange(e.target.value)
                            }
                            aria-invalid={mismatch || undefined}
                          />
                          {match && (
                            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <Check className="size-3.5" aria-hidden="true" />
                              Passwords match
                            </p>
                          )}
                          {mismatch && (
                            <p className="text-destructive text-xs">
                              Passwords do not match — they are case-sensitive,
                              check capitalization.
                            </p>
                          )}
                        </Field>
                      )
                    }}
                  </form.Subscribe>
                )}
              </form.Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Spinner />}
              Update password
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
