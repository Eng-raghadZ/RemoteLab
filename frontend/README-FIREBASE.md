# Firebase Authentication Integration — Setup Guide

This adds Firebase Authentication + Firestore to the Remote Lab landing
page, exactly as scoped in `firebase_auth_prompt.md`: two predefined
student accounts, login by Student ID **or** university email, protected
Dashboard route, logout, and locked-down security rules. The existing
UI/design is untouched — only the login form's behavior was wired up.

## 1. What was added

```
src/
  firebase/
    firebase.js        Firebase app init (Auth + Firestore)
    auth.js             login/logout, Student ID → email resolution, error mapping
    firestore.js        read-only helpers (student directory lookup, profile read)
  context/
    AuthContext.jsx      React context exposing { user, profile, initializing }
  components/
    ProtectedRoute.jsx   redirects to "/" if not signed in
  pages/
    RemoteLabLanding.jsx your original landing page, with the login form wired up
    Dashboard.jsx         placeholder post-login page (Page 2 / Upload plugs in here)
  App.jsx                 router root: "/" (login) and "/dashboard" (protected)
firestore.rules            security rules (see below)
firebase.json, .firebaserc  Firebase CLI config
scripts/
  seedUsers.js             Admin SDK script that creates the 2 initial accounts
  package.json
.env.example
```

## 2. Install dependencies

```bash
npm install
```

`package.json` already lists `firebase` and `react-router-dom` alongside React and Vite — this is now a complete, runnable project (verified with `npm run build`).

## 3. Create the Firebase project

1. https://console.firebase.google.com → **Add project**.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (production mode is fine — rules below lock it down).
4. **Project settings → General → Your apps → Add app (Web)** → copy the config values.

## 4. Configure environment variables

```bash
cp .env.example .env
```

Fill in the six `VITE_FIREBASE_*` values from step 3. `.env` is
git-ignored — never commit real keys.

## 5. Deploy the security rules

```bash
npm install -g firebase-tools   # if you don't have it
firebase login
# edit .firebaserc and put your real project ID in place of YOUR_FIREBASE_PROJECT_ID
firebase deploy --only firestore:rules
```

### How the rules work (`firestore.rules`)

Two collections:

- **`users/{uid}`** — full profile (`studentId`, `email`, `fullName`, `role`, `active`).
  Only the signed-in owner can **read** their own doc. No client can create, update, or delete — ever.
- **`studentDirectory/{studentId}`** — a minimal public mapping of `studentId → email`, nothing else.

Firebase Auth requires an email to sign in, but a student typing their
**Student ID** hasn't authenticated yet — so something has to resolve
ID → email *before* login. `studentDirectory` is that minimal, deliberate
exception: it exposes **only** an email address per student ID, never
names, roles, or anything else, and it's **read-only** for every client.
Everything else in Firestore denies all client reads and writes by default.

> **If you'd rather expose zero public reads:** replace the
> `studentDirectory` lookup in `src/firebase/auth.js` with a Cloud
> Function (`onCall`) that does the same lookup server-side via the
> Admin SDK. The rest of the app doesn't need to change — this was kept
> out of the default setup only to avoid requiring a paid Blaze plan.

## 6. Create the two initial accounts

The client can never create users (see rules above) — only the Admin SDK can:

1. **Firebase Console → Project settings → Service accounts → Generate new private key** → save as `scripts/serviceAccountKey.json` (already git-ignored).
2. ```bash
   cd scripts
   npm install
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npm run seed
   ```

This creates, in both Firebase Auth and Firestore:

| Student ID | Email | Password |
|---|---|---|
| `202012345` | `student1@ptuk.edu.ps` | `Student@123` |
| `202012346` | `student2@ptuk.edu.ps` | `Student@123` |

The script is safe to re-run — it matches existing users by email and updates in place rather than duplicating them.

**Change the passwords** for anything beyond a demo/graduation-project
setting — these are in a plaintext prompt file and shouldn't be treated
as secret.

## 7. Add the background image

Drop `background4k.png` into `public/background4k.png` (Vite serves that folder from the site root).

## 8. Run it

```bash
npm run dev
```

Log in at `/` with either a Student ID or the full email, plus the
password above. On success you're redirected to `/dashboard`
(protected — visiting it directly while signed out bounces you back to
`/`). Already-signed-in users hitting `/` are auto-redirected to
`/dashboard`. Log out from the Dashboard to clear the session.

## 9. Behavior summary (mapped to the original request)

- ✅ Email/Password auth, exactly two accounts, no client self-signup.
- ✅ Single identifier field accepts Student ID or email.
- ✅ Student ID → email resolved via Firestore before signing in.
- ✅ Success → redirect to Dashboard, user's name displayed.
- ✅ Failure → friendly inline error, no redirect, form stays filled in.
- ✅ Login button disabled + spinner while a request is in flight.
- ✅ Session persists (Firebase default) until explicit logout.
- ✅ Protected routes redirect signed-out users; signed-in users are redirected away from `/`.
- ✅ Firestore rules: owner-only profile reads, zero client writes anywhere.
- ✅ Input validation + basic format checks before any network/Firestore call (defense against malformed/injection-style input — Firestore's SDK also parameterizes all queries, so traditional injection isn't possible here regardless).
- ✅ Existing visual design untouched — only the login form's logic changed.

## 10. Known scope notes

- **Dashboard is a placeholder.** The prompt's "redirect to Dashboard" and your project's "Page 2: File Upload Page" are the same next step — build the upload UI directly into `src/pages/Dashboard.jsx` (or rename the route) when you're ready for that page.
- **Forgot password** link in the UI is still a placeholder `href="#"` — wire it to Firebase's `sendPasswordResetEmail` when needed.
