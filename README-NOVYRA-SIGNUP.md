# Novyra onboarding and workspace implementation

See the root README for setup, validation and Cloudflare Pages deployment instructions.

## Implemented UI
- Responsive Novyra welcome screen, rounded-square N mark, slogan, language selector and three-phone visual preview.
- Single-page account form with names, email, country, password, confirmation, strength meter and inline validation.
- Four-step progress flow: account details, app lock, workspace selection and success.
- PIN keypad, pattern lock, and platform biometric enrollment prompt.
- Personal / Business workspace selector, currency selection and conditional company-name field.
- Profile settings include the reusable Personal / Business mode switcher.
- Localized interface for Persian, English, Arabic, Turkish and German; RTL for Persian and Arabic.
- Reusable Button, Input, Card, StepProgress, CountrySelect, PinPad, PatternLock and ModeSwitcher components.

## Integration boundaries
- Email/password registration and login use the existing Worker routes.
- Google sign-in is a localized placeholder until OAuth is configured.
- Company name is persisted in the Business workspace in the isolated preview D1 database.
- Finance transactions sync to workspace-scoped D1 tables through authenticated Worker routes; local storage is an offline cache.
- Demo dashboard figures are placeholders, not account balances.

## Local validation
```bash
npm install
npm run test:auth-translations
npm run typecheck
npm run build
```