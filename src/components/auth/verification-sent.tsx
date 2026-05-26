import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { CardFooter } from '~/components/ui/card'
import { AuthShell } from '~/components/auth/auth-shell'

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
  title,
  description,
  onResend,
  resendLabel,
  isResending = false,
  footer,
}: Props) {
  const { t } = useTranslation('auth')
  const resolvedTitle = title ?? t('verificationSent.title')
  const resolvedResendLabel = resendLabel ?? t('verificationSent.resendDefault')
  return (
    <AuthShell title={resolvedTitle} description={description}>
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
            {resolvedResendLabel}
          </Button>
        )}
        {footer}
      </CardFooter>
    </AuthShell>
  )
}
