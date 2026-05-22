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

| #  | Étape         | Commande                 | Résultat attendu              |
| -- | ------------- | ------------------------ | ----------------------------- |
| B1 | Typecheck     | `pnpm typecheck`         | Exit 0, aucune erreur         |
| B2 | Lint          | `pnpm lint`              | Exit 0, 0 warning             |
| B3 | Build         | `pnpm build`             | Bundle écrit dans `.output/`  |
| B4 | Smoke E2E     | `pnpm test:smoke`        | Tous les scénarios passent    |
| B5 | Cookies prod  | `pnpm test:cookies`      | `albo.session_token` a Secure+HttpOnly+SameSite=Lax+Max-Age≈604800 |
| B6 | Skills à jour | `pnpm sync:skills:check` | `0 skills drifted`            |

## Niveau 2 — Auth (6 min)

Les minutiae UI (texte exact, spinners, skeletons, aria-label) ne sont pas
listées ici — elles tombent sous le CI visuel + typecheck. Ce niveau
couvre uniquement les comportements qui peuvent **régresser silencieusement**.

Tester avec un user neuf "Alice" (`alice@test.local`).

| #   | Étape                                                  | Résultat attendu                                                                  |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| A1  | `/register` → submit, onboarding org "Acme"            | Redirige `/app/acme`, user créé, `superAdmin: true` (premier user)                |
| A2  | Sign out → re-sign in correct                          | Redirige `/app/acme` (dernière org via `lastOrgSlug`)                              |
| A3  | Sign in mauvais mdp                                    | Inline `<Alert>` destructive au-dessus du form (pas toast). Pas de session.       |
| A4  | `/app/acme` non authentifié                            | Redirige `/login?redirect=…`                                                       |
| A5  | `/app/me` → change password                            | Toast succès **+ email "Password changed"** (anti-takeover) + autres sessions invalidées |
| A6  | Magic link enregistré + non-enregistré                 | Toast privacy-respecting identique. Aucune `users` row créée pour email inconnu.   |
| A7  | Forgot → reset chain (email → token → nouveau mdp)     | Sign-in avec nouveau mdp marche. Sessions pré-reset toutes invalidées.            |
| A8  | `/reset-password?token=expired` (ou sans token)        | Card "Invalid or expired link" + CTA primary "Send a new reset link"               |
| A9  | `/register` avec email déjà enregistré                 | **Même** écran "Check your inbox" qu'un signup neuf (anti-enumeration), aucun email envoyé |
| A10 | Rate-limit (sign-in 6×, sign-up 4×, magic 4× /60s)     | Toast "Too many attempts…" via classifier (plus de message BA cru)                |
| A11 | `/app/me` → change email                               | Email **d'approbation** arrive à l'adresse **courante** (anti-takeover), pas à la nouvelle |
| A12 | Password constraints (`/register` + `/reset-password`) | <12 chars → Zod block. HIBP leak → "appeared in known data breaches". zxcvbn meter visible. |
| A13 | Password match feedback `/reset-password`              | Identiques → ✓ vert "Passwords match". Différents → rouge case-sensitive hint.    |
| A14 | Resend (verification & reset)                          | 2e email arrive si email existe. Toast neutre privacy-respecting.                  |
| A15 | Network error (offline) sur magic-link + forgot        | Inline `<Alert>` "Network error" (pas de fausse "link sent" trompeuse).            |
| A16 | `/app/me` Sessions → list + Revoke + "Sign out others" | Session courante = badge Current sans bouton Revoke. Revoke autres OK. "Sign out other devices" demande confirm puis invalide tout sauf l'actuelle. |
| A17 | **Cross-tab persistence** (régression localhost)        | Sign-in onglet A → ouvrir onglet B sur `/app/acme` → reste loggé. Hard refresh chaque onglet 3× → toujours loggé. |
| A18 | Onboarding org avec slug réservé (`admin`, `api`, `me`) | Feedback inline "This slug is reserved" sous l'input. Submit toast "slug_reserved". |
| A19 | Onboarding org avec slug déjà pris                      | Feedback inline "This slug is already taken" en temps réel (sans soumettre). Submit toast "slug_taken". |

> **A20+ (gaps connues)** : pas d'email "Password changed" sur le flow
> `/forgot-password → /reset-password` ni NewDeviceEmail — voir
> `KNOWN_ISSUES.md` § "Post-event notification coverage" pour la roadmap.

## Niveau 2 — App shell UI (10 min)

Connecté en tant qu'Alice sur `/app/acme/`.

| #    | Étape                                                          | Résultat attendu                                                  |
| ---- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| SH1  | Sidebar `inset` (carte flottante arrondie) : groupes Platform / Billing en haut ; Members / Invitations / Settings épinglés en bas (nav secondaire `mt-auto`, sans label) | OK ; items admin-only masqués si rôle "member"                     |
| SH2  | Clic sur `SidebarTrigger` (header) OU sur la `SidebarRail` (bande fine au bord droit de la sidebar) | Sidebar collapse en `icon` ; cookie `sidebar_state` persiste ; icônes orga/profil non écrasées en mode `icon` |
| SH3  | Redimensionner < 768px                                         | Sidebar passe en `Sheet` mobile, ouverture via burger              |
| SH4  | Naviguer Dashboard → Items → Locations → Calendar → Tasks → Billing | Breadcrumb du header se met à jour à chaque route             |
| SH5  | Dashboard : 4 KPI cards + AreaChart + PieChart + recent items  | Counts cohérents avec items.list / listMembers réels               |
| SH6  | Toggle dark mode (icône soleil/lune dans header)               | Page bascule light ↔ dark, sidebar + charts adaptés                |
| SH7  | Theme picker (footer sidebar) → choisir Blue / Emerald / Violet| Primary + chart-1 changent ; survit au reload (localStorage)       |
| SH8  | Org switcher (header sidebar), orga **sans** logo             | Initiale (1ʳᵉ lettre) centrée dans le carré arrondi ; liste les orgs ; clic switch route + persiste `lastOrgSlug` |
| SH9  | NavUser (footer sidebar) → profile / switch org / sign out     | Avatar **rond** ; sans photo, initiales prénom+nom (ex. `BB`) ; mêmes destinations qu'avant refonte |
| SH10 | Bouton AI dans header                                          | Ouvre le modal chat existant (non-régression)                      |
| SH11 | Ouvrir une page au contenu plus haut que l'écran (ex. Items long) | Le cadre `inset` reste calé sur la hauteur du viewport ; le scroll se fait **dans** le cadre, bord bas arrondi toujours visible |

## Niveau 2 — Data table items (5 min)

| #   | Étape                                                | Résultat attendu                                                  |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| T1  | Filtre global (champ "Filter items…")                | Réduit les rows en temps réel (title/description/createdBy)        |
| T2  | Tri par "Created at" (clic header → dropdown)        | Asc/Desc fonctionne, indicateur visible                            |
| T3  | Pagination (créer >10 items)                         | Boutons next/prev/first/last + page size 10/20/30/50                |
| T4  | Sélection multiple via checkbox                      | Compteur "X of N row(s) selected" + bouton "Delete X" si admin     |
| T5  | Bulk delete (admin only)                             | Demande confirmation, supprime tout, toast succès                  |
| T6  | "New item" → Dialog → submit                         | Item créé, dialog se ferme, ligne apparaît en haut (real-time)     |
| T7  | Actions row (menu `…`) → Edit / Delete               | Edit ouvre le même Dialog en mode update ; Delete demande confirm  |

## Niveau 2 — Pages démo (mock, 3 min)

| #   | Étape                                                | Résultat attendu                                                  |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| D1  | `/app/acme/billing` Overview                         | 3 cards (plan, next invoice, usage) + alert "demo data"            |
| D2  | `/app/acme/billing` Invoices                         | Table 8 lignes avec badges Paid/Pending/Failed colorés             |
| D3  | `/app/acme/billing` Payment methods → "Add card"     | Dialog s'ouvre (placeholder), ferme sans erreur                    |
| D4  | `/app/acme/calendar`                                 | Calendar avec points sous les dates ayant un event                 |
| D5  | Cliquer une date dans le calendar                    | Panneau droit liste les events du jour (mock)                      |
| D6  | `/app/acme/tasks`                                    | 3 colonnes kanban avec 9 tasks, badges priorité                    |
| D7  | Cliquer flèches `→` / `←` sur une task               | La carte se déplace de colonne (state local)                       |
| D8  | `/app/acme/map` (Locations)                          | Carte Leaflet de France + 8 pins colorés ; card "Portefeuille" à droite avec compte par statut |
| D9  | Cliquer un pin sur la carte                          | Popup s'ouvre avec titre, adresse, capacité, prix formaté, badge statut |
| D10 | Reload `/app/acme/map` 3-4 fois                      | Pas de flash blanc ni erreur d'hydratation (le composant Leaflet est monté en client-only via `useEffect`) |

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
