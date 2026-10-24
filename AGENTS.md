# Project instructions

## Project map

- Astro pages: `src/pages/` (Portuguese at `/`, English at `/en/`). Keep both public languages; admin is Portuguese.
- React interfaces: `src/components/`; shared client logic: `src/lib/`; translations: `src/i18n/`.
- Public shelter configuration: `src/config/shelter.ts`. Keep secrets out of this browser-visible module.
- Fictional dogs/traits: `src/data/demoDogs.ts`; original illustrations: `public/illustrations/`; theme tokens: `src/styles/global.css`.
- Optional Bun API: `server/paws-api.ts`, configuration: `server/config.ts`; clean schema: `database/`; local tooling: `scripts/`; tests: `tests/`.

## Safe modes and configuration

- Preserve the backend-free demo: `PUBLIC_API_URL` defaults blank, forms stay disabled, and admin writes are unavailable. Never substitute an external service or mailto/payment fallback.
- Use only an explicitly configured backend you control. Follow `docs/backend.md` for a dedicated local PostgreSQL database and API; starting the API alone must not enable forms or email.
- Generate fresh local credentials with `bun run setup:local`; it creates a private `.env` and refuses to overwrite one. Never commit `.env`, credentials, uploads or database exports. `.env.example` contains only safe configuration examples.
- Public forms require both `shelter.forms.enabled` and backend `PAWS_FORM_ENABLED` opt-in. Keep `PAWS_FORM_EMAIL_DRY_RUN=true` for local tests. Preserve the UI distinction between stored dry-run submissions and delivered email; ambiguous responses are not success.
- Keep demo records fictional and assets redistributable. See `ASSETS-LICENSE.md` and `docs/provenance.md`; use `docs/customization.md` when changing branding or deployment configuration.

## Local verification

Use Bun 1.3.11 or newer from the project root:

```sh
bun install --frozen-lockfile
bun run check
bun test
bun run build
```

`bun dev` serves the static demo; `bun run preview` serves the build. `bun test tests/formSubmission.test.ts` checks the client form contract using synthetic HTTP responses, not real persistence or email. `bun run test:integration` requires an explicitly configured empty local `paws_test_*` database; read `docs/backend.md` before running it.

Keep changes scoped, preserve concurrent work, and report actual check failures. Publication and deployment require explicit authorization.
