# TESTING — end-to-end validation plan

Manual + automated plan to validate a fresh copy of the template before
forking it into a production SaaS. Allow ~70 min end-to-end.

Prerequisites:

- `pnpm install`
- `pnpm exec convex dev` run once (provisions the deployment)
- Convex environment variables set:
  - `BETTER_AUTH_SECRET`
  - `SITE_URL` (`http://localhost:3000` locally)
  - `RESEND_API_KEY` + `RESEND_FROM` + `RESEND_TEST_MODE=true` in dev
  - `ANTHROPIC_API_KEY` (default model: `claude-haiku-4-5`)
- `.env.local` filled in (`VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`)
- 2 browsers (or 1 browser + 1 incognito window) ready for multi-tenant tests

## Level 1 — Build & smoke (automated, 2 min)

| #  | Step          | Command                  | Expected result               |
| -- | ------------- | ------------------------ | ----------------------------- |
| B0 | Toolchain pin | `pnpm --version`         | Matches `packageManager` in `package.json` exactly. Run this **first**: on a mismatch B1–B3 fail with `ERR_PNPM_IGNORED_BUILDS`, which blames esbuild rather than the pnpm version |
| B1 | Typecheck     | `pnpm typecheck`         | Exit 0, no errors             |
| B2 | Lint          | `pnpm lint`              | Exit 0, 0 warnings            |
| B3 | Build         | `pnpm build`             | Bundle written to `.output/`  |
| B4 | Smoke E2E     | `pnpm test:smoke`        | All scenarios pass            |
| B5 | Prod cookies  | `pnpm test:cookies`      | `albo.session_token` has Secure+HttpOnly+SameSite=Lax+Max-Age≈604800 |
| B6 | Skills intact | `pnpm sync:skills:verify` | `Vendored skills match skills-lock.json.` (exit 0) — offline, covers the `SKILL.md` files **and** their `references` |
| B6b | Skills up-to-date | `pnpm sync:skills:check` | `Skills up to date with upstream.` (exit 0) — network. Two distinct failures, both exit 2: `~ N skills drifted` (upstream changed) and `✗ … N skills could not be checked` (404 or network — the skill is tracked by nothing) |

B2–B3, B6 and B6b also run in CI on every PR (`.github/workflows/ci.yml`,
B6 via the `skills-verify` job, B6b via `skills-drift`). CI covers B0
implicitly: `pnpm/action-setup@v4` is given no `version:`, so it installs the
`packageManager` version and cannot drift from local.
B4–B5 remain local: they require a provisioned Convex deployment.

## Level 2 — Auth (6 min)

UI minutiae (exact text, spinners, skeletons, aria-label) are not listed
here — they fall under visual CI + typecheck. This level covers only
behaviours that can **silently regress**.

Test with a fresh user "Alice" (`alice@test.local`).

| #   | Step                                                   | Expected result                                                                   |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| A1  | `/register` → submit, onboarding org "Acme"            | Redirects to `/app/acme`, user created, `superAdmin: true` (first user). If `DEV_NOTIFY_EMAIL` is set, a "[albo] New signup: …" email arrives in that inbox (1× per new user, not on re-login). |
| A2  | Sign out → re-sign in correct                          | Redirects to `/app/acme` (last org via `lastOrgSlug`)                              |
| A3  | Sign in with wrong password                            | Inline destructive `<Alert>` above the form (not a toast). No session.            |
| A4  | `/app/acme` unauthenticated                            | Redirects to `/login` (bare — the app never generates `?redirect=`, so the return URL is **not** preserved; see `KNOWN_ISSUES.md` § "A return-URL search param needs the URL parser") |
| A5  | `/app/me` → change password                            | Success toast **+ "Password changed" email** (anti-takeover) + other sessions invalidated |
| A6  | Magic link for registered + unregistered email         | Identical privacy-respecting toast. No `users` row created for unknown email.     |
| A7  | Forgot → reset chain (email → token → new password)    | Sign-in with new password works. All pre-reset sessions invalidated.              |
| A8  | `/reset-password?token=expired` (or no token)          | Card "Invalid or expired link" + primary CTA "Send a new reset link"              |
| A9  | `/register` with already-registered email              | **Same** "Check your inbox" screen as a new signup (anti-enumeration), no email sent |
| A10 | Rate-limit (sign-in 6×, sign-up 4×, magic 4× /60s)    | "Too many attempts…" toast via classifier (no raw BA message)                     |
| A11 | `/app/me` → change email                               | **Approval email** arrives at the **current** address (anti-takeover), not the new one |
| A12 | Password constraints (`/register` + `/reset-password`) | <12 chars → Zod block. HIBP leak → "appeared in known data breaches". zxcvbn meter visible. |
| A13 | Password match feedback `/reset-password`              | Match → green ✓ "Passwords match". Mismatch → red case-sensitive hint.           |
| A14 | Resend (verification & reset)                          | 2nd email arrives if address exists. Neutral privacy-respecting toast.            |
| A15 | Network error (offline) on magic-link + forgot         | Inline `<Alert>` "Network error" (no misleading false "link sent").               |
| A16 | `/app/me` Sessions → list + Revoke + "Sign out others" | Current session = "Current" badge, no Revoke button. Revoking others works. "Sign out other devices" asks confirmation then invalidates all except current. |
| A17 | **Cross-tab persistence** (localhost regression)       | Sign in on tab A → open tab B on `/app/acme` → stays logged in. Hard-refresh each tab 3× → still logged in. |
| A18 | Onboarding org with reserved slug (`admin`, `api`, `me`) | Inline "This slug is reserved" feedback below the input. Submit toast "slug_reserved". |
| A19 | Onboarding org with already-taken slug                 | Inline "This slug is already taken" feedback in real time (before submit). Submit toast "slug_taken". |
| A20 | **Google sign-in** — without `GOOGLE_CLIENT_ID/SECRET` | `/login` + `/register`: **no** "Continue with Google" button or separator (clean template, no errors). |
| A21 | **Google sign-in** — with credentials + redirect URI in Google Console (`${SITE_URL}/api/auth/callback/google`) | Button visible. New user → redirects to `/app`, `users` row created. Email matching an existing password account → **no** duplicate `users` row (email dedup). |
| A22 | Google OAuth failure (cancelled / error)               | Returns to `/login?error=…` → toast "Couldn't sign in with that provider".        |
| A22b | **Google in prod** — after `pnpm run setup:prod` (Google creds present in dev) | `convex env list --prod` contains `GOOGLE_CLIENT_ID`; prod redirect URI added to the same Google client; button visible on prod domain, sign-in works. |
| A24 | **Open redirect** — sign in from `/login?redirect=https://evil.com`, then from `/login?redirect=/%09/evil.com` (tab-smuggling) | Both land on `/app`, **never** off-site. The hostile param is dropped silently — normal login page, no error screen. Repeat with `//evil.com` and `/\evil.com`. |
| A25 | **Return URL preserved** — sign in from `/login?redirect=/app/acme/items` | Lands on `/app/acme/items` (internal paths still work — the guard rejects origins, not paths). |

> **A23+ (known gaps)**: no "Password changed" email on the
> `/forgot-password → /reset-password` flow, nor NewDeviceEmail — see
> `KNOWN_ISSUES.md` § "Post-event notification coverage" for the roadmap.

## Level 2 — Internationalisation i18n (8 min)

App is bilingual FR/EN. English by default, French when the browser/preferences
request it. Architecture details: `KNOWN_ISSUES.md` § "i18n (react-i18next) SSR".

| #   | Step                                                                  | Expected result                                                                                   |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| I1  | Browser in `en-US`, `lang` cookie cleared, visit `/`                 | Everything in English. `<html lang="en">`. No flash.                                              |
| I2  | Force `Accept-Language: fr-CA` (DevTools or `curl -H`), cookie cleared, reload `/` | **From the SSR HTML source** (View Source, JS disabled) everything is in French. `<html lang="fr">`. |
| I3  | Reload in FR several times                                            | Console **without** "Text content does not match" warning (no hydration mismatch).                |
| I4  | Language switcher (footer sidebar, connected, or corner of `/`)       | Instant FR↔EN toggle. `lang` cookie updated. Survives reload.                                     |
| I5  | Logged in, change language                                            | `users.preferredLanguage` patched (check Convex dashboard).                                       |
| I6  | Variants `fr-BE` / `fr-FR` / `fr`                                    | All → French (any fr variant).                                                                    |
| I7  | Emails (reset password, invitation) for a user with `preferredLanguage=fr` | Subject + body in French; for EN/no-pref user → English.                                    |
| I8  | Wrong credentials in FR / invalid form in FR                         | FR auth error message (via classifier); FR Zod messages.                                          |
| I9  | Regression grep: `git grep -nE "\"[A-Z][a-z]+ " src/routes src/components` | No hardcoded UI string outside `src/components/ui/*` (shadcn chrome).                       |

## Level 2 — App shell UI (10 min)

Logged in as Alice on `/app/acme/`.

| #    | Step                                                          | Expected result                                                   |
| ---- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| SH1  | `inset` sidebar (floating rounded card): Platform group at top; Members / Invitations / Settings pinned at bottom (`mt-auto`, no label) | OK; admin-only items hidden for "member" role |
| SH2  | Click `SidebarTrigger` (header) OR the `SidebarRail` (thin strip on the right edge of the sidebar) | Sidebar collapses to `icon`; `sidebar_state` cookie persists; org/profile icons not overwritten in `icon` mode |
| SH3  | Resize < 768px                                                | Sidebar switches to `Sheet` mobile, opened via burger             |
| SH4  | Navigate Dashboard → Items → Settings → Members              | Header breadcrumb updates on each route                           |
| SH5  | Dashboard: 4 KPI cards + AreaChart + PieChart + recent items  | Counts consistent with real `items.list` / `listMembers`          |
| SH6  | Dark mode toggle (sun/moon icon in header)                    | Page switches light ↔ dark, sidebar + charts adapt               |
| SH7  | Theme picker (sidebar footer) → choose Blue / Emerald / Violet | Primary + chart-1 change; survives reload (localStorage)          |
| SH8  | Org switcher (sidebar header), org **without** a logo         | Initial (first letter) centered in the rounded square; lists orgs; click switches route + persists `lastOrgSlug` |
| SH9  | NavUser (sidebar footer) → profile / switch org / sign out    | **Round** avatar; without photo, first+last initials (e.g. `BB`); same destinations as before the refactor |
| SH10 | AI button in header (or ⌘J / Ctrl+J)                          | Toggles the AI panel (desktop rounded box / mobile overlay); state persists via the `ai_panel_state` cookie |
| SH11 | Open a page taller than the viewport (e.g. long Items list)   | The `inset` frame stays fixed to viewport height; scroll happens **inside** the frame, rounded bottom edge always visible |
| SH12 | Unknown URL (e.g. `/app/acme/nope` or `/nope`)                | Styled 404 card (FR/EN by locale) + back-home button              |
| SH13 | Dashboard / Items on initial load                             | Animated skeletons (KPI, recent items, table) — no naked "Loading…" text |
| SH14 | "What's new" button (sidebar footer, badge visible on first visit) | Dialog previews the 3 most recent dated FR/EN entries; badge disappears after opening and does not return on reload |
| SH15 | "What's new" dialog → "See all updates" (`/app/$orgSlug/changelog`) | Dedicated page lists the full history newest-first, FR/EN by locale; browser tab title reflects the locale |

## Level 2 — Data table items (5 min)

| #   | Step                                                 | Expected result                                                   |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| T1  | Global filter ("Filter items…" field)                | Reduces rows in real time (title/description/createdBy)           |
| T2  | Sort by "Created at" (click header → dropdown)       | Asc/Desc works, indicator visible                                 |
| T3  | Pagination (create >10 items)                        | next/prev/first/last buttons + page size 10/20/30/50              |
| T4  | Multi-select via checkbox                            | Counter "X of N row(s) selected" + "Delete X" button if admin     |
| T5  | Bulk delete (admin only)                             | Confirms, deletes all, success toast                              |
| T6  | "New item" → Dialog → submit                         | Item created, dialog closes, row appears at top (real-time)       |
| T7  | Row actions (`…` menu) → Edit / Delete               | Edit opens the same Dialog in update mode; Delete asks confirmation |

## Level 2 — Multi-tenant (15 min)

Still logged in as Alice. Prepare a second browser for Bob.

| #   | Step                                                        | Expected result                                                     |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| M1  | `/app/acme/settings/invitations` → invite `bob@test.local`  | Email sent, listed as pending                                       |
| M2  | Browser 2 (incognito) → open the invitation link            | `/accept-invite/<token>` accessible unauthenticated                 |
| M3  | Sign up Bob via the invitation flow                         | Bob created, automatically a member of Acme with "member" role. **No email-verification step**: the invite token pre-verifies the email (token-gated), Bob is signed in and lands on `/app/acme` directly |
| M4  | Bob visits `/app/acme/items`                                | Sees the list (empty or Alice's items), can create                  |
| M5  | Alice changes Bob's role → "admin"                          | Persists, Bob sees the updated badge                                |
| M6  | Bob creates a second org "Beta"                             | Switches to `/app/beta`, Alice is NOT a member                      |
| M7  | Alice navigates to `/app/beta` directly                     | Redirects to `/app` or 403                                          |
| M8  | Items isolated: Alice sees Acme items only                  | No Beta items on Alice's side                                       |
| M9  | Switch org via top-bar dropdown                             | Routes recalculated, items reloaded                                 |
| M10 | Bob (Acme admin) deletes an item created by Alice           | Allowed (admin override on creator-only)                            |
| M11 | Non-admin member tries to delete another user's item        | Error "forbidden", no deletion                                      |

## Level 3 — Invitations edge cases (8 min)

| #  | Step                                                       | Expected result                                                     |
| -- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| I1 | Invite an email already a member                           | Error "already_member", no duplicate                                |
| I2 | Invite the same email twice (both pending)                 | Rejected or replaces the invitation, no duplicate                   |
| I3 | Accept an expired invitation (force `expiresAt` in past), not yet a member | Error "expired", no member added                          |
| I4 | Re-open an invite link already accepted (still a member)   | **No error**: idempotent no-op, re-lands on `/app/<org>` (the accept effect can fire twice / second tab — replayable) |
| I5 | Accept invitation with a different account than the one invited | `/accept-invite` shows the "wrong account" switch card; a forced backend `accept` for a non-member with a mismatched email throws "email_mismatch" |
| I6 | Spam 25 invitations in < 1h                                | Rate-limit triggers → "rate_limited" after threshold                |
| I7 | Revoke a pending invitation                                | Disappears from list, link becomes invalid                          |
| I8 | Verify `RESEND_TEST_MODE=true` sends no real email         | Convex logs show "skipped (test mode)"                              |
| I9 | **Token-gated security** — sign up at `/register` with NO valid invite token (normal signup) | Email is **not** pre-verified: verification email sent, `emailVerified` stays false until the link is clicked. A signup whose `inviteToken` is absent/stale/for another email never bypasses verification |
| I10 | Email-match casing — invite `Bob@Test.local`, accept signed in as `bob@test.local` | Accepted (match is case- and whitespace-insensitive on both sides) |
| I11 | Sign up from `/register?redirect=/accept-invite/<token>` (not the inline accept page) | Lands **in the org** (`/app/<org>`), not stuck on `/app`: token-gated signup → signin → full nav to the accept page, which attaches the member. Parity with the inline `/accept-invite` flow |

## Level 3 — Items CRUD (8 min)

| #  | Step                                                   | Expected result                                                   |
| -- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| P1 | Create item via form                                   | Appears instantly in the list                                     |
| P2 | Open the app in a second tab → create item from tab A  | Tab B sees the item without refresh (Convex real-time)            |
| P3 | Edit item → save                                       | Title/description updated everywhere                              |
| P4 | Delete item by its creator                             | Disappears                                                        |
| P5 | Delete another user's item as a member                 | Blocked                                                           |
| P6 | Empty title / > 120 chars                              | Server-side validation error                                      |
| P7 | Description > 2000 chars                               | Error "description_too_long"                                      |
| P8 | Items invisible from another org (cf. M8)              | Isolation confirmed                                               |

## Level 4 — Uploads (5 min)

| #  | Step                                                    | Expected result                                                   |
| -- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| U1 | `/app/me` → drag/drop avatar (PNG < 5 MB)               | Upload OK, avatar visible in top bar                              |
| U2 | Avatar > 20 MB                                          | Rejected (Convex cap)                                             |
| U3 | `/app/acme/settings/general` → upload org logo          | Logo visible in top bar and member list                           |
| U4 | Replace an existing logo                                | Old one replaced, no orphan (check `_storage`)                    |

## Level 4 — Account lifecycle (8 min)

| #  | Step                                                    | Expected result                                                   |
| -- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| L1 | `/app/me` → change email                                | Verification email sent to the old address                        |
| L2 | Click the verification link                             | Email updated, sessions still valid                               |
| L3 | `/app/me` → delete account                              | Confirmation email sent                                           |
| L4 | Click the link in the delete email                      | Convex user purged, memberships removed, BA user deleted          |
| L5 | Deleted user attempts `/login`                          | Auth fails                                                        |

## Level 4 — Super-admin (5 min)

| #   | Step                                               | Expected result                                                   |
| --- | -------------------------------------------------- | ----------------------------------------------------------------- |
| SA1 | `/app/admin` accessible only for `superAdmin: true` | Bob (non-SA) → 403/redirect                                      |
| SA2 | List all users across all tenants                  | Exhaustive list, pagination works                                 |
| SA3 | Toggle `superAdmin` on another user                | Persists, the other user sees `/app/admin`                        |
| SA4 | Last-SA guard: remove own SA flag when sole SA     | Error "cannot_demote_last_superadmin"                             |
| SA5 | `purgeExcept` (dev cleanup) — dev only             | Keeps only the specified email, deletes everything else           |

## Level 5 — AI panel (10 min)

| #   | Step                                                    | Expected result                                                   |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| C1  | Open `/app/acme`                                        | AI panel open by default in its rounded box (desktop right column); latest thread resumed, else empty state with suggestions |
| C1b | Press ⌘J / Ctrl+J (or the header AI button), then reload | Panel toggles; state persists across reload (cookie `ai_panel_state`) |
| C2  | Send a simple message ("ping")                          | Stream visible token by token; "Thinking…" before first token; no UI blocking |
| C2b | Ask for a formatted response ("bullet list + bold")     | Markdown rendered via streamdown (bullets, bold, inline code, tables) |
| C3  | Ask the agent "list my items"                           | `listItems` runs (read, no approval), collapsible tool call, response lists Acme items |
| C4  | "create an item titled Test"                            | `createItem` shows **Confirm / Reject** buttons; **Confirm** writes it and generation resumes; item visible in `/app/acme/items` |
| C4b | Repeat, then click **Reject**                           | "Action rejected", nothing written; agent acknowledges            |
| C5  | While a long answer streams, click **Stop**             | Generation aborts                                                 |
| C6  | Spam 30 messages in 1 min                               | `chatSend` rate-limit triggers (also gates approvals)             |
| C7  | New chat (+), rename and delete a conversation          | Title updates; thread + messages removed                          |
| C8  | From `/app/beta`, verify Acme threads are NOT listed    | Org isolation confirmed (scope `${orgId}:${userId}`)             |

## Level 6 — Security + deployment (5 min)

| #  | Step                                               | Expected result                                                   |
| -- | -------------------------------------------------- | ----------------------------------------------------------------- |
| S1 | No secret with `VITE_` prefix                      | `grep -r "VITE_.*SECRET\|VITE_.*KEY"` → empty                    |
| S2 | No top-level `process.env.X` in `src/`             | Check client-side bundle                                          |
| S3 | Security headers present (CSP, HSTS, etc.)         | `curl -I http://localhost:3000` → expected headers                |
| S4 | Better Auth CORS restricted to `BETTER_AUTH_URL`   | Request from another origin → blocked                             |
| S5 | Webhooks HMAC: modified payload → rejected         | Manual test with a tampered payload                               |
| S6 | `pnpm build` + `pnpm start` (local prod)           | The prod bundle runs without warnings                             |

## Quick dev seed

To save ~2 min of setup, a dev seed (called via `convex run`) can create
Alice (SA), Bob (member), an "acme" org, and 3 items. Write it in
`convex/admin.ts` as an `internalMutation` named `seedDev`, gated behind
`process.env.CONVEX_DEPLOYMENT !== 'production'`.

## Failure recovery

- Smoke fails → open `KNOWN_ISSUES.md` (Convex deployment / `pnpm rebuild esbuild`).
- Auth fails → check `BETTER_AUTH_SECRET` + `SITE_URL` on the Convex env.
- Emails not received → valid `RESEND_API_KEY` + `RESEND_TEST_MODE=false` to
  actually deliver.
- AI not streaming → `ANTHROPIC_API_KEY` + check `convex/agent.ts` (default
  model `claude-haiku-4-5`).
