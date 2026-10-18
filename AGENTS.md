# AGENTS.md — capapvl.pt (CAPA Póvoa de Lanhoso)

## Hetzner Primary Workflow

- Active project work happens on Hetzner under `/home/deploy/projects/...`.
- GitHub is durable version history after meaningful changes are committed and pushed.
- Air `/Users/z/Projects/...` is a backup/mirror, not the active working root unless Z explicitly asks for Air-local work.
- If Z explicitly asks for Air-local work, pull the Air repo from GitHub before editing, commit/push from Air afterward, then pull/update the Hetzner repo before hosted agents continue on that repo.
- If an old prompt names `/Users/z/Projects/<repo>`, translate it to `/home/deploy/projects/<repo>` for active work after verifying the Hetzner root exists.

## Skills

### Frontend skill routing

- Before starting frontend work, load **`frontend`** for CAPA's Astro 5 + React 19 + Tailwind 4 stack rules.
- For visible UI/design changes, also load **`website-design-qa`** so screenshot QA, mobile QA, and Z's non-blocky visual bar are enforced.
- For new pages, redesigns, landing pages, or major visual-polish passes, also load **`ce-frontend-design`** for premium composition, motion, and implementation discipline.
- Do **not** load archived generic skills `designer` or `frontend-design` for routine CAPA work; their useful rules are consolidated into `website-design-qa` and `ce-frontend-design`.
- Load **`static-site-deployment`** only for build/deploy/live-verification work.

Dog shelter website for **CAPA Póvoa de Lanhoso** (Clube de Adoção e Proteção Animal), a Portuguese non-profit rescue/shelter/adoption organization. Built on the paws-platform open-source template.

**Live:** https://capapvl.org/ (Hetzner nginx static site + API proxy)
**Repo:** https://github.com/richkapp/paws-platform

---

## Current website runtime destination

- CAPA's public static site and API now run on `ubuntu-4gb-hel1-1` (Hetzner CX23, x86, 40 GB, Helsinki / `eu-central`), public IPv4 `2.29.9.89`.
- The former `ubuntu-16gb-hel1-1` / `65.21.156.73` is reserved for Hermes; do not use it as the CAPA website/API destination.

## Setup

```bash
bun install
cp .env.example .env   # set PUBLIC_CAPA_API_URL for local frontend work
bun dev                # http://localhost:4321
bun build              # builds to ./dist/
bun preview            # preview production build locally
```

---

## Stack & Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Astro 5 + React 19 islands |
| Styling | Tailwind CSS 4 (CSS-first @theme in src/styles/global.css) |
| Runtime | Bun |
| Backend | Hetzner Bun API + PostgreSQL (`capapvl_db`) plus committed public static fallback |
| Hosting | Hetzner nginx static site at `/home/deploy/apps/capapvl`; API proxied to loopback Bun service |

**Architecture pattern:**
- Astro static pages for public content (Home, About, Help/Donate, Adoption)
- React islands (client:visible) for dynamic content (dog listings, profiles, admin)
- Public dog listings and profiles load from the Hetzner API when available, but must keep the committed local fallback because external/backend outages have happened before.
- Static hosting constraint: no SSR, no dynamic routes → dog profile uses query param /cao?id=uuid

---

## Hetzner API

**API:** `https://api.capapvl.org` (Namecheap DNS points `capapvl.org`, `www`, and `api` to Hetzner `2.29.9.89`)
**Service:** `capapvl-api.service`
**Runtime:** Bun, `server/capa-api.ts`
**Database:** `capapvl_db` on local PostgreSQL
**Bind/security:** `server/capa-api.ts` must bind `127.0.0.1:3314`; public HTTPS access goes through nginx only. Do not widen the API to `0.0.0.0` or expose raw `3314` to fix connectivity.
**Lifecycle gotcha:** `/etc/systemd/system/capapvl-api.service` is enabled and uses `Restart=always`. Killing the Bun PID is not persistent; systemd respawns it. For intentional downtime, stop the unit with `sudo systemctl stop capapvl-api.service` and verify no listener on `127.0.0.1:3314`. Only disable the unit across reboot after Z explicitly approves that persistence change.

**2026-05-15 status:** The legacy Supabase project `amkwoeepuhlnjmybbnbo.supabase.co` returns NXDOMAIN from Hetzner and local DNS. Runtime Supabase usage has been migrated to the Hetzner API. Public pages still keep `src/data/capaDogs.ts` and static files under `public/images/dogs/` as a fallback.

**Admin:** `/admin` and `/en/admin` authenticate against the Hetzner API and write to `capapvl_db`. Photo uploads write to `public/images/dogs/{slug}/` on Hetzner and are served through the API image route.

### dogs table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| name | text | Not null |
| size | text | 'small' / 'medium' / 'large' |
| sex | text | 'male' / 'female' / null |
| age | text | Free text |
| description | text | Multi-line, parsed client-side |
| photo_url | text | Public URL to first API-served photo |
| is_adopted | boolean | Default false |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

### form_submissions table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, generated by API |
| kind | text | `sponsorship`, `mbway`, `visit`, `adoption_interest`, `volunteer`, `supply_donation`, or `foster_home` |
| locale | text | `pt` / `en` |
| source | text | Form surface, e.g. `footer`, `dog`, `home-sponsor-modal` |
| page_url | text | Page where the visitor submitted |
| context_label/context_value | text | Dog/shelter/modal context |
| name/email/phone/preferred_time/amount/business/contribution_method/message | text | Normalized visitor fields |
| payload | jsonb | Cleaned payload copy for recovery/debugging |
| email_sent | boolean | Whether SMTP delivery succeeded or dry-run accepted |
| email_error | text | SMTP/unconfigured error when delivery failed |
| created_at | timestamptz | Auto |

Run `scripts/create-form-submissions-table.sql` with PostgreSQL owner privileges before starting API code that expects this table; `capapvl_app` has select/insert/update grants only.

### Hetzner photo files
- Public read through the API image route; authenticated admin writes through the API upload/delete routes.
- Files live at `public/images/dogs/{slug}/photo-*.jpg` on Hetzner.
- Structure: `{slug}/photo-01.jpg`, `photo-03.jpg`, etc. (`photo-02` was the logo, all deleted)
- Slugs: lowercase, accents stripped (NFD normalization), spaces → hyphens

**Current data:** 99 public dog records in `src/data/capaDogs.ts`; 941 public dog photos committed under `public/images/dogs/{slug}/photo-*.jpg`, originally recovered from `/Users/z/capapvl-photos-backup` on 2026-05-15.

---

## Env Vars

```
PUBLIC_CAPA_API_URL=https://api.capapvl.org

# server-only (/etc/capapvl-api.env on Hetzner)
DATABASE_URL=postgres://capapvl_app:<password>@127.0.0.1:5432/capapvl_db
CAPA_ADMIN_EMAIL=<admin email>
CAPA_ADMIN_PASSWORD_SHA256=<sha256 password hash>
CAPA_SESSION_SECRET=<random secret>
CAPA_PUBLIC_API_URL=https://api.capapvl.org
CAPA_ALLOWED_ORIGINS=https://capapvl.org,https://www.capapvl.org,https://capapvl.pt,https://www.capapvl.pt,http://127.0.0.1:14324,http://127.0.0.1:4321
CAPA_PROJECT_ROOT=/home/deploy/projects/capapvl.pt
PORT=3314

# form delivery; if SMTP vars are absent, submissions persist and frontend falls back to mailto
CAPA_FORM_RECIPIENT_EMAIL=capa.geralpvl@gmail.com
CAPA_FORM_FROM_EMAIL='Richard Kappel <richard@richkapp.com>'
CAPA_FORM_SMTP_HOST=smtp.resend.com
CAPA_FORM_SMTP_PORT=587
CAPA_FORM_SMTP_USER=resend
CAPA_FORM_SMTP_PASSWORD=<Resend API key; do not commit>
CAPA_FORM_SMTP_SECURE=false
CAPA_FORM_EMAIL_DRY_RUN=false
```

.env is gitignored. Do not commit `/etc/capapvl-api.env` or any server-only secrets.

Hetzner security posture: local `.env` files are intentionally owner-only (`chmod 600`, `deploy:deploy`). Do not loosen permissions to "fix" access; agents running as `deploy` can still read them. The live API's server-only secrets belong in `/etc/capapvl-api.env`, not in repo files.

**Live form email delivery (2026-06-22):** CAPA uses RichKapp's verified Resend domain for SMTP. Sender is `Richard Kappel <richard@richkapp.com>` because Richard manages the site as CAPA's volunteer; recipient is `capa.geralpvl@gmail.com`; `server/capa-api.ts` sets `Reply-To` to the visitor's submitted email. Use Resend port `587` with `CAPA_FORM_SMTP_SECURE=false`; port `465` timed out from Hetzner during verification.

**Form date/time UX:** Public scheduling forms must show European day/month/year with 24-hour time (`dd/mm/yyyy hh:mm` / PT `dd/mm/aaaa hh:mm`). Do not use native `datetime-local` for these visitor-facing forms because browser locale can display US `mm/dd/yyyy` and 12-hour placeholders.

---

## Pages

| Page | Route | Type | Notes |
|------|-------|------|-------|
| Home | / | Static + React island | Hero, stats, featured dogs, about blurb, help CTA |
| Dogs | /caes | React island | Full listings with size + sex filters + name search |
| Dog Profile | /cao?id={uuid} | React island | Photo gallery, parsed description, adoption CTA |
| About | /sobre-nos | Static | Mission, principles, community |
| Help | /ajudar | Static | Donations, FAT foster program, volunteer scheduling form link |
| Volunteer form | /ajudar/formulario-voluntariado + /en/help/volunteer-form | React island | Scheduling form with email, optional phone, preferred time, and volunteer work-type checkboxes |
| Supply donation form | /ajudar/formulario-donativos-em-especie + /en/help/supply-donation-form | React island | In-kind donation drop-off form with email, optional phone, preferred time, and supply-type checkboxes |
| Foster home form | /ajudar/formulario-familia-acolhimento + /en/help/foster-home-form | React island | Multi-step FAT/foster-home request form with household, experience, availability, and animal-preference screening |
| Adoption | /adocao | Static | Process, pricing (F 75€, M 65€, puppy 30€) |
| Admin | /admin | Hetzner API | Protected login; CRUD and photo uploads persist to `capapvl_db` + Hetzner image files |

---

## Key Paths

```
src/
├── components/
│   ├── FeaturedDogs.tsx    # Homepage React island (client:visible)
│   ├── DogListings.tsx     # /caes — filters + search (React)
│   ├── DogProfile.tsx      # /cao?id= — gallery + CTA (React)
│   ├── AdminPanel.tsx      # /admin — Hetzner API admin (React)
│   ├── Hero.astro          # Homepage hero
│   ├── Nav.astro           # Navigation
│   ├── Stats.astro         # Shelter statistics counters
│   └── ...
├── lib/
│   └── capaApi.ts          # Hetzner API client + Dog type
├── data/
│   └── capaDogs.ts         # 104-dog static fallback with local photo/gallery paths
├── pages/                  # Each file = a route
└── styles/
    └── global.css          # Tailwind @theme (color tokens)
public/images/dogs/         # Restored dog photo galleries, committed static fallback
server/capa-api.ts          # Bun API served by capapvl-api.service
scripts/                    # Hetzner migration/data maintenance scripts
```

---

## Design Conventions (Z-Approved)

- **Palette:** Warm earth tones — primary (orange), warm (brown/cream), nature (green)
  - Defined via @theme in src/styles/global.css
  - primary-* (orange spectrum), warm-* (brown/cream), nature-* (green)
- **Vibe:** Warm, emotional, charity energy — NOT tech startup
- **Backgrounds:** Alternating white / warm-50 / warm-100 sections
- **Cards:** rounded-2xl, soft shadows, warm borders, fully clickable
- **Typography:** Inter, bold headings in warm-900
- **Buttons:** primary-500 orange, rounded-xl, hover transitions
- **Iconography:** Use recognizable, context-specific icons for donation/help cards; avoid abstract placeholder glyphs when the action needs instant comprehension.
- **Mobile nav socials:** Keep Facebook/Instagram as icon-only links centered at the bottom of the mobile menu. Do not add a visible “Redes sociais” / “Social links” label there.
- **Donate dropdown reuse:** `PlayfulDonateMenu.astro` is shared by nav, help cards, and hero CTAs. When reusing it outside nav, verify sibling dropdowns close each other, mobile panels scroll fully into view, desktop panels overlay instead of reflowing the hero, and panels are opaque/readable over trust chips or decorative content.
- **Mobile-first:** Always responsive, hamburger nav on mobile
- **Language:** Portuguese (PT) — all public content

---

## Deploy

Live production is Hetzner nginx serving the Astro static build from `/home/deploy/apps/capapvl`, plus `api.capapvl.org` proxying the loopback Bun API. The old Hostinger `deploy` branch workflow is legacy/transitional only, not the current live surface.

**Git identity:** zkgit.substance129@passmail.com

```bash
# Build with the production API URL, then publish static files to nginx root.
# Bump CAPA_ASSET_VERSION for behavior/data-status changes that affect React islands,
# because nginx serves /_astro assets as immutable for one year.
CAPA_ASSET_VERSION=$(date -u +%Y%m%d-%H%M%S) PUBLIC_CAPA_API_URL=https://api.capapvl.org bun run build
# If the form_submissions table is missing, run once before API restart:
# cat scripts/create-form-submissions-table.sql | sudo -u postgres psql capapvl_db -v ON_ERROR_STOP=1
rsync -a --delete dist/ /home/deploy/apps/capapvl/
find /home/deploy/apps/capapvl -type d -exec chmod 755 {} +
find /home/deploy/apps/capapvl -type f -exec chmod 644 {} +
```

**Publish only from `main`:** production must never run code that is not on `origin/main`. Before syncing to `2.29.9.89`, check out `main`, run `git fetch origin && git status -sb` and confirm the working tree is clean and level with `origin/main` (no ahead/behind, no uncommitted changes). Feature branches are reviewed and merged first (merge needs Z's explicit approval), then published. The production folder `/home/deploy/projects/capapvl.pt` on that host is plain files, not a git checkout; after a publish, compare it with `main` using `rsync -anci` (excluding `public/images/dogs/`, `.env*`, `node_modules`, `dist`, `archive`) and expect no differences. Use dated backup folders (`site-pre-<label>-$(date -u +%Y%m%dT%H%M%SZ)`) instead of deleting an older backup first.

**Run deploys on the CAPA server, not on Hermes:** production is `deploy@2.29.9.89`. Sync `server/`, `src/`, `scripts/` and `public/images/dogs/` there (never `--delete` on photos), then build there. Set `ASTRO_TELEMETRY_DISABLED=1` for the build: `deploy` cannot create `~/.config/astro` on that host and the build fails without it. Back up first into `~/backups/capapvl/` (`pg_dump -Fc "$DATABASE_URL"` after sourcing `/etc/capapvl-api.env`, plus the photos and `/home/deploy/apps/capapvl`).

**Database roles:** `capapvl_app` (the API's `DATABASE_URL`) can select/insert/update/delete dog rows but cannot alter the schema; `dogs` is owned by `capapvl_admin`. Schema changes need `sudo -u postgres` as root on `2.29.9.89`; ask Z before using root there.

WARNING: Do not edit files directly under `/home/deploy/apps/capapvl`; they are generated from source and overwritten by the next build/sync.

**Live verification:** A successful build/sync is not enough. Confirm the live site and API return the expected production responses, for example:

```bash
curl -sS -I https://capapvl.org/
curl -sS https://api.capapvl.org/health
curl -sS 'https://api.capapvl.org/dogs?includeAdopted=true' | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["dogs"]))'
curl -sS -I https://capapvl.org/caes/ | grep -i '^cache-control:'
```

For browser-level verification, use Playwright or CDP-driven Chromium against `https://capapvl.org/caes/` and confirm `https://api.capapvl.org/dogs?includeAdopted=true` returns 200 with 99 dog cards rendered, 12 adopted banners, and adopted-name searches such as Batatinha/Belinha/Chico each return `1 cão encontrado` with `ADOTADO!`.

---

## Gotchas

- **Canonical domain:** `https://capapvl.org` is canonical; `www.capapvl.org` should redirect to the apex so browser API calls use the allowed `https://capapvl.org` origin.
- **Hetzner API path:** `https://api.capapvl.org` is the public API origin. The older `https://richkapp.com/capapvl-api` bridge is legacy and should not be used for new builds.
- **Raw API bind:** `capapvl-api.service` must stay loopback-only on `127.0.0.1:3314`. The public surface is the nginx HTTPS bridge, not raw port `3314`.
- **Legacy Supabase unavailable:** The old project ref returned NXDOMAIN on 2026-05-15. Do not add new runtime Supabase dependencies.
- **Static site:** No SSR, no dynamic routes. Dog profiles use /cao?id=uuid.
- **Legacy Supabase key note:** sb_publishable_/sb_secret_ previously worked with @supabase/supabase-js v2.97.0, but runtime Supabase usage has since been removed.
- **Logo was photo-02:** Every dog's original page had the CAPA logo as photo-02. All deleted from storage. If re-scraping, filter files < 20KB.
- **Accented slugs:** NFD normalization used in upload scripts (Jóia → joia). Don't break this.
- **No unique constraint on name:** Re-running upload scripts creates duplicates. Use upsert or check first.
- **React islands are client:visible:** They lazy-load on scroll. Good for performance.
- **Immutable Astro assets:** nginx serves `/_astro/*` with `Cache-Control: public, immutable`. If a dog-listing/profile behavior change appears correct in API data but wrong in a user's browser, check for stale island JS. Bump `CAPA_ASSET_VERSION`, rebuild/sync, verify `/caes/` has `Cache-Control: no-cache`, and confirm the live HTML references the new `/_astro/DogListings.*.js` filename.
- **Static fallback can mask API outages:** `/caes` can continue rendering committed dog data while `api.capapvl.org` and public forms return `502`. Every CAPA status update/deploy must verify `systemctl is-active capapvl-api.service`, local `http://127.0.0.1:3314/health`, and public `https://api.capapvl.org/health`; never infer API health from a rendered page.
- **Form verifier writes rows:** `scripts/verify-form-endpoint.mjs` always exercises the API insert path, even when SMTP is dry-run. Do not run it against production casually; if QA rows are inserted, delete the `qa-*@example.com` / verifier-source rows from `form_submissions` before checkout.

---

## Remaining Work

- [x] Point `capapvl.org`, `www.capapvl.org`, and `api.capapvl.org` to Hetzner `65.21.156.73`, issue cert, and update `PUBLIC_CAPA_API_URL`/`CAPA_PUBLIC_API_URL` from the temporary RichKapp bridge.
- [ ] Z to revoke/remove any remaining legacy Supabase project credentials in Supabase dashboard if accessible.

---

## Decision Log

- 2025-07-26: Z approved warm earth tone palette. Carry this style to all pages. (Crash & Burn)
- 2026-02-24: Astro + React + Supabase + Hostinger stack chosen. Matches existing project patterns. (Crash & Burn)
- 2026-02-24: Dog profile uses /cao?id=uuid (query param) — Hostinger static-only, no dynamic routes. (Crash & Burn)
- 2026-02-24: Legacy JWT keys for Supabase — new format not compatible. (Crash & Burn)
- 2026-02-24: Photos resized to 1200px/80% JPEG via sharp before upload — stays within 500MB free tier. (Crash & Burn)
- 2026-03-16: sb_publishable_/sb_secret_ format confirmed working with @supabase/supabase-js v2.97.0 — legacy keys rotated after .env exposure. (Razor & Blade)
- 2026-03-16: Logo/footer/header changes ported from deploy branch HTML back to Astro source files. Never edit deploy branch directly again. (Razor & Blade)
- 2026-03-16: SUPABASE_SERVICE_ROLE_KEY was committed to git — rotated all keys, .env recreated. (Razor & Blade)
- 2026-05-15: Supabase project ref returned NXDOMAIN; public dog pages now use committed static fallback data and restored local dog photos. Hostinger Git deploy push succeeded but live origin did not update during verification, so hPanel may need manual deployment trigger. (Codex)
- 2026-06-10: Canonical live surface moved to Hetzner at `https://capapvl.org`; Namecheap DNS points apex/www/api to `65.21.156.73`; Let's Encrypt covers apex/www/api; `www` redirects to apex; API origin is `https://api.capapvl.org`. (Hermes)
