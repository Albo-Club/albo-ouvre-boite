// Pure, side-effect-free predicates for invitation acceptance. Shared by the
// `accept` mutation and the `validateInviteForSignup` internal query so the
// acceptance rules — especially the security-critical signup gate — live in
// exactly one place.

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

export function emailsMatch(a: string, b: string): boolean {
  return normalizeEmail(a) === normalizeEmail(b)
}

type InvitationLike = {
  email: string
  expiresAt: number
  acceptedAt?: number
}

/**
 * True only when an invitation may pre-verify a signup's email: the token
 * resolved to an invitation that is still pending (not accepted), not expired,
 * and addressed to the same email (case + whitespace insensitive).
 *
 * Token + email-match is mandatory: a matching email alone NEVER qualifies —
 * that would let anyone mark any address verified by signing up with it.
 */
export function isInviteValidForSignup(
  inv: InvitationLike | null,
  email: string,
  now: number,
): boolean {
  if (!inv) return false
  if (inv.acceptedAt) return false
  if (inv.expiresAt < now) return false
  return emailsMatch(inv.email, email)
}
