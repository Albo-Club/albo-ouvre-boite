import { useMemo, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { toast } from 'sonner'
import { ConvexError } from 'convex/values'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'
import { Check, X } from 'lucide-react'

import { api } from '../../../convex/_generated/api'
import { getI18n } from '~/lib/i18n'
import { getLocale } from '~/lib/locale'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'
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

const SLUG_RE = /^[a-z0-9-]{3,40}$/

export const Route = createFileRoute('/app/onboarding')({
  component: OnboardingPage,
  head: () => ({
    meta: [
      {
        title: getI18n(getLocale()).getFixedT(null, 'nav')(
          'onboarding.metaTitle',
        ),
      },
    ],
  }),
})

function OnboardingPage() {
  const navigate = useNavigate()
  const { t } = useTranslation(['nav', 'validation'])
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('validation:name.required')).max(80),
        slug: z.string().regex(SLUG_RE, t('validation:slug.pattern')),
      }),
    [t],
  )
  const create = useConvexMutation(api.organizations.create)
  const [loading, setLoading] = useState(false)

  const form = useForm({
    defaultValues: { name: '', slug: '' },
    validators: { onChange: schema, onSubmit: schema },
    onSubmit: async ({ value }) => {
      setLoading(true)
      try {
        const { slug } = await create(value)
        toast.success(t('nav:onboarding.created'))
        navigate({ to: '/app/$orgSlug', params: { orgSlug: slug } })
      } catch (err) {
        const code = err instanceof ConvexError ? (err.data as string) : ''
        const messages: Record<string, string> = {
          slug_taken: t('nav:onboarding.errors.slugTaken'),
          slug_reserved: t('nav:onboarding.errors.slugReserved'),
          invalid_slug: t('nav:onboarding.errors.invalidSlug'),
          invalid_name: t('nav:onboarding.errors.invalidName'),
        }
        toast.error(messages[code] ?? t('nav:onboarding.errors.couldNotCreate'))
      } finally {
        setLoading(false)
      }
    },
  })

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('nav:onboarding.title')}</CardTitle>
          <CardDescription>{t('nav:onboarding.description')}</CardDescription>
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
                      <FieldLabel htmlFor={field.name}>
                        {t('nav:onboarding.name')}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        placeholder={t('nav:onboarding.namePlaceholder')}
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
              <form.Field name="slug">
                {(field) => {
                  const invalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={invalid || undefined}>
                      <FieldLabel htmlFor={field.name}>
                        {t('nav:onboarding.slug')}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        placeholder={t('nav:onboarding.slugPlaceholder')}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(e.target.value.toLowerCase())
                        }
                        aria-invalid={invalid || undefined}
                      />
                      <FieldDescription>
                        {t('nav:onboarding.slugHintPrefix')}{' '}
                        <code>
                          /app/
                          {field.state.value ||
                            t('nav:onboarding.slugFallback')}
                        </code>
                      </FieldDescription>
                      <SlugAvailability slug={field.state.value} />
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
              {t('nav:onboarding.submit')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}

function SlugAvailability({ slug }: { slug: string }) {
  // Only query when the shape is valid — saves a roundtrip on every keystroke
  // while the user is mid-typing. Convex subscriptions are cheap but skipping
  // the obvious-invalid case keeps the UI calm.
  const { t } = useTranslation('nav')
  const shapeValid = SLUG_RE.test(slug)
  const result = useConvexQuery(
    api.organizations.checkSlug,
    shapeValid ? { slug } : 'skip',
  )

  if (!shapeValid) return null
  if (result === undefined) {
    return (
      <p
        className="text-muted-foreground flex items-center gap-1.5 text-xs"
        aria-live="polite"
      >
        <Spinner className="size-3" />
        {t('onboarding.availability.checking')}
      </p>
    )
  }
  if (result.available) {
    return (
      <p
        className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
        aria-live="polite"
      >
        <Check className="size-3.5" aria-hidden="true" />
        {t('onboarding.availability.available')}
      </p>
    )
  }
  const reasonText: Record<typeof result.reason, string> = {
    invalid: t('onboarding.availability.invalid'),
    reserved: t('onboarding.availability.reserved'),
    taken: t('onboarding.availability.taken'),
  }
  return (
    <p
      className="text-destructive flex items-center gap-1.5 text-xs"
      aria-live="polite"
    >
      <X className="size-3.5" aria-hidden="true" />
      {reasonText[result.reason]}
    </p>
  )
}
