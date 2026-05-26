import { useState } from 'react'
import { useConvexQuery } from '@convex-dev/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { api } from '../../../convex/_generated/api'
import { authClient } from '~/lib/auth-client'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'
import { Spinner } from '~/components/ui/spinner'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

/**
 * Renders the social sign-in buttons + the "or continue with" divider as one
 * unit. Returns `null` when no provider is configured (template default), so
 * pages can drop it in unconditionally without an orphan divider. Provider
 * availability comes from `api.publicConfig.enabledSocialProviders`, the single
 * source of truth (credentials live in the Convex env).
 */
export function SocialAuthButtons({ redirect }: { redirect?: string }) {
  const { t } = useTranslation('auth')
  const providers = useConvexQuery(api.publicConfig.enabledSocialProviders, {})
  const [loading, setLoading] = useState(false)

  if (providers === undefined) {
    return <Skeleton className="h-9 w-full rounded-md" />
  }

  if (!providers.google) return null

  const onGoogle = async () => {
    setLoading(true)
    const { error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: redirect ?? '/app',
      errorCallbackURL: '/login',
    })
    // On success the browser redirects to Google; we only reach here on error.
    if (error) {
      setLoading(false)
      toast.error(t('social.error'))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => void onGoogle()}
        disabled={loading}
      >
        {loading ? <Spinner /> : <GoogleIcon />}
        {t('social.google')}
      </Button>
      <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
        <span className="bg-card text-muted-foreground relative z-10 px-2">
          {t('social.divider')}
        </span>
      </div>
    </div>
  )
}
