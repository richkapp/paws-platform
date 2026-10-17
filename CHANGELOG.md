# CHANGELOG — capapvl.pt

## 2026-10-17 — Admin area rebuilt for the CAPA team

- Editing no longer loses data: the old form dropped "Chipada/Vacinada/Esterilizada" on every female dog and "Castrado" on 19 males, and cut multi-line stories. New `src/lib/adminDogForm.ts` reads and writes every existing record format (round-trip checked on all 100 dogs).
- Portuguese only, in the site's playful style; card list with tabs (Para adoção, Adotados, Por completar, Todos), accent-insensitive search, "Ver no site" links.
- Editor: birth and entry years instead of free text, gendered labels, foster status, "A saber antes de adotar", and the /match traits (energia, receio, carente, fuga, aves, padrinho), so new dogs can appear in the quiz. Photo previews before upload, size/format checks, unsaved-changes guard, sticky save bar.
- Confirm dialogs for marking adopted and deleting; delete suggests "Marcar adotado" instead.
- API: renaming a dog moves its photo folder (photos were lost before); duplicate names refused; deleted dogs' photos archived outside `public/`; 10 failed logins per IP per 15 minutes.

## 2026-10-16 — CAPA corrections, follow-up fixes

- Filters: size filters on the landing page and `/caes` both use three groups (Pequenos, Médios, Grandes). Pequeno/Médio counts as Pequeno and Médio/Grande as Grande; profiles still show the exact size from CAPA's records.
- Dogs: removed Abby and Farrusco. Abby is in `caes.json` `_meta.saidos` as an earlier dog to exclude; Farrusco matches its "Farrusca" entry and is not on CAPA's Canva photo sheet by name or photo. Filled missing birth and entry years for Channel, Jóia, Peter and Rastas from CAPA's Canva table "Entrada/Idade"; where that table disagrees with `caes.json`, `caes.json` was kept.
- Landing page: dog cards show age in years ("12 anos") like `/caes`.
- `/match`: English version at `/en/match`, added to the main menu in both languages and to the language switcher; disclaimer notes that some temperament data is still being confirmed by the team.
- Tests: `verify-caes-browser.mjs` and `verify-dog-profile-browser.mjs` updated for 100 profiles, 10 adopted, sex-aware adopted labels, and Mouse replacing Abby as the adopted fixture.

## 2026-10-16 — CAPA October 2026 corrections and /match quiz

- Data: rebuilt dog records from CAPA's `caes.json` (2026-10-15): full stories, sex, five record sizes, foster status (`Acolhimento:`), shelter notes (`Nota:`) and quiz traits; removed Nobita, Patty, Serena (died) and Mac (excluded); added Chiquinho, Jason, Pepita, Peter, Pietro, Rocky and Shadow with photos from CAPA's Canva sheet; marked Becas, Esmeralda, Kiki and Nemo adopted; fixed Mouse showing Morena's story; renamed Esmerelda to Esmeralda (photo folder too).
- Profile: ADOTADA/ADOTADO and "a/o" wording follow the dog's sex; age reads "cerca de N anos (nasceu em YYYY)"; entry reads "No abrigo desde YYYY, há N anos"; adopted badge moved to the photo corner; foster note and "A saber antes de adotar" box.
- `/match`: adoption match quiz ported from CAPA's prototype; scores verified identical to the original over 2,000 random answer sets.
- API/DB: `dogs.size` accepts five sizes; new `traits jsonb` column. Migration in `scripts/capa-corrections-2026-10/`.
- Deploy: backups in `~/backups/capapvl/` on `2.29.9.89` (database dump, dog photos, previous static site).

## 2026-08-19 — Website runtime moved to the smaller Hetzner host

- Infrastructure: CAPA's Namecheap web A records (`@`, `www`, and `api`) now point to `2.29.9.89`, the `ubuntu-4gb-hel1-1` Hetzner CX23 destination in Helsinki / `eu-central`.
- Verification: authoritative DNS and forced HTTPS reachability were checked after cutover; mail and non-web DNS records were left untouched. The former `65.21.156.73` host is reserved for Hermes.

## 2026-08-05
- Dogs: marked Batatinha, Belinha, and Chico as adopted after CAPA confirmed their foster families adopted them; they remain visible with adopted banners.

## 2026-07-11
- Updated CAPA repository documentation to use the current `richkapp` GitHub namespace after the account rename; no application code or runtime configuration changed.

## 2026-06-29
- Help foster families: added bilingual multi-step foster-home request form routes at `/ajudar/formulario-familia-acolhimento` and `/en/help/foster-home-form`, replacing the FAT/foster section email buttons with structured form links and extending `/forms/submit` email delivery with `foster_home` submissions.
- Help donations: added bilingual in-kind supply donation form routes at `/ajudar/formulario-donativos-em-especie` and `/en/help/supply-donation-form`, replacing the supply-section email text with localized drop-off form buttons and extending `/forms/submit` email delivery with `supply_donation` submissions.
- Help hero: changed the primary hero actions to `Voluntariado` / `Volunteer` links that open the new volunteer form pages and `Doar` / `Donate` dropdowns that reuse the site donation menu options.
- Help volunteering: added bilingual volunteer scheduling form routes at `/en/help/volunteer-form` and `/ajudar/formulario-voluntariado`, linked them from both help pages, and extended the existing backend-backed form submission/email flow for volunteer requests with multi-select work types, required email, optional phone, and preferred time.

## 2026-06-22
- Footer: changed the bottom credit to “Made with ❤️ by RichKapp”, with RichKapp underlined and opening `https://richkapp.com/websites` in a new tab.
- Forms: replaced the native browser date-time picker in visit scheduling with a CAPA-controlled European `dd/mm/yyyy hh:mm` 24-hour field so Portuguese and English visitors do not see US `mm/dd/yyyy` formatting.
- Forms/API: configured live form email delivery through RichKapp's Resend SMTP setup so CAPA submissions send to `capa.geralpvl@gmail.com` from `Richard Kappel <richard@richkapp.com>` with visitor email as Reply-To; verified live `/forms/submit` returned `emailSent:true` / HTTP 201.
- Mobile nav: removed the “Redes sociais” / “Social links” text from the mobile menu and centered the Facebook/Instagram icons at the bottom.
- Help donations: replaced the abstract in-kind donation card glyphs with clearer category-specific SVG icons for cleaning supplies, dog food, medication, and other items on `/ajudar/` and `/en/help/`.
- Site chrome: replaced placeholder social/payment glyphs with real Facebook, Instagram, PayPal, and official MB WAY icons; the mobile burger menu now starts below 1000px and includes Facebook/Instagram links.
- Help: fixed the FAT / foster-family block on narrow mobile screens so the peach card, badge, and large heading stay aligned instead of clipping or forcing broken word wraps.
- Forms/API: added a backend-backed `/forms/submit` flow through the Hetzner Bun API for sponsorship, MB Way, visit scheduling, and dog adoption-interest requests; submissions persist to PostgreSQL, attempt SMTP email to CAPA when configured, and keep prepared-email fallback when delivery is unavailable.
- Dog profiles: replaced the adoption email CTA with a structured adoption-interest popup that sends dog context, visitor contact details, and notes through the backend form endpoint.
- Footer: added a Visit/Visita section under Navigation with a Google Maps map-pin card, schedule-first guidance, and a shared Schedule a visit form; Contact now only lists phone and email.
- Visit scheduling: extracted the dog-profile Schedule a visit form into a reusable popup and fixed it to render above the sticky nav on mobile so the top of the form is no longer cut off.
- Dog profiles: added a bilingual Schedule a visit / Agendar visita popup below the dog photo carousel and above the info card for available dogs; the form collects name, email, phone, preferred visit time, and notes, then prepares an email to `capa.geralpvl@gmail.com`.
- Mobile nav: made the mobile menu vertically scrollable within the viewport and auto-scroll the Donate dropdown into view so PayPal, MB Way, and bank-transfer options remain reachable on short phone screens.
- Footer: fixed the Playful footer donation IBAN on mobile so the full `PT50 0010 0000 4591 4000 0014 9` wraps visibly instead of being hidden behind horizontal scrolling.
- Dog profiles: moved mobile gallery previous/next arrows out from on top of dog photos into a smaller control row below the image, while keeping desktop overlay arrows; the browser verifier now checks mobile controls do not overlap the image.
- Home donations: changed homepage help card #4 into a card-shaped Donate dropdown with PayPal, MB Way, and bank-transfer options, matching the top-nav Donate behavior.
- Help donations: added a direct MB Way CTA button inside the financial-support MB Way card on `/ajudar/` and `/en/help/`, reusing the same phone-number request popup as the Donate menu.
- Donations: added a Doar/Donate dropdown to the Playful nav with PayPal, MB Way, and bank-transfer options; PayPal opens the real CAPA donation page in a new tab, bank transfer deep-links to the financial support section, and MB Way opens a phone-number request popup.
- Help donations: updated the `/ajudar/` and `/en/help/` financial-support PayPal cards with the real PayPal donation link and revised the MB Way text to point visitors to the new Donate menu flow.
- Home sponsor card: changed the #2 Apadrinhar/Sponsor card into a popup form that collects name, email, optional phone, business status, monthly contribution amount, preferred contribution method, and notes, then prepares an email to `capa.geralpvl@gmail.com`.
- Landing nav: added the missing Adoção/Adoption menu link to the live home nav and shared site nav, pointing to `/adocao` and `/en/adopt` across Portuguese and English menus.
- Dog profiles: fixed the language switcher on `/cao/` and `/en/dog/` so Portuguese/English flag links preserve the `?id=` query instead of dropping visitors onto the empty dog-profile route.
- Landing nav: changed the live-home Help links from the in-page `#ajudar` anchor to the dedicated help routes `/ajudar` and `/en/help` for Portuguese and English home pages.
- Dog profiles: fixed the Playful gallery regression where real shelter photos could force the gallery wider than the profile container, clipping dogs off-screen on `/cao/` and `/en/dog/`; profile photos now fit inside a bounded card and the new browser verifier covers Athos, Abby, Alana, and English/mobile variants.
- Full-site Playful audit: moved the remaining public legacy surfaces (`/en/help/`, `/cao/`, `/en/dog/`, and `404.html`) onto CAPA's Playful Impact shell while leaving the noindex admin app routes as admin-only islands.
- Dog profiles: restyled the shared React profile island with Playful photo gallery, profile cards, compatibility chips, adopted/available CTA panels, and route-aware Playful nav/footer wrappers for Portuguese and English profile routes.
- Adoção/Adoption: redesigned the live `/adocao/` and `/en/adopt/` pages directly with the CAPA Playful Impact system while preserving the existing adoption benefits, process, fees, contact, and final CTA copy.
- Adoção/Adoption: added a stronger real-photo adoption-poster hero, locale-aware Playful section components, local hero image derivatives, route-scoped scroll reveal, bilingual content-preservation smoke coverage, and desktop/mobile screenshot QA.

## 2026-06-21
- Footer: linked the CAPA address to Google Maps in a new tab across Playful and legacy footers, and normalized the footer phone `tel:` href.
- Landing nav: changed the Playful landing menu's "Os Nossos Cães" / "Our Dogs" link from the in-page `#caes` anchor to the full listing routes `/caes` and `/en/dogs`.
- Footer: moved the Playful footer donation IBAN into a wider support pill spanning the help/contact columns on desktop, restored the full `PT50` IBAN formatting, and fixed the live-home footer phone link href.
- Accessibility: included adopted status in `/caes/` and `/en/dogs/` dog-card accessible names, changed Playful filter controls from fake tab semantics to pressed-button groups, and hardened live-home browser smoke cleanup/port allocation.
- Landing: promoted the Playful Impact `/test-landing/` experience to the live `/` and `/en/` home routes with canonical metadata, route-aware home/language links, shared page assembly, hydrated featured-dog browser smoke, and preserved `/test-landing/` as a noindex review reference.
- Cães/Dogs: redesigned the live `/caes/` and parity-safe `/en/dogs/` listing routes with the CAPA Playful Impact system while preserving hero copy, search/filter labels, result text, dog cards, profile links, API loading, and committed fallback data.
- Cães/Dogs: added a stronger real-photo adoption-poster hero collage, route-aware Playful chrome, tactile search/filter controls, Playful dog cards with visible adopted banners, static content smoke, and hydrated browser smoke for 99 dog cards, 9 adopted badges, and Abby adopted search.
- Sobre nós/About: redesigned the live `/sobre-nos/` and `/en/about/` pages directly with the CAPA Playful Impact system while preserving the bilingual origin, principles, community, rescue/rehabilitation, Zeus story, and dogs CTA copy.
- Sobre nós/About: added a stronger poster-style real-photo hero, locale-aware Playful section components, local hero image derivatives, route-scoped scroll reveal, and a bilingual content-preservation smoke script.
- Playful Impact: moved the shared scroll-reveal behavior into a reusable `PlayfulScrollReveal` component, kept MutationObserver support only for dynamic Playful routes, cleared long-lived `will-change` after reveal, and darkened the orange action token so white CTA text passes WCAG AA contrast.
- Ajudar: redesigned the live `/ajudar/` page directly with the CAPA Playful Impact system while preserving all existing help, donation, volunteer, FAT, payment, email, and CTA copy; added a stronger poster-style hero using a local real-photo fallback after image generation was unavailable in this environment.
- Ajudar: added route-aware Playful nav/footer chrome, tactile donation/volunteer/FAT/payment sections, route-scoped scroll reveal, a content-preservation smoke script, and desktop/mobile screenshot QA for the live help page redesign.
- Landing: added `/test-landing/` as a noindex production review page that preserves the current homepage copy and section flow while applying the Playful Impact design concept: cream canvas, Sora/Plus Jakarta Sans type, juicy orange CTAs, blob hero image treatment, pillowy cards, soft-brutalist rotations, and squishy interaction states.
- Landing: removed the accidental translucent white card behind the hero dog image so the image blob now floats directly over the cream hero background.
- Landing: added route-scoped scroll-reveal motion to `/test-landing/`: hero elements enter on load, section headers rise into view, cards pop/stagger as the user scrolls, dynamic dog cards are observed after React hydration, and reduced-motion users get static content.
- Dogs: kept the test landing's featured dogs backed by the existing Hetzner API plus committed fallback data, preserving size filters and `/cao?id=` profile links.
- Design docs: added `DESIGN.md` as the CAPA Playful Impact reference covering palette, typography, layout, motion, component rules, implementation notes, and QA checklist.
- Deploy: built with `PUBLIC_CAPA_API_URL=https://api.capapvl.org` and a fresh `CAPA_ASSET_VERSION`, synced `dist/` to `/home/deploy/apps/capapvl`, and verified live `/test-landing/` returns the new noindex page instead of the old 404 body while `/` remains the existing live homepage.

## 2026-06-19
- Dogs: marked Abby, Bella, Bolt, Buggy, Farrusco, Kiki, Klein, Mickey, and Mouse as adopted, and added a visible adopted banner on dog listing/profile photos.
- Dogs: removed deceased dogs Farrusca, Iman, Molly, Ringo, and Salsa from the public fallback dataset and public photo assets.
- Deploy: added a CAPA asset-version token to built Astro filenames and set HTML responses to `Cache-Control: no-cache` so browsers do not keep stale dog-listing JavaScript after status updates.

## 2026-06-10
- Go-live: moved CAPA public hosting to Hetzner under `https://capapvl.org`, with Namecheap DNS `A` records for `@`, `www`, and `api` pointing to `65.21.156.73`.
- Sobre nós/About: replaced the text-only dark hero on both Portuguese and English pages with a warmer split hero using a real CAPA dog-care photo, and updated Open Graph image/URL metadata for `capapvl.org`.
- Infra: deployed the Astro static build to `/home/deploy/apps/capapvl`, added nginx vhosts for `capapvl.org` and `api.capapvl.org`, and issued a Let's Encrypt certificate covering `capapvl.org`, `www.capapvl.org`, and `api.capapvl.org`.
- Routing: canonicalized `www.capapvl.org` to `https://capapvl.org`; `api.capapvl.org` proxies to the loopback Bun API on `127.0.0.1:3314`.
- Config: updated frontend/server API URLs from the old RichKapp bridge to `https://api.capapvl.org` while retaining `capapvl.pt` origins in the server allowlist for transitional compatibility.
- Verification: DNS resolved globally to Hetzner; HTTPS smokes returned 200 for the site and admin page, API health returned `{"ok":true}`, `/dogs` returned 104 dogs, and Playwright verified `/caes` loads 104 dog cards and API-served photos without console/page errors.

## 2026-06-04
- Security: hardened `capapvl-api.service` so `server/capa-api.ts` binds `127.0.0.1:3314` instead of a broad interface. Public API access remains through the temporary nginx HTTPS bridge at `https://richkapp.com/capapvl-api`; raw port `3314` must not be exposed publicly.
- Verification: local health and nginx-backed `richkapp.com/capapvl-api/health` smokes returned HTTP 200 after restart; external probe confirmed raw `3314` closed publicly.
- Docs: updated `AGENTS.md` with the loopback-bind requirement and raw-port gotcha.

## 2026-05-15
- Migration: Moved CAPA runtime data/auth/photo management off Supabase and onto a Hetzner Bun API backed by `capapvl_db`. Added `server/capa-api.ts`, persistent token auth, dog CRUD, status updates, photo upload/delete, and API-served dog images from `public/images/dogs`.
- Frontend: Replaced runtime Supabase calls in public dog listings, featured dogs, dog profiles, and admin with `src/lib/capaApi.ts`. Public pages still retain committed `src/data/capaDogs.ts` fallback data if the Hetzner API is unavailable.
- Infra: Added `capapvl-api.service` and an Nginx proxy path at `https://richkapp.com/capapvl-api` as a temporary HTTPS bridge until `api.capapvl.pt` DNS points to Hetzner and has its own certificate.
- Admin: Replaced the browser-local demo admin with Hetzner API authentication and persistent CRUD/status/photo management against `capapvl_db` plus `public/images/dogs`.
- Deploy: Pushed migration source to `main` (`0db0393`) and static output to `deploy` (`656da73`). Live Hostinger still served old `_astro/AdminPanel.DxKTiPf4.js` during verification, so hPanel manual Git deploy/reconnect is still required before production reflects the Hetzner API frontend.
- Deploy: Pushed source fix to `main` (`6c003c4`) and static output to `deploy` (`24bf174`). GitHub deploy branch contains `_astro/AdminPanel.DxKTiPf4.js`, but live `https://capapvl.pt/en/admin/` still serves old `_astro/AdminPanel.q4P30BYD.js`; Hostinger hPanel manual Git deploy/reconnect is required before production reflects the admin fallback.
- Recovery: Supabase project `amkwoeepuhlnjmybbnbo.supabase.co` returns NXDOMAIN while the public React islands still queried Supabase, causing `/caes` and homepage featured dogs to fall back to the 12-dog Unsplash seed list.
- Data: Generated `src/data/capaDogs.ts` from Hetzner `capapvl_db.public.dogs` (104 rows) and switched public dog listing/profile fallbacks to that local dataset.
- Photos: Restored 977 dog photos from `/Users/z/capapvl-photos-backup` into `public/images/dogs/` on Hetzner and updated the local dog dataset to use `/images/dogs/{slug}/photo-01.jpg` plus profile gallery photo arrays.
- Deploy: Committed and pushed source recovery to `main` (`fad3f16`) and static deploy output to `deploy` (`2d83c7c`). Hostinger had not pulled the new deploy branch during verification; hPanel manual Git deploy/reconnect may be required.
- Docs: Updated project `AGENTS.md` with the static fallback, restored photo path, live verification commands, and Hostinger deploy-stall warning. Also updated `/home/deploy/projects/websites/AGENTS.md` and `CHANGELOG.md` with CAPA's active repo and recovery state.
- Verification: `bun run build` passes; local `/caes` preview shows 104 dogs with real photos; dog profile pages render restored local galleries. Production still needs live-origin verification after Hostinger pulls the pushed deploy branch.

## 2025-07-25
- Replaced wavy SVG hero divider with a clean single-arc curve for smoother hero-to-content transition (Crash & Burn)

## 2026-02-25 (Session 6 — Admin Testing, Enhancements & Deploy)
- Deploy: Site is LIVE at capapvl.pt — Hostinger Git deploy from `deploy` branch with auto-deployment enabled (Crash & Burn)
- Deploy: Pushed `main` and `deploy` branches to https://github.com/richkapp/paws-platform (Crash & Burn)
- Git: Set repo email to zkgit.substance129@passmail.com, also set as global default on Mac (Crash & Burn)

## 2026-02-25 (Session 6a — Admin Testing & Enhancements)
- Admin: Added size, sex, and status (available/adopted) filter dropdowns to dashboard (Crash & Burn)
- Admin: Replaced plain description textarea with structured form fields: subtitle/personality, breed, entry date, story, sociability (4 dropdowns), medical checkboxes (Crash & Burn)
- Admin: Form auto-generates description in DogProfile parser format; reverse-parses on edit (Crash & Burn)
- Admin: Moved personality field under name, relabeled as "Subtítulo (personalidade)" for shelter staff clarity (Crash & Burn)
- Assets: Downloaded CAPA logo from original site (110px JPEG), created SVG recreation draft (Crash & Burn)
- Task: PROMPT.md removed per Z's request, SPEC.md and AUDIT.md retained (Crash & Burn)

## 2026-02-25 (Session 5 — Polish Pass)
- SEO: Updated `src/layouts/Layout.astro` to support `ogImage`, `ogUrl`, `noindex` props; all pages now emit full Open Graph meta tags (og:type, og:title, og:description, og:image, og:url, og:locale, og:site_name) (Crash & Burn)
- SEO: Updated per-page descriptions to match spec on all 6 public pages (index, caes, sobre-nos, ajudar, adocao, cao) (Crash & Burn)
- SEO: Admin page now emits `<meta name="robots" content="noindex, nofollow">` with no OG tags (Crash & Burn)
- 404: Created `src/pages/404.astro` — friendly Portuguese "Página não encontrada" page with paw print icon, warm earth-tone palette, Nav + Footer, CTAs to homepage and dog listings (Crash & Burn)
- Favicon: `public/favicon.svg` is the Astro default logo (not CAPA branding) — Z should provide a real CAPA logo SVG to replace it (Crash & Burn)
- Build: 8 pages, 0 errors, 942ms (Crash & Burn)

## 2026-02-25
- Scraped 8 images from original https://capapvl.pt/sobre_nos into `public/images/sobre-nos/` (Crash & Burn)
- Scraped 10 images from original https://capapvl.pt/ajudar into `public/images/ajudar/` (Crash & Burn)
- Resized 5 images over 500KB using sharp (max 1200px wide, 80% JPEG quality) (Crash & Burn)
- `/sobre-nos` page: replaced placeholder with real community photo, added 2 rescued-dog photos to rehab section, added Zeus success story photo with caption overlay (Crash & Burn)
- `/ajudar` page: added 3-photo volunteer strip to volunteering section, added dog fostering photo to FAT section (Crash & Burn)
- Build passes clean: 7 pages, 0 errors, 910ms (Crash & Burn)

## 2026-02-24 (Session 3)
- Built `/admin` page: full admin panel behind Supabase email/password auth (Crash & Burn)
  - `src/pages/admin.astro` — Astro page wrapper
  - `src/components/AdminPanel.tsx` — React island (client:load) with all admin functionality
- Admin panel features: login/logout, dog dashboard (search, all dogs incl. adopted), add new dog with photo upload, edit dog with photo management (view/delete/upload), toggle adopted status inline, delete dog with confirmation dialog (Crash & Burn)
- Photo upload convention preserved: slug from name (strip accents), photo-01 then photo-03 onwards (skip photo-02 slot) (Crash & Burn)
- Portuguese UI labels throughout: Entrar, Sair, Adicionar Cão, Editar, Eliminar, Adotado, Disponível, etc. (Crash & Burn)
- Design: warm earth-tone palette consistent with site, TW4 classes, rounded corners, responsive table (Crash & Burn)
- Build: 7 pages (6 existing + admin), 0 errors, 852ms (Crash & Burn)

## 2026-02-24 (Session 2)
- Connected Supabase project (amkwoeepuhlnjmybbnbo), applied migration via SQL Editor: dogs table, RLS policies, dog-photos storage bucket (Crash & Burn)
- Uploaded all 104 dogs + ~980 photos to Supabase (resized 1200px/80% JPEG via sharp). Scripts: upload-dogs.ts, upload-missing.ts (Crash & Burn)
- Scraped descriptions from all 104 dog pages on original site → dogs-descriptions.json (99 with content, 5 empty) (Crash & Burn)
- Pushed descriptions to Supabase dogs table (Crash & Burn)
- Added `sex` column to dogs table, populated from descriptions (44 male, 55 female, 5 unknown) (Crash & Burn)
- Deleted 104 CAPA logo images from storage (were scraped as photo-02 in every dog folder, ~10KB each) (Crash & Burn)
- Built `/cao` dog profile page: full-width photo gallery with thumbnails, parsed structured description (story, info grid, sociability tags), adoption CTA with email link (Crash & Burn)
- Redesigned dog profile layout: photos on top, big name, personality quote, "A Minha História" card, "Sobre Mim" grid, "Compatibilidade" tags (Crash & Burn)
- Added sex filter to `/caes`: ♀ Fêmea / ♂ Macho, works in conjunction with size filter (Crash & Burn)
- Made dog cards fully clickable (removed separate "Conhecer" link) on both `/caes` and homepage (Crash & Burn)
- Updated Dog type with `sex` field (Crash & Burn)
- Updated PROJECT.md with full current state: Supabase schema, data stats, gotchas, env vars, remaining work (Crash & Burn)
- 6 pages build clean: `bun run build` — 842ms (Crash & Burn)

## 2026-02-24 (Session 1)
- Built `/caes` page: DogListings React island with size filter tabs, name search, results count, responsive grid, loading skeletons, seed data fallback (Crash & Burn)
- Built `/sobre-nos` page: hero, Stats reuse, 3 principles cards, community/schools, rescue & rehab, success stories CTA (Crash & Burn)
- Built `/ajudar` page: Donativos em Género (4 cards), Doação de Tempo (4 volunteer cards), FAT foster section, Donativos Monetários with IBAN + MBWay + PayPal (Crash & Burn)
- Built `/adocao` page: 6 benefits grid, 6-step adoption timeline, 3 pricing cards (Fêmea 75€/Macho 65€/Bebé 30€), success stories (Crash & Burn)
- Updated Nav with Adoção link, Footer with real contact info (capa.geralpvl@gmail.com, EN310 115 address, IBAN) (Crash & Burn)
- Expanded seed data to 12 real dogs from shelter (4 per size) with real names/ages/descriptions (Crash & Burn)
- Created Supabase migration: dogs table + RLS policies + dog-photos storage bucket (Crash & Burn)
- Scraped 104 dogs (1,083 photos) from existing site into organized folders (Crash & Burn)
- Scraped page content from /adocao, /sobre_nos, /ajudar for reference (Crash & Burn)
- All 5 pages build clean: `bun run build` — 662ms (Crash & Burn)

## 2025-07-26
- Scaffolded Astro 5 project with React 19, Tailwind CSS 4, Supabase client, Bun runtime (Crash & Burn)
- Note: Astro 5's official integration installs TW4 (not TW3). Using TW4 with CSS-first config — correct for new projects (Crash & Burn)
- Set up Supabase client lib, Dog type, seed data for 6 dogs (2 per size category) (Crash & Burn)
- Created warm earth-tone color palette: primary (orange), warm (brown), nature (green) (Crash & Burn)
- Built all 8 landing page sections: Nav (sticky + mobile hamburger), Hero, Stats (animated counters with IntersectionObserver), WhyAdopt (3 benefit cards), FeaturedDogs (React island with Supabase fetch + seed fallback + size filter tabs), AboutBlurb, HelpCta, Footer (Crash & Burn)
- FeaturedDogs uses client:visible for lazy loading, loading skeletons, empty states (Crash & Burn)
- `bun run build` clean — zero errors (Crash & Burn)
- Init git repo (Crash & Burn)

## 2026-02-24
- Project created. Stack: Astro 5 + React 19 + Tailwind 3 + Supabase + Bun. Hosted on Hostinger. (Crash & Burn)
- Researched current capapvl.pt site structure — hero, stats, why adopt, dog listings by size, about, help/FAT program (Crash & Burn)
- Created landing-page task spec (Crash & Burn)
