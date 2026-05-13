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

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    onAPIError: {
      onError: (error: unknown) => {
        console.error('[ba-api-error]', {
          message: error instanceof Error ? error.message : String(error),
          name: error instanceof Error ? error.name : undefined,
          stack: error instanceof Error ? error.stack : undefined,
        })
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
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
          'magicLink',
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
        sendChangeEmailVerification: async (data: {
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
        sendMagicLink: async ({ email, url }) => {
          const mutCtx = requireRunMutationCtx(ctx)
          await consumeLimit(mutCtx, 'magicLink', email.toLowerCase().trim())
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
