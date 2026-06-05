import { useEffect, useState } from 'react'
import { Laptop, Smartphone, Tablet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { TFunction } from 'i18next'

import { authClient } from '~/lib/auth-client'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Skeleton } from '~/components/ui/skeleton'
import { Spinner } from '~/components/ui/spinner'

type BaSession = {
  id: string
  token: string
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string | Date
}

/**
 * List the current user's active Better Auth sessions with a per-row revoke
 * action. Marks the session backing the current browser tab as "Current".
 */
export function ActiveSessions() {
  const { t } = useTranslation(['account', 'common', 'errors'])
  const te = (k: string) => t(`errors:${k}`)
  const { data: current } = authClient.useSession()
  const currentSessionId = current?.session.id

  const [sessions, setSessions] = useState<Array<BaSession> | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false)
  const [revokingAll, setRevokingAll] = useState(false)

  async function refresh() {
    const { data, error } = await authClient.listSessions()
    if (error) {
      toast.error(formatAuthError(classifyAuthError(error), 'signin', te))
      return
    }
    setSessions(data)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleRevoke(s: BaSession) {
    setRevokingId(s.id)
    const { error } = await authClient.revokeSession({ token: s.token })
    setRevokingId(null)
    if (error) {
      toast.error(formatAuthError(classifyAuthError(error), 'signin', te))
      return
    }
    toast.success(t('account:sessions.revoked'))
    void refresh()
  }

  async function handleRevokeOthers() {
    setRevokingAll(true)
    const { error } = await authClient.revokeOtherSessions()
    setRevokingAll(false)
    setConfirmRevokeAll(false)
    if (error) {
      toast.error(formatAuthError(classifyAuthError(error), 'signin', te))
      return
    }
    toast.success(t('account:sessions.revokedOthers'))
    void refresh()
  }

  if (sessions === null) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('account:sessions.none')}
      </p>
    )
  }

  const sorted = [...sessions].sort((a, b) => {
    if (a.id === currentSessionId) return -1
    if (b.id === currentSessionId) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const hasOthers = sorted.some((s) => s.id !== currentSessionId)

  return (
    <div className="space-y-3">
      {hasOthers && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmRevokeAll(true)}
          >
            {t('account:sessions.signOutOthers')}
          </Button>
        </div>
      )}
      <ul className="divide-border divide-y rounded-md border">
        {sorted.map((s) => {
        const isCurrent = s.id === currentSessionId
        const { label, Icon } = describeUserAgent(s.userAgent, t)
        const when = formatRelative(new Date(s.createdAt), t)
        return (
          <li
            key={s.id}
            className="flex items-center gap-4 p-4"
          >
            <Icon className="text-muted-foreground size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">{label}</p>
                {isCurrent && (
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-full px-2 py-0.5 text-xs font-medium">
                    {t('account:sessions.current')}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {s.ipAddress ?? t('account:sessions.ipUnknown')} · {when}
              </p>
            </div>
            {!isCurrent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRevoke(s)}
                disabled={revokingId === s.id}
              >
                {revokingId === s.id && <Spinner />}
                {t('account:sessions.revoke')}
              </Button>
            )}
          </li>
        )
      })}
      </ul>
      <Dialog open={confirmRevokeAll} onOpenChange={setConfirmRevokeAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('account:sessions.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('account:sessions.confirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmRevokeAll(false)}
              disabled={revokingAll}
            >
              {t('common:actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRevokeOthers()}
              disabled={revokingAll}
            >
              {revokingAll && <Spinner />}
              {t('account:sessions.confirmAction')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function describeUserAgent(
  ua: string | null | undefined,
  t: TFunction<['account', 'common', 'errors']>,
) {
  if (!ua) return { label: t('account:sessions.unknownDevice'), Icon: Laptop }
  const lower = ua.toLowerCase()
  const isMobile = /mobile|iphone|android/.test(lower)
  const isTablet = /ipad|tablet/.test(lower)
  const Icon = isTablet ? Tablet : isMobile ? Smartphone : Laptop

  const browser = /firefox\//i.test(ua)
    ? 'Firefox'
    : /edg\//i.test(ua)
      ? 'Edge'
      : /chrome\//i.test(ua)
        ? 'Chrome'
        : /safari\//i.test(ua)
          ? 'Safari'
          : t('account:sessions.genericBrowser')

  const os = /windows nt/i.test(ua)
    ? 'Windows'
    : /mac os x|macintosh/i.test(ua)
      ? 'macOS'
      : /android/i.test(ua)
        ? 'Android'
        : /iphone|ipad|ipod|ios/i.test(ua)
          ? 'iOS'
          : /linux/i.test(ua)
            ? 'Linux'
            : t('account:sessions.unknownOs')

  return { label: t('account:sessions.deviceLabel', { browser, os }), Icon }
}

function formatRelative(
  date: Date,
  t: TFunction<['account', 'common', 'errors']>,
): string {
  const diff = Date.now() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return t('account:time.justNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('account:time.minAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('account:time.hourAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return t('account:time.dayAgo', { count: days })
  return date.toLocaleDateString()
}
