import { query } from './_generated/server'

// Tells the frontend which social providers are wired so it can render (or
// hide) the matching buttons. The booleans are derived from env presence —
// not the secrets themselves — so this is safe to expose publicly. Keep in
// sync with the `socialProviders` block in `convex/auth.ts`.
export const enabledSocialProviders = query({
  args: {},
  handler: () => ({
    google: !!(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
  }),
})
