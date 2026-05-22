import { createFileRoute, Link } from '@tanstack/react-router'

import { Button } from '~/components/ui/button'
import { Logo } from '~/components/Logo'
import { useRedirectWhenAuthenticated } from '~/lib/auth-state'

export const Route = createFileRoute('/')({
  component: Home,
  head: () => ({
    meta: [
      { title: 'albo — MVP starter' },
      {
        name: 'description',
        content: 'B2B MVP starter — TanStack Start + Convex.',
      },
    ],
  }),
})

function Home() {
  useRedirectWhenAuthenticated()
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-8">
      <Logo className="h-10" />
      <h1 className="text-4xl font-bold tracking-tight">albo</h1>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        B2B MVP starter template. Auth, multi-tenant orgs, and AI chat are
        wired and ready.
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/register">Create account</Link>
        </Button>
      </div>
    </main>
  )
}
