import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'

import { api } from '../../convex/_generated/api'
import { authClient } from '~/lib/auth-client'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
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

export const Route = createFileRoute('/accept-invite/$token')({
  component: AcceptInvitePage,
  head: () => ({ meta: [{ title: 'Accept invitation — albo' }] }),
})

type Preview = NonNullable<
  ReturnType<typeof useConvexQuery<typeof api.invitations.preview>>
>

function AcceptInvitePage() {
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
        toast.success('Invitation accepted')
        navigate({ to: '/app/$orgSlug', params: { orgSlug } })
      } catch (err) {
        const code = err instanceof ConvexError ? (err.data as string) : ''
        const messages: Record<string, string> = {
          not_found: 'This invitation does not exist',
          already_accepted: 'This invitation was already accepted',
          expired: 'This invitation has expired',
          email_mismatch:
            'This invitation was sent to a different email address',
        }
        setAcceptError(messages[code] ?? 'Could not accept this invitation.')
        triedAccept.current = false
      }
    })()
  }, [preview, authLoading, isAuthenticated, me, token, navigate, acceptMutation])

  if (!preview) return <LoadingCard message="Loading invitation…" />
  if (preview.kind === 'not_found') {
    return (
      <InfoCard
        title="Invitation not found"
        message="The link you used is invalid or has been revoked."
      />
    )
  }
  if (preview.kind === 'expired') {
    return (
      <InfoCard
        title="Invitation expired"
        message="Ask the person who invited you to send a fresh link."
      />
    )
  }
  if (preview.kind === 'already_accepted') {
    return (
      <InfoCard
        title="Already accepted"
        message="This invitation has already been used."
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
        message={acceptError ?? `Joining ${preview.orgName}…`}
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
  message = 'Loading…',
  error = false,
}: {
  message?: string
  error?: boolean
}) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{error ? 'Hold on' : 'One moment'}</CardTitle>
          <CardDescription>{message}</CardDescription>
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
  const [loading, setLoading] = useState(false)
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Wrong account</CardTitle>
          <CardDescription>
            <span className="block break-all">
              You're signed in as <strong>{currentEmail}</strong>.
            </span>
            <span className="mt-2 block break-all">
              This invitation is for <strong>{preview.email}</strong>.
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
            {loading ? 'Signing out…' : 'Sign out & switch account'}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}

const signInSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

function SignInToAccept({
  preview,
}: {
  preview: Extract<Preview, { kind: 'ok' }>
}) {
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
        toast.error(error.message ?? 'Sign in failed')
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
      toast.error(error.message ?? 'Could not send magic link')
      return
    }
    toast.success('Magic link sent — check your inbox.')
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join {preview.orgName}</CardTitle>
          <CardDescription>
            Sign in to <strong>{preview.email}</strong> to accept.
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
                <FieldLabel htmlFor="invite-email">Email</FieldLabel>
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
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <Input
                        id={field.name}
                        type="password"
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
              {loading ? 'Signing in…' : 'Accept invitation'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onMagicLink}
              disabled={magicLoading}
            >
              {magicLoading ? 'Sending…' : 'Email me a magic link'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}

const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'At least 8 characters'),
})

function SignUpToAccept({
  preview,
}: {
  preview: Extract<Preview, { kind: 'ok' }>
}) {
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
        toast.error(error.message ?? 'Sign up failed')
        return
      }
      setVerificationSent(true)
      // After verification click → useConvexAuth flips → auto-accept fires
    },
  })

  if (verificationSent) {
    return (
      <main className="flex min-h-svh items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Check your inbox</CardTitle>
            <CardDescription>
              We sent a verification link to <strong>{preview.email}</strong>.
              Click it to confirm your email — your invitation to{' '}
              <strong>{preview.orgName}</strong> will be accepted automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Join {preview.orgName}</CardTitle>
          <CardDescription>
            Set a name and password for <strong>{preview.email}</strong>. We’ll
            email a link to verify before you join.
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
                <FieldLabel htmlFor="invite-email">Email</FieldLabel>
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
                      <FieldLabel htmlFor={field.name}>Your name</FieldLabel>
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
              <form.Field name="password">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <Input
                        id={field.name}
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
              </form.Field>
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Accept invitation'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
