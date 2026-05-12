# TESTING — plan de validation bout-en-bout

Plan manuel + automatisé pour valider une copie fraîche du template avant
de la dériver en SaaS de prod. Compter ~70 min de bout en bout.

Pré-requis :

- `pnpm install`
- `pnpm exec convex dev` lancé une fois (provisionne le déploiement)
- Variables d'environnement Convex configurées :
  - `BETTER_AUTH_SECRET`
  - `SITE_URL` (`http://localhost:3000` en local)
  - `RESEND_API_KEY` + `RESEND_FROM` + `RESEND_TEST_MODE=true` en dev
  - `ANTHROPIC_API_KEY` (modèle par défaut : `claude-haiku-4-5`)
- `.env.local` rempli (`VITE_CONVEX_URL`, `CONVEX_DEPLOYMENT`)
- 2 navigateurs (ou 1 navigateur + 1 fenêtre incognito) prêts pour les
  tests multi-tenant

## Niveau 1 — Build & smoke (automatisé, 2 min)

| # | Étape                  | Commande                | Résultat attendu                         |
| - | ---------------------- | ----------------------- | ---------------------------------------- |
| B1 | Typecheck              | `pnpm typecheck`        | Exit 0, aucune erreur                    |
| B2 | Lint                   | `pnpm lint`             | Exit 0, 0 warning                        |
| B3 | Build                  | `pnpm build`            | Bundle écrit dans `.output/`             |
| B4 | Smoke E2E              | `pnpm test:smoke`       | Tous les scénarios passent               |
| B5 | Skills à jour          | `pnpm sync:skills:check`| `0 skills drifted`                       |

## Niveau 2 — Auth (10 min)

Tester avec un user neuf "Alice" (`alice@test.local`).

| #  | Étape                                              | Résultat attendu                                                    |
| -- | -------------------------------------------------- | ------------------------------------------------------------------- |
| A1 | `/register` → submit email/password                | Redirige vers `/app`, user créé, `superAdmin: true` (premier user)  |
| A2 | Onboarding org (création première org "Acme")      | Redirige vers `/app/acme`                                            |
| A3 | Top bar affiche nom user + org                     | OK                                                                  |
| A4 | Sign out                                           | Redirige vers `/login`                                              |
| A5 | Sign in avec mauvais mot de passe                  | Erreur visible, pas de session                                      |
| A6 | Sign in correct                                    | Re-redirige vers `/app/acme` (dernière org)                          |
| A7 | `/app/me` → change password                        | Submit OK, sign out + re-sign in avec nouveau mdp marche             |
| A8 | Magic link via `/login`                            | Email reçu, clic → session ouverte                                   |
| A9 | Tenter `/app/acme` non authentifié (fenêtre fresh) | Redirige vers `/login` avec `?redirect=`                              |

## Niveau 2 — Multi-tenant (15 min)

Toujours connecté en tant qu'Alice. Préparer un 2e navigateur pour Bob.

| #   | Étape                                                       | Résultat attendu                                                    |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| M1  | `/app/acme/settings/invitations` → invite `bob@test.local`  | Email envoyé, listée en pending                                     |
| M2  | Browser 2 (incognito) → ouvrir le lien d'invitation         | Page `/accept-invite/<token>` accessible non-authentifié            |
| M3  | Sign up Bob via le flow d'invitation                        | Bob créé, automatiquement membre d'Acme avec rôle "member"          |
| M4  | Bob visite `/app/acme/items`                                | Voit la liste (vide ou items d'Alice), peut créer                   |
| M5  | Alice change rôle Bob → "admin"                             | Persiste, Bob voit le badge mis à jour                              |
| M6  | Bob crée une 2e org "Beta"                                  | Switch vers `/app/beta`, Alice n'est PAS membre                      |
| M7  | Alice tente `/app/beta` directement                         | Redirige vers `/app` ou 403                                          |
| M8  | Items isolés : Alice voit items d'Acme uniquement           | Aucun item de Beta côté Alice                                       |
| M9  | Switch org via dropdown top bar                             | Routes recalculées, items rechargés                                 |
| M10 | Bob (admin Acme) supprime un item créé par Alice            | Autorisé (admin override sur creator-only)                          |
| M11 | Member non-admin tente de supprimer item d'un autre         | Erreur "forbidden", pas de delete                                   |

## Niveau 3 — Invitations edge cases (8 min)

| #  | Étape                                                      | Résultat attendu                                                    |
| -- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| I1 | Inviter un email déjà membre                               | Erreur "already_member", pas de doublon                              |
| I2 | Inviter le même email 2× (en pending)                      | Refusé ou remplace l'invitation, pas de doublon                      |
| I3 | Accepter une invitation expirée (forcer `expiresAt` passé) | Erreur "invitation_expired", pas d'ajout                             |
| I4 | Accepter une invitation déjà acceptée                      | Erreur "already_accepted"                                            |
| I5 | Accepter invitation avec un autre compte que celui invité  | Refus ("wrong_account") OU rejet selon politique                     |
| I6 | Spammer 25 invitations en < 1h                             | Rate-limit déclenche → "rate_limited" après seuil                    |
| I7 | Révoquer une invitation pending                            | Disparaît de la liste, lien devient invalide                         |
| I8 | Vérifier que `RESEND_TEST_MODE=true` n'envoie pas d'email réel | Logs Convex montrent "skipped (test mode)"                       |

## Niveau 3 — Items CRUD (8 min)

| #  | Étape                                                  | Résultat attendu                                                  |
| -- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| P1 | Create item via formulaire                             | Apparaît instantanément dans la liste                              |
| P2 | Ouvrir l'app dans un 2e onglet → créer item depuis A   | Onglet B voit l'item sans refresh (real-time Convex)               |
| P3 | Edit item → save                                       | Title/description mis à jour partout                               |
| P4 | Delete item par son créateur                           | Disparaît                                                          |
| P5 | Delete item d'un autre user en tant que member        | Bloqué                                                             |
| P6 | Title vide / > 120 chars                               | Erreur de validation côté serveur                                  |
| P7 | Description > 2000 chars                               | Erreur "description_too_long"                                      |
| P8 | Items invisibles depuis une autre org (cf. M8)         | Isolation confirmée                                                |

## Niveau 4 — Uploads (5 min)

| #  | Étape                                                   | Résultat attendu                                                  |
| -- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| U1 | `/app/me` → drag/drop avatar (PNG < 5 MB)               | Upload OK, avatar visible top bar                                 |
| U2 | Avatar > 20 MB                                          | Refusé (cap Convex)                                               |
| U3 | `/app/acme/settings/general` → upload logo org          | Logo visible dans le top bar et la liste des membres              |
| U4 | Remplacer un logo existant                              | Ancien remplacé, pas d'orphelin (vérifier `_storage`)             |

## Niveau 4 — Account lifecycle (8 min)

| #  | Étape                                                   | Résultat attendu                                                  |
| -- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| L1 | `/app/me` → change email                                | Email de vérif envoyé à l'ancienne adresse                         |
| L2 | Clic lien de vérif                                      | Email mis à jour, sessions toujours valides                        |
| L3 | `/app/me` → delete account                              | Email de confirmation envoyé                                       |
| L4 | Clic lien dans email delete                             | User Convex purgé, memberships supprimées, BA user supprimé        |
| L5 | Le user supprimé tente `/login`                         | Auth échoue                                                       |

## Niveau 4 — Super-admin (5 min)

| #   | Étape                                              | Résultat attendu                                                  |
| --- | -------------------------------------------------- | ----------------------------------------------------------------- |
| SA1 | `/app/admin` accessible uniquement pour `superAdmin: true` | Bob (non-SA) → 403/redirect                                        |
| SA2 | Lister tous les users de tous les tenants         | Liste exhaustive, pagination OK                                    |
| SA3 | Toggle `superAdmin` sur un autre user              | Persiste, l'autre user voit `/app/admin`                           |
| SA4 | Last-SA guard : retirer son propre flag SA si seul SA | Erreur "cannot_demote_last_superadmin"                          |
| SA5 | `purgeExcept` (dev cleanup) — uniquement en dev    | Conserve uniquement l'email indiqué, supprime le reste             |

## Niveau 5 — AI chat (8 min)

| #  | Étape                                                   | Résultat attendu                                                  |
| -- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| C1 | Ouvrir le slide-over chat depuis `/app/acme`            | Premier thread créé automatiquement                                |
| C2 | Envoyer un message simple ("ping")                      | Stream visible token par token, pas de blocage UI                  |
| C3 | Demander à l'agent "liste mes items"                    | Tool `listItems` appelé, réponse contient les items d'Acme        |
| C4 | "crée un item titre Test"                               | Tool `createItem` appelé, item visible dans `/app/acme/items` après refresh |
| C5 | "supprime l'item Test" + confirmation                   | Tool `deleteItem` appelé, item disparaît                          |
| C6 | Spammer 30 messages en 1 min                            | Rate-limit `chatSend` se déclenche                                |
| C7 | Depuis `/app/beta`, vérifier que les threads d'Acme ne sont PAS listés | Isolation org confirmée (scope `${orgId}:${userId}`) |

## Niveau 6 — Sécurité + déploiement (5 min)

| #  | Étape                                              | Résultat attendu                                                  |
| -- | -------------------------------------------------- | ----------------------------------------------------------------- |
| S1 | Aucun secret avec préfixe `VITE_`                  | `grep -r "VITE_.*SECRET\|VITE_.*KEY"` → vide                       |
| S2 | Aucun `process.env.X` top-level dans `src/`        | Vérifier client-side bundle                                       |
| S3 | Headers de sécurité présents (CSP, HSTS, etc.)     | `curl -I http://localhost:3000` → headers attendus                 |
| S4 | CORS Better Auth limité à `BETTER_AUTH_URL`        | Requête depuis un autre origin → bloquée                          |
| S5 | Webhooks HMAC : payload modifié → rejeté          | Test manuel avec un payload tampered                              |
| S6 | `pnpm build` + `pnpm start` (prod local)           | Le bundle prod tourne sans warning                                 |

## Seed dev rapide

Pour gagner ~2 min de setup, un seed dev (à appeler via `convex run`)
peut créer Alice (SA), Bob (member), une org "acme" et 3 items. À écrire
dans `convex/admin.ts` sous un `internalMutation` `seedDev`, gated derrière
`process.env.CONVEX_DEPLOYMENT !== 'production'`.

## En cas d'échec

- Smoke échoue → ouvrir `KNOWN_ISSUES.md` (déploiement Convex / `pnpm rebuild esbuild`).
- Auth échoue → vérifier `BETTER_AUTH_SECRET` + `SITE_URL` côté Convex env.
- Emails non reçus → `RESEND_API_KEY` valide + `RESEND_TEST_MODE=false` pour
  recevoir réellement.
- AI ne stream pas → `ANTHROPIC_API_KEY` + vérifier `convex/agent.ts` (modèle
  par défaut `claude-haiku-4-5`).
