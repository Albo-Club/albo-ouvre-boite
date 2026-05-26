import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Logo } from '~/components/Logo'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

type Props = {
  title: ReactNode
  description?: ReactNode
  /** Card body — typically the `<form>` with CardContent + CardFooter. */
  children: ReactNode
}

/**
 * Shared auth page shell modelled on the shadcn `login-03` block: muted
 * full-height background, brand mark above a centered card with a centered
 * header. Used by /login, /register, /forgot-password and /reset-password so
 * every auth surface looks consistent.
 */
export function AuthShell({ title, description, children }: Props) {
  return (
    <main className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link
          to="/"
          aria-label="albo"
          className="flex items-center justify-center"
        >
          <Logo />
        </Link>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          {children}
        </Card>
      </div>
    </main>
  )
}
