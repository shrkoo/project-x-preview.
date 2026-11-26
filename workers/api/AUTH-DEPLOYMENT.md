# NOVYRA authentication deployment and diagnostics

## What the login route requires

Password login requires only:
- Worker binding `DB` pointing to the correct environment's D1 database.
- D1 tables `users`, `sessions`, and `auth_rate_limits`.
- The expected columns in `users`, `sessions`, `auth_rate_limits`, and `signup_verification_codes`; `/api/health` checks the login and verification columns too.
- Workers WebCrypto (`crypto.subtle` PBKDF2/SHA-256 and `crypto.getRandomValues`), which is native to the Workers runtime.

The `/api/health` endpoint also checks `signup_verification_codes` because it is required for the complete signup/verification flow. It reports binding/secret/configuration presence as booleans only and never returns secret values.

## Environment inventory

### Worker bindings
- `DB`: D1; required for login.
- `STORY_MEDIA`: KV namespace; required for story/media features, not password login.
- `ROOM_HUB`: Durable Object namespace; required for live rooms, not password login.
- `AI`: Workers AI binding; required for AI features, not password login.

### Worker secrets (set separately on Preview and Production)
- `TURNSTILE_SECRET_KEY`: required when signup validates Turnstile tokens; not used by password login.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: required for Google OAuth; not used by password login.
- `RESEND_API_KEY`: email provider option; used with `EMAIL_FROM`.
- `EMAIL_BRIDGE_SECRET`: email bridge option; used with `EMAIL_BRIDGE_URL`.
- `ADMIN_EMAIL`: optional; controls initial admin role assignment.

Email delivery requires either `RESEND_API_KEY` plus `EMAIL_FROM`, or `EMAIL_BRIDGE_URL` plus `EMAIL_BRIDGE_SECRET`.

### Plain-text Worker configuration
- `APP_URL`: public application origin.
- `WEBAUTHN_ORIGIN`: allowed WebAuthn origin.
- `GOOGLE_REDIRECT_URI`: Google OAuth callback URL.
- `REQUIRE_EMAIL_VERIFICATION`: string `true` or `false`.
- `EMAIL_FROM`: sender identity when using Resend.
- `EMAIL_BRIDGE_URL`: endpoint when using the email bridge.

### Frontend build-time variables
- `NEXT_PUBLIC_API_BASE`: API Worker base URL.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: public Turnstile site key (not a secret).

### CI/CD-only variables and GitHub Environment secrets
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`: required by GitHub Actions to apply Preview migrations and deploy the Preview Worker/Pages site.
- Preview GitHub Environment secrets consumed by the existing workflow: `PREVIEW_GOOGLE_CLIENT_ID`, `PREVIEW_GOOGLE_CLIENT_SECRET`, `PREVIEW_RESEND_API_KEY`, `PREVIEW_EMAIL_BRIDGE_URL`, `PREVIEW_EMAIL_BRIDGE_SECRET`, and `PREVIEW_ADMIN_EMAIL`.
- Preview GitHub Environment variable: `PREVIEW_EMAIL_FROM`.
- The workflow maps those Preview-prefixed names to the runtime Worker names listed above. They are not additional `env.*` names inside the Worker.

The current code does not use a JWT signing secret or session secret: sessions are random opaque tokens generated with WebCrypto, and only their SHA-256 hashes are stored in D1. Do not add `SESSION_SECRET` or `JWT_SECRET` merely to fix password login.

## Exact Wrangler commands

Run commands from `workers/api` after authenticating Wrangler.

### Apply migrations
Preview (isolated Preview D1 only):
```sh
npx wrangler d1 migrations apply novyra-preview-db --remote --config wrangler.preview.toml
```

Production (production D1 only; do not run as part of Preview testing):
```sh
npx wrangler d1 migrations apply project-x-main --remote --config wrangler.jsonc
```

### Set secrets

Set each applicable value independently in both environments. Use your own secret values; never paste them into source control or logs.

Preview:
```sh
printf '%s' "$TURNSTILE_SECRET_KEY" | npx wrangler secret put TURNSTILE_SECRET_KEY --config wrangler.preview.toml
printf '%s' "$GOOGLE_CLIENT_ID" | npx wrangler secret put GOOGLE_CLIENT_ID --config wrangler.preview.toml
printf '%s' "$GOOGLE_CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.preview.toml
printf '%s' "$RESEND_API_KEY" | npx wrangler secret put RESEND_API_KEY --config wrangler.preview.toml
printf '%s' "$EMAIL_BRIDGE_SECRET" | npx wrangler secret put EMAIL_BRIDGE_SECRET --config wrangler.preview.toml
printf '%s' "$EMAIL_BRIDGE_URL" | npx wrangler secret put EMAIL_BRIDGE_URL --config wrangler.preview.toml
printf '%s' "$ADMIN_EMAIL" | npx wrangler secret put ADMIN_EMAIL --config wrangler.preview.toml
```

Production:
```sh
printf '%s' "$TURNSTILE_SECRET_KEY" | npx wrangler secret put TURNSTILE_SECRET_KEY --config wrangler.jsonc
printf '%s' "$GOOGLE_CLIENT_ID" | npx wrangler secret put GOOGLE_CLIENT_ID --config wrangler.jsonc
printf '%s' "$GOOGLE_CLIENT_SECRET" | npx wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.jsonc
printf '%s' "$RESEND_API_KEY" | npx wrangler secret put RESEND_API_KEY --config wrangler.jsonc
printf '%s' "$EMAIL_BRIDGE_SECRET" | npx wrangler secret put EMAIL_BRIDGE_SECRET --config wrangler.jsonc
printf '%s' "$ADMIN_EMAIL" | npx wrangler secret put ADMIN_EMAIL --config wrangler.jsonc
```

Only set the provider credentials you actually use. `EMAIL_BRIDGE_URL` is already a plain-text Production `vars` value in `wrangler.jsonc`; Preview CI can inject its Preview-specific endpoint as a secret. If using Resend, configure `EMAIL_FROM` as a plain-text `vars` value in the matching Wrangler config. The Preview workflow already maps Preview GitHub Environment secrets into the Preview Worker; Production is intentionally not changed by this branch.

### Live logs

Preview:
```sh
npx wrangler tail novyra-preview-api --format pretty --config wrangler.preview.toml
```

Production (read-only log tail):
```sh
npx wrangler tail project-x-api --format pretty --config wrangler.jsonc
```

## Possible sources of HTTP 500

1. Missing or misnamed `DB` binding, wrong D1 database ID, or a Worker deployed with the wrong Wrangler config.
2. Missing migrations or schema drift in the environment being hit: missing `users`, `sessions`, or `auth_rate_limits`, or missing columns used by the login query/session insert. Preview and Production databases must be checked independently.
3. D1 query/insert failure, unavailable database, or D1 limits/errors while updating the rate-limit row, looking up the user, or inserting the session.
4. Malformed legacy user data causing PBKDF2 inputs to be invalid. Missing password salt/hash is now treated as invalid credentials (401), not an internal error.
5. Workers WebCrypto failure while deriving PBKDF2/SHA-256 or generating a token. The implementation uses native WebCrypto and no Node-only password-hash package.
6. Wrong environment variable names or config selection. The code expects `DB`, `REQUIRE_EMAIL_VERIFICATION`, and the exact names listed above.
7. Missing Google OAuth credentials affect Google sign-in only; missing Turnstile credentials affect signup only; missing email-provider credentials affect email sending/resend only. They should not cause password login to return 500.
8. Missing `STORY_MEDIA`, `ROOM_HUB`, or `AI` bindings affect their respective features, not the password login route. The project uses KV for `STORY_MEDIA`; no R2 binding is referenced by the Worker.
9. No `SESSION_SECRET` or `JWT_SECRET` is required by the current implementation.

## Test checklist

### Automated CI
- `npm run test:auth-login`: success, wrong password, unknown email with generic response, unverified email, rate limit, and D1 failure with request ID.
- Existing TypeScript check and production build.
- Preview deploy smoke test calls `GET /api/health` and fails unless the D1 binding and required tables exist.

### Preview
- Check `GET https://novyra-preview-api.projectx-novyratam.workers.dev/api/health`: `ok=true`, `database=connected`, and required table flags true.
- Tail Preview logs, then test a valid account, wrong password, unknown email, rate limiting, and an unverified account if Preview verification is enabled.
- Confirm the login response stores the session and navigates into the app; refresh and verify `/auth/me` restores the session.
- Confirm inline localized errors, password clearing/email retention, forgot-password flow, resend-code action, and conditional biometric visibility.

### Production (manual approval only)
- Verify Production `/api/health` and Production D1 migrations separately.
- Confirm the Production Worker uses `project-x-main` and Production secrets/configuration.
- Run one controlled successful login and one invalid-password test, then confirm logs contain request IDs but no passwords, tokens, or email addresses.
- This Preview branch workflow must never apply migrations to Production or deploy the Production Worker.
