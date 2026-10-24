# Customization and deployment

## Public configuration

`src/config/shelter.ts` is typed and intentionally non-secret. Set only information you have permission to publish. Empty contact, maps, social and donation values stay inactive. Configured web links and bank details are independent of the forms switch: they may lead to real contacts or payments even while submissions remain disabled. Notices reflect these states separately; this site does not process payments. Review both Portuguese/English copy in `src/i18n/` and `src/pages/` before replacing the fictional shelter. Adoption fees are nullable; `null` displays an unconfigured label rather than claiming a real charge. Available/adopted counts come from the configured dog dataset; the sterilized impact count remains explicit fictional configuration until replaced.

Illustrations and the logo live in `public/illustrations/`. Theme color tokens and system font stacks live in `src/styles/global.css`. Replace assets only with your own or verified redistributable work, update `ASSETS-LICENSE.md`, and provide useful alt text. There are no remote fonts/photo hotlinks required by the demo.

Edit `src/data/demoDogs.ts` to change offline examples; keep ids unique and traits compatible with `src/lib/dogFacts.ts`. Size values are `small`, `small-medium`, `medium`, `medium-large`, `large`; sex is `male`, `female` or `null`. Description helpers in `src/lib/adminDogForm.ts` and `dogFacts.ts` preserve Portuguese line labels (including foster notes); the questionnaire uses those descriptions plus traits. Keep the scoring engine intact unless you intentionally change and test its behavior. Questionnaire scores assist exploration, not adoption approval.

## Deploying only the static demo

Run `bun install --frozen-lockfile`, `bun run check`, `bun test`, then `bun run build`. Any static host can serve `dist/`. Keep `PUBLIC_API_URL` blank and leave all destinations/forms disabled for a published demo. Check nested PT/EN routes and the 404 page on your chosen host. Never publish `.env`, local database exports, `storage/`, `archive/`, logs, or internal project documents. Bun is required at build time, not by the resulting static site.

## Deploying a real shelter site

A real installation is a separate operation, not part of the quick start:

1. Obtain permission for the identity, content, personal data and photos. Replace every fictional figure and review both languages.
2. Provision a dedicated PostgreSQL database on the **same host** as the optional API; remote database URLs are deliberately unsupported. Use a least-privilege app role and private credentials.
3. Apply the clean schema to an empty DB. The demo seed is optional; do not seed fictional animals into a real service by accident.
4. Run one Bun API process as an unprivileged service, from a known working directory. Keep its loopback bind and place your own HTTPS reverse proxy in front; do not expose PostgreSQL.
5. Set `PAWS_PUBLIC_API_URL` to your own HTTPS API origin, exact `PAWS_ALLOWED_ORIGINS`, a dedicated writable `PAWS_PROJECT_ROOT` for persistent media, fresh generated admin credentials and session secret. No host-specific service/nginx configs are shipped.
6. Set frontend `PUBLIC_API_URL` to that API origin **at build time**, customize `shelter.publicUrl`, rebuild and deploy `dist/`. Serve static `/illustrations/` assets from the frontend; uploaded `/images/dogs/` media is served by the API.
7. Confirm auth and API CRUD/media persistence over HTTPS, then back up the DB and `storage/`/`archive/` together. Rotate credentials and test restores. Do not run multiple API instances against shared media.
8. Keep forms/email disabled until consent, privacy, abuse protection and SMTP delivery are reviewed. Enable both UI/API switches intentionally. There is no payments processor, submission inbox, resend queue, MFA or managed user account system.
9. Verify public pages, questionnaire, mobile layouts, disabled/active states, allowed origins, accessibility, logs and outbound requests on your own deployment. Add operational monitoring and rate limits at your reverse proxy.

`PUBLIC_*` values are visible to site visitors. Server auth/database/SMTP values must stay in the server environment only. A fresh deployment needs fresh secrets; never reuse course/demo credentials.
