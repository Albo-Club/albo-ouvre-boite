import '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start'

const ba = convexBetterAuthReactStart({
  convexUrl: import.meta.env.VITE_CONVEX_URL,
  convexSiteUrl: import.meta.env.VITE_CONVEX_SITE_URL,
})

// The Convex Better Auth adapter calls `fetch(upstream, { body: req.body,
// duplex: 'half' })` to proxy the request. On Vercel's Node runtime, that
// streaming-body path throws on POST /sign-in/email and surfaces as a 500
// to the browser even though Convex itself returns a clean 401.
// Buffering the body to an ArrayBuffer first turns the request into a
// non-streaming one, which `fetch` handles reliably on every runtime.
async function bufferRequestBody(request: Request): Promise<Request> {
  if (request.method === 'GET' || request.method === 'HEAD') return request
  const body = await request.arrayBuffer()
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: body.byteLength > 0 ? body : undefined,
  })
}

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      ANY: async ({ request }) => {
        try {
          const buffered = await bufferRequestBody(request)
          return await ba.handler(buffered)
        } catch (err) {
          // Log fields on separate lines: Vercel's UI truncates a single
          // long line, which hid the actual cause during the first round.
          console.error('[ts-auth-handler] url=', request.url)
          console.error('[ts-auth-handler] method=', request.method)
          console.error(
            '[ts-auth-handler] name=',
            err instanceof Error ? err.name : typeof err,
          )
          console.error(
            '[ts-auth-handler] message=',
            err instanceof Error ? err.message : String(err),
          )
          if (err instanceof Error && err.stack) {
            console.error('[ts-auth-handler] stack=', err.stack)
          }
          throw err
        }
      },
    },
  },
})
