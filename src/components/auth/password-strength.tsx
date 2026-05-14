import { useEffect, useState } from 'react'
import { zxcvbnAsync, zxcvbnOptions } from '@zxcvbn-ts/core'
import type { ZxcvbnResult } from '@zxcvbn-ts/core'

import { cn } from '~/lib/utils'

let ready = false

async function configureZxcvbn() {
  if (ready) return
  ready = true
  const [{ dictionary: common, adjacencyGraphs }, en] = await Promise.all([
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-en'),
  ])
  zxcvbnOptions.setOptions({
    dictionary: { ...common, ...en.dictionary },
    graphs: adjacencyGraphs,
    translations: en.translations,
  })
}

const SCORE_LABEL = ['Very weak', 'Weak', 'Fair', 'Good', 'Excellent'] as const
const SCORE_TONE = [
  'bg-destructive',
  'bg-destructive',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-emerald-500',
] as const

interface PasswordStrengthProps {
  value: string
  /** Optional list of user-known strings to penalize (email, name…). */
  userInputs?: Array<string>
  /** Server-side minimum. The meter never displays "good"/"excellent" until
   * this length is met — avoids the contradictory signal of a strong meter
   * sitting next to a "too short" validator error. Defaults to 12 to match
   * the BA `emailAndPassword.minPasswordLength` config. */
  minLength?: number
  className?: string
}

/**
 * Indicative password strength meter (zxcvbn-ts). Non-blocking — drives
 * affordance, not validation. Hidden when the input is empty.
 *
 * Lazy-loads the wordlist on first use to keep the auth bundle slim.
 */
export function PasswordStrength({
  value,
  userInputs,
  minLength = 12,
  className,
}: PasswordStrengthProps) {
  const [result, setResult] = useState<ZxcvbnResult | null>(null)

  useEffect(() => {
    if (!value) {
      setResult(null)
      return
    }
    let cancelled = false
    configureZxcvbn()
      .then(() => zxcvbnAsync(value, userInputs))
      .then((r) => {
        if (!cancelled) setResult(r)
      })
      .catch(() => {
        // zxcvbn failure is non-critical — just skip the hint.
      })
    return () => {
      cancelled = true
    }
  }, [value, userInputs])

  if (!value) return null

  const tooShort = value.length < minLength
  const score = result?.score ?? 0 // 0..4
  // Below min-length, force the affordance to "Too short" regardless of
  // entropy — otherwise zxcvbn happily reports "Excellent" for an 11-char
  // password that the Zod validator will then reject as "At least 12
  // characters", and the user sees two contradictory signals.
  const displayScore = tooShort ? 0 : score
  const label = tooShort
    ? `Too short — ${minLength - value.length} more character${minLength - value.length === 1 ? '' : 's'} to go`
    : (SCORE_LABEL[score] ?? 'Checking…')
  const tone = SCORE_TONE[displayScore]

  return (
    <div
      className={cn('space-y-1.5', className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < displayScore + 1 ? tone : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        {tooShort ? (
          <span className="text-destructive font-medium">{label}</span>
        ) : (
          <>
            Strength:{' '}
            <span className="text-foreground font-medium">{label}</span>
            {result?.feedback.warning ? ` — ${result.feedback.warning}` : ''}
          </>
        )}
      </p>
    </div>
  )
}
