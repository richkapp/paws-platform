# Optional local backend

Skip this for the static demo. Use a **new dedicated local PostgreSQL database**, never a real shelter database. PostgreSQL 14+ and Bun 1.3.11+ are required. The API, schema and test tools reject non-loopback database URLs and URL query overrides. API listening is always `127.0.0.1`; there is no public bind default.

## 1. Generate private local configuration

From the project root, **before copying `.env.example` to `.env`**:

```sh
bun run setup:local
```

This creates `.env` with owner-only permissions and prints a fresh random admin password and database-role password once. Save them locally in a password manager; do not paste them into tickets or commits. No password or hash is published in the sample. The generator refuses to overwrite `.env`. If you already have an environment file, keep it and configure the blank values from `.env.example` manually, or move your own file aside before generating a new one.

The generated login is `admin@example.invalid`, a reserved fictional address; it receives no mail. The password verifier is SHA-256 (a compatibility choice, not a password-hardening algorithm); use the random password, not a short human password. The 32-byte random session secret is independent of it. Change `PAWS_ADMIN_EMAIL` if desired and keep all `PAWS_*` credentials private. Only `PUBLIC_*` variables are exposed to browser builds.

## 2. Create your local role and database

Install/start PostgreSQL using your operating system's documentation. Open its administrative SQL console locally (for example `sudo -u postgres psql` on many Linux systems, or `psql postgres` for a local developer installation). Run:

```sql
CREATE ROLE paws_local LOGIN;
\password paws_local
CREATE DATABASE paws_local OWNER paws_local;
\q
```

At the password prompt, enter the **generated local PostgreSQL role password**. These commands intentionally create a new role/database and fail if the names already exist. Do not reuse an existing database. If these names are taken, choose new local names in both SQL and `.env`. Admin console access is only needed to create this isolated role/database, not to run the app. The role must not be superuser or have access to unrelated databases.

Generated `DATABASE_URL` targets `127.0.0.1:5432/paws_local`. Adjust only your local port/names as needed. Keep URL passwords percent-encoded if you set your own special-character password (the generator uses URL-safe characters).

## 3. Initialize and seed

```sh
bun run db:setup
bun run db:seed
```

Bun reads the project `.env` automatically. Setup creates `dogs`, `dog_photos` and `form_submissions` with constraints and indexes. It is idempotent for this clean schema, **not a migration tool for pre-existing applications**. Seed inserts the same fictional `demoDogs` displayed by the frontend. Repeat setup/seed safely: no existing dog is overwritten. Changing demo source later does not change an already-seeded row; edit it through admin, or create a new disposable database. There is no reset/delete-all command.

## 4. Start both processes

```sh
# Terminal 1 (project root)
bun run api
```

The API should print its loopback listening origin. In `.env`, set:

```dotenv
PUBLIC_API_URL=http://127.0.0.1:3314
```

```sh
# Terminal 2 (project root; restart after changing PUBLIC_API_URL)
bun dev
```

Open <http://localhost:4321/admin> and log in with the generated admin credentials. You can create/edit/delete fictional dogs, change adopted status, edit questionnaire traits and upload JPEG/PNG/WebP files. Public dog reads do not require authentication; all dog/media writes do. Uploaded files are decoded and converted into metadata-stripped JPEGs up to 1600px, at most 8 files per request and 5 MiB per input file. Names must produce a nonempty Latin-letter/number slug; duplicate slugs are rejected. Unknown trait fields are preserved; known scoring fields are validated.

`PAWS_PUBLIC_API_URL` is the origin used in uploaded-photo URLs; keep it aligned with the local API port. `PAWS_ALLOWED_ORIGINS` lists exact browser origins; defaults cover `localhost:4321` and `127.0.0.1:4321`, not arbitrary hosts. `PAWS_PROJECT_ROOT` defaults to the current project directory and controls `storage/dog-photos/` and `archive/dog-photos/`. These directories are ignored. Do not put symlinks in either media directory. Back up both the database and media; do not commit private uploads.

Stop both processes with Ctrl-C. To return to static demo, clear `PUBLIC_API_URL` and restart/rebuild the frontend.

## Public forms and email: separate switches

Starting the backend does **not** activate forms or email. Defaults are:

```dotenv
PAWS_FORM_ENABLED=false
PAWS_FORM_EMAIL_DRY_RUN=true
```

The UI also requires `shelter.forms.enabled=true` in `src/config/shelter.ts`. Only opt in once you have reviewed consent/privacy and the form destinations. For local synthetic tests, `PAWS_FORM_ENABLED=true` stores submissions in PostgreSQL but dry-run makes **no SMTP connection**. A successful dry-run returns `emailSent:false, dryRun:true`; it does not falsely report email delivery. `/health` exposes these non-secret flags. A disabled `/forms/submit` returns 503 without saving data. The API supports `contact`, `sponsorship`, `visit`, `adoption_interest`, `volunteer`, `supply_donation`, `foster_home`; no payment processing is implemented.

Real email needs an explicit `PAWS_FORM_EMAIL_DRY_RUN=false` and complete `PAWS_FORM_SMTP_HOST`, `PAWS_FORM_SMTP_PORT`, `PAWS_FORM_SMTP_SECURE`, `PAWS_FORM_FROM_EMAIL`, `PAWS_FORM_RECIPIENT_EMAIL`, plus SMTP user/password if the relay requires them. No sender/recipient default exists. Use an SMTP service you control, TLS as appropriate, and a reviewed retention policy. Email failure leaves the stored submission with `email_sent=false` and an error; there is no automatic retry and no mailto fallback. Do not test delivery against real recipients while learning.

## Real integration test

The runner uses real PostgreSQL, not mocked persistence. Create another **empty** dedicated local role/database with a database name beginning `paws_test_` (for example `paws_test_local`), using the same administrative-console pattern and a different generated password. Set `TEST_DATABASE_URL` privately in your shell or `.env` to that database, then:

```sh
bun run test:integration
```

It asserts schema/seed idempotence, disabled forms, login errors, unauthorized rejection, create/edit/adopt/unadopt, trait persistence, photo upload/read/rename/delete/archive, symlink protection and explicitly enabled form storage with email dry-run. It starts an ephemeral loopback API and uses an OS temporary directory for synthetic images; both are cleaned in `finally`. It refuses nonempty databases and leaves its synthetic SQL rows in your test database for inspection. Drop **only your named test database and role** with your local PostgreSQL admin when finished. Never point this at the app database or production. Unit tests (`bun test`) need no database.

## Troubleshooting

- Missing env: run the generator from the project root or complete private `.env`; do not publish its content.
- Connection/schema error: confirm PostgreSQL is running, your role/password/port are correct, then run `db:setup` and `db:seed` on a dedicated new DB. Startup errors include the PostgreSQL error code without printing the connection password.
- Demo still visible: set `PUBLIC_API_URL`, then restart Astro. When using a built site, rebuild it.
- Origin denied: add the exact local frontend origin to `PAWS_ALLOWED_ORIGINS`, restart API. Never use `*` to hide a mismatch.
- Photos unavailable: verify `PAWS_PUBLIC_API_URL`, storage permissions and no symlinks. API photo URLs are not static demo assets.
- Backend unavailable in browser: inspect the console/network; do not assume an apparent UI update proves persistence. Check a fresh API read.
