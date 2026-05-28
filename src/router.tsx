import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { routeTree } from './routeTree.gen'
import { authClient } from '~/lib/auth-client'
import { initSentry } from '~/lib/sentry'

// Client-only singletons. getRouter() is called during SSR AND on every
// client hydration; re-instantiating ConvexQueryClient on each call drops
// the open WebSocket and forces a fresh /api/auth/get-session round-trip,
// which briefly flips `useConvexAuth().isAuthenticated` to false and lets
// the `/app` guard redirect to /login on hard refresh or new tab.
// On the server we always create fresh instances (no cross-request leaks).
let _convexQueryClient: ConvexQueryClient | null = null
let _queryClient: QueryClient | null = null

function getOrCreateClients(convexUrl: string) {
  if (typeof window === 'undefined') {
    const cqc = new ConvexQueryClient(convexUrl)
    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          queryKeyHashFn: cqc.hashFn(),
          queryFn: cqc.queryFn(),
          gcTime: 5000,
        },
      },
    })
    cqc.connect(qc)
    return { convexQueryClient: cqc, queryClient: qc }
  }
  if (!_convexQueryClient || !_queryClient) {
    _convexQueryClient = new ConvexQueryClient(convexUrl)
    _queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          queryKeyHashFn: _convexQueryClient.hashFn(),
          queryFn: _convexQueryClient.queryFn(),
          gcTime: 5000,
        },
      },
    })
    _convexQueryClient.connect(_queryClient)
  }
  return { convexQueryClient: _convexQueryClient, queryClient: _queryClient }
}

export function getRouter() {
  if (typeof window !== 'undefined') {
    initSentry()
  }
  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!
  if (!CONVEX_URL) {
    console.error('missing envar CONVEX_URL')
  }
  const { convexQueryClient, queryClient } = getOrCreateClients(CONVEX_URL)

  const router = routerWithQueryClient(
    createRouter({
      routeTree,
      defaultPreload: 'intent',
      context: { queryClient },
      scrollRestoration: true,
      defaultPreloadStaleTime: 0, // Let React Query handle all caching
      defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
      defaultNotFoundComponent: () => <p>not found</p>,
      Wrap: ({ children }) => (
        <ConvexBetterAuthProvider
          client={convexQueryClient.convexClient}
          authClient={authClient}
        >
          {children}
        </ConvexBetterAuthProvider>
      ),
    }),
    queryClient,
  )

  return router
}
