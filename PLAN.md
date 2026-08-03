# Forkast implementation plan

Last updated: 2026-08-03 (second pass — see Section 14 for the work in flight)

This is the implementation authority for continuing Forkast in a fresh task.
`PRODUCT.md` is the product authority; `DESIGN.md` is the visual authority;
`README.md` holds operational setup. Git history is the record of what was built
and why — this document was pruned on 2026-08-03 to keep it readable, and the
removed detail (per-milestone task lists, the delivery-history commit list, and
narrative accounts of fixed bugs) remains in the log.

## 1. Current state

- Repository `git@github.com:adilio/Forkast.git`, checkout
  `/Users/adil/Code/Forkast`, deploy branch `main`.
- Production <https://forkast.4dl.ca>; Netlify project `forkast-4dl`; fallback
  <https://forkast-4dl.netlify.app>; Cloudflare DNS-only CNAME.
- Firebase project `forkast-4dl`, Spark plan, Firestore Standard `us-west1`.
  Storage, Analytics, Gemini, and Firebase Hosting are intentionally disabled.
- **Sign-in works.** Google is the only method; no password or account-linking
  code remains. The owner completed a real production sign-in on 2026-08-02.
  Getting there required two fixes in Forkast's own delivery layer, both now
  invariants below.
- **Email/password sign-in is disabled** in Firebase as of 2026-08-03; Google is
  the only enabled provider. There was nothing to delete alongside it: the
  project contains exactly one Auth account, Google-only, with no password
  credential. The disposable password account described in earlier handoffs no
  longer exists.
- The single household is owned by that account, has City Market and Costco
  seeded, and holds one expired, unused invite. Whether it is the original
  bootstrap household or a fresh one, it is now the owner's live household and
  must not be deleted.
- Website import works on most sites and is blocked by a few publishers. This is
  measured, not assumed: see Section 5.
- The local service-account key lives outside the repository at
  `/Users/adil/Code/forkast-4dl-firebase-adminsdk-fbsvc-1b9b26cd84.json`, mode
  `0600`. Never commit it. In production it is the Netlify secret
  `FIREBASE_SERVICE_ACCOUNT_JSON` (all scopes — Netlify Free has no granular
  scoping).

### Operational invariants

Each of these was learned from a production failure. Breaking one fails quietly.

- **CSP must allow `https://apis.google.com`** in `script-src` and `frame-src`
  (`netlify.toml`). Firebase Auth loads its gapi bootstrap there for both the
  popup and redirect flows. Without it, sign-in fails with `auth/internal-error`
  before the popup opens.
- **`/__/` must stay in `navigateFallbackDenylist`** (`vite.config.ts`). The
  Firebase auth handler is proxied onto our own origin, so otherwise the service
  worker serves the app shell in its place and sign-in hangs on the boot screen
  with no error at all.
- **The build stamps `COMMIT_REF` into `index.html`** (`vite.config.ts`). The
  service worker precaches the document *with its response headers* and only
  refetches when the document hash changes, so without the stamp a header-only
  deploy never reaches an installed client.
- **Verify delivery-layer changes in a browser, not with `curl`.** `curl` has no
  service worker and reported everything healthy while two of the faults above
  were live.
- Firebase Admin stays on the 13.x line (14.x bundles an ESM-only `jose` path
  that crashes in Netlify's CommonJS packaging). Netlify functions need
  `AWS_LAMBDA_JS_RUNTIME=nodejs24.x`. PostCSS is pinned to the earliest
  audited-safe release old enough for Netlify's lagging npm mirror.

### Implemented MVP

- Responsive React/TypeScript/Vite PWA using the cool-paper kitchen-pass system
  in `DESIGN.md`.
- Google-only sign-in (popup on desktop, redirect on iPhone and installed PWA),
  sign-out, persistent sessions, first-household bootstrap, seeded City
  Market/Costco stores, and one-time household invitations.
- Recipe list, search, favorites, manual create/edit/delete, draft recovery,
  details, source attribution and images, serving scaling, and selected-or-all
  ingredient transfer to shopping.
- Authenticated JSON-LD website importer with an editable review/fallback and
  SSRF, redirect, DNS/IP, timeout, response-size, and content-type protections.
- Plan to Eat CSV preview/import with unknown-field preservation, duplicate
  decisions, progress, and a downloadable completion report.
- Realtime/offline per-store shopping lists: quantities, manual items,
  check/uncheck, move/delete, clear confirmation, delete undo, safe exact-item
  combining, remembered store routing, per-store transfer receipts.
- Full versioned household JSON export, schema.org Recipe JSON-LD export, and a
  source/image manifest. Restore guidance is in `README.md`.
- Netlify Functions, production headers, PWA install/Shortcut instructions,
  Firestore rules, CI, and unit/rules/browser tests.

Milestones 0–6 of the original plan are complete. Do not rebuild them.

### Verification completed

- `npm run check` passes: TypeScript, ESLint, Prettier, 29 unit tests, and the
  production/PWA build. Auth tests cover Google-only popup, redirect completion,
  redirect failure, and cancellation, and assert that no user-facing auth message
  mentions a password or linking.
- Playwright Chromium/Mobile Safari smoke tests pass. The signed-out screen was
  measured at 1440, 390, and 320px: no horizontal overflow, 52px touch target.
- The Firestore emulator rules suite passes in GitHub Actions; recent workflow
  runs are green in both `verify` and `rules` jobs.
- `npm audit --audit-level=high` passes. Twelve known moderate transitive issues
  remain in dev/admin tooling; the offered forced downgrade is breaking and was
  intentionally not applied.
- Impeccable was used throughout. Its detector ran once and returned no findings;
  **do not rerun it merely for a handoff.** Critique and finish-reviewer passes
  are persisted under `.impeccable/`.
- Production probes: the app, manifest, icons, cache/security headers, and the
  anonymous function boundary behave correctly — anonymous import returns
  `401 {"message":"Sign in to continue."}` rather than crashing.
- Household bootstrap, store seeding, invite creation, and export structure were
  all proven in production during acceptance. The account that exercised them no
  longer exists; the current state is described above.
- Recipe import was verified end-to-end through the live function on 2026-08-03,
  so the fetch originated from Netlify's IPs rather than a developer machine.
  Seven sites returned complete recipes and a known-blocked site failed as a
  control. Details and the full site table are in Section 5.

### Continuation checklist

1. Confirm a clean tree on `main`.
2. Done 2026-08-03: Email/Password disabled, and no disposable account existed to
   delete. Do not delete the remaining account or household — they are the
   owner's. If an account ever does need removing, resolve exact IDs privately
   and never record them in Git.
3. Household bootstrap is verified server-side: one household, owner role
   correct, City Market and Costco both seeded. Still unverified by the owner:
   that sign-out then sign-back-in preserves access on a real device.
4. Have Marla sign in with Google and redeem a fresh one-time invite; confirm
   both accounts share the household. Then confirm an unrelated Google user with
   no invite gets an isolated household and cannot read the first one. Remove any
   synthetic isolation-test data afterwards.
5. Run the private/physical acceptance work in Section 10 that cannot be
   automated. Do not commit private CSV, recipe, account, or export data.
6. Fix blockers, rerun proportional tests, push, and update this section. Only
   then mark the definition of complete in Section 12.

Remaining owner-only inputs: interactive Google consent for Marla and an
unrelated test account, the household's own recipe sites and Plan to Eat CSV, two
physical iPhones, export inspection, and one week of real use. Exact account
email addresses are deliberately not recorded here.

If sign-in ever breaks again, separate the two signatures first: a visible
message carries a Firebase code (every unmapped code is surfaced as
`Reference: auth/...`) and points at Google or Firebase configuration; a silent
hang points at Forkast's delivery layer and the invariants above.

## 2. How to work on this

The implementing agent is expected to carry work through without pausing for
routine product, design, dependency, naming, Firebase, Netlify, or testing
decisions. Use `PRODUCT.md`, this plan, repository evidence, official
documentation, real browser behavior, and judgment. When several options are
viable, choose the simplest reversible one that satisfies the acceptance criteria
and the YAGNI boundary. Do not stop at analysis, scaffolding, or a partial
vertical slice.

Ask the owner only when no safe progress remains, when platform policy requires
approval, or when a genuinely unavailable credential or physical-device action
blocks a check. A useful but nonessential uncertainty is not a blocker: record it
and continue with everything independent of it.

Delivery follows `/Users/adil/Code/AGENTS.md`: the owner's Git identity only,
never any AI/bot/co-author attribution, work directly on `main`, no branches or
pull requests, no rewriting published history. Deliver atomically — one coherent
change at a time, with proportional verification, staged narrowly, pushed to
`origin/main`, keeping `main` deployable at every commit. Do not squash the work
into one mega-commit at the end.

Impeccable is mandatory for material frontend changes, not a final coat of paint.
Apply `DESIGN.md` consistently, inspect the result in a real browser at narrow
iPhone and desktop widths, and keep hierarchy, one-handed reach, touch targets,
text enlargement, safe areas, focus behavior, screen-reader semantics, contrast,
and reduced motion intact. Visual polish never authorizes deferred features.

## 3. Product goal and YAGNI boundary

Forkast replaces the parts of Plan to Eat this household actually uses: save a
clean recipe from a website on an iPhone in a few taps, favorite it, scale
servings, keep synchronized City Market and Costco lists with remembered
ingredient-to-store routing, and import the existing library from a Plan to Eat
CSV. Supporting essentials: title/ingredient search, manual recipe CRUD, adding
whole recipes or selected ingredients to lists, arbitrary grocery items,
collaborative checking with poor service, Home Screen install, and full export.

**Released from deferral on 2026-08-03 by the owner**, who asked for them
directly. They are no longer gated on evidence; see Section 14 for scope and
status.

- Meal-planning calendar and turning a plan into a shopping list
- Per-member store preferences on the shared list
- A starter recipe catalog and a rotating "Recipes of the week"
- Light/dark/system appearance — **shipped**, commit `608a838`

**Explicitly deferred** — deferred is not rejected, but each item needs a real
household problem to supply its acceptance criteria first:

- Drag-and-drop meal planning and saved reusable plans
- Pantry/freezer inventory and "what can I make?" queries
- Nutrition, macros, USDA matching, density tables
- Price tracking, budgets, grocery-ordering integrations
- OCR, PDF, screenshot, and social-platform scraping
- LLM-based parsing
- Recipe collaboration history and simultaneous editing
- Ingredient synonyms, taxonomy, automatic aisle classification, volume-to-weight
  conversion
- Multiple named list histories, archival, templates
- Push notifications, reminders, background sync, native apps
- Locally uploaded recipe photos
- Roles beyond owner/member, public sharing, multi-household users
- Analytics, Sentry, feature flags, bespoke admin panel
- CRDTs, custom sync protocol, separate API server, SQL, microservices

## 4. Settled decisions

Settled unless implementation evidence shows one is unworkable.

| Area | Decision | Reason |
| --- | --- | --- |
| Build vs. adopt | Build Forkast | The validated scope is far smaller than RecipeSage, and the custom UX is the point. |
| Client | React, TypeScript, Vite | Boring, familiar, strongly supported. |
| Form factor | Responsive installable PWA | No App Store, wrapper, or Apple Developer account needed. |
| Hosting | Netlify | Explicit preference; project and domain already exist. |
| API | Netlify Functions | Only for fetching third-party pages and a few privileged household operations. |
| Authentication | Google-only Firebase Auth | Forkast stores no passwords. Any Google user may create an isolated household or redeem an invite. |
| Primary data | Cloud Firestore | Realtime collaboration and offline write queuing without a custom sync engine. |
| Images | Preserve the source image URL; no uploads | Avoids Firebase Storage billing, which now requires Blaze even inside no-cost quotas. |
| Styling | Plain CSS with a small token layer | No component framework before the interface demands one. |
| State | React state plus Firestore listeners | No Redux, Zustand, or query cache without a demonstrated problem. |
| Offline | Firestore persistent cache plus PWA shell | No CRDT, change log, or custom IndexedDB sync layer. |
| Recipe extraction | Server-side JSON-LD/schema.org first | Most established sites publish structured data; this strips ads and narrative naturally. |
| Messy imports | Editable review plus manual fallback | Smaller and more reliable than promising universal scraping or adding an LLM. |
| Export | Forkast JSON plus schema.org Recipe JSON-LD | Human-recoverable backup and portable records. |

Retained warnings from the original research: URL import is the largest product
risk, iOS has no Web Share Target API, social platforms cannot be reliably
scraped, nutrition is approximate, and export must not be an afterthought.

## 5. Recipe import

### How capture works today

iOS Safari has no PWA Web Share Target API, so capture uses a user-installed
"Save to Forkast" Shortcut: on a recipe page, Share → Save to Forkast, which
opens `https://forkast.4dl.ca/import?url=<encoded-url>`. Forkast calls its
authenticated Netlify function, which fetches the page server-side and extracts
schema.org Recipe JSON-LD into an editable review screen. The import screen also
has a Paste URL button.

Expectations are deliberately honest: sites with JSON-LD work well, sites without
it show a clear fallback rather than saving junk, the fallback allows manual
entry, and the source URL is always retained.

### Publisher blocks: measured 2026-08-02

Twenty popular recipe sites were probed with Forkast's exact importer request,
then checked for the Recipe JSON-LD the extractor needs. **Fifteen work.**

| Result | Sites |
| --- | --- |
| Works — recipe data extracted | Food Network, Delish, Taste of Home, BBC Good Food, Epicurious, Bon Appétit, Food.com, King Arthur Baking, NYT Cooking, Budget Bytes, Sally's Baking, RecipeTin Eats, Pinch of Yum, Love and Lemons, Minimalist Baker |
| Blocked | Allrecipes (402), Serious Eats (402), Simply Recipes (402), The Kitchn (403) |
| Reachable but unstructured | Smitten Kitchen — publishes recipes as prose, no JSON-LD |

The blocks are concentrated, not an industry trend: Allrecipes, Serious Eats, and
Simply Recipes are all People Inc. brands behind one Cloudflare pay-per-crawl
policy that returns `402` with a content-licensing contact in the body. The
Kitchn (Apartment Therapy) is a separate `403`. All four permit general crawling
in `robots.txt` — the refusal happens at the CDN edge, so `robots.txt` is no
guide here. The same 402 was returned to both Forkast's user-agent and an
ordinary desktop Chrome user-agent from a residential connection, so this is
neither a datacenter-IP problem nor a header problem.

Confirmed through production on 2026-08-03: Netlify's datacenter IPs make no
difference. Seven working sites were imported end-to-end through the live
function — Food Network, Food.com, BBC Good Food, Bon Appétit, NYT Cooking,
Budget Bytes, and RecipeTin Eats — all returning complete recipes (Food Network
15 ingredients and 9 steps; NYT Cooking 7 and 4). Allrecipes, run as a control in
the same batch, failed with `FETCH_FAILED` as expected. The residential table
above therefore holds for production.

**Ruled out permanently.** Headless browsers (Playwright, Puppeteer), stealth
plugins, residential proxies, user-agent spoofing, and challenge-solving services
all exist to defeat an access control the publisher deliberately set and
advertised. They contradict the import boundary in `PRODUCT.md`, they are fragile
enough to break on the publisher's schedule, and a browser engine is impractical
inside a Netlify function on this cost plan.

### Approved direction: capture from the user's own browser

The owner approved this on 2026-08-03: for pages Forkast's server cannot fetch,
the user opens the page in their own browser as a genuine reader and shares it
into Forkast, which parses the HTML the browser already has. No access control is
circumvented, because there is nothing to circumvent — it is a person reading a
website and choosing what to do with the page.

Not yet built, and still gated on evidence: build it when the household's own
failed-site count justifies it, not speculatively. Two shapes:

- Extend the existing iOS Shortcut to pass the page contents Safari already
  loaded, instead of only the URL.
- A desktop paste-the-page fallback for the same reason.

Both accept untrusted HTML from the client, so the server path's protections need
equivalents on the new path:

- Enforce a size limit before parsing, and reject anything that is not HTML.
- Sanitize before parsing; never execute page scripts; parse JSON-LD defensively.
- Do not trust client-claimed provenance — treat a supplied source URL as a
  label, validate it, and keep it clearly separate from parsed content.
- Return and store only normalized recipe fields, never the whole page.
- Keep the server fetch path as the default for sites that permit it; the
  browser path is a fallback, not a replacement.

`PRODUCT.md` needs no change: it already names the Shortcut as the capture
mechanism, and its rule against bypassing login walls, CAPTCHAs, and bot
protection is upheld by this design rather than strained by it.

Smitten Kitchen is a separate problem — access is fine, structure is absent. That
would need a fallback parser (microdata, `h-recipe`, or recipe-plugin markup),
which is its own decision and is not authorized by the above.

### Evidence-led decision queue

After at least two weeks of household use, review evidence in this order:

1. If recipes are regularly planned ahead, add a simple week view with tap to
   place. Do not start with drag-and-drop.
2. If source images frequently disappear or personal photos are wanted, enable
   Firebase Storage on Blaze with budget alerts and client-side WebP resizing.
3. If manual fallback is common, count the failing sites, then act on Section 5.
   A broader parser or an LLM does not help against a publisher block.
4. If store layouts matter in practice, add user-ordered aisle sections per store.
5. If duplicate ingredient naming causes visible list pain, introduce aliases
   gradually from user corrections rather than importing a global ontology.
6. Consider pantry/freezer inventory only if the household repeatedly asks "what
   can we make with what we have?"
7. Nutrition, price tracking, OCR, social import, reminders, and grocery-order
   integrations stay last — costly, approximate, or fragile.

## 6. Technical architecture

```text
iPhone / desktop PWA
  ├── Netlify CDN: React application and service worker
  ├── Firebase Auth: persistent household sign-in
  ├── Firestore web SDK: recipes, preferences, realtime shopping items
  └── /.netlify/functions/import-recipe
        ├── verifies the Firebase ID token
        ├── validates and safely fetches an external URL
        └── extracts schema.org Recipe JSON-LD into a draft response
```

The browser writes household data directly to Firestore under security rules. The
import function does not save a recipe; it returns an untrusted draft for the
signed-in user to review, which keeps the function small and the CRUD path
consistent.

Dependencies are deliberately short: React, React DOM, wouter, Firebase modular
SDK, Zod, Papa Parse, `parse-ingredient` behind Forkast's own adapter,
`vite-plugin-pwa`/Workbox, Cheerio in the function, and Vitest / React Testing
Library / Playwright / Firebase Emulator Suite for tests. Do not add a UI
framework, global state package, query cache, date library, or form library until
plain React becomes demonstrably painful.

### Firestore layout

```text
users/{uid}
  displayName, email, householdId

households/{householdId}
  name, ownerUid, createdAt

households/{householdId}/members/{uid}
  role                 # owner | member
  joinedAt

households/{householdId}/invites/{inviteId}
  tokenHash            # never expose the raw token after creation
  expiresAt, createdBy, usedAt

households/{householdId}/recipes/{recipeId}
  title, description, sourceUrl, sourceHost, imageUrl, baseServings,
  ingredients[], instructions[], notes, tags[], starred, importMetadata,
  createdAt, createdBy, updatedAt, updatedBy

households/{householdId}/stores/{storeId}
  name                 # City Market | Costco
  sortOrder

households/{householdId}/ingredientStoreRules/{normalizedIngredientKey}
  displayName, storeId, updatedAt, updatedBy

households/{householdId}/shoppingItems/{itemId}
  name, normalizedName, quantity, quantityMax, unit, note, storeId,
  checked, manual, sourceRecipeId, sourceIngredientId,
  createdAt, createdBy, updatedAt, updatedBy
```

Each recipe ingredient is an embedded object:

```ts
type RecipeIngredient = {
  id: string;
  rawText: string;
  quantity: number | null;
  quantityMax: number | null;
  unit: string | null;
  name: string;
  note: string | null;
  scalable: boolean;
};
```

Embedding ingredients keeps a recipe read to one document and matches how
ingredients are edited. Shopping items stay separate documents because their
checked/store state changes frequently and concurrently — never store a whole
list as one array or document.

## 7. Security constraints

Firestore rules are a release blocker, not polish:

- A signed-in user can read their own `users/{uid}` record.
- Household subcollection access requires a matching membership document.
- Clients cannot make themselves owner or add arbitrary members; invite creation,
  redemption, and membership changes go through verified server functions.
- Recipe and shopping writes validate allowed fields and basic types, and store
  IDs must reference one of the household's stores.
- Emulator tests cover owner, member, non-member, unauthenticated,
  malformed-write, and cross-household cases.

The import function is an SSRF boundary and stays one:

- Require and verify a Firebase ID token, then confirm household membership.
- Accept only `http`/`https`; reject credentials in URLs and nonstandard ports.
- Resolve the hostname and reject loopback, link-local, private, multicast, and
  cloud-metadata addresses for IPv4 and IPv6.
- Revalidate every redirect and cap the redirect count.
- Apply timeouts, a response-size limit, and an HTML-only content-type policy.
- Send a truthful Forkast user agent and never bypass CAPTCHAs or bot defenses.
- Parse JSON-LD defensively, never execute page scripts, and return only
  normalized recipe fields.
- Keep the per-user rate limit and structured error codes.

## 8. Behavior rules

**Serving scaling.** Save an immutable `baseServings`; display factor = requested
÷ base. Scale `quantity` and both ends of a range when `scalable`. Leave
absent/non-numeric quantities alone. Render common kitchen fractions when close
enough, otherwise a sensible decimal with no false precision. Never convert cups
to grams, merge unlike units, or apply densities. The editor can correct a parsed
ingredient and mark a line non-scalable. Tests cover integers, decimals,
Unicode/mixed fractions, ranges, zero/missing servings, "to taste," and rounding.

**Offline and sync.** Firestore's persistent local cache with multi-tab support;
realtime listeners only for the active household's shopping items and visible
recipe data. Precache the app shell; runtime-cache recipe images conservatively
and tolerate third-party images disappearing. Show clear offline, syncing, and
failed-write states. Rely on Firestore's mutation queue — do not layer another
queue on top. Per-item last-write behavior is sufficient; simultaneous edits to
one item are rare and do not justify a merge UI. iOS has no dependable background
sync, so reconnect and flush in the foreground.

## 9. Cost plan

Expected operating cost is **$0/month at household usage**, with two
qualifications.

**Netlify.** The Free plan has a hard 300-credit monthly limit consumed by
production deploys, bandwidth, requests, and function compute — notably 15
credits per production deploy, so frequent deploys drain the allowance faster
than app traffic does. The plan pauses the site at the limit rather than billing.
Keep auto-recharge off, batch meaningful changes, and monitor credits during
development and after the Plan to Eat import. The account may hold legacy pricing
(accounts created before 2025-09-04); confirm on the team billing page.

**Firebase.** Auth and Firestore household usage sit far inside the free quota
(1 GiB stored, 50k reads, 20k writes, 20k deletes per day, 10 GiB egress/month).
Cloud Storage now requires the Blaze plan and a linked billing account even
within no-cost quotas — hence source image URLs instead of uploads, and Spark
with no billing account. If uploads ever become important, enable Blaze
deliberately, pick an eligible no-cost bucket region, resize in the browser, and
set budget alerts, remembering that budgets alert but do not cap charges.

The `4dl.ca` domain is the only already-paid external cost. No LLM, paid scraping
service, Apple account, or server is required.

References: <https://www.netlify.com/pricing/>,
<https://firebase.google.com/docs/firestore/quotas>,
<https://firebase.google.com/pricing>

## 10. Verification strategy

Every implementation change runs typecheck, ESLint, unit tests, and a production
build, plus Firestore rule tests when data access changes and Playwright smoke
tests for critical flows. CI runs these on pushes to `main`; keep it small enough
not to waste Netlify deploy credits.

### Operating production without a browser

These techniques were worked out during the Google-only cutover and are recorded
because nothing else in the repository explains them. All of them use the local
service-account key named in Section 1.

- **Confirm a deploy actually landed.** Poll the production document for the
  commit SHA rather than guessing at Netlify timing:
  `curl -sS https://forkast.4dl.ca/ | grep forkast-build`. The stamp equals the
  deployed commit.
- **Confirm a service-worker-affecting change reached clients.** Load the site in
  a browser, then re-load. The first visit fetches the new worker; the second is
  served by it. Reading headers with `curl` proves nothing about what an
  installed client sees.
- **Read or change Firebase Auth configuration** through the Identity Toolkit
  admin API with a `cloud-platform`-scoped token from the key:
  `GET/PATCH https://identitytoolkit.googleapis.com/admin/v2/projects/forkast-4dl/config`
  (authorized domains, `signIn.email.enabled`) and
  `.../defaultSupportedIdpConfigs` (provider enablement). Email/password was
  disabled with `PATCH ?updateMask=signIn.email.enabled`.
- **Exercise an authenticated Netlify Function without a browser.** Mint a custom
  token for a uid whose `users/{uid}` document has a `householdId`, exchange it
  via `accounts:signInWithCustomToken` with the public `VITE_FIREBASE_API_KEY`,
  then send the resulting `idToken` as a Bearer header. `import-recipe` is
  read-only — it returns a draft and writes nothing — so it is safe to probe.
  Respect its limit of 10 imports per minute per uid.
- **Field-name trap.** The extractor returns `ingredientLines`, not
  `ingredients`. A probe reading the wrong field reports empty recipes and looks
  like a data-loss bug.
- **Inventory before destructive work.** List Auth users with their providers and
  map each household's members and document counts first. Doing this is what
  revealed that the "disposable password account" in earlier handoffs no longer
  existed and that the only remaining household was the owner's.

Required fixture coverage:

- JSON-LD: single object, `@graph`, array, HowToStep, HowToSection, missing
  servings, multiple image representations, malformed JSON, and no Recipe
- Ingredients: integer, decimal, common fraction, Unicode fraction, mixed
  fraction, range, missing unit, "to taste," non-scalable text
- Plan to Eat: normal export, alternate capitalization, embedded
  newlines/quotes, blank fields, duplicate URLs/titles, unknown columns,
  invalid rows
- Security: unauthenticated, member, non-member, cross-household, invalid store,
  unexpected fields, attempted role escalation

Household acceptance script, on the two actual iPhones:

1. Install Forkast, sign in with Google, confirm the session survives closing and
   reopening the installed PWA.
2. Share three real recipe websites through the Shortcut, including one expected
   failure, and confirm manual recovery is tolerable.
3. Star a recipe and find it by search.
4. Change a 4-serving recipe to 6 and check the quantities.
5. Add selected scaled ingredients to both stores.
6. Move an ingredient from City Market to Costco and remember the preference.
7. Put one phone offline, change items on both, reconnect, confirm the result.
8. Export all data and inspect the files.
9. Cook and shop from Forkast for one real week before cancelling Plan to Eat.

## 11. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A site blocks fetching or lacks JSON-LD | Honest error, preserve the URL, editable manual entry, no bot bypass. See Section 5. |
| Imported ingredients parse incorrectly | Preserve `rawText`, show review, allow correction and non-scalable marking. |
| Firestore rules leak household data | Emulator rule tests are a release blocker; membership mutation stays server-side. |
| Import function reaches internal hosts | Redirect-aware DNS/IP validation, timeouts, size limits. |
| Two users overwrite list state | One document per shopping item. |
| Offline data disappears on iOS | Firestore is the source of truth; local state is a cache; sync on foreground. |
| Third-party image URLs break | Graceful placeholder; consider Storage only if it becomes a real problem. |
| Free tiers change or are exhausted | Portable exports, monitor dashboards, recharge off, avoid Blaze in MVP. |
| Plan to Eat export shape differs | Inspect the real CSV privately, preview mappings, preserve unknown fields, never commit the data. |
| A delivery-layer change silently breaks auth | Keep the Section 1 invariants; verify in a browser with the app installed. |
| Friends can see another household | Membership-based rules stay authoritative; verify with a separate Google account. |
| Project expands before it is useful | Enforce the YAGNI boundary; schedule deferred work only from observed use. |

## 12. Definition of MVP complete

Software and automated criteria are met, production credentials and rules are
live, Google sign-in works, email/password is retired, and website import is
verified from production. Everything still open needs owner consent, the
household's own data, or a physical iPhone. The items below are not claimed
complete; see the continuation checklist for order.

- The owner and Marla sign in only with Google and stay signed in on their
  iPhones, with no legacy password identity.
- A friend can create a separate household with Google and cannot access the
  initial household.
- The Plan to Eat library is imported with a reviewed error report.
- Website import succeeds on the household's common sites through the Shortcut in
  a few taps.
- Recipes are clean, editable, searchable, favoritable, and correctly scalable.
- Ingredients route to City Market or Costco and the preference is reused.
- Shopping changes synchronize between both users and survive a tested offline
  period.
- The app is installable and usable at <https://forkast.4dl.ca>.
- Firestore security tests and the automated suite pass.
- A complete export has been generated and inspected.
- The household has used Forkast for one real week without a switch-blocking
  problem.

## 13. Fresh-task kickoff

> Continue the Forkast project in `/Users/adil/Code/Forkast`. Read `PRODUCT.md`,
> `PLAN.md`, `README.md`, and `/Users/adil/Code/AGENTS.md` before acting. Treat
> `PRODUCT.md` and `PLAN.md` as the product and implementation authorities.
> **Start from Section 14 — it is the live work — then** the continuation
> checklist in Section 1. Respect the operational
> invariants there, read "Operating production without a browser" in Section 10
> before touching Firebase or production, and preserve completed work — do not
> rebuild milestones and do
> not rerun Impeccable's one-time detector. Work autonomously to the definition of
> complete in Section 12 without stopping for routine questions. Use Impeccable
> for any material frontend change and re-verify affected flows in a real browser.
> Make coherent atomic changes, verify each, commit with only my configured Git
> identity, and push directly to `origin/main`. Never create a branch or pull
> request, never add AI or co-author attribution, and keep `main` deployable. If a
> credential, private-data, or physical-device blocker remains, finish every
> independent task and report the exact owner action needed.

## 14. Second pass: planning, per-member routing, catalog, appearance

Opened 2026-08-03 on the owner's direct instruction. Four items, taken in this
order. Everything below reflects state at the handoff point.

### 14.1 What the owner asked for

1. The light/dark/system appearance control used on `adilio.ca` and `4dl.ca`.
2. A shopping list that handles several people with different store preferences.
3. Assigning recipes to days and turning that into a shopping list, the way Plan
   to Eat does.
4. A "Recipes of the week" surface, backed by roughly forty recipes sourced from
   the top recipe sites.

These override the YAGNI deferral in Section 3 for exactly these four items and
nothing adjacent. Drag-and-drop planning, saved reusable plans, and pantry
inventory remain deferred.

### 14.2 Status

| Item | State |
| --- | --- |
| Appearance control | **Shipped and pushed**, commit `608a838` |
| Per-member store preferences | **Shipped and pushed**, commit `bda3fe9` |
| Meal plan calendar | **Next task** — designed in 14.5 |
| Recipe catalog and Recipes of the week | **Shipped**, commits `2a7fd9d`, `4e355a8`, `42a9776` |

### 14.3 Appearance control — done

`src/lib/theme.ts` holds the preference in a `useSyncExternalStore` store,
`src/components/ThemeToggle.tsx` renders it as three real radio inputs behind
styled labels, and a boot script in `index.html` stamps `data-theme` on `<html>`
before first paint. The control lives in Settings. Six unit tests in
`src/lib/theme.test.ts` cover device following, storage, live device changes,
and a held choice ignoring them.

Two invariants worth keeping:

- **Never write a colour literal in a component rule.** Both themes are token
  sets; a literal is a value that cannot flip. Type on a filled action control
  is `--on-action`, because under low light the action green becomes a *light*
  fill and only dark type reads on it.
- **Theme switching suppresses transitions for one frame**
  (`:root[data-theme-switching]`). Components animate colour to explain their
  own state changing. A theme swap changes every colour at once and animating it
  reads as a smear.

`DESIGN.md` carries the full night palette and is the authority for it.

### 14.4 Per-member store preferences — done

**The problem.** `households/{id}/ingredientStoreRules/{key}` is one shared set
of ingredient-to-store rules. With two people on one list, whoever last sent
ingredients silently retrained routing for both. Where an ingredient is bought
is a personal habit; the list itself is correctly shared.

**The shape.** Routing resolves in layers, most personal first:

1. `households/{id}/memberPrefs/{uid}/storeRules/{normalizedIngredientKey}`
2. `households/{id}/ingredientStoreRules/{key}` — the pre-split household rules,
   still **read** as an inherited baseline, no longer **written**. Nobody's
   existing habits are discarded and no migration is needed.
3. `households/{id}/memberPrefs/{uid}.defaultStoreId`
4. The household's first store.

`src/lib/storeRouting.ts` implements this as a pure function over plain maps,
deliberately free of Firestore so it can be tested directly. It returns the
reason alongside the store, because a list that reroutes without saying so reads
as a bug the first time it disagrees with you.

**What shipped.** `memberPrefs/{uid}` holds each person's `defaultStoreId`;
`memberPrefs/{uid}/storeRules/{key}` holds their own ingredient rules.
`rememberStore` writes only the caller's rules. The shopping tab opens on the
reader's own store, **derived rather than stored** so it settles when the
preference arrives instead of an effect racing the render — ESLint's
`set-state-in-effect` rule catches the stored version, so do not reintroduce it.
Settings gained a default-store picker and a way to forget your own routing.

`displayName` is now mirrored onto `households/{id}/members/{uid}` by both
`bootstrap-household` and `redeem-invite`, because `users/{uid}` is readable only
by that user and a shared list otherwise has no way to credit anyone. **Existing
member documents predate this and have no `displayName`** — the UI falls back to
"someone in your household". If the owner wants real names on existing rows, a
one-off admin backfill from `users/{uid}` is needed; it was not run, because
doing so touches the owner's live household.

Rules test `keeps store preferences personal` covers a member reading but not
writing another's preferences, a non-member being refused entirely, a
nonexistent store being rejected, and the old household collection being
readable but frozen.

### 14.5 Meal plan calendar — not started

Intended shape, matching how Plan to Eat is actually used:

```text
households/{householdId}/plannedMeals/{plannedMealId}
  date              # YYYY-MM-DD, local to the household, not a timestamp
  slot              # breakfast | lunch | dinner | other
  recipeId
  servings          # the planned scale, independent of the recipe's base
  note
  createdAt, createdBy, updatedAt, updatedBy
```

A week view with tap-to-place rather than drag-and-drop, per Section 5's
decision queue. The plan-to-list step scales each planned recipe to its planned
servings and routes every ingredient through `routeIngredient`, so it reuses the
transfer path that already exists on the recipe screen rather than a second one.
Store the date as a plain `YYYY-MM-DD` string: a timestamp makes "Tuesday" depend
on the reader's device time zone, which is wrong for a household calendar.

Open question, decide with evidence rather than up front: whether adding a
planned week to the list should skip ingredients already on it. Combining is
already handled for exact matches by `addIngredientToShopping`.

### 14.6 Recipe catalog and Recipes of the week — done

Forty-five recipes, drawn only from the fifteen sites Section 5 measured as
readable and spread across those sites, weeknight dinners, vegetarian meals,
breakfasts, and bakes.

**The boundary that shaped it.** Importing a recipe into the household's own
Firestore is personal use and is what Forkast exists to do. Committing forty-five
publishers' instruction text into this repository is redistribution — ingredient
lists are not copyrightable, instructions are, and attribution is not a licence.
So `src/data/catalog.ts` holds links and factual labels only: `id`, `title`,
`siteName`, `url`, `tags`, `minutes`. The type deliberately has no
`description`, `ingredients`, or `instructions`, so a reviewer sees the rule
without reading a comment. **Do not "fix" a future gap by checking in a JSON dump
of imported results.**

`minutes` is nullable because several publishers state no time; Epicurious, Bon
Appétit, and Food Network entries carry `null` rather than an invented number.

**Verification of the data.** Every URL was fetched and run through the real
extractor before being committed. `scripts/verify-catalog.ts` is that check —
`node --experimental-strip-types scripts/verify-catalog.ts`, 45/45 at the time of
writing. It is not part of `npm run check`, because it makes forty-five requests
to other people's servers. Run it when entries start failing; publishers move
URLs, and that is accepted rather than worked around.

**What shipped in the app.** `src/lib/catalogWeek.ts` picks the week
deterministically from the week number, counted in UTC from a Monday so both
phones agree and a new week starts on a Monday. `spreadBy` reorders the catalog
one site at a time first: the file is written site by site, and a plain window
over it handed out three recipes from one publisher.
`src/lib/catalogImport.ts` holds the add logic, free of Firestore and network so
it is tested directly; `src/lib/useCatalogAdder.ts` wires it to the app.
`CatalogRows` renders both surfaces.

Three behaviours worth keeping:

- **Duplicates are checked twice** — against the catalog link, and against the
  canonical URL the publisher declares, which is what actually gets saved and is
  often not the link we hold.
- **Rows settle as each recipe lands**, not when the batch ends. Anything else
  leaves an added recipe reading as still addable through a long run.
- **A batch paces itself** one under the importer's ten-per-minute-per-uid limit
  and reports failures per entry.

**Where it lives.** Reached from the recipe book at `/catalog`, not from the
rail. A fifth rail item would have meant re-cutting
`grid-template-columns: repeat(4, 1fr)` and spending one-handed reach at 320px.

**Verified in a browser** signed in against the emulators at 1440, 390, and
320px: no horizontal overflow, 52px touch targets, and real imports from nine
publishers, including a four-recipe and a seven-recipe batch.

Fixing this surfaced a parser bug worth noting: the unit pattern was not anchored
to a word ending, so "1 garlic clove" parsed as one gram of "arlic clove". Every
import had been going through it. Fixed in `4e355a8`.

### 14.7 Verification environment

`npm run check` passes at the handoff point: typecheck, ESLint, Prettier, 69
unit tests, production build.

**The Firestore emulator now runs locally.** It needs a Java runtime; the owner
installed Temurin 26 on 2026-08-03, and `npm run test:rules` passes. A
non-interactive agent cannot install it — `brew install --cask temurin` needs a
sudo password — so if a fresh machine lacks Java, ask the owner to run
`! brew install --cask temurin` rather than attempting it.

**Driving signed-in screens that call a Netlify Function.** `vite` alone does
not serve `/.netlify/functions`, and `netlify dev` applies the SPA redirect in
`netlify.toml` to Vite's own module URLs, so `/src/main.tsx` comes back as
`index.html` and nothing mounts. What works: run
`netlify functions:serve --port 9999` with `FIREBASE_AUTH_EMULATOR_HOST`,
`FIRESTORE_EMULATOR_HOST`, and `FIREBASE_SERVICE_ACCOUNT_JSON` set, then run Vite
with a local-only config that proxies `/.netlify/functions` to it. With the auth
emulator host set, Admin accepts emulator tokens. Sign in without touching the
popup by running, in the page:

```js
const fb = await import('/src/lib/firebase.ts');
const auth = await import('/node_modules/.vite/deps/firebase_auth.js');
await auth.signInWithCredential(
  fb.auth,
  auth.GoogleAuthProvider.credential(JSON.stringify({ sub: 'tester-1', email: 'tester@example.com', email_verified: true, name: 'Test Cook' })),
);
```

The window-resize path of the browser tooling did not work here, so narrow
widths were measured by driving the same signed-in flow through Playwright at
390 and 320px and asserting `scrollWidth === innerWidth`.

To drive signed-in screens in a real browser, set
`VITE_USE_FIREBASE_EMULATORS=true` in `.env.local`, start
`npx firebase emulators:start --project forkast-4dl --only auth,firestore`, and
seed a household through the Auth emulator. **Set the flag back to `false`
before committing** — it is a local-only switch and shipping it true would point
production at 127.0.0.1.
