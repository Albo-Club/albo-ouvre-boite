import { mutation } from './_generated/server'
import { requireAppUser } from './lib/auth'
import { RESEND_FROM, resend } from './email'
import { passwordChangedEmail } from './emailTemplates'

const siteUrl = process.env.SITE_URL!

/**
 * Post-event notifications. Called after the security-critical state change
 * has already succeeded — these emails inform the user; they are not part of
 * the action itself, so failures here must never roll back the underlying op.
 *
 * Public mutations rather than internalMutations so the client can fire them
 * immediately after a BA call succeeds. The recipient address is always
 * read from the authenticated user (server-side), never from client input —
 * so the endpoint cannot be abused to spam arbitrary inboxes.
 */

export const notifyPasswordChanged = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAppUser(ctx)
    const resetUrl = `${siteUrl}/forgot-password`
    const { subject, html, text } = passwordChangedEmail({
      email: user.email,
      resetUrl,
    })
    await resend.sendEmail(ctx, {
      from: RESEND_FROM,
      to: user.email,
      subject,
      html,
      text,
    })
  },
})
