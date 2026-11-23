# SSCK Photography admin portal: accounts, email verification and roles

How it works, in one paragraph: people register with their name, a personal username, their email and the shared passkey.
The account is created **pending**. We email a one-time magic link through **Brevo**; opening it (within 15 minutes) activates
the account as a **General User**. Only active accounts can sign in. Super Admins and Admins manage people from the portal's
**Users** tab, and a Super Admin can change the shared passkey from the **Passkey** tab.

## 1. Environment variables (Vercel > Project > Settings > Environment Variables)
Changing a variable only takes effect after a **redeploy**. Nothing below is ever sent to the browser or written in source code.

| Name | Required | Value / purpose |
|---|---|---|
| `BREVO_API_KEY` | yes | your Brevo API key (already configured) |
| `BREVO_FROM_EMAIL` | yes | `verify@auth.ssckphotography.com` |
| `BREVO_FROM_NAME` | optional | `SSCK Photography` (this is the default) |
| `APP_URL` | yes | `https://ssckphotography.com` (no trailing path). Verification links are built **only** from this, never from the request |
| `MAGIC_LINK_SECRET` | yes | random string, 32+ characters (already configured). Signs the links so forged ones are rejected before the database is touched |
| `DATABASE_URL` | yes | Neon / Postgres connection string |
| `AUTH_SECRET` | yes | random string, 32+ characters. Signs CSRF tokens, hashes IP addresses for rate limiting |
| `SHARED_PASSKEY_HASH` | first setup only | hash from `npm run hash-passkey`. Once a Super Admin saves a passkey in the portal, the database copy takes over and this is ignored |
| `APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET` | yes (inbox, votes) | as in the previous step; the secret must equal the Apps Script property `PROXY_SECRET` |
| `SESSION_IDLE_HOURS`, `SESSION_MAX_DAYS` | optional | defaults 12 and 7 |

No variable was renamed. `SITE_URL` (used by the chatbot) is untouched and unrelated.
Generate random values with `node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))"`.

## 2. Brevo
1. Brevo > Senders, Domains & Dedicated IPs: the domain `auth.ssckphotography.com` must be **authenticated** (DKIM and DMARC records added in your DNS), and `verify@auth.ssckphotography.com` must be a verified sender. Without this, Brevo rejects or spam-folders the messages.
2. Brevo > SMTP & API > API keys: the key goes into Vercel as `BREVO_API_KEY`. If the account has an IP allow-list ("Authorised IPs"), Vercel's addresses change, so leave it off or allow all.
3. The code calls `POST https://api.brevo.com/v3/smtp/email` with the header `api-key`. A failed send is logged as the HTTP status only (never the key, address or link).

## 3. Database (run once; safe to repeat; upgrades Step 1/2 data in place)
```
npm install
DATABASE_URL="postgres://..." npm run setup-db
```
What it changes: adds `email`, `email_verified_at`, `updated_at` to `users`; widens `role` to `super_admin | admin | editor | general`;
adds a unique index on `lower(email)`; creates `email_verification_tokens` (hash of each link, expiry, used-at) and `settings`
(holds the portal-managed passkey hash); adds `detail` to `auth_events`. **Existing accounts are kept.** They have no email on file
and still sign in; they show as "Not verified" in the Users tab until an administrator adds an email.

## 4. Make yourself Super Admin (once)
Your existing administrator account is now an **Admin**, which cannot change roles, delete users or change the passkey.
In Neon's SQL editor: `update users set role = 'super_admin' where username = 'your.username';`
Do this **before** relying on the Users and Passkey tabs. After that, everything is done from the portal.

## 5. Deploy
Upload this project to Vercel as usual (Git push or `vercel --prod`). The first deploy runs `npm install` because of `package.json`.
`auth-setup/` is excluded from the deployment by `.vercelignore`. If you change `SHARED_PASSKEY_HASH` or any variable, redeploy.

## 6. Check it works (manual test script)
1. `https://ssckphotography.com/api/auth` shows `{"ok":true,"configured":true,"emailConfigured":true}`. If `emailConfigured` is `false`, one of the five email variables is missing or malformed.
2. Open `/admin/`, choose **Sign Up**, register with a real address you can read. You see "Check your email" with a 60 second resend countdown.
3. The email "Verify your email for the SSCK Photography Admin Portal" arrives. Click **Verify Email**: you see "Email verified!" (the email also contains the 15 minute notice and the plain link).
4. A second email, "Welcome to the SSCPC Admin Portal!", arrives with your username (never the passkey).
5. Click the verification link again: "This link was already used". Wait 15 minutes on an unused link: "This link has expired", with a form to get a new one.
6. Back at `/admin/`, sign in: you land on the "Signed in" page as a General User. Before verifying, sign-in tells you to verify first and offers to resend.
7. As Super Admin: **Users** (search, edit, role, activate/deactivate, delete) and **Passkey** (change; everyone is signed out).

## 7. Roles
| | Super Admin | Admin | Editor | General User |
|---|---|---|---|---|
| Content sections, photos, Publish tab | yes | yes | yes | no |
| Inbox, votes | yes | yes | no | no |
| View users; edit details, activate/deactivate | all | Editors and General Users only | no | no |
| Change roles; delete users | yes | no | no | no |
| Shared passkey, Site settings | yes | no | no | no |

New registrations are always General Users; nothing a browser sends can change that. Nobody can change their own role or status
or delete themselves, a Super Admin account must be demoted before it can be deleted, and the last active Super Admin is protected.
Sensitive changes (role, deactivation, email, username) sign the affected person out immediately.

## 8. What is and is not enforced by the server
Enforced on the server for every request: sign-in, sessions, CSRF, the inbox, votes, user management and the passkey.
**Not covered:** Publishing website content still commits to GitHub using a token stored in the editor's own browser (as before). The portal hides
the Publish tab from General Users, but the server cannot stop someone who holds a valid GitHub token. Moving publishing server-side is the next step if you need
Editors to be technically (not just visually) limited.

## 9. Tests
`npm test` runs 90 backend tests (registration, magic links, Brevo request shape, sessions, roles, user management, passkey rotation, Apps Script gate).
They use an in-memory database and a recording mailer, so they prove the logic but **not** your live Neon database or live Brevo delivery; do section 6 once after deploying.
