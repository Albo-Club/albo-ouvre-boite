/**
 * Webhook signature verification using HMAC-SHA256 over a raw request body.
 *
 * Use in any incoming Convex HTTP route that receives a payload from a
 * third-party (Stripe, GitHub, custom). Always verify with the *raw* body,
 * not a re-stringified JSON copy.
 *
 * Example:
 *   const raw = await request.text()
 *   const ok = await isValidHmac({
 *     payload: raw,
 *     signature: request.headers.get('x-signature') ?? '',
 *     secret: process.env.WEBHOOK_SECRET!,
 *   })
 *   if (!ok) return new Response('Invalid signature', { status: 401 })
 */
export async function isValidHmac(args: {
  payload: string
  signature: string
  secret: string
}): Promise<boolean> {
  const { payload, signature, secret } = args
  if (!signature) return false
  const expected = await computeHmac(payload, secret)
  return constantTimeEqual(signature, expected)
}

async function computeHmac(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
