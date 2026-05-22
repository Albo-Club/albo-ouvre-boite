import { useEffect } from 'react'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useConvexMutation, useConvexQuery } from '@convex-dev/react-query'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '~/lib/auth-state'

export const Route = createFileRoute('/app')({
  component: AppLayout,
})

function AppLayout() {
  const navigate = useNavigate()
  const { isLoading, isAuthenticated, isSignedOut } = useAuthState()
  const me = useConvexQuery(
    api.users.me,
    isAuthenticated ? {} : 'skip',
  )
  const provisionMe = useConvexMutation(api.users.provisionMe)

  useEffect(() => {
    // Only redirect when BA confirms no session. Don't redirect on the
    // transient `convexAuth=false while BA session loading` state — that
    // caused tab-A→tab-B and hard-refresh logouts in dev.
    //
    // Belt-and-suspenders on top of `useAuthState`'s error/refetch guard:
    // require the signed-out signal to stay stable for a beat before
    // navigating. A transient blip (cold-start /get-session, focus refetch,
    // request aborted during hydration) clears within a few hundred ms, and
    // the cleanup cancels the pending redirect when `isSignedOut` flips back
    // to false — so a logged-in user opening a new tab or returning after
    // idle is no longer bounced to /login.
    if (!isSignedOut) return
    const timer = setTimeout(() => {
      navigate({ to: '/login' })
    }, 1500)
    return () => clearTimeout(timer)
  }, [isSignedOut, navigate])

  useEffect(() => {
    if (me?.kind === 'unprovisioned') {
      void provisionMe()
    }
  }, [me?.kind, provisionMe])

  if (isLoading || !isAuthenticated || !me || me.kind !== 'ready') {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    )
  }

  return <Outlet />
}
