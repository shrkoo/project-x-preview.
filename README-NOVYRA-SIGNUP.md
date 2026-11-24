# Novyra signup redesign

The root onboarding route now uses the four-step Novyra flow. The existing API worker remains the authentication authority.

## Requirements
- Node.js 20+
- npm

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Validate and build
```bash
npm run typecheck
npm run build
```

## Cloudflare Pages
Use the repository's existing Cloudflare Pages project and preview branch. Build command: `npm run build`. Output follows the existing Next.js static-export configuration. Set `NEXT_PUBLIC_API_BASE` to the intended API Worker URL for the environment. Keep preview and production API/database bindings separate.

## Authentication notes
- Registration uses the existing `POST /auth/register` contract and stores the returned session token.
- Login uses `GET /auth/password-salt` followed by `POST /auth/login`.
- Google sign-in redirects to the existing `/auth/google/start` route; provider credentials and callback configuration remain an environment/backend responsibility.
- PIN/pattern hashes are device-local app-lock credentials; biometric enrollment uses WebAuthn on supported devices.
- The selected workspace is stored as `accountType` and in `projectx-account-type`. A single user account is retained.

## Assumptions
- Existing Worker supports the current registration payload fields (email, name, country, currency, language, accountType, appLockType, appLockHash, salt, passwordHash).
- Business workspace metadata can be extended server-side; `companyName` is sent with registration but must be persisted by the Worker schema before it can be treated as authoritative.
- Dashboard routing remains owned by the existing authenticated app.
