import { useEffect, useState } from 'react'
import { KeyRound, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { TFunction } from 'i18next'

import { authClient } from '~/lib/auth-client'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { Button } from '~/components/ui/button'
import { Skeleton } from '~/components/ui/skeleton'

type BaAccount = {
  id: string
  providerId: string
  accountId?: string
  createdAt?: string | Date
}

// Providers we plan to wire when OAuth ships (Phase 3, ~3 months out).
// Keep the scaffolding here so the OAuth PR only flips `enabled` and adds
// `socialProviders` to convex/auth.ts — no UI rewrite needed.
type ProviderDef = {
  id: 'google' | 'github' | 'apple'
  label: string
  // No icons in this scaffold to avoid pulling in brand SVGs ahead of need.
}
const FUTURE_PROVIDERS: Array<ProviderDef> = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
  { id: 'apple', label: 'Apple' },
]

function describeProvider(
  id: string,
  t: TFunction<['account', 'errors']>,
): { label: string; Icon: typeof Mail } {
  switch (id) {
    case 'credential':
      return { label: t('account:linked.emailPassword'), Icon: KeyRound }
    case 'email':
      return { label: t('account:linked.magicLink'), Icon: Mail }
    default:
      return {
        label: id.charAt(0).toUpperCase() + id.slice(1),
        Icon: KeyRound,
      }
  }
}

/**
 * Lists Better Auth accounts linked to the current user (e.g. `credential`
 * for password, plus future OAuth providers). Scaffolded so the upcoming
 * OAuth PR (Google/GitHub/Apple) only needs to enable `socialProviders` in
 * `convex/auth.ts` — the UI here already shows the "available to connect"
 * placeholders.
 */
export function LinkedAccounts() {
  const { t } = useTranslation(['account', 'errors'])
  const [accounts, setAccounts] = useState<Array<BaAccount> | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const { data, error } = await authClient.listAccounts()
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- `alive` is flipped by cleanup across the await
      if (!alive) return
      if (error) {
        toast.error(
          formatAuthError(classifyAuthError(error), 'signin', (k) =>
            t(`errors:${k}`),
          ),
        )
        setAccounts([])
        return
      }
      setAccounts(data)
    })()
    return () => {
      alive = false
    }
  }, [])

  if (accounts === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-md" />
        <Skeleton className="h-14 w-full rounded-md" />
      </div>
    )
  }

  const linkedProviderIds = new Set(accounts.map((a) => a.providerId))

  return (
    <div className="space-y-4">
      {accounts.length > 0 && (
        <ul className="divide-border divide-y rounded-md border">
          {accounts.map((a) => {
            const { label, Icon } = describeProvider(a.providerId, t)
            return (
              <li key={a.id} className="flex items-center gap-4 p-4">
                <Icon className="text-muted-foreground size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{label}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {t('account:linked.connected')}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
          {t('account:linked.connectMore')}
        </p>
        <ul className="divide-border divide-y rounded-md border">
          {FUTURE_PROVIDERS.map((p) => {
            const alreadyLinked = linkedProviderIds.has(p.id)
            return (
              <li key={p.id} className="flex items-center gap-4 p-4">
                <KeyRound className="text-muted-foreground size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.label}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {alreadyLinked
                      ? t('account:linked.connected')
                      : t('account:linked.comingSoon')}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  {alreadyLinked
                    ? t('account:linked.disconnect')
                    : t('account:linked.connect')}
                </Button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
