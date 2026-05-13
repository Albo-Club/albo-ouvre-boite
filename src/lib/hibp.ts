/**
 * Check whether a password has appeared in known data breaches.
 *
 * Uses HaveIBeenPwned's k-anonymity range API: SHA-1 the password locally,
 * send only the first 5 hex chars, then scan the (suffix, count) list for
 * the rest. The full password never leaves the browser, HIBP only sees the
 * 5-char prefix shared by ~500 other hashes.
 *
 * Soft-fail by design: if the network call errors out, we return `pwned:
 * false`. We'd rather let a signup through than block users on a HIBP CDN
 * outage. Server-side `minPasswordLength: 12` still applies.
 *
 * Spec: https://haveibeenpwned.com/API/v3#PwnedPasswords
 */

export interface HibpResult {
  pwned: boolean
  /** Number of times this hash appeared in breaches. 0 when not pwned. */
  count: number
}

async function sha1Upper(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-1', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export async function isPasswordPwned(
  password: string,
  options: { signal?: AbortSignal } = {},
): Promise<HibpResult> {
  if (!password) return { pwned: false, count: 0 }

  let hash: string
  try {
    hash = await sha1Upper(password)
  } catch {
    return { pwned: false, count: 0 }
  }
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      signal: options.signal,
      // Padding hides our true range size from network observers.
      headers: { 'Add-Padding': 'true' },
    })
    if (!res.ok) return { pwned: false, count: 0 }
    const text = await res.text()
    for (const line of text.split('\n')) {
      const [s, c] = line.trim().split(':')
      if (s === suffix) return { pwned: true, count: Number(c) || 1 }
    }
    return { pwned: false, count: 0 }
  } catch {
    return { pwned: false, count: 0 }
  }
}
