import type { ReactNode } from 'react'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

type Props = {
  title?: string
  description: ReactNode
  onResend?: () => void | Promise<void>
  resendLabel?: string
  isResending?: boolean
  /** Extra footer content rendered after the resend button. Pass `null` to omit. */
  footer?: ReactNode
}

export function VerificationSentCard({
  title = 'Check your inbox',
  description,
  onResend,
  resendLabel = 'Resend link',
  isResending = false,
  footer,
}: Props) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardFooter className="flex-col gap-3">
          {onResend && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void onResend()}
              disabled={isResending}
            >
              {isResending && <Spinner />}
              {resendLabel}
            </Button>
          )}
          {footer}
        </CardFooter>
      </Card>
    </main>
  )
}
