# Paws Platform 🐾

A fictional animal shelter starter built with Astro, React and Tailwind CSS. Browse **Paws Meadow** in Portuguese or English, try the adoption questionnaire, and customize it for a shelter you have permission to represent.

**The default is a static demo, not a real shelter service.** All dogs, stories and figures are fictional. Public forms, contact/payment destinations and admin writes are disabled. There is no live shelter fallback and no backend or email account is needed to explore it.

## Quick start: static demo

Install [Bun](https://bun.sh/) 1.3.11 or newer, then in this project folder:

```sh
bun install --frozen-lockfile
bun dev
```

Open <http://localhost:4321>. No `.env` is required; `PUBLIC_API_URL` defaults to blank. `bun dev` runs only the frontend. To test a production build:

```sh
bun run check
bun test
bun run build
bun run preview
```

The preview URL is printed by Astro (normally <http://localhost:4321>). A static build goes into `dist/`.

## Features

- Responsive landing, about, adoption and support pages in PT/EN.
- Searchable dog listings with size/sex filters, profiles, local illustrations, galleries, adopted status and foster notes.
- An adoption questionnaire with the existing scoring model and fictional traits; suggestions are not suitability guarantees.
- Counts derived from the demo dataset, or the optional configured API.
- Portuguese admin with authenticated create/edit/delete, adopt/unadopt, quiz traits and photo management when the backend is configured. Demo mode clearly reports that writes are unavailable.
- Contact, adoption, visit, volunteering, fostering and supply forms with explicit demo-disabled states. No mailto fallback.

## Two modes

| Mode | Reads | Writes | Delivery |
| --- | --- | --- | --- |
| Default demo | `src/data/demoDogs.ts` | Disabled | None |
| Optional local backend | Local PostgreSQL via loopback Bun API | Authenticated admin | Public forms off; email dry-run on |
| Real deployment | Your own reviewed configuration | Your responsibility | Requires explicit opt-in and SMTP setup |

For a working local admin, follow **[Optional backend setup](docs/backend.md)**. It creates a clean dedicated database; there are no production migrations or exports. This starter uses **PostgreSQL + filesystem storage, not Supabase**.

## Customize

- **Identity, descriptions, contact/address, public URL, social/donation destinations, fees, impact figures, forms:** `src/config/shelter.ts`. All of this is public; never put secrets there.
- **Demo dogs and traits:** `src/data/demoDogs.ts`. Database seed imports this same array; it does not overwrite existing records.
- **Branding and illustrations:** `public/illustrations/`; see [asset licensing](ASSETS-LICENSE.md).
- **Colors and typography:** `src/styles/global.css` (`@theme` tokens).
- **Pages/translations:** `src/pages/` and `src/i18n/`.
- **API environment:** `.env.example` documents every variable. Keep frontend `PUBLIC_API_URL` blank until the local backend works.

More details: [customization and deployment](docs/customization.md).

## Commands

| Command | Purpose |
| --- | --- |
| `bun dev` | Start the static demo frontend |
| `bun run check` | Astro/TypeScript check, then server/scripts/tests typecheck |
| `bun test` | Offline unit/contract tests; no production endpoints |
| `bun run build` | Build the static frontend |
| `bun run preview` | Preview the built frontend |
| `bun run setup:local` | Create a new private `.env` with generated local credentials; never overwrites |
| `bun run db:setup` | Apply the idempotent clean schema to your explicit local `DATABASE_URL` |
| `bun run db:seed` | Insert fictional demo dogs without overwriting existing rows |
| `bun run api` | Start the optional loopback API (requires database/auth configuration) |
| `bun run test:integration` | Real HTTP/PostgreSQL assertions in an explicit empty `paws_test_*` database |

## Architecture and limitations

Astro builds static pages; React islands load dog data and handle interactive controls. The optional Bun API uses a small PostgreSQL pool, bearer-token admin authentication, Sharp image conversion and local filesystem storage. Runtime uploads live in ignored `storage/`; deleted dogs' photos move into ignored `archive/`. Neither directory belongs in a public source repository.

The single-admin SHA-256 verifier and 14-day HMAC bearer tokens preserve the starter's simple authentication model. This is not a managed identity service: there is no password reset, MFA, per-user permissions or individual token revocation. Use a generated high-entropy password, protect browser storage from script injection and rotate the session secret to invalidate all tokens. The in-memory login/form rate limits reset on restart and apply globally on this loopback service. One API process owns media mutations; multi-instance writes are not supported. Filesystem/database changes are not one cross-resource transaction: maintain backups and inspect storage after an interrupted write. Submissions have no admin inbox UI or retry worker.

Default UI assets/fonts are local. No external analytics, database, photo service or remote form/payment destination is configured. This is a starter, not a production readiness or animal-welfare certification. Before real use, review accessibility, privacy/retention/consent, security, image rights, backups and adoption operations.

## License and provenance

The application code is offered under [MIT](LICENSE), following the earlier Paws Platform README's stated MIT license. That source had no separately tracked license file; [provenance notes](docs/provenance.md) record this limitation rather than claiming a verified historical notice. New local demo illustrations are covered separately in [ASSETS-LICENSE.md](ASSETS-LICENSE.md). No third-party animal/person photos or records are included.
