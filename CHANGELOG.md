# Changelog

## 1.0.0 (2026-05-16)


### Features

* 3.1 — settings UI (general, members, invitations) ([5f64932](https://github.com/Albo-Club/albo-ouvre-boite/commit/5f649329937d9611ad80818a92df15329d5dcebd))
* 3.2 — user profile + global app bar ([641de1e](https://github.com/Albo-Club/albo-ouvre-boite/commit/641de1e26ce5328c6cf2111431c0a886c5fdeb14))
* 3.3 — super-admin /app/admin ([e4c9fad](https://github.com/Albo-Club/albo-ouvre-boite/commit/e4c9fad3dbbc0780b60c74af000786bb5e0a44e9))
* 3.4 — items CRUD multi-tenant example ([1115f80](https://github.com/Albo-Club/albo-ouvre-boite/commit/1115f809985f59677e53e3b79d0ade8fc71c27e8))
* 3.5 — AI backend (Convex Agent + Anthropic + /api/chat stream) ([55f39bc](https://github.com/Albo-Club/albo-ouvre-boite/commit/55f39bc9a4dc3f1cc04687d0803cadd06781e73b))
* 3.6 — AI chat sidebar (JALON phase 3) ([6d5abc6](https://github.com/Albo-Club/albo-ouvre-boite/commit/6d5abc6f052914222d37f57b7cce6d385d36dae7))
* 4.1 — rate-limiter on invitations, magic-link, chat ([0937305](https://github.com/Albo-Club/albo-ouvre-boite/commit/09373059cfae4ed0bcbd7db60909285282994543))
* 4.2 — Sentry (front-end) ([3d830e3](https://github.com/Albo-Club/albo-ouvre-boite/commit/3d830e38277857a1ad5010830d809c5cf00e8764))
* 4.3 — runtime security baseline ([7dea04f](https://github.com/Albo-Club/albo-ouvre-boite/commit/7dea04f6f50352a4c23317aa4c49656a43aa721b))
* 4.4 — skills sync script + SessionStart hook ([aef7358](https://github.com/Albo-Club/albo-ouvre-boite/commit/aef735860a9af09e0bf13fb13654ca0c64aab7c4))
* 4.5 — CLI rebrand (pnpm run init &lt;name&gt;) ([d3c2f2d](https://github.com/Albo-Club/albo-ouvre-boite/commit/d3c2f2d361ef16ce5c4370fb2d1f34e98d6ac37d))
* 4.6 — upgrade-template script ([62c40cf](https://github.com/Albo-Club/albo-ouvre-boite/commit/62c40cf30ee184e45229d46457063aa094eeb7c2))
* 4.7 — CI/CD (renovate + sync-skills + release-please) ([f82a29f](https://github.com/Albo-Club/albo-ouvre-boite/commit/f82a29fec36141602e29dfb4ce577fdec2bca452))
* agent tools (items CRUD) + Haiku 4.5 default + skills doc + TESTING.md ([8f02b51](https://github.com/Albo-Club/albo-ouvre-boite/commit/8f02b51e07d20941731bd6cac5ca5dad3dc63207))
* agent tools + Haiku 4.5 + skills doc + TESTING.md ([a234a15](https://github.com/Albo-Club/albo-ouvre-boite/commit/a234a15df7a582a53b8e60db3c74809cda721a4d))
* **auth:** Phase 0 + 1 hardening — security, password policy, UX ([0ec64cc](https://github.com/Albo-Club/albo-ouvre-boite/commit/0ec64cc001b893fd5707c6296cb7ce72452cc79c))
* **auth:** Phase 1 hardening — session config, 12-char policy, HIBP, strength meter, eye toggle ([ee47ccf](https://github.com/Albo-Club/albo-ouvre-boite/commit/ee47ccfddc55e06d6df54de1c4ea88a5f59ee18a))
* **auth:** Phase 2 UX — consistency, polish, sessions, post-event notif ([d3951a2](https://github.com/Albo-Club/albo-ouvre-boite/commit/d3951a281b7e32a63c8c657a5b0e26ea51f02fa0))
* **auth:** Phase 2 UX — consistency, polish, sessions, post-event notif ([986bb42](https://github.com/Albo-Club/albo-ouvre-boite/commit/986bb429f6e7488f7a09a4ef4ff85597a0a99465))
* **auth:** Phase 3 — localhost session fix, UX hardening, slimmer TESTING ([9cd2557](https://github.com/Albo-Club/albo-ouvre-boite/commit/9cd25575b72465ac5e43b7ec9c6b351a355de7d3))
* **auth:** Phase 3 — localhost session fix, UX hardening, slimmer TESTING ([5a52209](https://github.com/Albo-Club/albo-ouvre-boite/commit/5a522092ed37a288d1a53ae2184fa7afec1262f2))
* **demo:** coworking-flavored mocks + Locations map page ([#8](https://github.com/Albo-Club/albo-ouvre-boite/issues/8)) ([12b8fd8](https://github.com/Albo-Club/albo-ouvre-boite/commit/12b8fd83aac0eaa32ff537628ba7c3d46e3a1d27))
* gap 5 — Convex file storage for avatars + org logos ([8bf0271](https://github.com/Albo-Club/albo-ouvre-boite/commit/8bf027146bc72c854dae6db0b92249a194376e51))
* gap 6 — /app/me change email + magic link + delete account ([3964f1f](https://github.com/Albo-Club/albo-ouvre-boite/commit/3964f1f46d3ee804d6841e2d6b76f12af6094545))
* gap 9 — security headers via TanStack Start global middleware ([369d4d1](https://github.com/Albo-Club/albo-ouvre-boite/commit/369d4d1f65e1f852cc64d1c4a6f411ea00ac4f18))
* **onboarding:** one `pnpm setup` wizard replaces 8-step manual config ([#15](https://github.com/Albo-Club/albo-ouvre-boite/issues/15)) ([8bafd2b](https://github.com/Albo-Club/albo-ouvre-boite/commit/8bafd2b5bfd055571b26eb7944d83c24c439b4b6))
* phase 1 foundation — Tailwind v4 + shadcn + brand + folder layout ([5b6331d](https://github.com/Albo-Club/albo-ouvre-boite/commit/5b6331dad07f69df27017eeb18cb4f0e4c9eb43a))
* phase 2 — auth + multi-tenant orgs + invitations ([90b48f8](https://github.com/Albo-Club/albo-ouvre-boite/commit/90b48f832b89348ddcfb06ae64d24f3a4d163498))
* scripts/e2e-smoke.mjs — automated smoke checks ([bff8fb9](https://github.com/Albo-Club/albo-ouvre-boite/commit/bff8fb907e138d5c2118b529b92ffbc49e5abcb1))
* SITE_URL guard via APP_ENV ([#4](https://github.com/Albo-Club/albo-ouvre-boite/issues/4)) ([4176fd9](https://github.com/Albo-Club/albo-ouvre-boite/commit/4176fd9f14c71c4f6aa406cce5f9252dda3626a4))
* **ui:** shadcn lego app shell — sidebar, dashboard, data table, theme picker ([#3](https://github.com/Albo-Club/albo-ouvre-boite/issues/3)) ([9c8242b](https://github.com/Albo-Club/albo-ouvre-boite/commit/9c8242b295c4c44682745201593746d17ac98d51))


### Bug Fixes

* add Nitro plugin for Vercel deployment ([#2](https://github.com/Albo-Club/albo-ouvre-boite/issues/2)) ([d72e20d](https://github.com/Albo-Club/albo-ouvre-boite/commit/d72e20dc5696ad21ec92044d0f40d1bfefe7c4f4))
* **auth:** buffer request body before proxying to Convex ([#10](https://github.com/Albo-Club/albo-ouvre-boite/issues/10)) ([283842a](https://github.com/Albo-Club/albo-ouvre-boite/commit/283842a39fb32318d70252618b868e1d67d7e7f9))
* **auth:** harden sign-in flow + forgot-password + settings layout ([#9](https://github.com/Albo-Club/albo-ouvre-boite/issues/9)) ([72d1ee2](https://github.com/Albo-Club/albo-ouvre-boite/commit/72d1ee2636950f0f94aedeea5dc7e074484255f3))
* **auth:** Phase 0 hardening — rate-limit, change-email approval, anti-enumeration ([ea153b1](https://github.com/Albo-Club/albo-ouvre-boite/commit/ea153b129d6871aac506df8d98200d0abc883f8e))
* **auth:** prevent duplicate users with same email ([#6](https://github.com/Albo-Club/albo-ouvre-boite/issues/6)) ([f4597e8](https://github.com/Albo-Club/albo-ouvre-boite/commit/f4597e864fbc938acf136522de2a1aa898403a64))
* **settings:** match peer routes' shell pattern (flex-1, no max-w-4xl) ([#12](https://github.com/Albo-Club/albo-ouvre-boite/issues/12)) ([107cead](https://github.com/Albo-Club/albo-ouvre-boite/commit/107cead926e152725aa6e1338ba6502494074c58))
