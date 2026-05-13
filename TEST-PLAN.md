# Plan de test — Auth durci (Phases 0 + 1)

Ce document est pensé pour valider les nouveaux comportements
d'authentification **sans rentrer dans la technique**. Chaque scénario
décrit ce qu'un utilisateur réel doit voir, dans l'ordre où il le voit.

**Durée estimée** : ~40 min pour tout passer.
**Pré-requis** : un environnement de dev qui tourne (`pnpm dev`), accès
à une boîte mail (vraie ou de test) et un navigateur en mode privé pour
le second utilisateur.

---

## Vue d'ensemble — ce qui change pour l'utilisateur

| Avant | Après |
|-------|-------|
| Mot de passe accepté à partir de 8 caractères | **Minimum 12 caractères** |
| Aucun signal sur la force du mot de passe | Une **jauge** s'affiche pendant la saisie (faible / moyen / fort / excellent) |
| Mots de passe ultra-courants (« Password123 ») acceptés | Si le mot de passe figure dans une **fuite publique**, il est refusé |
| Champ password masqué, pas de toggle | Un **œil** permet d'afficher/masquer ce qu'on tape |
| Tentatives infinies à l'inscription / connexion | Au-delà de quelques essais en 1 minute, l'API renvoie « trop de tentatives » |
| Tentative d'inscription avec un email déjà pris révélait l'info | Désormais le même écran « consultez votre boîte mail » est affiché — un attaquant ne peut plus dresser une liste d'emails inscrits |
| Changement d'email sans aucune confirmation à l'ancienne adresse | L'ancienne adresse reçoit un mail d'approbation explicite avant tout changement |

---

## Parcours 1 — Création d'un compte (5 min)

### 1.1 Création réussie

1. Aller sur `/register`.
2. Saisir un nom, un email **jamais utilisé**, un mot de passe `monMotDePasseSolide!`.
3. **Pendant** la saisie du mot de passe : une jauge à 4 barres apparaît sous le champ avec un label `Strength: Good / Excellent`.
4. Cliquer sur l'icône **œil** à droite du champ : le mot de passe devient visible. Recliquer : il redevient masqué.
5. Soumettre.

✅ **Attendu** : écran "Check your inbox" + un mail de vérification arrive sur l'adresse saisie.

### 1.2 Mot de passe trop court

1. Recommencer 1.1 mais avec un mot de passe à 11 caractères.

✅ **Attendu** : message rouge sous le champ « At least 12 characters ». Le bouton "Sign up" n'envoie rien tant que ce n'est pas corrigé.

### 1.3 Mot de passe issu d'une fuite

1. Recommencer 1.1 avec le mot de passe `Password1234567`.
2. Saisir, puis cliquer en dehors du champ (pour déclencher la vérif).

✅ **Attendu** : message rouge sous le champ « This password has appeared in known data breaches. Pick another. »
**Note PM** : ce check tape sur un service public (HaveIBeenPwned) en mode anonyme — aucune partie du mot de passe n'est transmise en clair.

### 1.4 Anti-fraude — email déjà pris

1. Aller sur `/register` (en mode privé ou autre navigateur).
2. Saisir le **même email** que dans 1.1 + un nouveau mot de passe valide.
3. Soumettre.

✅ **Attendu** : **exactement le même écran** "Check your inbox" qu'à l'étape 1.1 — aucune mention du fait que l'email existe déjà.
**Pourquoi c'est important** : un attaquant ne peut plus tester en masse une liste d'emails pour identifier des comptes existants.

---

## Parcours 2 — Connexion (5 min)

### 2.1 Connexion normale

1. Aller sur `/login`.
2. Saisir l'email + le mot de passe créés en 1.1.
3. Vérifier que l'œil fonctionne aussi sur ce champ.
4. Soumettre.

✅ **Attendu** : redirection vers `/app`.

### 2.2 Anti-brute-force

1. Se déconnecter.
2. Sur `/login`, tenter 6 fois en moins d'1 minute avec un **mauvais** mot de passe.

✅ **Attendu** : à partir de la 6ᵉ tentative, message « Too many attempts — please wait a moment and try again. »
**Pourquoi c'est important** : sans cette protection, un attaquant peut tester des millions de mots de passe à la chaîne.

### 2.3 Compte non vérifié

1. Créer un nouveau compte (parcours 1.1) **sans cliquer le lien email**.
2. Essayer de se connecter avec ce compte.

✅ **Attendu** : encart bleu/gris au-dessus du formulaire « Email isn't verified yet » + bouton « Resend verification email ».

---

## Parcours 3 — Mot de passe oublié (5 min)

### 3.1 Demande de réinitialisation

1. `/login` → clic « Forgot your password ? ».
2. Saisir l'email d'un compte existant.
3. Soumettre.

✅ **Attendu** : écran de confirmation neutre, **identique** au cas suivant (3.2). Un mail "Reset your albo password" arrive dans la boîte.

### 3.2 Demande avec email inconnu

1. Recommencer 3.1 avec un email qui n'existe pas.

✅ **Attendu** : **exactement le même écran** qu'à l'étape 3.1, aucun mail.
**Pourquoi c'est important** : sans ça, un attaquant peut découvrir si un email a un compte.

### 3.3 Réinitialisation effective

1. Cliquer le lien dans le mail reçu à l'étape 3.1.
2. Sur la page `/reset-password` : saisir un nouveau mot de passe (12+ chars, observer la jauge), puis le confirmer.
3. Soumettre.

✅ **Attendu** : toast « Password updated », redirection vers `/login`, puis connexion réussie avec le nouveau mot de passe.

### 3.4 Lien expiré

1. Attendre 65 min après réception du mail de l'étape 3.1, puis cliquer dessus.

✅ **Attendu** : page « Invalid or expired link » avec un lien « Send a new reset link ».
**Note PM** : couvert également par la Phase 2 — distinction expiré / déjà utilisé.

---

## Parcours 4 — Changement d'email (5 min)

⚠ Le scénario le plus critique côté sécurité.

### 4.1 Demande de changement

1. Connecté en tant qu'utilisateur A. Aller sur `/app/me`.
2. Section "Email" → saisir une nouvelle adresse.
3. Soumettre.

✅ **Attendu** :
- Un mail **arrive sur l'adresse ACTUELLE** (l'ancienne), pas la nouvelle.
- Sujet : "Approve email change on albo".
- Texte : "Someone requested to change your account email to <nouveau>. If this was you, click below to approve."

### 4.2 Approbation

1. Cliquer le bouton dans ce mail.

✅ **Attendu** : un second mail arrive sur la **nouvelle** adresse pour confirmer qu'elle est bien à l'utilisateur. Clic → email mis à jour côté compte.

### 4.3 Anti-fraude — refus

1. Recommencer 4.1.
2. **Ne pas cliquer** le mail d'approbation.

✅ **Attendu** : au bout de quelques heures (durée du token BA), l'ancienne adresse reste active, le changement est abandonné.
**Pourquoi c'est important** : sans cette double validation, un pirate qui aurait volé une session pourrait changer l'email sans que l'utilisateur en soit informé, puis demander une réinitialisation de mot de passe sur la nouvelle adresse → prise de contrôle complète du compte.

---

## Parcours 5 — Changement de mot de passe authentifié (3 min)

1. Connecté. Aller sur `/app/me`.
2. Section "Password" :
   - Saisir le mot de passe actuel.
   - Saisir un nouveau (12+ chars, jauge visible, HIBP actif, œil cliquable).
3. Soumettre.

✅ **Attendu** : toast "Password changed". Toutes les **autres** sessions ouvertes (autre navigateur, autre device) sont déconnectées immédiatement.

---

## Parcours 6 — Magic link (2 min)

1. `/login` → laisser le champ password vide.
2. Saisir email et cliquer **« Email me a magic link »**.

✅ **Attendu** :
- Avec un email connu : mail reçu, clic → connecté.
- Avec un email inconnu : même message à l'écran, aucun mail.

---

## Cas limites à vérifier en passant

| Cas | Attendu |
|-----|---------|
| Tenter 4 inscriptions en 1 min depuis le même navigateur | À partir de la 4ᵉ : "Too many attempts" |
| Tenter 4 demandes "mot de passe oublié" en 1 min sur le même email | À partir de la 4ᵉ : "Too many attempts" |
| Coller un mot de passe au lieu de le taper (champ password) | Le coller fonctionne. La jauge + le check HIBP se déclenchent au "blur" (clic dehors). |
| Sur mobile, taper sur l'icône œil | Le mot de passe devient visible/masqué, le focus reste sur le champ. |

---

## Outils de test

- **Mailbox de test** : Resend en mode test (`RESEND_TEST_MODE=true` en dev) — les mails ne sont pas réellement envoyés, mais visibles dans les logs Convex.
- **Mots de passe pwned** : utiliser `Password1234567`, `qwerty1234567890`, `letmein123456` — tous sont dans HIBP.
- **Reset du compteur de rate-limit** : attendre 1 minute, ou pour les tests rapides, restart `pnpm dev` (la table BA `rateLimit` se vide).

---

## Que faire si un scénario échoue

1. **Ouvrir la console DevTools** → onglet Network → reproduire le scénario.
2. Capturer la réponse de la requête fautive (`/api/auth/*`).
3. **Logs Convex** dans le dashboard : section "Logs" → filtrer sur `[ba-api-error]`.
4. Ouvrir un ticket avec : scénario, étape, capture Network, log Convex.

---

## Hors scope (à venir en Phase 2)

Ces points ne sont **pas** couverts par les Phases 0 et 1 et seront livrés ensuite :

- L'écran `/login` doit rediriger vers `/app` si l'utilisateur est déjà connecté.
- `/reset-password` doit distinguer un lien **expiré** d'un lien **déjà utilisé**.
- Après une réinitialisation réussie, l'utilisateur doit être **automatiquement connecté** (au lieu de revenir à `/login`).
- Compteur "trop de tentatives" affiché côté UI au bout de 3 essais infructueux (avant même que l'API ne renvoie 429).
- Auto-focus sur le premier champ de chaque écran.
- Distinction visuelle (cadre rouge) entre l'état "erreur" et "succès" sur les écrans de réinitialisation.
