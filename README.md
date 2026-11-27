# Homa AI

**Every moment, accounted for.**
A mobile-first finance experience with one account and two selectable workspaces: Personal and Business.

## Stack
- Next.js 15, React 19, TypeScript
- Tailwind CSS 3
- React Hook Form + Zod validation
- Lucide icons
- Cloudflare Pages static export (`out/`)

## Run locally
Requirements: Node.js 20+ and npm.
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Quality checks
```bash
npm run test:language-autonyms
npm run test:auth-translations
npm run test:regional-preferences
npm run test:regional-profile-schema
npm run typecheck
npm run build
```

## Cloudflare Pages preview deployment
1. Connect this repository to the existing Cloudflare Pages project.
2. Set the build command to `npm run build`.
3. Set the build output directory to `out`.
4. Set `NEXT_PUBLIC_API_BASE` to the preview API Worker URL for preview builds.
5. Keep preview Worker and D1 bindings separate from production. Do not point a preview build at the production database.

The Next.js configuration uses static export. Deploy the generated `out/` directory through the existing Pages project.

## Onboarding
The four-step onboarding is implemented in `app/components/NovyraSignupFlow.tsx`: welcome; a single-page account form; app-lock setup; workspace and currency selection; then success and dashboard entry.

Persian and Arabic use RTL layout. English, Turkish and German use LTR. Missing translation keys silently fall back to English. Country names are localized with `Intl.DisplayNames` and sorted in the selected locale.

Reusable components include Button, Input, Card, StepProgress, CountrySelect, PinPad, PatternLock and ModeSwitcher.

## Important integration boundaries
- Email/password registration and login use the existing Cloudflare Worker routes. The Worker remains the authentication authority.
- Google sign-in is intentionally a placeholder until OAuth client credentials, callback URLs and provider configuration are set. The button displays a localized setup notice; OAuth is not active.
- Company name is persisted in an owner-scoped Business workspace in the preview D1 database. Each account has at most one Personal and one Business workspace.
- PIN and pattern secrets are device-local app-lock settings, not account passwords. Biometric setup requires a secure context and a platform authenticator.
- Finance transactions are synchronized through authenticated, workspace-scoped Worker/D1 endpoints; local storage is used as an offline cache. The Worker verifies workspace ownership before reading or replacing transaction data.
- Empty-state dashboard figures are illustrative until the user records real transactions. The app must not present them as bank-linked balances.

## Safety and deployment assumptions
- This branch is a preview implementation; it does not change the production branch or production database.
- Do not merge or promote it to production until OAuth, company/workspace persistence, server-side workspace isolation, and end-to-end registration/email verification have been configured and tested.
## Existing Cloudflare Worker authentication (no Supabase/Firebase)

The Worker remains the source of truth for password authentication and bearer sessions. No Supabase or Firebase migration is used.

### Preview environment configuration

Set these values on the **preview Worker** only:

| Name | Type | Value / purpose |
|---|---|---|
| `APP_URL` | Worker variable | Exact Homa AI Pages preview origin, e.g. `https://feature-homa-auth-part1.novyra.pages.dev` |
| `REQUIRE_EMAIL_VERIFICATION` | Worker variable | `true` |
| `EMAIL_FROM` | Worker variable | Verified sender, e.g. `Homa AI <accounts@your-verified-domain.example>` |
| `GOOGLE_CLIENT_ID` | Worker variable | Google OAuth web client ID |
| `GOOGLE_REDIRECT_URI` | Worker variable | `https://YOUR-WORKER.workers.dev/auth/google/callback` |
| `TURNSTILE_SECRET_KEY` | Worker secret | Cloudflare Turnstile secret key |
| `RESEND_API_KEY` | Worker secret | Resend API key for verification and reset emails |
| `GOOGLE_CLIENT_SECRET` | Worker secret | Google OAuth client secret |

Set this on the **Cloudflare Pages preview build**:
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: the public Turnstile site key for the preview hostname.

If the existing email bridge is used instead of Resend, configure `EMAIL_BRIDGE_URL` as a Worker variable and `EMAIL_BRIDGE_SECRET` as a Worker secret; in that case `RESEND_API_KEY` is not required. Do not commit secret values.

### Provider setup
1. Create a Turnstile widget allowing the Pages preview hostname and add its site key to Pages plus its secret key to the preview Worker.
2. Verify the sender domain in Resend, create an API key, and set `EMAIL_FROM` to an address on that verified domain.
3. In Google Cloud Console create an OAuth 2.0 Web application. Add the exact Worker callback URL above as an authorized redirect URI. Add the Pages preview origin to authorized JavaScript origins.
4. Apply the preview migration with `npx wrangler d1 migrations apply novyra-preview-db --remote --config workers/api/wrangler.preview.toml` from `workers/api/` (or use the matching config-relative command from the repository root). Deploy with `npx wrangler deploy --config workers/api/wrangler.preview.toml`; keep the production database and Worker untouched.

### Account lifecycle
- Signup creates a pending account, emails a 6-digit code, and does not issue a session until the code is verified. Codes expire after 10 minutes and allow at most five attempts.
- Resend is rate-limited per IP and enforces a 60-second per-account cooldown.
- The email-exists endpoint requires a valid Turnstile token and is rate-limited per IP. Do not expose it without Turnstile.
- Password reset uses the existing Worker reset-token flow; reset links are one-time and expire after one hour.
- Google OAuth uses the existing Worker authorization-code callback and the client consumes the returned session token.
- App-lock secrets remain device-local.

### Data deletion
Users must be able to request account deletion from the product's privacy/account settings. The deletion operation must authenticate the account owner, revoke sessions, and delete user-owned records and uploaded media according to the published retention policy. Do not treat browser-local logout as account deletion.

### Manual authentication regression checklist
- [ ] Register with a new email: no session is issued before code verification.
- [ ] Register with an existing password account: inline password-account card appears; Log in and Forgot password work.
- [ ] Register with an existing Google account: inline Google-account message and Continue with Google action appear.
- [ ] Submit a wrong 6-digit code: attempt count increments; account remains inactive.
- [ ] Submit an expired code: Worker rejects it; resend obeys the 60-second cooldown and IP limit.
- [ ] Disable network during signup/login: user sees a recoverable error and can retry without losing form values.
- [ ] Switch fa/ar and en/tr/de: labels and step numerals follow the selected locale and RTL/LTR direction.
- [ ] Search for Persian `ایران`, English `Iran`, native name and ISO code `IR`; each resolves to one Iran option.
- [ ] Verify autofill stays white with dark text in Chrome and Samsung Internet; test iOS Safari separately.
- [ ] Test Google OAuth using the exact registered callback URL and confirm the client consumes the Worker-issued session.
