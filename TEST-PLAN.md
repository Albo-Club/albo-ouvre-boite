# Test plan — Hardened auth (Phases 0 + 1)

This document is designed to validate the new authentication behaviours
**without going into implementation details**. Each scenario describes what
a real user should see, in the order they see it.

**Estimated time**: ~40 min to run through everything.
**Prerequisites**: a running dev environment (`pnpm dev`), access to a
mailbox (real or test), and a private/incognito browser for the second user.

---

## Overview — what changes for the user

| Before | After |
|--------|-------|
| Password accepted from 8 characters | **Minimum 12 characters** |
| No signal on password strength | A **strength meter** appears while typing (weak / fair / strong / excellent) |
| Very common passwords ("Password123") accepted | If the password appears in a **public breach**, it is rejected |
| Password field masked, no toggle | An **eye icon** lets you show/hide what you're typing |
| Unlimited sign-in / sign-up attempts | Beyond a few attempts in 1 minute, the API returns "too many attempts" |
| Registering with an already-taken email revealed the information | The same "check your inbox" screen is shown — an attacker can no longer enumerate registered emails |
| Email change with no confirmation to the old address | The old address receives an explicit approval email before any change |

---

## Journey 1 — Account creation (5 min)

### 1.1 Successful creation

1. Go to `/register`.
2. Enter a name, an email **never used before**, and password `myStrongPassphrase!`.
3. **While** typing the password: a 4-bar strength meter appears below the field with a label `Strength: Good / Excellent`.
4. Click the **eye icon** on the right of the field: the password becomes visible. Click again: it's hidden.
5. Submit.

✅ **Expected**: "Check your inbox" screen + a verification email arrives at the entered address.

### 1.2 Password too short

1. Repeat 1.1 but with an 11-character password.

✅ **Expected**: red message below the field "At least 12 characters". The "Sign up" button submits nothing until this is fixed.

### 1.3 Breached password

1. Repeat 1.1 with password `Password1234567`.
2. Type it, then click outside the field (to trigger the check).

✅ **Expected**: red message below the field "This password has appeared in known data breaches. Pick another."
**PM note**: this check hits a public service (HaveIBeenPwned) in anonymous mode — no part of the password is transmitted in plaintext.

### 1.4 Anti-fraud — already-taken email

1. Go to `/register` (private mode or another browser).
2. Enter the **same email** as in 1.1 + a new valid password.
3. Submit.

✅ **Expected**: **exactly the same** "Check your inbox" screen as in step 1.1 — no mention of the email already existing.
**Why it matters**: an attacker can no longer mass-test a list of emails to identify existing accounts.

---

## Journey 2 — Sign in (5 min)

### 2.1 Normal sign-in

1. Go to `/login`.
2. Enter the email + password created in 1.1.
3. Verify the eye icon works on this field too.
4. Submit.

✅ **Expected**: redirect to `/app`.

### 2.2 Anti-brute-force

1. Sign out.
2. On `/login`, try 6 times in under 1 minute with a **wrong** password.

✅ **Expected**: from the 6th attempt, message "Too many attempts — please wait a moment and try again."
**Why it matters**: without this protection, an attacker can test millions of passwords in a row.

### 2.3 Unverified account

1. Create a new account (journey 1.1) **without clicking the email link**.
2. Try to sign in with that account.

✅ **Expected**: blue/grey banner above the form "Email isn't verified yet" + "Resend verification email" button.

---

## Journey 3 — Forgotten password (5 min)

### 3.1 Reset request

1. `/login` → click "Forgot your password?".
2. Enter an existing account's email.
3. Submit.

✅ **Expected**: neutral confirmation screen, **identical** to the next case (3.2). A "Reset your albo password" email arrives in the inbox.

### 3.2 Request with unknown email

1. Repeat 3.1 with an email that doesn't exist.

✅ **Expected**: **exactly the same screen** as in step 3.1, no email sent.
**Why it matters**: without this, an attacker can discover whether an email has an account.

### 3.3 Effective reset

1. Click the link in the email received in step 3.1.
2. On the `/reset-password` page: enter a new password (12+ chars, observe the strength meter), then confirm it.
3. Submit.

✅ **Expected**: "Password updated" toast, redirect to `/login`, then successful sign-in with the new password.

### 3.4 Expired link

1. Wait 65 min after receiving the email in step 3.1, then click it.

✅ **Expected**: "Invalid or expired link" page with a "Send a new reset link" link.
**PM note**: also covered by Phase 2 — distinction between expired / already used.

---

## Journey 4 — Email change (5 min)

⚠ The most security-critical scenario.

### 4.1 Change request

1. Logged in as user A. Go to `/app/me`.
2. "Email" section → enter a new address.
3. Submit.

✅ **Expected**:
- An email **arrives at the CURRENT address** (the old one), not the new one.
- Subject: "Approve email change on albo".
- Body: "Someone requested to change your account email to <new>. If this was you, click below to approve."

### 4.2 Approval

1. Click the button in that email.

✅ **Expected**: a second email arrives at the **new** address to confirm it belongs to the user. Click → email updated on the account.

### 4.3 Anti-fraud — rejection

1. Repeat 4.1.
2. **Don't click** the approval email.

✅ **Expected**: after a few hours (BA token lifetime), the old address remains active, the change is abandoned.
**Why it matters**: without this double validation, an attacker who has stolen a session could change the email without the user being notified, then request a password reset on the new address → full account takeover.

---

## Journey 5 — Authenticated password change (3 min)

1. Logged in. Go to `/app/me`.
2. "Password" section:
   - Enter the current password.
   - Enter a new one (12+ chars, strength meter visible, HIBP active, eye icon clickable).
3. Submit.

✅ **Expected**: "Password changed" toast. All **other** open sessions (other browser, other device) are immediately signed out.

---

## Journey 6 — Magic link (2 min)

1. `/login` → leave the password field empty.
2. Enter email and click **"Email me a magic link"**.

✅ **Expected**:
- With a known email: email received, click → signed in.
- With an unknown email: same on-screen message, no email sent.

---

## Edge cases to check along the way

| Case | Expected |
|------|----------|
| Try 4 registrations in 1 min from the same browser | From the 4th: "Too many attempts" |
| Try 4 "forgot password" requests in 1 min on the same email | From the 4th: "Too many attempts" |
| Paste a password instead of typing it | Pasting works. Strength meter + HIBP check trigger on blur (click outside). |
| On mobile, tap the eye icon | Password becomes visible/hidden, focus stays on the field. |

---

## Test tools

- **Test mailbox**: Resend in test mode (`RESEND_TEST_MODE=true` in dev) — emails are not actually sent, but visible in Convex logs.
- **Pwned passwords**: use `Password1234567`, `qwerty1234567890`, `letmein123456` — all are in HIBP.
- **Reset rate-limit counter**: wait 1 minute, or for quick tests, restart `pnpm dev` (the BA `rateLimit` table is cleared).

---

## What to do if a scenario fails

1. **Open DevTools console** → Network tab → reproduce the scenario.
2. Capture the failing request response (`/api/auth/*`).
3. **Convex logs** in the dashboard: "Logs" section → filter on `[ba-api-error]`.
4. Open a ticket with: scenario, step, Network capture, Convex log.

---

## Out of scope (coming in Phase 2)

These points are **not** covered by Phases 0 and 1 and will be delivered later:

- The `/login` screen should redirect to `/app` if the user is already signed in.
- `/reset-password` should distinguish an **expired** link from an **already-used** one.
- After a successful reset, the user should be **automatically signed in** (instead of returning to `/login`).
- "Too many attempts" counter shown in the UI after 3 failed attempts (before the API returns 429).
- Auto-focus on the first field of each screen.
- Visual distinction (red border) between "error" and "success" states on reset screens.
