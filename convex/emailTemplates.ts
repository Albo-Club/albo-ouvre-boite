/**
 * Email templates. Plain text + HTML are sent together (multipart/alternative)
 * — a strong anti-spam signal and required for accessibility.
 *
 * HTML uses inline styles since Gmail / Outlook strip <style> tags.
 * Layout is a single 560px column, mobile-safe.
 */

const APP_NAME = 'albo'
const BRAND = '#0f0f10'
const MUTED = '#6b6b73'
const BORDER = '#e7e7ea'
const BG = '#ffffff'
const BUTTON_BG = '#0f0f10'
const BUTTON_FG = '#ffffff'

function layout({
  preheader,
  heading,
  paragraphs,
  cta,
  footer,
}: {
  preheader: string
  heading: string
  paragraphs: string[]
  cta?: { label: string; url: string }
  footer: string
}) {
  const ctaHtml = cta
    ? `<tr><td style="padding: 24px 0 8px;">
        <a href="${cta.url}"
          style="display:inline-block; background:${BUTTON_BG}; color:${BUTTON_FG}; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600; font-size:14px;">
          ${cta.label}
        </a>
      </td></tr>`
    : ''
  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<tr><td style="padding-bottom:14px; line-height:1.55;">${p}</td></tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin:0; padding:0; background:${BG}; color:${BRAND}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Arial, sans-serif;">
  <span style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:560px; border:1px solid ${BORDER}; border-radius:14px; background:${BG};">
        <tr><td style="padding:28px 32px 0;">
          <div style="font-weight:700; font-size:18px; letter-spacing:-0.01em;">${APP_NAME}</div>
        </td></tr>
        <tr><td style="padding:20px 32px 8px;">
          <h1 style="margin:0 0 8px; font-size:20px; font-weight:600; line-height:1.3;">${heading}</h1>
        </td></tr>
        <tr><td style="padding:0 32px 8px; font-size:15px; color:${BRAND};">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            ${bodyHtml}
            ${ctaHtml}
          </table>
        </td></tr>
        <tr><td style="padding:24px 32px 28px; border-top:1px solid ${BORDER}; color:${MUTED}; font-size:12px; line-height:1.5;">
          ${footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function plainText(parts: string[]): string {
  return parts.filter(Boolean).join('\n\n')
}

export function invitationEmail({
  inviterName,
  orgName,
  acceptUrl,
}: {
  inviterName: string
  orgName: string
  acceptUrl: string
}) {
  const subject = `You're invited to ${orgName} on ${APP_NAME}`
  const heading = `Join ${orgName}`
  const intro = `<strong>${inviterName}</strong> invited you to join <strong>${orgName}</strong>.`
  const followup = `Click the button below to accept. This link expires in 7 days.`
  const footer = `If you didn't expect this invitation, you can safely ignore this email.`
  const preheader = `${inviterName} invited you to join ${orgName}.`

  const html = layout({
    preheader,
    heading,
    paragraphs: [intro, followup],
    cta: { label: 'Accept invitation', url: acceptUrl },
    footer,
  })

  const text = plainText([
    `${inviterName} invited you to join ${orgName} on ${APP_NAME}.`,
    `Accept the invitation:`,
    acceptUrl,
    `This link expires in 7 days.`,
    `If you didn't expect this invitation, you can safely ignore this email.`,
  ])

  return { subject, html, text }
}

export function changeEmailVerificationEmail({
  url,
  newEmail,
}: {
  url: string
  newEmail: string
}) {
  // Sent to the CURRENT address. Acts as approval gate: a hijacked session
  // can request the change, but only the legitimate owner of the current
  // inbox can authorize it.
  const subject = `Approve email change on ${APP_NAME}`
  const heading = `Approve email change`
  const intro = `Someone requested to change your ${APP_NAME} account email to <strong>${newEmail}</strong>.`
  const followup = `If this was you, click below to approve. <strong>If not, ignore this email</strong> — your current address stays unchanged and the request is dropped.`
  const footer = `Your account email is updated only after you approve here.`
  const preheader = `Approve change to ${newEmail}.`

  const html = layout({
    preheader,
    heading,
    paragraphs: [intro, followup],
    cta: { label: 'Approve email change', url },
    footer,
  })

  const text = plainText([
    `Approve email change on ${APP_NAME}.`,
    `Someone requested to change your account email to ${newEmail}.`,
    `If this was you, open this link to approve:`,
    url,
    `If not, ignore this email — your current address stays unchanged.`,
  ])

  return { subject, html, text }
}

export function deleteAccountVerificationEmail({
  url,
  name,
}: {
  url: string
  name?: string | null
}) {
  const subject = `Confirm account deletion on ${APP_NAME}`
  const heading = `Confirm account deletion`
  const intro = name
    ? `${name}, you asked to delete your ${APP_NAME} account.`
    : `You asked to delete your ${APP_NAME} account.`
  const followup = `This will permanently remove your profile, your organization memberships, and your access. <strong>This cannot be undone.</strong>`
  const footer = `If you didn't request this, ignore this email and nothing happens.`
  const preheader = `Confirm account deletion.`

  const html = layout({
    preheader,
    heading,
    paragraphs: [intro, followup],
    cta: { label: 'Delete my account', url },
    footer,
  })

  const text = plainText([
    intro,
    `This will permanently remove your profile and access. This cannot be undone.`,
    `Confirm by opening this link:`,
    url,
    `If you didn't request this, ignore this email.`,
  ])

  return { subject, html, text }
}

export function verificationEmail({ url }: { url: string }) {
  const subject = `Verify your email on ${APP_NAME}`
  const heading = `Verify your email`
  const intro = `Confirm this is your email address by clicking the button below. You'll be signed in automatically.`
  const fallback = `If the button doesn't work, copy this URL into your browser:<br><span style="color:${MUTED}; word-break:break-all;">${url}</span>`
  const footer = `If you didn't create an account, you can safely ignore this email.`
  const preheader = `Verify your email on ${APP_NAME}.`

  const html = layout({
    preheader,
    heading,
    paragraphs: [intro, fallback],
    cta: { label: 'Verify email', url },
    footer,
  })

  const text = plainText([
    `Verify your email on ${APP_NAME}.`,
    `Open this link to verify and sign in:`,
    url,
    `If you didn't create an account, you can safely ignore this email.`,
  ])

  return { subject, html, text }
}

export function resetPasswordEmail({ url }: { url: string }) {
  const subject = `Reset your ${APP_NAME} password`
  const heading = `Reset your password`
  const intro = `We received a request to reset your ${APP_NAME} password. Click the button below to choose a new one. This link expires in 1 hour.`
  const fallback = `If the button doesn't work, copy this URL into your browser:<br><span style="color:${MUTED}; word-break:break-all;">${url}</span>`
  const footer = `If you didn't request a password reset, ignore this email and your password stays unchanged.`
  const preheader = `Reset your ${APP_NAME} password.`

  const html = layout({
    preheader,
    heading,
    paragraphs: [intro, fallback],
    cta: { label: 'Reset password', url },
    footer,
  })

  const text = plainText([
    `Reset your ${APP_NAME} password.`,
    `Open this link to choose a new password (expires in 1 hour):`,
    url,
    `If you didn't request this, ignore this email.`,
  ])

  return { subject, html, text }
}

export function passwordChangedEmail({
  email,
  resetUrl,
}: {
  email: string
  resetUrl: string
}) {
  // Post-event notification — fired AFTER the password is already changed.
  // Sent to the same address that owns the account, so a legitimate user who
  // just changed their own password will recognise it, and a victim of an
  // account takeover will see the breach and can recover via the reset link.
  const subject = `Your ${APP_NAME} password was changed`
  const heading = `Password changed`
  const intro = `The password for <strong>${email}</strong> was just changed on ${APP_NAME}.`
  const followup = `If you made this change, no action is needed. <strong>If you didn't, your account may be compromised</strong> — reset your password now and review your active sessions.`
  const footer = `For your safety, all other sessions were signed out automatically.`
  const preheader = `Password changed for ${email}.`

  const html = layout({
    preheader,
    heading,
    paragraphs: [intro, followup],
    cta: { label: 'Reset password', url: resetUrl },
    footer,
  })

  const text = plainText([
    `Your ${APP_NAME} password was just changed.`,
    `If you didn't do this, reset your password now: ${resetUrl}`,
    `For your safety, all other sessions were signed out automatically.`,
  ])

  return { subject, html, text }
}

export function magicLinkEmail({ url }: { url: string }) {
  const subject = `Your ${APP_NAME} sign-in link`
  const heading = `Sign in to ${APP_NAME}`
  const intro = `Click the button below to sign in. This link expires in 5 minutes.`
  const fallback = `If the button doesn't work, copy this URL into your browser:<br><span style="color:${MUTED}; word-break:break-all;">${url}</span>`
  const footer = `If you didn't request this, you can safely ignore this email.`
  const preheader = `Sign in to ${APP_NAME}.`

  const html = layout({
    preheader,
    heading,
    paragraphs: [intro, fallback],
    cta: { label: 'Sign in', url },
    footer,
  })

  const text = plainText([
    `Sign in to ${APP_NAME}.`,
    `Open this link to sign in (expires in 5 minutes):`,
    url,
    `If you didn't request this, you can safely ignore this email.`,
  ])

  return { subject, html, text }
}
