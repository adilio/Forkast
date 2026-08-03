# Forkast implementation plan

Last updated: 2026-08-03.

The implementation authority for continuing Forkast. `PRODUCT.md` is the product
authority, `DESIGN.md` the visual one, `README.md` the operational setup. Git
history is the record of what was built and why; this file keeps only what a
fresh task needs in order to act correctly.

## 1. Next up

**1. Cache previewed recipes so they do not load again every time.** Opening a
catalog recipe reads it from the publisher. Today that read is remembered only
for the life of one screen (`createDraftCache` in `src/lib/catalogImport.ts`), so
leaving the catalog and coming back re-reads the page, and the weekly picks and
the catalog page each keep their own copy. Persist it per device instead —
IndexedDB or `localStorage`, keyed by the recipe URL — so a preview is instant
the second time and the importer's ten-a-minute allowance is spent once.

Decide these while building; they are not questions for the owner:

- Expire entries after a couple of weeks and cap how many are kept, so a
  corrected recipe is not frozen forever and storage cannot grow without bound.
- Serve the cached copy immediately; a stale preview beats a spinner.
- This is a per-device reading cache, like the browser's own. It never goes into
  the repository and never into Firestore — see the catalog boundary in
  Section 9.

**2. The meal plan calendar** — designed in Section 9, not started.

**3. Owner-only checks**, which need a person, a phone, or private data:

- Marla signs in with Google and redeems a fresh invite; both accounts then share
  the household. An unrelated Google account gets an isolated household and
  cannot read the first. Remove any synthetic test data afterwards.
- Sign out and back in on a real iPhone and confirm access survives.
- Install Forkast on both iPhones, capture three real recipe sites through the
  Shortcut including one expected failure, open two catalog previews and add one,
  scale a recipe, route ingredients to both stores, take one phone offline and
  reconcile, then export everything and read the files.
- Cook and shop from Forkast for one real week before cancelling Plan to Eat.

Do not commit private CSV, recipe, account, or export data. Exact account email
addresses are deliberately not recorded here.

## 2. Current state

- Repository `git@github.com:adilio/Forkast.git`, checkout
  `/Users/adil/Code/Forkast`, deploy branch `main`.
- Production <https://forkast.4dl.ca>; Netlify project `forkast-4dl`; fallback
  <https://forkast-4dl.netlify.app>; Cloudflare DNS-only CNAME.
- Firebase project `forkast-4dl`, Spark plan, Firestore Standard `us-west1`.
  Storage, Analytics, Gemini, and Firebase Hosting are intentionally disabled.
- **Google sign-in works in production** and is the only method. Email/password
  was disabled on 2026-08-03 and no password credential exists.
- One household, owned by the owner's account, City Market and Costco seeded.
  **It is live data — do not delete it.**
- The service-account key lives outside the repository at
  `/Users/adil/Code/forkast-4dl-firebase-adminsdk-fbsvc-1b9b26cd84.json`, mode
  `0600`. Never commit it. In production it is the Netlify secret
  `FIREBASE_SERVICE_ACCOUNT_JSON`.
- `npm run check` passes — typecheck, ESLint, Prettier, 75 unit tests, production
  build — as do the emulator rules suite, Playwright smoke tests, and
  `npm audit --audit-level=high`.

**Built and live.** The whole MVP: Google-only auth with household bootstrap and
one-time invites; recipe CRUD, search, favourites, draft recovery, serving
scaling, and ingredient transfer; the JSON-LD website importer with its SSRF
protections; Plan to Eat CSV import; realtime offline per-store shopping lists
with remembered routing; full JSON and schema.org export; PWA install; Firestore
rules; CI. Plus three second-pass features whose invariants are in Section 9: the
appearance control, per-member store routing, and the starter recipe catalog.

Do not rebuild any of it.

## 3. Operational invariants

Each was learned from a production failure. Breaking one fails quietly.

- **CSP must allow `https://apis.google.com`** in `script-src` and `frame-src`
  (`netlify.toml`). Firebase Auth loads its gapi bootstrap there. Without it,
  sign-in fails with `auth/internal-error` before the popup opens.
- **`/__/` must stay in `navigateFallbackDenylist`** (`vite.config.ts`). The
  Firebase auth handler is proxied onto our own origin; otherwise the service
  worker serves the app shell in its place and sign-in hangs silently.
- **The build stamps `COMMIT_REF` into `index.html`** (`vite.config.ts`). The
  service worker precaches the document *with its headers* and only refetches
  when the document hash changes, so without the stamp a header-only deploy never
  reaches an installed client.
- **Verify delivery-layer changes in a browser, not with `curl`.** `curl` has no
  service worker and called everything healthy while two of the above were live.
- Firebase Admin stays on 13.x (14.x bundles an ESM-only `jose` path that crashes
  Netlify's CommonJS packaging). Functions need
  `AWS_LAMBDA_JS_RUNTIME=nodejs24.x`. PostCSS is pinned for Netlify's lagging npm
  mirror.
- If sign-in breaks, separate the two signatures first: a visible message
  carrying a Firebase code (unmapped ones surface as `Reference: auth/...`) points
  at Google or Firebase configuration; a silent hang points at Forkast's delivery
  layer and the invariants above.

## 4. How to work on this

Carry work through without pausing for routine product, design, dependency,
naming, Firebase, Netlify, or testing decisions. When several options are viable,
choose the simplest reversible one that satisfies the acceptance criteria and the
YAGNI boundary. Do not stop at analysis or a partial slice.

Ask the owner only when no safe progress remains, when platform policy requires
approval, or when a genuinely unavailable credential or physical device blocks a
check. A useful but nonessential uncertainty is not a blocker: record it and
continue with everything independent of it.

Delivery follows `/Users/adil/Code/AGENTS.md`: the owner's Git identity only,
never any AI or co-author attribution, work directly on `main`, no branches or
pull requests, no rewriting published history. One coherent change at a time,
verified proportionally, pushed to `origin/main`, `main` deployable at every
commit. Do not squash a session into one mega-commit.

Impeccable is mandatory for material frontend changes, not a final coat of paint.
Apply `DESIGN.md`, inspect the result in a real browser at iPhone and desktop
widths, and keep hierarchy, one-handed reach, touch targets, text enlargement,
safe areas, focus, screen-reader semantics, contrast, and reduced motion intact.
Visual polish never authorises deferred features. Do not rerun Impeccable's
one-time detector for a handoff; its passes are under `.impeccable/`.

## 5. Product boundary

Forkast replaces the parts of Plan to Eat this household uses: save a clean
recipe from a website on an iPhone in a few taps, favourite it, scale servings,
keep synchronised City Market and Costco lists with remembered
ingredient-to-store routing, and import the existing library from a CSV.
Supporting essentials: title and ingredient search, manual CRUD, adding recipes
or selected ingredients to lists, arbitrary grocery items, collaborative checking
on poor service, Home Screen install, and full export.

**Deferred** — not rejected, but each needs a real household problem to supply
its acceptance criteria first:

- Drag-and-drop meal planning and saved reusable plans
- Pantry/freezer inventory and "what can I make?" queries
- Nutrition, macros, USDA matching, density tables
- Price tracking, budgets, grocery-ordering integrations
- OCR, PDF, screenshot, and social-platform scraping
- LLM-based parsing
- Recipe collaboration history and simultaneous editing
- Ingredient synonyms, taxonomy, aisle classification, volume-to-weight conversion
- Multiple named list histories, archival, templates
- Push notifications, reminders, background sync, native apps
- Locally uploaded recipe photos
- Roles beyond owner/member, public sharing, multi-household users
- Analytics, Sentry, feature flags, bespoke admin panel
- CRDTs, custom sync protocol, separate API server, SQL, microservices

**Evidence-led, once the household has used it for a fortnight:** enable Firebase
Storage on Blaze if source images keep disappearing or personal photos are
wanted; count failing sites before touching the parser; add user-ordered aisle
sections if store layout matters in practice; introduce ingredient aliases only
from real corrections; consider pantry inventory only if the household keeps
asking "what can we make with what we have?". Nutrition, price tracking, OCR,
social import, and grocery-order integrations stay last.

## 6. Settled decisions

Settled unless implementation evidence shows one is unworkable.

| Area | Decision | Reason |
| --- | --- | --- |
| Build vs. adopt | Build Forkast | The validated scope is far smaller than RecipeSage, and the custom UX is the point. |
| Client | React, TypeScript, Vite | Boring, familiar, strongly supported. |
| Form factor | Responsive installable PWA | No App Store, wrapper, or Apple Developer account. |
| Hosting | Netlify | Explicit preference; project and domain already exist. |
| API | Netlify Functions | Only for fetching third-party pages and a few privileged household operations. |
| Authentication | Google-only Firebase Auth | Forkast stores no passwords. |
| Primary data | Cloud Firestore | Realtime collaboration and offline writes without a custom sync engine. |
| Images | Keep the source image URL; no uploads | Avoids Storage billing, which now needs Blaze even inside free quotas. |
| Styling | Plain CSS with a token layer | No component framework before the interface demands one. |
| State | React state plus Firestore listeners | No Redux, Zustand, or query cache without a demonstrated problem. |
| Offline | Firestore persistent cache plus PWA shell | No CRDT or custom IndexedDB sync layer. |
| Recipe extraction | Server-side JSON-LD first | Most established sites publish structured data; it strips ads and narrative naturally. |
| Messy imports | Editable review plus manual fallback | Smaller and more reliable than universal scraping or an LLM. |
| Export | Forkast JSON plus schema.org JSON-LD | Human-recoverable backup and portable records. |

Dependencies stay short: React, React DOM, wouter, Firebase modular SDK, Zod,
Papa Parse, `parse-ingredient` behind Forkast's own adapter,
`vite-plugin-pwa`/Workbox, Cheerio in the function, and Vitest / React Testing
Library / Playwright / Firebase Emulator Suite for tests. Do not add a UI
framework, global state package, query cache, date library, or form library until
plain React becomes demonstrably painful.

## 7. Recipe import, and what publishers allow

iOS Safari has no PWA Web Share Target API, so capture uses a user-installed
"Save to Forkast" Shortcut: Share → Save to Forkast opens
`https://forkast.4dl.ca/import?url=…`, and the authenticated Netlify function
fetches the page server-side and extracts schema.org Recipe JSON-LD into an
editable review screen. There is also a Paste URL button. Sites with JSON-LD work
well; sites without show a clear fallback rather than saving junk; the source URL
is always kept.

**Measured 2026-08-02, confirmed from production 2026-08-03.** Twenty popular
sites were probed with Forkast's exact request. Fifteen work: Food Network,
Delish, Taste of Home, BBC Good Food, Epicurious, Bon Appétit, Food.com, King
Arthur Baking, NYT Cooking, Budget Bytes, Sally's Baking, RecipeTin Eats, Pinch
of Yum, Love and Lemons, Minimalist Baker. Four are blocked at the CDN edge —
Allrecipes, Serious Eats, and Simply Recipes (all People Inc., one Cloudflare
pay-per-crawl policy returning `402`) and The Kitchn (`403`). Smitten Kitchen is
reachable but publishes prose with no JSON-LD.

The blocks are not about us: the same `402` came back to an ordinary desktop
Chrome user-agent on a residential connection, and Netlify's datacenter IPs made
no difference when seven working sites imported cleanly through the live function
with Allrecipes failing as a control. `robots.txt` permits crawling on all four —
the refusal is at the edge, so it is no guide here.

**Ruled out permanently:** headless browsers, stealth plugins, residential
proxies, user-agent spoofing, and challenge-solving services. They exist to
defeat an access control the publisher deliberately set and advertised, they
contradict the import boundary in `PRODUCT.md`, and they break on the publisher's
schedule.

**Approved instead, when the household's own failed-site count justifies it:**
capture from the user's own browser. The user opens the page as a genuine reader
and shares it into Forkast, which parses the HTML the browser already has —
either by extending the iOS Shortcut to pass page contents, or a desktop
paste-the-page fallback. Nothing is circumvented. Both accept untrusted HTML, so
they need the server path's protections: a size limit before parsing, HTML only,
sanitise before parsing, never execute page scripts, parse JSON-LD defensively,
treat any supplied source URL as an unverified label kept separate from parsed
content, and store only normalised recipe fields. The server path stays the
default. Smitten Kitchen is a different problem — access is fine, structure is
absent — and a microdata or `h-recipe` fallback parser is its own decision.

## 8. Architecture, data, and rules

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
import function saves nothing; it returns an untrusted draft for the signed-in
user to review, which keeps the function small and the CRUD path single.

```text
users/{uid}                     displayName, email, householdId
households/{hid}                name, ownerUid, createdAt
  members/{uid}                 role (owner|member), joinedAt, displayName
  invites/{inviteId}            tokenHash, expiresAt, createdBy, usedAt
  recipes/{recipeId}            title, description, sourceUrl, sourceHost,
                                imageUrl, baseServings, ingredients[],
                                instructions[], notes, tags[], starred,
                                importMetadata, created*/updated*
  stores/{storeId}              name, sortOrder
  ingredientStoreRules/{key}    displayName, storeId, updated*  # frozen, read-only
  memberPrefs/{uid}             defaultStoreId
    storeRules/{key}            displayName, storeId, updated*
  shoppingItems/{itemId}        name, normalizedName, quantity, quantityMax,
                                unit, note, storeId, checked, manual,
                                sourceRecipeId, sourceIngredientId,
                                created*/updated*
```

Ingredients are embedded objects (`id`, `rawText`, `quantity`, `quantityMax`,
`unit`, `name`, `note`, `scalable`), which keeps a recipe read to one document
and matches how they are edited. Shopping items stay separate documents because
their checked and store state changes concurrently — never store a list as one
array.

**Firestore rules are a release blocker, not polish.** A user reads only their
own `users/{uid}`; household access requires a membership document; clients
cannot make themselves owner or add members, so invite creation, redemption, and
membership changes go through verified server functions; recipe and shopping
writes validate fields and types, and a store ID must reference one of the
household's stores. Emulator tests cover owner, member, non-member,
unauthenticated, malformed-write, and cross-household cases.

**The import function is an SSRF boundary and stays one.** Verify the ID token
and household membership; accept only `http`/`https` with no credentials or
nonstandard ports; resolve the hostname and reject loopback, link-local, private,
multicast, and cloud-metadata addresses for IPv4 and IPv6; revalidate every
redirect and cap the count; apply timeouts, a response-size limit, and an
HTML-only content-type policy; send a truthful user agent and never bypass
CAPTCHAs or bot defences; parse JSON-LD defensively and return only normalised
fields; keep the per-user rate limit and structured error codes.

## 9. Behaviour rules and shipped-feature invariants

**Serving scaling.** `baseServings` is immutable; factor = requested ÷ base.
Scale `quantity` and both ends of a range when `scalable`, leave absent or
non-numeric quantities alone, render common kitchen fractions when close enough
and otherwise a decimal with no false precision. Never convert cups to grams,
merge unlike units, or apply densities. The editor can correct a parsed
ingredient and mark a line non-scalable.

**Offline and sync.** Firestore's persistent multi-tab cache; realtime listeners
only for the active household's shopping items and visible recipe data. Precache
the shell, runtime-cache recipe images conservatively, tolerate third-party
images vanishing, and show clear offline, syncing, and failed-write states. Rely
on Firestore's mutation queue — do not layer another on top. Per-item last-write
is sufficient. iOS has no dependable background sync, so flush in the foreground.

**Appearance** (`608a838`). `src/lib/theme.ts` holds the preference in a
`useSyncExternalStore` store, `ThemeToggle` renders three real radio inputs, and
a boot script in `index.html` stamps `data-theme` before first paint. Never write
a colour literal in a component rule — both themes are token sets, and a literal
cannot flip; type on a filled action control is `--on-action`, because under low
light the action green becomes a *light* fill. Theme switching suppresses
transitions for one frame (`:root[data-theme-switching]`), or every colour
animating at once reads as a smear.

**Per-member store routing** (`bda3fe9`). Where you buy something is personal;
the list is shared. Routing resolves most-personal-first:
`memberPrefs/{uid}/storeRules/{key}` → the old household-wide
`ingredientStoreRules` as an inherited baseline, still read but **never written**
→ `memberPrefs/{uid}.defaultStoreId` → the household's first store.
`src/lib/storeRouting.ts` is a pure function over plain maps and returns the
reason alongside the store, because rerouting silently reads as a bug. The
shopping tab opens on the reader's own store, **derived rather than stored** —
ESLint's `set-state-in-effect` catches the stored version; do not reintroduce it.
Member documents created before this have no `displayName` and fall back to
"someone in your household"; a backfill would touch live data and was not run.

**Starter catalog** (`2a7fd9d`, `4e355a8`, `42a9776`, `4fe797e`, `7f3a632`).
Forty-five recipes from the fifteen readable sites, at `/catalog`, reached from
the recipe book rather than the rail — a fifth rail item would cost one-handed
reach at 320px. Three picks appear on the recipe book each week.

- **The boundary.** Importing a recipe into the household's own Firestore is
  personal use. Committing publishers' instruction text to this repository is
  redistribution — ingredient lists are not copyrightable, instructions are, and
  attribution is not a licence. So `src/data/catalog.ts` holds `id`, `title`,
  `siteName`, `url`, `imageUrl`, `tags`, `minutes`, and the type deliberately has
  no `description`, `ingredients`, or `instructions`. **Do not "fix" a gap by
  checking in a dump of imported results.** `imageUrl` is a bare URL, the same
  kind of fact as `url`. `minutes` is nullable because several publishers state
  no time, and an invented number would read as measured.
- **Every URL was verified through the real extractor** before being committed.
  `node --experimental-strip-types scripts/verify-catalog.ts` re-runs that check;
  it is out of `npm run check` because it hits forty-five third-party servers.
- **Previewing then adding is one read**, via `createDraftCache`; the pacer skips
  entries already in hand. Section 1 is about making that cache survive a reload.
- **Duplicates are checked twice** — the catalog link, and the canonical URL the
  publisher declares, which is what actually gets saved.
- **Rows settle as each recipe lands**, not when the batch ends, and a batch
  paces one under the importer's ten-per-minute limit, reporting failures per
  entry.
- The week's picks come from the week number, not `Math.random()`, so both phones
  agree; `spreadBy` interleaves sites first, or a week hands out three recipes
  from one publisher.

**Meal plan calendar — designed, not started.** A week view with tap-to-place,
not drag-and-drop:

```text
households/{hid}/plannedMeals/{id}
  date        # YYYY-MM-DD as a plain string, never a timestamp
  slot        # breakfast | lunch | dinner | other
  recipeId, servings, note, created*/updated*
```

The date must be a string: a timestamp makes "Tuesday" depend on the reader's
time zone, which is wrong for a household calendar. Plan-to-list scales each
planned recipe to its planned servings and routes ingredients through
`routeIngredient`, reusing the transfer path the recipe screen already has.
Whether adding a planned week should skip ingredients already on the list is an
open question — decide it with evidence; exact matches already combine.

## 10. Verification

Every change runs typecheck, ESLint, unit tests, and a production build, plus
rule tests when data access changes and Playwright smoke tests for critical
flows. CI runs these on pushes to `main`.

**Fixtures to keep covered.** JSON-LD: single object, `@graph`, array, HowToStep,
HowToSection, missing servings, multiple images, malformed JSON, no Recipe.
Ingredients: integer, decimal, common and Unicode and mixed fractions, ranges,
missing unit, "to taste", non-scalable text, a name starting with a unit
abbreviation ("1 garlic clove"), and an abbreviated unit with a period ("2 tbsp.
dill"). CSV: normal export, odd capitalisation, embedded newlines and quotes,
blank fields, duplicate URLs and titles, unknown columns, invalid rows. Security:
unauthenticated, member, non-member, cross-household, invalid store, unexpected
fields, attempted role escalation.

The last two ingredient cases were real bugs, both invisible in fixtures and
obvious on screen. **Check `parse-ingredient` behaviour against a real imported
recipe, not only the suite.**

### Running it locally

The Firestore emulator needs Java; Temurin 26 is installed. A non-interactive
agent cannot install it — if a fresh machine lacks it, ask the owner to run
`! brew install --cask temurin`.

For signed-in screens, set `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local` and
start `npx firebase emulators:start --project forkast-4dl --only auth,firestore`.
**Set the flag back to `false` before committing** — shipping it true points
production at 127.0.0.1.

For screens that call a Netlify Function, `vite` alone will not serve
`/.netlify/functions`, and `netlify dev` applies the SPA redirect to Vite's own
module URLs, so `/src/main.tsx` comes back as `index.html` and nothing mounts.
What works: `netlify functions:serve --port 9999` with
`FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`, and
`FIREBASE_SERVICE_ACCOUNT_JSON` set, plus a local-only Vite config proxying
`/.netlify/functions` to it. Admin accepts emulator tokens once the auth emulator
host is set. Sign in without the popup by running, in the page:

```js
const fb = await import('/src/lib/firebase.ts');
const auth = await import('/node_modules/.vite/deps/firebase_auth.js');
await auth.signInWithCredential(
  fb.auth,
  auth.GoogleAuthProvider.credential(
    JSON.stringify({ sub: 'tester-1', email: 'tester@example.com', email_verified: true, name: 'Test Cook' }),
  ),
);
```

Window resizing through the browser tooling did not work here; narrow widths were
measured by driving the same signed-in flow through Playwright at 390 and 320px
and asserting `scrollWidth === innerWidth`.

### Operating production without a browser

All of these use the service-account key from Section 2.

- **Confirm a deploy landed.**
  `curl -sS https://forkast.4dl.ca/ | grep forkast-build` — the stamp equals the
  deployed commit.
- **Confirm a service-worker change reached clients.** Load the site, then
  reload: the first visit fetches the new worker, the second is served by it.
  `curl` proves nothing about an installed client.
- **Read or change Auth configuration** through the Identity Toolkit admin API
  with a `cloud-platform`-scoped token:
  `GET/PATCH https://identitytoolkit.googleapis.com/admin/v2/projects/forkast-4dl/config`
  and `.../defaultSupportedIdpConfigs`.
- **Exercise an authenticated function.** Mint a custom token for a uid whose
  `users/{uid}` has a `householdId`, exchange it via
  `accounts:signInWithCustomToken` with the public `VITE_FIREBASE_API_KEY`, then
  send the `idToken` as a Bearer header. `import-recipe` writes nothing, so it is
  safe to probe; respect its 10/minute/uid limit.
- **Field-name trap.** The extractor returns `ingredientLines`, not
  `ingredients`. A probe reading the wrong field reports empty recipes and looks
  like data loss.
- **Inventory before destructive work.** List Auth users with providers and map
  each household's members and document counts first.

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| A site blocks fetching or lacks JSON-LD | Honest error, keep the URL, manual entry, no bot bypass. Section 7. |
| A catalog URL or image moves | Accepted. `scripts/verify-catalog.ts` re-checks; images hide rather than leave a hole. |
| Ingredients parse incorrectly | Keep `rawText`, show review, allow correction and non-scalable marking. |
| Rules leak household data | Emulator tests are a release blocker; membership mutation stays server-side. |
| The import function reaches internal hosts | Redirect-aware DNS/IP validation, timeouts, size limits. |
| Two users overwrite list state | One document per shopping item. |
| Offline data disappears on iOS | Firestore is the source of truth; local state is a cache; sync on foreground. |
| A delivery-layer change silently breaks auth | Section 3 invariants; verify in a browser with the app installed. |
| Another household's data is visible | Membership rules are authoritative; verify with a separate Google account. |
| Free tiers exhausted | Portable exports, auto-recharge off, avoid Blaze. Section 12. |
| Scope creeps ahead of usefulness | Section 5's boundary; schedule deferred work only from observed use. |

## 12. Cost

**$0/month at household usage**, with two qualifications.

**Netlify Free** has a hard 300-credit monthly limit covering deploys, bandwidth,
requests, and function compute — **15 credits per production deploy**, so batch
changes rather than deploying per commit. The plan pauses the site at the limit
rather than billing; keep auto-recharge off.

**Firebase** Auth and Firestore sit far inside the free quota (1 GiB stored, 50k
reads, 20k writes, 20k deletes per day, 10 GiB egress/month). Cloud Storage now
requires Blaze even within no-cost quotas — hence source image URLs instead of
uploads. If uploads ever matter, enable Blaze deliberately, pick a no-cost bucket
region, resize in the browser, and set budget alerts, remembering budgets alert
but do not cap.

`4dl.ca` is the only already-paid external cost. No LLM, scraping service, Apple
account, or server is required.

## 13. Fresh-task kickoff

> Continue the Forkast project in `/Users/adil/Code/Forkast`. Read `PRODUCT.md`,
> `PLAN.md`, `README.md`, and `/Users/adil/Code/AGENTS.md` before acting. Treat
> `PRODUCT.md` and `PLAN.md` as the product and implementation authorities.
> **Start from Section 1 — it is the work queue.** Respect the operational
> invariants in Section 3, read Section 10 before touching Firebase or
> production, and preserve completed work. Work autonomously without stopping for
> routine questions. Use Impeccable for any material frontend change and
> re-verify affected flows in a real browser. Make coherent atomic changes, verify
> each, commit with only my configured Git identity, and push directly to
> `origin/main`. Never create a branch or pull request, never add AI or co-author
> attribution, and keep `main` deployable. If a credential, private-data, or
> physical-device blocker remains, finish every independent task and report the
> exact owner action needed.
