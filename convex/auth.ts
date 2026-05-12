import { betterAuth } from 'better-auth/minimal'
import { magicLink } from 'better-auth/plugins/magic-link'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { requireRunMutationCtx } from '@convex-dev/better-auth/utils'
import type { GenericCtx } from '@convex-dev/better-auth'
import authConfig from './auth.config'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'
import { RESEND_FROM, resend } from './email'
import { magicLinkEmail } from './emailTemplates'
import { consumeLimit } from './rateLimiters'

const siteUrl = process.env.SITE_URL!

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
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
