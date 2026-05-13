/**
 * Classify Better Auth client errors into a small, stable, UI-facing set.
 *
 * Why bother: BA returns granular codes (USER_NOT_FOUND vs
 * INVALID_EMAIL_OR_PASSWORD vs INVALID_PASSWORD …). Surfacing those
 * verbatim leaks enumeration (an attacker learns *which* field is wrong).
 * We collapse them, then format user-facing copy per context.
 *
 * Source codes: node_modules/@better-auth/core/dist/error/codes.mjs
 */

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'EMAIL_INVALID'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'SESSION_EXPIRED'
  | 'RATE_LIMITED'
  | 'NETWORK'
  | 'UNKNOWN'

export interface AuthErrorLike {
  code?: string | null
  status?: number | null
  statusText?: string | null
  message?: string | null
}

const CODE_MAP: Partial<Record<string, AuthErrorCode>> = {
  INVALID_EMAIL_OR_PASSWORD: 'INVALID_CREDENTIALS',
  INVALID_PASSWORD: 'INVALID_CREDENTIALS',
  INVALID_USER: 'INVALID_CREDENTIALS',
  // Collapsed on purpose — distinguishing "user not found" from "wrong
  // password" is exactly the enumeration leak we want to block.
  USER_NOT_FOUND: 'INVALID_CREDENTIALS',
  USER_EMAIL_NOT_FOUND: 'INVALID_CREDENTIALS',
  CREDENTIAL_ACCOUNT_NOT_FOUND: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  USER_ALREADY_EXISTS: 'EMAIL_ALREADY_REGISTERED',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'EMAIL_ALREADY_REGISTERED',
  INVALID_EMAIL: 'EMAIL_INVALID',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  PASSWORD_TOO_LONG: 'PASSWORD_TOO_LONG',
  INVALID_TOKEN: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_NOT_FRESH: 'SESSION_EXPIRED',
}

export function classifyAuthError(
  err: AuthErrorLike | null | undefined,
): AuthErrorCode {
  if (!err) return 'UNKNOWN'
  if (err.status === 429) return 'RATE_LIMITED'
  if (err.code) {
    const mapped = CODE_MAP[err.code]
    if (mapped) return mapped
  }
  if (err.status === 403) return 'EMAIL_NOT_VERIFIED'
  if (err.status === 401) return 'INVALID_CREDENTIALS'
  if (err.status == null && err.code == null) return 'NETWORK'
  return 'UNKNOWN'
}

export type AuthErrorContext = 'signin' | 'signup' | 'reset' | 'verify' | 'change'

/**
 * Format a classified error into user-facing copy. Some codes render
 * differently depending on the surrounding flow (e.g. duplicate-email on
 * signup must look identical to success to defeat enumeration).
 */
export function formatAuthError(
  code: AuthErrorCode,
  ctx: AuthErrorContext = 'signin',
): string {
  switch (code) {
    case 'INVALID_CREDENTIALS':
      return 'Email or password is incorrect.'
    case 'EMAIL_NOT_VERIFIED':
      return 'Verify your email to continue. Check your inbox for the link.'
    case 'EMAIL_ALREADY_REGISTERED':
      return ctx === 'signup'
        ? "If this email isn't already taken, we'll send you a verification link."
        : 'This email is already in use.'
    case 'EMAIL_INVALID':
      return 'Please enter a valid email address.'
    case 'PASSWORD_TOO_SHORT':
      return 'Password is too short.'
    case 'PASSWORD_TOO_LONG':
      return 'Password is too long.'
    case 'TOKEN_INVALID':
      return 'This link is invalid. Please request a new one.'
    case 'TOKEN_EXPIRED':
      return 'This link has expired. Please request a new one.'
    case 'SESSION_EXPIRED':
      return 'Your session expired. Please sign in again.'
    case 'RATE_LIMITED':
      return 'Too many attempts — please wait a moment and try again.'
    case 'NETWORK':
      return 'Network error. Check your connection and retry.'
    case 'UNKNOWN':
    default:
      return 'Something went wrong. Please try again.'
  }
}
