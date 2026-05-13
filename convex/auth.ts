import { betterAuth } from 'better-auth/minimal'
import { magicLink } from 'better-auth/plugins/magic-link'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { requireRunMutationCtx } from '@convex-dev/better-auth/utils'
import type { GenericCtx } from '@convex-dev/better-auth'
import authConfig from './auth.config'
import { components, internal } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import { RESEND_FROM, resend } from './email'
import {
  changeEmailVerificationEmail,
  deleteAccountVerificationEmail,
  magicLinkEmail,
  resetPasswordEmail,
  verificationEmail,
} from './emailTemplates'
import { consumeLimit } from './rateLimiters'

const siteUrl = process.env.SITE_URL!

if (
  process.env.APP_ENV === 'production' &&
  /(?:^|\/\/)(?:localhost|127\.0\.0\.1)(?::|\/|$)/.test(siteUrl)
) {
  throw new Error(
    `[albo] SITE_URL is "${siteUrl}" while APP_ENV=production. ` +
      'Emails would ship with broken links. Run: ' +
      'pnpm exec convex env set SITE_URL "https://your-domain" --prod',
  )
}

export const authComponent = createClient<DataModel>(components.betterAuth)

const isProd = process.env.APP_ENV === 'production'

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    // Per-endpoint rate-limit. Storage `database` is backed by the Convex
    // adapter (auto-created `rateLimit` table). The global window/max apply
    // to anything not in customRules. Tight limits on sensitive paths.
    rateLimit: {
      enabled: true,
      window: 10,
      max: 100,
      storage: 'database',
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 3 },
        '/forgot-password': { window: 60, max: 3 },
        '/reset-password': { window: 60, max: 5 },
        '/sign-in/magic-link': { window: 60, max: 3 },
        '/magic-link/verify': { window: 60, max: 5 },
        '/email-verification/send': { window: 60, max: 3 },
        '/verify-email': { window: 60, max: 10 },
        '/change-email': { window: 60, max: 3 },
        '/change-password': { window: 60, max: 5 },
        '/delete-user': { window: 60, max: 3 },
      },
    },
    // Force secure cookies in prod, sensible defaults everywhere. Without
    // explicit attributes BA's defaults vary by adapter — pin them.
    advanced: {
      useSecureCookies: isProd,
      cookiePrefix: 'albo',
      defaultCookieAttributes: {
        sameSite: 'lax',
        secure: isProd,
        httpOnly: true,
      },
    },
    onAPIError: {
      onError: (error: unknown) => {
        console.error('[ba-api-error]', {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : undefined,
          stack: error instanceof Error ? error.stack : undefined,
        })
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh once a day
      cookieCache: { enabled: true, maxAge: 60 * 5 }, // 5 min
      // `freshAge` is how recently a user must have authenticated for
      // sensitive ops (changeEmail, deleteUser, change-password). BA enforces
      // this when an endpoint asks for a fresh session.
      freshAge: 60 * 60, // 1h
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      // Server-side minimum. The Zod schemas in /register, /reset-password
      // and /me change-password mirror this — both layers must agree or the
      // form passes client validation and 400s on submit.
      minPasswordLength: 12,
      maxPasswordLength: 128,
      sendResetPassword: async (data: {
        user: { email: string }
        url: string
      }) => {
        const mutCtx = requireRunMutationCtx(ctx)
        await consumeLimit(
          mutCtx,
          'passwordResetSend',
          data.user.email.toLowerCase().trim(),
        )
        const { subject, html, text } = resetPasswordEmail({ url: data.url })
        await resend.sendEmail(mutCtx, {
          from: RESEND_FROM,
          to: data.user.email,
          subject,
          html,
          text,
        })
      },
      // Invalidate every other session on reset — basic account-takeover
      // mitigation if the previous password was leaked.
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async (data: {
        user: { email: string }
        url: string
      }) => {
        const mutCtx = requireRunMutationCtx(ctx)
        await consumeLimit(
          mutCtx,
          'verificationSend',
          data.user.email.toLowerCase().trim(),
        )
        const { subject, html, text } = verificationEmail({ url: data.url })
        await resend.sendEmail(mutCtx, {
          from: RESEND_FROM,
          to: data.user.email,
          subject,
          html,
          text,
        })
      },
    },
    account: {
      accountLinking: {
        enabled: true,
      },
    },
    user: {
      changeEmail: {
        enabled: true,
        // BA expects `sendChangeEmailConfirmation` — sending to the CURRENT
        // address so the legitimate owner approves before BA dispatches the
        // verification to the new one. The previous typo
        // (`sendChangeEmailVerification`) silently dropped this layer, letting
        // a hijacked session swap the email without notifying the rightful
        // user. See update-user.mjs in better-auth.
        sendChangeEmailConfirmation: async (data: {
          user: { email: string }
          newEmail: string
          url: string
        }) => {
          const mutCtx = requireRunMutationCtx(ctx)
          const { subject, html, text } = changeEmailVerificationEmail({
            url: data.url,
            newEmail: data.newEmail,
          })
          await resend.sendEmail(mutCtx, {
            from: RESEND_FROM,
            to: data.user.email,
            subject,
            html,
            text,
          })
        },
      },
      deleteUser: {
        enabled: true,
        sendDeleteAccountVerification: async (data: {
          user: { email: string; name?: string | null }
          url: string
        }) => {
          const mutCtx = requireRunMutationCtx(ctx)
          const { subject, html, text } = deleteAccountVerificationEmail({
            url: data.url,
            name: data.user.name ?? null,
          })
          await resend.sendEmail(mutCtx, {
            from: RESEND_FROM,
            to: data.user.email,
            subject,
            html,
            text,
          })
        },
        beforeDelete: async (user: { id: string }) => {
          const mutCtx = requireRunMutationCtx(ctx)
          await mutCtx.runMutation(internal.users.cascadeDelete, {
            betterAuthId: user.id,
          })
        },
      },
    },
    plugins: [
      magicLink({
        // We only let people in via /register. Without this, the plugin
        // silently creates a BA user on first link click — which breaks
        // the provisioning invariant and leaves password-less accounts
        // behind that can later 500 on signIn.email. See KNOWN_ISSUES.md.
        disableSignUp: true,
        sendMagicLink: async ({ email, url }) => {
          const mutCtx = requireRunMutationCtx(ctx)
          await consumeLimit(
            mutCtx,
            'magicLinkSend',
            email.toLowerCase().trim(),
          )
          const { subject, html, text } = magicLinkEmail({ url })
          await resend.sendEmail(mutCtx, {
            from: RESEND_FROM,
            to: email,
            subject,
            html,
            text,
          })
        },
      }),
      convex({ authConfig }),
    ],
  })
