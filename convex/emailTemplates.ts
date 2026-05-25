/**
 * Email templates. Plain text + HTML are sent together (multipart/alternative)
 * — a strong anti-spam signal and required for accessibility.
 *
 * HTML uses inline styles since Gmail / Outlook strip <style> tags.
 * Layout is a single 560px column, mobile-safe.
 *
 * Each template is bilingual (en/fr). The recipient's locale is resolved from
 * their stored `preferredLanguage` (via `users.localeForEmail` or the caller's
 * own lookup); English is the fallback. Copy here is user-facing — keep it in
 * sync with the front-end `auth` namespace where the flows overlap.
 */

export type EmailLocale = 'en' | 'fr'

const APP_NAME = 'albo'
const BRAND = '#0f0f10'
const MUTED = '#6b6b73'
const BORDER = '#e7e7ea'
const BG = '#ffffff'
const BUTTON_BG = '#0f0f10'
const BUTTON_FG = '#ffffff'

function layout({
  locale,
  preheader,
  heading,
  paragraphs,
  cta,
  footer,
}: {
  locale: EmailLocale
  preheader: string
  heading: string
  paragraphs: Array<string>
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
<html lang="${locale}">
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

function plainText(parts: Array<string>): string {
  return parts.filter(Boolean).join('\n\n')
}

function pick<T>(locale: EmailLocale, copy: Record<EmailLocale, T>): T {
  return copy[locale] ?? copy.en
}

const urlFallback = (locale: EmailLocale, url: string) =>
  pick(locale, {
    en: `If the button doesn't work, copy this URL into your browser:<br><span style="color:${MUTED}; word-break:break-all;">${url}</span>`,
    fr: `Si le bouton ne fonctionne pas, copiez cette URL dans votre navigateur :<br><span style="color:${MUTED}; word-break:break-all;">${url}</span>`,
  })

export function invitationEmail({
  locale,
  inviterName,
  orgName,
  acceptUrl,
}: {
  locale: EmailLocale
  inviterName: string
  orgName: string
  acceptUrl: string
}) {
  const c = pick(locale, {
    en: {
      subject: `You're invited to ${orgName} on ${APP_NAME}`,
      heading: `Join ${orgName}`,
      intro: `<strong>${inviterName}</strong> invited you to join <strong>${orgName}</strong>.`,
      followup: `Click the button below to accept. This link expires in 7 days.`,
      footer: `If you didn't expect this invitation, you can safely ignore this email.`,
      preheader: `${inviterName} invited you to join ${orgName}.`,
      cta: 'Accept invitation',
      text: [
        `${inviterName} invited you to join ${orgName} on ${APP_NAME}.`,
        `Accept the invitation:`,
        acceptUrl,
        `This link expires in 7 days.`,
        `If you didn't expect this invitation, you can safely ignore this email.`,
      ],
    },
    fr: {
      subject: `Vous êtes invité à rejoindre ${orgName} sur ${APP_NAME}`,
      heading: `Rejoindre ${orgName}`,
      intro: `<strong>${inviterName}</strong> vous a invité à rejoindre <strong>${orgName}</strong>.`,
      followup: `Cliquez sur le bouton ci-dessous pour accepter. Ce lien expire dans 7 jours.`,
      footer: `Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.`,
      preheader: `${inviterName} vous a invité à rejoindre ${orgName}.`,
      cta: 'Accepter l’invitation',
      text: [
        `${inviterName} vous a invité à rejoindre ${orgName} sur ${APP_NAME}.`,
        `Accepter l’invitation :`,
        acceptUrl,
        `Ce lien expire dans 7 jours.`,
        `Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.`,
      ],
    },
  })

  const html = layout({
    locale,
    preheader: c.preheader,
    heading: c.heading,
    paragraphs: [c.intro, c.followup],
    cta: { label: c.cta, url: acceptUrl },
    footer: c.footer,
  })

  return { subject: c.subject, html, text: plainText(c.text) }
}

export function changeEmailVerificationEmail({
  locale,
  url,
  newEmail,
}: {
  locale: EmailLocale
  url: string
  newEmail: string
}) {
  // Sent to the CURRENT address. Acts as approval gate: a hijacked session
  // can request the change, but only the legitimate owner of the current
  // inbox can authorize it.
  const c = pick(locale, {
    en: {
      subject: `Approve email change on ${APP_NAME}`,
      heading: `Approve email change`,
      intro: `Someone requested to change your ${APP_NAME} account email to <strong>${newEmail}</strong>.`,
      followup: `If this was you, click below to approve. <strong>If not, ignore this email</strong> — your current address stays unchanged and the request is dropped.`,
      footer: `Your account email is updated only after you approve here.`,
      preheader: `Approve change to ${newEmail}.`,
      cta: 'Approve email change',
      text: [
        `Approve email change on ${APP_NAME}.`,
        `Someone requested to change your account email to ${newEmail}.`,
        `If this was you, open this link to approve:`,
        url,
        `If not, ignore this email — your current address stays unchanged.`,
      ],
    },
    fr: {
      subject: `Approuver le changement d'e-mail sur ${APP_NAME}`,
      heading: `Approuver le changement d'e-mail`,
      intro: `Quelqu'un a demandé à changer l'e-mail de votre compte ${APP_NAME} pour <strong>${newEmail}</strong>.`,
      followup: `Si c'était vous, cliquez ci-dessous pour approuver. <strong>Sinon, ignorez cet e-mail</strong> — votre adresse actuelle reste inchangée et la demande est annulée.`,
      footer: `L'e-mail de votre compte n'est mis à jour qu'après votre approbation ici.`,
      preheader: `Approuver le changement vers ${newEmail}.`,
      cta: 'Approuver le changement',
      text: [
        `Approuver le changement d'e-mail sur ${APP_NAME}.`,
        `Quelqu'un a demandé à changer l'e-mail de votre compte pour ${newEmail}.`,
        `Si c'était vous, ouvrez ce lien pour approuver :`,
        url,
        `Sinon, ignorez cet e-mail — votre adresse actuelle reste inchangée.`,
      ],
    },
  })

  const html = layout({
    locale,
    preheader: c.preheader,
    heading: c.heading,
    paragraphs: [c.intro, c.followup],
    cta: { label: c.cta, url },
    footer: c.footer,
  })

  return { subject: c.subject, html, text: plainText(c.text) }
}

export function deleteAccountVerificationEmail({
  locale,
  url,
  name,
}: {
  locale: EmailLocale
  url: string
  name?: string | null
}) {
  const c = pick(locale, {
    en: {
      subject: `Confirm account deletion on ${APP_NAME}`,
      heading: `Confirm account deletion`,
      intro: name
        ? `${name}, you asked to delete your ${APP_NAME} account.`
        : `You asked to delete your ${APP_NAME} account.`,
      followup: `This will permanently remove your profile, your organization memberships, and your access. <strong>This cannot be undone.</strong>`,
      footer: `If you didn't request this, ignore this email and nothing happens.`,
      preheader: `Confirm account deletion.`,
      cta: 'Delete my account',
      text: [
        name
          ? `${name}, you asked to delete your ${APP_NAME} account.`
          : `You asked to delete your ${APP_NAME} account.`,
        `This will permanently remove your profile and access. This cannot be undone.`,
        `Confirm by opening this link:`,
        url,
        `If you didn't request this, ignore this email.`,
      ],
    },
    fr: {
      subject: `Confirmer la suppression du compte sur ${APP_NAME}`,
      heading: `Confirmer la suppression du compte`,
      intro: name
        ? `${name}, vous avez demandé à supprimer votre compte ${APP_NAME}.`
        : `Vous avez demandé à supprimer votre compte ${APP_NAME}.`,
      followup: `Cela supprimera définitivement votre profil, vos adhésions aux organisations et votre accès. <strong>Cette action est irréversible.</strong>`,
      footer: `Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail et rien ne se passera.`,
      preheader: `Confirmer la suppression du compte.`,
      cta: 'Supprimer mon compte',
      text: [
        name
          ? `${name}, vous avez demandé à supprimer votre compte ${APP_NAME}.`
          : `Vous avez demandé à supprimer votre compte ${APP_NAME}.`,
        `Cela supprimera définitivement votre profil et votre accès. Cette action est irréversible.`,
        `Confirmez en ouvrant ce lien :`,
        url,
        `Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
      ],
    },
  })

  const html = layout({
    locale,
    preheader: c.preheader,
    heading: c.heading,
    paragraphs: [c.intro, c.followup],
    cta: { label: c.cta, url },
    footer: c.footer,
  })

  return { subject: c.subject, html, text: plainText(c.text) }
}

export function verificationEmail({
  locale,
  url,
}: {
  locale: EmailLocale
  url: string
}) {
  const c = pick(locale, {
    en: {
      subject: `Verify your email on ${APP_NAME}`,
      heading: `Verify your email`,
      intro: `Confirm this is your email address by clicking the button below. You'll be signed in automatically.`,
      footer: `If you didn't create an account, you can safely ignore this email.`,
      preheader: `Verify your email on ${APP_NAME}.`,
      cta: 'Verify email',
      text: [
        `Verify your email on ${APP_NAME}.`,
        `Open this link to verify and sign in:`,
        url,
        `If you didn't create an account, you can safely ignore this email.`,
      ],
    },
    fr: {
      subject: `Vérifiez votre e-mail sur ${APP_NAME}`,
      heading: `Vérifiez votre e-mail`,
      intro: `Confirmez qu'il s'agit bien de votre adresse e-mail en cliquant sur le bouton ci-dessous. Vous serez connecté automatiquement.`,
      footer: `Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.`,
      preheader: `Vérifiez votre e-mail sur ${APP_NAME}.`,
      cta: 'Vérifier l’e-mail',
      text: [
        `Vérifiez votre e-mail sur ${APP_NAME}.`,
        `Ouvrez ce lien pour vérifier et vous connecter :`,
        url,
        `Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.`,
      ],
    },
  })

  const html = layout({
    locale,
    preheader: c.preheader,
    heading: c.heading,
    paragraphs: [c.intro, urlFallback(locale, url)],
    cta: { label: c.cta, url },
    footer: c.footer,
  })

  return { subject: c.subject, html, text: plainText(c.text) }
}

export function resetPasswordEmail({
  locale,
  url,
}: {
  locale: EmailLocale
  url: string
}) {
  const c = pick(locale, {
    en: {
      subject: `Reset your ${APP_NAME} password`,
      heading: `Reset your password`,
      intro: `We received a request to reset your ${APP_NAME} password. Click the button below to choose a new one. This link expires in 1 hour.`,
      footer: `If you didn't request a password reset, ignore this email and your password stays unchanged.`,
      preheader: `Reset your ${APP_NAME} password.`,
      cta: 'Reset password',
      text: [
        `Reset your ${APP_NAME} password.`,
        `Open this link to choose a new password (expires in 1 hour):`,
        url,
        `If you didn't request this, ignore this email.`,
      ],
    },
    fr: {
      subject: `Réinitialisez votre mot de passe ${APP_NAME}`,
      heading: `Réinitialisez votre mot de passe`,
      intro: `Nous avons reçu une demande de réinitialisation de votre mot de passe ${APP_NAME}. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Ce lien expire dans 1 heure.`,
      footer: `Si vous n'avez pas demandé de réinitialisation, ignorez cet e-mail et votre mot de passe reste inchangé.`,
      preheader: `Réinitialisez votre mot de passe ${APP_NAME}.`,
      cta: 'Réinitialiser le mot de passe',
      text: [
        `Réinitialisez votre mot de passe ${APP_NAME}.`,
        `Ouvrez ce lien pour choisir un nouveau mot de passe (expire dans 1 heure) :`,
        url,
        `Si vous n'avez pas demandé cela, ignorez cet e-mail.`,
      ],
    },
  })

  const html = layout({
    locale,
    preheader: c.preheader,
    heading: c.heading,
    paragraphs: [c.intro, urlFallback(locale, url)],
    cta: { label: c.cta, url },
    footer: c.footer,
  })

  return { subject: c.subject, html, text: plainText(c.text) }
}

export function passwordChangedEmail({
  locale,
  email,
  resetUrl,
}: {
  locale: EmailLocale
  email: string
  resetUrl: string
}) {
  // Post-event notification — fired AFTER the password is already changed.
  const c = pick(locale, {
    en: {
      subject: `Your ${APP_NAME} password was changed`,
      heading: `Password changed`,
      intro: `The password for <strong>${email}</strong> was just changed on ${APP_NAME}.`,
      followup: `If you made this change, no action is needed. <strong>If you didn't, your account may be compromised</strong> — reset your password now and review your active sessions.`,
      footer: `For your safety, all other sessions were signed out automatically.`,
      preheader: `Password changed for ${email}.`,
      cta: 'Reset password',
      text: [
        `Your ${APP_NAME} password was just changed.`,
        `If you didn't do this, reset your password now: ${resetUrl}`,
        `For your safety, all other sessions were signed out automatically.`,
      ],
    },
    fr: {
      subject: `Votre mot de passe ${APP_NAME} a été modifié`,
      heading: `Mot de passe modifié`,
      intro: `Le mot de passe de <strong>${email}</strong> vient d'être modifié sur ${APP_NAME}.`,
      followup: `Si vous êtes à l'origine de ce changement, aucune action n'est requise. <strong>Sinon, votre compte est peut-être compromis</strong> — réinitialisez votre mot de passe maintenant et vérifiez vos sessions actives.`,
      footer: `Pour votre sécurité, toutes les autres sessions ont été déconnectées automatiquement.`,
      preheader: `Mot de passe modifié pour ${email}.`,
      cta: 'Réinitialiser le mot de passe',
      text: [
        `Votre mot de passe ${APP_NAME} vient d'être modifié.`,
        `Si vous n'êtes pas à l'origine de ce changement, réinitialisez votre mot de passe maintenant : ${resetUrl}`,
        `Pour votre sécurité, toutes les autres sessions ont été déconnectées automatiquement.`,
      ],
    },
  })

  const html = layout({
    locale,
    preheader: c.preheader,
    heading: c.heading,
    paragraphs: [c.intro, c.followup],
    cta: { label: c.cta, url: resetUrl },
    footer: c.footer,
  })

  return { subject: c.subject, html, text: plainText(c.text) }
}

export function magicLinkEmail({
  locale,
  url,
}: {
  locale: EmailLocale
  url: string
}) {
  const c = pick(locale, {
    en: {
      subject: `Your ${APP_NAME} sign-in link`,
      heading: `Sign in to ${APP_NAME}`,
      intro: `Click the button below to sign in. This link expires in 5 minutes.`,
      footer: `If you didn't request this, you can safely ignore this email.`,
      preheader: `Sign in to ${APP_NAME}.`,
      cta: 'Sign in',
      text: [
        `Sign in to ${APP_NAME}.`,
        `Open this link to sign in (expires in 5 minutes):`,
        url,
        `If you didn't request this, you can safely ignore this email.`,
      ],
    },
    fr: {
      subject: `Votre lien de connexion ${APP_NAME}`,
      heading: `Connexion à ${APP_NAME}`,
      intro: `Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien expire dans 5 minutes.`,
      footer: `Si vous n'avez pas demandé cela, vous pouvez ignorer cet e-mail.`,
      preheader: `Connexion à ${APP_NAME}.`,
      cta: 'Se connecter',
      text: [
        `Connexion à ${APP_NAME}.`,
        `Ouvrez ce lien pour vous connecter (expire dans 5 minutes) :`,
        url,
        `Si vous n'avez pas demandé cela, vous pouvez ignorer cet e-mail.`,
      ],
    },
  })

  const html = layout({
    locale,
    preheader: c.preheader,
    heading: c.heading,
    paragraphs: [c.intro, urlFallback(locale, url)],
    cta: { label: c.cta, url },
    footer: c.footer,
  })

  return { subject: c.subject, html, text: plainText(c.text) }
}
