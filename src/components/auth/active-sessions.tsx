import { useEffect, useState } from 'react'
import { Laptop, Smartphone, Tablet } from 'lucide-react'
import { toast } from 'sonner'

import { authClient } from '~/lib/auth-client'
import { classifyAuthError, formatAuthError } from '~/lib/auth-errors'
import { Button } from '~/components/ui/button'
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
  const { data: current } = authClient.useSession()
  const currentSessionId = current?.session?.id

  const [sessions, setSessions] = useState<Array<BaSession> | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function refresh() {
    const { data, error } = await authClient.listSessions()
    if (error) {
      toast.error(formatAuthError(classifyAuthError(error)))
      return
    }
    setSessions((data ?? []) as Array<BaSession>)
  }

  useEffect(() => {
    void refresh()
  }, [])

  async function handleRevoke(s: BaSession) {
    setRevokingId(s.id)
    const { error } = await authClient.revokeSession({ token: s.token })
    setRevokingId(null)
    if (error) {
      toast.error(formatAuthError(classifyAuthError(error)))
      return
    }
    toast.success('Session revoked.')
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
      <p className="text-muted-foreground text-sm">No active sessions.</p>
    )
  }

  const sorted = [...sessions].sort((a, b) => {
    if (a.id === currentSessionId) return -1
    if (b.id === currentSessionId) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <ul className="divide-border divide-y rounded-md border">
      {sorted.map((s) => {
        const isCurrent = s.id === currentSessionId
        const { label, Icon } = describeUserAgent(s.userAgent)
        const when = formatRelative(new Date(s.createdAt))
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
                    Current
                  </span>
                )}
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {s.ipAddress ?? 'IP unknown'} · {when}
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
                Revoke
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function describeUserAgent(ua: string | null | undefined) {
  if (!ua) return { label: 'Unknown device', Icon: Laptop }
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
          : 'Browser'

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
            : 'Unknown OS'

  return { label: `${browser} on ${os}`, Icon }
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString()
}
