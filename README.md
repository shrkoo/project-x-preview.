# Novyra

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
- Company name is currently retained on the device during onboarding. The current Worker profile schema does not persist a company/workspace record; add a D1 migration and authenticated API contract before relying on it across devices.
- PIN and pattern secrets are device-local app-lock settings, not account passwords. Biometric setup requires a secure context and a platform authenticator.
- The current finance UI persists transaction and preference data in browser local storage. Before production multi-device bookkeeping, move financial records to authenticated, workspace-scoped Worker/D1 tables and enforce workspace ownership server-side. A client-side mode switch alone is not a security boundary.
- Dashboard figures are demonstration values until real financial records are connected.

## Safety and deployment assumptions
- This branch is a preview implementation; it does not change the production branch or production database.
- Do not merge or promote it to production until OAuth, company/workspace persistence, server-side workspace isolation, and end-to-end registration/email verification have been configured and tested.