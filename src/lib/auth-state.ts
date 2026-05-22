import { useConvexAuth } from 'convex/react'
import { authClient } from '~/lib/auth-client'

// Unified auth signal that prevents the "false unauthenticated" flash that
// briefly redirects to /login on hard refresh or new-tab navigation.
//
// `useConvexAuth()` reports `{ isLoading: false, isAuthenticated: false }`
// both when (a) the user is genuinely signed out AND (b) when the Convex
// client is mid-fetch of a fresh JWT after WebSocket re-open. Treating (b)
// like (a) causes the auth guard to redirect, then snap back once Convex
// catches up.
//
// Better Auth's `useSession()` reads from the BA cookieCache (~5min TTL)
// and resolves almost instantly. If BA reports a session, we know the user
// is authenticated even if Convex is still catching up.
//
// Use this hook in any route guard instead of consuming `useConvexAuth()`
// directly.
export function useAuthState() {
  const { isLoading: convexLoading, isAuthenticated: convexAuth } =
    useConvexAuth()
  const baSession = authClient.useSession()

  const baPending = baSession.isPending
  const baRefetching = baSession.isRefetching
  const baError = baSession.error
  const hasBaUser = !!baSession.data?.user

  // Loading: either side hasn't decided yet, OR BA has a user but Convex
  // hasn't issued a token yet (the gap that causes the flash).
  const isLoading = convexLoading || baPending || (hasBaUser && !convexAuth)

  // Authenticated: both sides must agree. (Both true.)
  const isAuthenticated = convexAuth && hasBaUser

  // Signed out: only when BA has *positively* settled on "no session" — not
  // pending, not refetching, no user, AND no transient fetch error. A
  // failed/aborted/cold `/get-session` (network blip, Vercel function cold
  // start, request aborted mid-hydration, cross-tab focus refetch) leaves
  // `data:null` with `isPending:false`; the previous `!baPending && !hasBaUser`
  // treated that like a real logout and redirected a still-authenticated user
  // to /login on a new tab or after idle — even though the session cookie is
  // valid and the very next fetch returns 200. Excluding the error/refetching
  // states keeps a transient blip from logging the user out.
  const isSignedOut =
    !baPending && !baRefetching && !hasBaUser && baError == null

  return {
    isLoading,
    isAuthenticated,
    isSignedOut,
    user: baSession.data?.user ?? null,
  }
}
