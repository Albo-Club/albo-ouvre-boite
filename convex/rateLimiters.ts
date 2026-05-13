import { ConvexError } from 'convex/values'
import { HOUR, MINUTE, RateLimiter } from '@convex-dev/rate-limiter'

import { components } from './_generated/api'

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Invitations: per inviter (~admin), prevents accidental spam.
  invitationCreate: {
    kind: 'token bucket',
    rate: 20,
    period: HOUR,
    capacity: 5,
  },
  // Magic-link sign-in emails: per recipient email.
  magicLinkSend: { kind: 'token bucket', rate: 5, period: HOUR, capacity: 2 },
  // Email-verification resends: per recipient email. Separate bucket so a
  // user re-asking for a verification link doesn't eat into magic-link quota.
  verificationSend: {
    kind: 'token bucket',
    rate: 5,
    period: HOUR,
    capacity: 3,
  },
  // Password-reset emails: per recipient email.
  passwordResetSend: {
    kind: 'token bucket',
    rate: 3,
    period: HOUR,
    capacity: 2,
  },
  // Chat messages: per user. AI calls are expensive.
  chatSend: { kind: 'token bucket', rate: 30, period: MINUTE, capacity: 10 },
})

type LimitName =
  | 'invitationCreate'
  | 'magicLinkSend'
  | 'verificationSend'
  | 'passwordResetSend'
  | 'chatSend'

/**
 * Throws a friendly ConvexError when a limit is hit. The data payload includes
 * the limit name so the UI can show contextual messages.
 */
export async function consumeLimit(
  ctx: Parameters<typeof rateLimiter.limit>[0],
  name: LimitName,
  key: string,
): Promise<void> {
  const result = await rateLimiter.limit(ctx, name, { key })
  if (!result.ok) {
    throw new ConvexError({
      code: 'rate_limited',
      limit: name,
      retryAfterMs: result.retryAfter,
    })
  }
}
