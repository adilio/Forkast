# Forkast implementation plan

Last updated: 2026-08-01

This document is the source of truth for continuing Forkast in a fresh Codex
task. It supersedes the attached Claude research where that research conflicts
with the decisions below.

## 1. Current state

- Repository: `git@github.com:adilio/Forkast.git`
- Local checkout: `/Users/adil/Code/Forkast`
- Default and deployment branch: `main`
- Latest implementation commit at this update:
  `9060e88 Expose safe Google auth diagnostics`
- Netlify project: `forkast-4dl`
- Netlify fallback URL: <https://forkast-4dl.netlify.app>
- Production URL: <https://forkast.4dl.ca>
- Cloudflare DNS: DNS-only CNAME `forkast.4dl.ca` to
  `forkast-4dl.netlify.app`
- The Google migration UI and redirect-safe Netlify auth proxy are deployed.
  Production presents Google as the primary sign-in, retains only a disclosed
  temporary owner-password fallback, and gives the signed-in owner an explicit
  credential-linking action. The Google provider, support email, Firebase
  authorized domains, and OAuth origins/redirect URIs are configured. A live
  owner linking attempt currently stops safely with `auth/internal-error` before
  the Google popup opens; the owner record still has only its password provider.
  Do not remove the fallback or disable password auth before the owner links and
  verifies Google re-entry.
- Firebase project `forkast-4dl` is provisioned on the Spark plan. Email/password
  Authentication is temporarily enabled for the owner's bootstrap account.
  Firestore Standard in `us-west1` is enabled. Storage, Analytics, Gemini, and
  Firebase Hosting are intentionally disabled. The launch target is now Google
  sign-in only; see the continuation checklist and Section 13.
- Public Firebase web configuration is set for local/Netlify use. The private
  `FIREBASE_SERVICE_ACCOUNT_JSON` is installed as a protected, production-only
  Netlify secret and privileged functions now work. Netlify Free does not allow
  granular environment-variable scopes, so the secret necessarily uses all
  site scopes. The local key copy is outside the repository at
  `/Users/adil/Code/forkast-4dl-firebase-adminsdk-fbsvc-1b9b26cd84.json`, has
  mode `0600`, must never be committed, and may be removed after operations no
  longer need the local copy.
- Firebase CLI is authenticated. The current `firestore.rules` and indexes were
  deployed successfully and the Firebase Console visibly confirmed the
  `createdBy`-integrity revision published at 2026-08-01 10:13 local time.
- The owner created a real production Firebase account. Household bootstrap now
  succeeds, City Market and Costco were seeded, and invite creation returned a
  valid one-time 24-hour link. Invite redemption still needs Marla's account.
- Authenticated live website import reached the production function. Allrecipes
  refused the server fetch, and Forkast correctly preserved the source URL and
  opened the recoverable manual editor. Budget Bytes and Sally's Baking produced
  complete editable production drafts without saving private data. The Sally's
  pass exposed visible HTML entities; `8b6960b` fixed them and the same live URL
  passed afterward. Household-specific source sites still need private acceptance.

Repository workflow is defined by `/Users/adil/Code/AGENTS.md`: complete and
verify requested changes, then commit and push directly to `main`; do not create
branches or pull requests.

### Implemented MVP

- Responsive React/TypeScript/Vite PWA with the cool-paper kitchen-pass visual
  system recorded in `DESIGN.md`; route briefs and the selected design contract
  are preserved in the repository.
- Google redirect sign-in, safe owner credential linking, a temporary migration-
  only owner-password fallback, sign-out, persistent sessions, first-household
  bootstrap, seeded City Market/Costco stores, and one-time household invitations.
- Recipe list/search/favorites, manual create/edit/delete, focused draft recovery,
  recipe details, source attribution/images, serving scaling, and selected or all
  ingredient transfer to shopping.
- Authenticated JSON-LD website importer with editable review/fallback and SSRF,
  redirect, DNS/IP, timeout, response-size, and content-type protections.
- Plan to Eat CSV preview/import with unknown-field preservation, duplicate
  decisions, progress, and downloadable completion report.
- Realtime/offline per-store shopping lists with quantities, manual items,
  check/uncheck, move/delete, clear confirmation, delete undo, safe exact-item
  combining, remembered store routing, and per-store transfer receipts.
- Full versioned household JSON export, schema.org Recipe JSON-LD export, and
  source/image manifest; restore guidance is in `README.md`.
- Netlify Functions, production headers, PWA install/Shortcut instructions,
  Firestore security rules, CI, unit/rules/browser tests, and operational docs.

### Verification completed

- `npm run check` passes: TypeScript, ESLint, Prettier, 30 unit tests, and the
  production/PWA build.
- Six Playwright Chromium/Mobile Safari smoke tests passed, including narrow
  iPhone and desktop flows. Manual visual inspection at 1440, 390, and 320 px
  found no horizontal overflow, console errors, or blocked primary controls.
- The Firestore emulator rules suite passes in GitHub Actions. Workflow run
  `30692586571` was green after fixing test discovery; later commits
  `a033fef` and `c1d49ac` also completed green verification runs. Workflow run
  `30693089349` for `d17202f` completed green in both `verify` and `rules` jobs.
  Workflow run `30714565583` for `9060e88` also completed green.
- `npm audit --audit-level=high` passes. Twelve known moderate transitive issues
  remain in development/administrative tooling; the offered forced downgrade is
  breaking and was intentionally not applied.
- Impeccable was used throughout. Its detector was run exactly once and returned
  no findings; do not rerun it merely for the handoff. Independent critique and
  finish-reviewer passes were completed, persisted under `.impeccable/`, and all
  material findings were fixed.
- The production app, manifest, icons, cache/security headers, and anonymous
  function boundary were probed. The import function correctly returns
  `401 {"message":"Sign in to continue."}` rather than crashing.
- The owner UID and household membership baseline were verified privately using
  one-way hashes. The production export action completed, and the backup,
  portable recipe, manifest, and two-store structure validated without printing
  or committing household data.

### Delivery history

- `f26aa24 Build deployable Forkast PWA foundation`
- `787f835 Build secure Forkast household MVP`
- `446a63a Fix Firestore rules test discovery`
- `a033fef Fix Netlify Firebase function runtime`
- `c1d49ac Stabilize Netlify dependency install`
- `d17202f Pin Netlify-compatible PostCSS`
- `efe6e8e Plan Google sign-in for stage two`
- `06687cf Harden production response types`
- `58556e4 Add safe Google account migration`
- `3f5752b Remove unused Firebase init proxy`
- `8b6960b Decode recipe JSON-LD entities`
- `f4a6371 Update Google migration handoff`
- `30e56cb Use reliable desktop Google auth`
- `9060e88 Expose safe Google auth diagnostics`

All listed commits were pushed directly to `origin/main`. Firebase Admin was
kept on the compatible 13.x line because 14.x bundled an ESM-only `jose` path
that crashed in Netlify's CommonJS function packaging. Netlify functions use
`AWS_LAMBDA_JS_RUNTIME=nodejs24.x`. The latest PostCSS override pins the earliest
audited-safe release old enough for Netlify's lagging npm mirror; this was added
after an automatic deploy reported that `postcss@8.5.25` was not indexed.

### Continuation checklist

Start here in a fresh task, in this order:

1. Confirm Git status is clean and `main` is at or beyond `9060e88`. Preserve
   the working production household and do not create a replacement owner.
2. Finish the staged Google-only launch migration in Section 13. Provider setup,
   support email, authorized domains, and OAuth origins/redirect URIs are already
   complete. Diagnose the live `auth/internal-error` that occurs before the
   desktop Google popup opens, then use Forkast Settings to link the matching
   Google identity, sign out, and sign back in with Google. Compare the same
   private UID and household baseline, then remove the temporary password UI and
   disable the provider. Let Marla redeem a fresh invite with Google and verify
   an unrelated Google user creates an isolated household; remove only synthetic
   acceptance data afterward.
3. Finish production function acceptance: redeem a fresh one-time invite with
   Marla and verify successful authenticated extraction on representative live
   recipe sites. The Allrecipes refusal/fallback path is already verified.
4. Run the private/physical acceptance work that cannot be automated: real Plan
   to Eat CSV import and report review, common live recipe sites, Save to Forkast
   Shortcut on Marla's iPhone, two-account realtime/offline reconciliation,
   export inspection, PWA install/persistent login on both iPhones, and one week
   of household use. Do not commit private CSV, recipe, account, or export data.
5. Fix any acceptance blockers, rerun proportional tests, commit/push `main`, and
   update this section. Only then mark the definition of MVP complete.

Already completed in production: Netlify credential setup and redeploy,
Firebase CLI authorization, latest Firestore rules/index deployment, owner
account creation, household bootstrap, store seeding, invite creation,
authenticated function access, Google migration code/proxy deployment,
production export structure validation, two successful public-site extractions,
and the expected live-site failure recovery path. Anonymous import still returns
no-store HTTP 401 JSON.

The remaining owner/private inputs are owner Google consent after the popup
resolver is fixed, the second household Google account plus an unrelated
acceptance account, household recipe sites and Plan to Eat CSV, two physical
iPhones, downloaded-export spot inspection, and the one-week usage period. Exact
account email addresses are intentionally not recorded in the repository.

### Autonomous execution mandate

The implementing agent is authorized and expected to carry this plan through to
the complete MVP without pausing after a milestone or asking the owner to choose
routine product, design, dependency, naming, Firebase, Netlify, testing, or
implementation details. Use the product facts in `PRODUCT.md`, this plan, current
repository evidence, official documentation, real browser/device behavior, and
best engineering judgment. When several choices are viable, choose the simplest
reversible option that satisfies the acceptance criteria and YAGNI boundary.

Do not stop at analysis, scaffolding, a status report, or a partially working
vertical slice. Maintain an internal working plan, execute milestones in order,
verify each one, and continue until the definition of MVP complete is met. Use
existing authenticated local browser sessions and available tools when setup or
verification requires a web console. Never wait for aesthetic preferences or
other optional input; the owner has explicitly delegated those decisions.

If a genuinely unavailable credential, mandatory external approval, or physical
iPhone action makes one check impossible, exhaust safe alternatives, record the
exact blocker, and continue every independent task. Ask the owner only when no
safe progress remains or platform policy requires approval. A useful but
nonessential uncertainty is not a blocker.

### Atomic Git delivery policy

- Use only the owner's existing configured Git identity.
- Never add Codex, AI, bot, generated-by, or co-author attribution to commits,
  commit messages, source files, or pull-request metadata.
- Work directly on `main`. Do not create branches, worktrees for branches, or
  pull requests.
- Deliver atomically as work progresses: one coherent, reviewable change at a
  time; run its proportional verification; stage only its files; commit it; push
  it directly to `origin/main`; confirm the push; then continue immediately to
  the next coherent change.
- Keep `main` deployable at every pushed commit. Fix a failing build/deployment
  before layering unrelated work on top.
- Preserve unrelated owner changes, never rewrite published history, and do not
  squash all implementation into one final mega-commit.

## 2. Product goal

Forkast is a private, low-maintenance household recipe and grocery-list PWA. Its
first job is to replace the parts of Plan to Eat that this household actually
uses, not to reproduce Plan to Eat feature-for-feature.

The validated household MVP is:

1. Save a clean recipe from a normal recipe website on an iPhone in a few taps,
   without the site's ads and backstory.
2. Star and unstar favorite recipes.
3. Change the serving count and scale numeric ingredient quantities.
4. Maintain synchronized shopping lists for City Market and Costco.
5. Assign ingredients to a store and remember that preference the next time the
   same ingredient is added.
6. Import the existing recipe library from a Plan to Eat CSV export.

Supporting essentials that are included by judgment:

- Search the recipe library by title and ingredient.
- Manually add, edit, and delete a recipe when importing is not possible.
- Add either a whole recipe or selected ingredients to the shopping lists.
- Add arbitrary grocery items that do not come from a recipe.
- Check and uncheck items collaboratively, including with unreliable service.
- Install Forkast on the iPhone Home Screen as a PWA.
- Export all household data so Forkast never becomes another lock-in problem.

## 3. Product and architecture decisions

These decisions are settled unless implementation evidence shows that one is
unworkable.

| Area | Decision | Reason |
| --- | --- | --- |
| Build vs. adopt | Build Forkast | The spouse-validated scope is materially smaller than RecipeSage, and the custom UX is the point of the project. |
| Client | React, TypeScript, Vite | Boring, familiar, strongly supported, and already reflected in the repository README. |
| Form factor | Responsive installable PWA | No App Store, native wrapper, or Apple Developer account is needed. |
| Hosting | Netlify | Explicit preference; project and custom domain already exist. |
| API | Netlify Functions | Required only for securely fetching third-party recipe pages and a few privileged household operations. |
| Authentication | Google-only Firebase Authentication | Forkast stores no passwords. Existing owner data is preserved by linking Google to the current UID before disabling email/password. Any Google user may create an isolated household or redeem an invite. |
| Primary data | Cloud Firestore | Realtime collaboration and built-in offline write queuing remove the need for a custom sync engine. |
| Images in MVP | Preserve the source image URL; no uploads | Avoids Firebase Storage billing setup and image-processing work until local image ownership is proven necessary. |
| Image uploads later | Firebase Storage, only if needed | Explicit platform preference, but it requires the Blaze billing plan even when usage stays within no-cost quotas. |
| Styling | Plain CSS with a small token layer | Avoid choosing and carrying a component framework before the interface demands one. |
| State | React state plus Firestore listeners | Do not add Redux, Zustand, or TanStack Query unless a demonstrated state problem appears. |
| Offline | Firestore persistent local cache plus a PWA app shell | Do not build a CRDT, change log, or custom IndexedDB synchronization layer. |
| Recipe extraction | Server-side JSON-LD/schema.org extraction first | Most established recipe sites publish structured recipe data; this strips the narrative and ads naturally. |
| Messy imports | Editable review screen and manual paste fallback | More reliable and much smaller than promising universal scraping or adding an LLM in MVP. |
| Canonical export | Forkast JSON plus schema.org Recipe JSON-LD | Human-recoverable full backup and broadly portable recipe records. |

### Why the Claude recommendation is not being followed

The research recommended adopting self-hosted RecipeSage and, if building,
using a Cloudflare/D1/R2 stack with a normalized SQL database and a custom
offline synchronization log. That is credible for the much larger feature set
the report assumed, but it is not the right plan now:

- The household explicitly wants a narrower product than RecipeSage's complete
  recipe/meal-planning suite.
- Operating RecipeSage's multi-container stack would create more ongoing work
  than this small family app needs.
- The user explicitly prefers Netlify and Firebase over Cloudflare and
  Supabase.
- Firestore already supplies realtime listeners, offline persistence, and
  queued writes. Rebuilding those with IndexedDB, timestamps, and a change log
  would add risk without improving the two-user shopping-list experience.
- A large canonical-ingredient ontology, densities, nutrition links, calendar,
  CRDTs, and OCR are speculative until the household uses the core loop.

The research remains useful for its warnings: URL import is the largest product
risk; iOS does not support the Web Share Target API; social platforms cannot be
reliably scraped; nutrition calculations are approximate; and data export must
not be an afterthought.

## 4. YAGNI boundary

### In the MVP

- An initial two-user household plus separately isolated households for friends
- Recipe library, search, manual CRUD, source attribution, and favorites
- Normal website URL import with an editable confirmation step
- iPhone Share Sheet workflow through a small user-installed Shortcut
- Numeric serving scaling without automatic unit conversion
- Two seeded stores: City Market and Costco
- Remembered store preference based on a normalized ingredient name
- One active shopping list per store, manual items, checked state, and realtime
  collaboration
- Firestore offline persistence and queued writes
- Plan to Eat recipe CSV import with preview and error reporting
- Full JSON/JSON-LD export
- PWA installation, responsive layouts, and basic accessibility
- Security rules, import-function safeguards, automated tests, and deployment

### Explicitly deferred

- Meal-planning calendar, saved meal plans, and drag-and-drop
- Pantry/freezer inventory and “what can I make?” queries
- Nutrition, macros, calories, USDA matching, and density tables
- Price tracking, budgets, and grocery-ordering integrations
- OCR, PDF, screenshot, Instagram, TikTok, and Pinterest scraping
- LLM-based parsing
- Recipe collaboration history or simultaneous recipe editing
- Ingredient synonyms, taxonomy, automatic aisle classification, and
  volume-to-weight conversion
- Multiple named shopping-list histories, list archival, and list templates
- Push notifications, reminders, background sync, and native applications
- Locally uploaded recipe photos
- Household roles beyond owner/member, public sharing, and multi-household users
- Analytics, Sentry, feature flags, and a bespoke admin panel
- CRDTs, a custom sync protocol, a separate API server, SQL, and microservices

Deferred does not mean rejected. A deferred feature gets scheduled only after a
real household problem supplies its acceptance criteria.

### Impeccable design and UX mandate

Impeccable is mandatory for the frontend work, not an optional final coat of
paint. `PRODUCT.md` contains the durable product truth. Before the first real UI
implementation, the agent must use the installed Impeccable skill to establish
the visual world, create `DESIGN.md`, and record any route-level surface briefs
the workflow requires. The owner has delegated missing design inputs and the
direction choice: use Impeccable's assigned/recommended direction and product
evidence without stopping to ask for preferences.

Treat Forkast as an **Operate** product. Its visual identity should be memorable
and specific, but expression may never obscure recipe content, list state, or a
familiar control. Design for the actual scenes: one-handed iPhone capture,
cooking at a counter, grocery-store glare and distraction, two-person realtime
updates, long ingredient names, empty/new accounts, loading, partial import,
offline, syncing, conflict, and error states.

Impeccable requirements for every user-facing milestone:

- Inspect the implemented surface in a real browser at representative narrow
  iPhone and desktop widths; screenshots and DOM assertions complement rather
  than replace visual inspection.
- Apply the chosen visual system consistently to navigation, typography,
  controls, forms, recipe content, shopping states, feedback, and empty states.
- Avoid a generic dashboard, repetitive card grid, timid template styling, and
  decorative effects that compete with operation.
- Maintain excellent hierarchy, one-handed reach, comfortable touch targets,
  text enlargement, safe-area behavior, keyboard/focus behavior, screen-reader
  semantics, contrast, reduced motion, and fast first load.
- Use purposeful motion only where it clarifies state or spatial change.
- Author real product-appropriate sample content for development and tests, label
  synthetic demonstration data where needed, and never invent commercial proof.
- After material UI work, run Impeccable's detector once over the changed
  targets, resolve findings, then perform its independent finish-reviewer pass.
- Before MVP completion, run Impeccable critique, adapt, audit, harden, and
  polish passes across the complete core flow; implement the material fixes and
  re-verify mobile and desktop.

Visual polish does not authorize deferred product features. Impeccable should
raise the craft of the agreed workflow, not expand its scope.

## 5. Target user experience

### 5.1 Save from an iPhone website

Because iOS Safari does not support the PWA Web Share Target API, Forkast cannot
appear directly in the Share Sheet as a web app. The MVP flow is:

1. Install a supplied “Save to Forkast” iOS Shortcut once.
2. On a recipe page, tap Share, then “Save to Forkast.”
3. The Shortcut opens `https://forkast.4dl.ca/import?url=<encoded-url>`.
4. Forkast calls its authenticated Netlify import function.
5. Forkast displays only the extracted title, image, servings, ingredients, and
   instructions in an editable review screen.
6. Tap Save.

The same import screen also has a Paste URL button for use without the Shortcut.
The first technical spike must validate this exact flow on the wife's iPhone.
If opening a query URL from Shortcuts does not preserve an acceptable login
experience, adjust the Shortcut flow before building the rest of the importer.

Import expectations must be honest:

- Mainstream recipe sites with schema.org Recipe JSON-LD should work well.
- Sites without structured data show a clear fallback instead of saving junk.
- The fallback lets the user paste/edit the title, ingredients, and directions.
- Login-walled or bot-protected social sites are not supported in MVP.
- The source URL is always retained.

### 5.2 Browse and use a recipe

- Recipe cards show image when available, title, favorite state, and source.
- Search filters locally by title and ingredient name. The household-scale
  library is small enough that a dedicated search service is unnecessary.
- The recipe view has a serving stepper/input. Changing it never mutates the
  saved base recipe.
- Parsed numeric quantities scale; text-only quantities such as “to taste” stay
  unchanged.
- A user can select all or individual ingredients and add them to shopping.
- Import output is always editable so parsing imperfections do not trap data.

### 5.3 Shop at two stores

- Shopping opens to two obvious tabs or sections: City Market and Costco.
- Each item is its own Firestore document so two users checking different items
  do not overwrite each other.
- Adding an ingredient uses its remembered store. Unknown ingredients ask for a
  store, defaulting to the last-used store for convenience.
- Moving an item can optionally update that ingredient's future store
  preference.
- Compatible exact-name/unit items may be combined. Ambiguous quantities remain
  separate; do not attempt risky unit conversion.
- Checked items remain visible in a collapsed section until explicitly cleared.
- Manual add must be one fast input, with store determined by the current tab.
- Cached lists remain readable and checkable without connectivity; Firestore
  sends queued changes when the app returns online.

### 5.4 Import Plan to Eat

1. User exports the Plan to Eat recipe book as CSV from its website.
2. Forkast parses the file in the browser; the raw file is not uploaded.
3. A preview reports recognized columns, recipe count, duplicates, warnings, and
   rows that cannot be imported.
4. User confirms the import.
5. Recipes are written in conservative batches and progress is shown.
6. A completion report is downloadable and failed rows remain recoverable.

The importer maps title, description, servings, preparation/cook time, source
URL, image URL when present, ingredients, directions, tags/categories, notes,
and favorite state when the export supplies them. Unknown columns are preserved
in an `importMetadata` object rather than silently discarded. Duplicate
detection first uses normalized source URL, then normalized title; the user can
skip or import a duplicate.

This migration covers recipes only. Existing meal plans and historical shopping
lists are out of scope unless an actual export later proves both useful and easy
to support.

## 6. Technical architecture

```text
iPhone / desktop PWA
  ├── Netlify CDN: React application and service worker
  ├── Firebase Auth: persistent household sign-in
  ├── Firestore web SDK: recipes, preferences, and realtime shopping items
  └── /.netlify/functions/import-recipe
        ├── verifies the Firebase ID token
        ├── validates and safely fetches an external URL
        └── extracts schema.org Recipe JSON-LD into a draft response
```

The browser writes household data directly to Firestore under security rules.
The import function does not save a recipe; it returns an untrusted draft for
the signed-in user to review. This keeps the function small and the normal CRUD
path consistent.

### Proposed dependencies

Keep the dependency list intentionally short and verify current versions when
implementation begins:

- Runtime: React, React DOM, React Router, Firebase modular web SDK, Zod
- CSV import: Papa Parse
- Ingredient parsing: `parse-ingredient`, wrapped behind Forkast's own adapter
- PWA: `vite-plugin-pwa`/Workbox
- Function parsing: Cheerio plus small schema.org/JSON-LD normalization code
- Tests: Vitest, React Testing Library, `@testing-library/user-event`,
  Playwright, and Firebase Emulator Suite rules tests
- Tooling: TypeScript, ESLint, Prettier

Do not add a UI framework, global state package, query cache, date library, or
form library until plain React becomes demonstrably painful.

### Firestore layout

```text
users/{uid}
  displayName
  email
  householdId

households/{householdId}
  name
  ownerUid
  createdAt

households/{householdId}/members/{uid}
  role                 # owner | member
  joinedAt

households/{householdId}/invites/{inviteId}
  tokenHash            # never expose the raw token after creation
  expiresAt
  createdBy
  usedAt

households/{householdId}/recipes/{recipeId}
  title
  description
  sourceUrl
  sourceHost
  imageUrl
  baseServings
  ingredients[]
  instructions[]
  notes
  tags[]
  starred
  importMetadata
  createdAt, createdBy, updatedAt, updatedBy

households/{householdId}/stores/{storeId}
  name                 # City Market | Costco
  sortOrder

households/{householdId}/ingredientStoreRules/{normalizedIngredientKey}
  displayName
  storeId
  updatedAt, updatedBy

households/{householdId}/shoppingItems/{itemId}
  name
  normalizedName
  quantity
  quantityMax
  unit
  note
  storeId
  checked
  manual
  sourceRecipeId
  sourceIngredientId
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

Embedding ingredients keeps a recipe read to one document and matches the way
ingredients are edited. Individual shopping items remain separate documents
because their checked/store state changes frequently and concurrently.

The likely Firestore recipe document limit is not a practical concern for
normal recipes, but the importer must reject an abnormally large record with a
useful error instead of attempting an oversized write.

### Authentication and household onboarding

- Launch with Google as the only sign-in method and browser-local persistence.
  Do not collect or store Forkast passwords and do not add SMS or magic links.
- Migrate the owner's temporary email/password account by explicitly linking the
  matching Google credential while signed in. Verify the Firebase UID and
  `users/{uid}.householdId` before and after linking.
- Keep email/password enabled only during that migration window. Disable it and
  remove its UI after Google sign-out/sign-in restores the same UID and data.
- The first user creates the household through an authenticated Netlify
  Function and becomes owner. Keeping bootstrap writes server-side avoids a
  permissive special case in Firestore rules.
- Any Google user without a membership may create an isolated household.
- Provide a short-lived, single-use household invite link/code generated by an
  authenticated Netlify Function. Store only its hash and expiry.
- Marla signs in with Google and redeems the owner's invite once.
- After onboarding, normal operation does not depend on Netlify Functions.
- The PWA must retain cached recipes and lists through ordinary auth-token
  refreshes and temporary network loss.

### Firestore security rules

Rules are a release blocker, not polish:

- A signed-in user can read their own `users/{uid}` record.
- A user can read/write a household subcollection only if a matching household
  membership document exists.
- Clients cannot make themselves an owner or add arbitrary members.
- Recipe and shopping writes validate allowed fields and basic types.
- Store IDs on shopping items must reference one of the household's stores.
- Invite creation/redemption and membership changes happen through verified
  server functions.
- Rules receive emulator tests for owner, member, non-member, unauthenticated,
  malformed-write, and cross-household cases.

### Secure recipe fetching

An arbitrary URL fetcher is an SSRF boundary and must be treated as such even
for a family app:

- Require and verify a Firebase ID token, then confirm that the user belongs to
  a Forkast household before allowing a fetch.
- Accept only `http` and `https`; prefer HTTPS.
- Reject credentials in URLs and nonstandard ports.
- Resolve the hostname and reject loopback, link-local, private, multicast, and
  cloud metadata addresses for both IPv4 and IPv6.
- Revalidate every redirect and cap redirect count.
- Apply connection and total timeouts, a response-size limit, and an HTML-only
  content-type policy.
- Send a truthful Forkast user agent and do not bypass CAPTCHAs or bot defenses.
- Parse JSON-LD defensively; never execute page scripts.
- Return only normalized recipe fields, not the entire third-party page.
- Add a small per-user rate limit and structured error codes.

## 7. Serving-size behavior

- Save an immutable `baseServings` with the recipe.
- Display factor = requested servings / base servings.
- Scale `quantity` and both ends of a range when `scalable` is true.
- Leave absent/non-numeric quantities unchanged.
- Render common kitchen fractions where the result is close enough; otherwise
  use a sensible decimal with no false precision.
- Do not convert cups to grams, merge unlike units, or apply ingredient density.
- The review/editor lets the user correct a parsed ingredient and mark a line as
  non-scalable.
- Tests cover integers, decimals, Unicode/mixed fractions, ranges, zero/missing
  servings, “to taste,” and common rounding cases.

## 8. Offline and synchronization behavior

- Enable Firestore's persistent local cache with multi-tab support when the
  browser permits it.
- Use realtime listeners only for the current household's active shopping items
  and currently visible recipe data; avoid listeners over unbounded data.
- Recipe search can maintain a compact client-side index after loading recipe
  summaries. No Algolia/Typesense service is needed.
- Precache the application shell. Runtime-cache recipe image URLs conservatively
  and tolerate third-party images disappearing.
- Show clear offline, syncing, and failed-write states.
- Rely on Firestore's local mutation queue. Do not layer another queue on top.
- Resolve shopping conflicts per item with Firestore's normal last-write
  behavior. Simultaneous edits to the same item are rare and do not justify a
  merge UI.
- iOS has no dependable background sync. Reconnect and flush while the app is in
  the foreground.

## 9. Cost plan

The expected operating cost is **$0/month at household usage**, but “free” has
two qualifications.

### Netlify

Netlify's current Free plan is $0 with a hard 300-credit monthly limit. Credits
are consumed by production deploys, bandwidth, requests, and function compute.
The published current rates include 15 credits per production deploy, 20 credits
per GB of bandwidth, 2 credits per 10,000 web requests, and 10 credits per
GB-hour of compute. A tiny two-user PWA should fit, but many production deploys
can consume the allowance faster than app traffic. The Free plan pauses sites at
the limit rather than creating a surprise bill. The account may be on a legacy
plan because Netlify accounts created before 2025-09-04 can retain legacy
pricing; confirm the actual team billing page before implementation.

Cost controls:

- Keep Netlify auto-recharge off.
- Batch meaningful changes rather than pushing throwaway production commits.
- Monitor credits during development and after the Plan to Eat import.
- Keep the import function response small and cache static assets normally.

Reference: <https://www.netlify.com/pricing/>

### Firebase

- Firebase Authentication Google sign-in usage for this small set of households
  is comfortably within the no-cost tier.
- Firestore's free quota is currently 1 GiB stored, 50,000 document reads/day,
  20,000 writes/day, 20,000 deletes/day, and 10 GiB outbound/month. Household
  usage should be orders of magnitude below those numbers.
- Cloud Storage for Firebase now requires the pay-as-you-go Blaze plan and a
  linked billing account, even when storage usage remains inside no-cost quotas.
  New buckets can still receive up to 5 GB-months storage and other no-cost
  allowances in eligible regions, but it is not a strict no-card service.

Therefore the MVP deliberately uses source image URLs and can run on Firebase's
Spark plan with no billing account. If uploaded images become important, enable
Blaze deliberately, choose an eligible no-cost bucket region, resize images in
the browser, set Google Cloud budget alerts, and document that budgets alert but
do not automatically cap charges.

References:

- <https://firebase.google.com/docs/firestore/quotas>
- <https://firebase.google.com/docs/auth>
- <https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024>
- <https://firebase.google.com/pricing>

The existing `4dl.ca` domain is the only already-paid external cost. No LLM,
paid scraping service, Apple account, or new server is required for MVP.

## 10. Implementation milestones

Each milestone should leave `main` working, tested, and deployed. Complete its
atomic commits, push them, and continue autonomously to the next milestone. Do
not build later milestones speculatively inside an earlier one, but do not stop
after an exit criterion is met.

Implementation status as of `d17202f`: the coded work for Milestones 0–6 is
complete. Automated and browser verification is complete. The remaining exit
criteria are the production secret/rules publication and owner/private-device
acceptance items listed in Section 1; do not rebuild completed milestones.

### Milestone 0 — Foundation and highest-risk spike

- Scaffold Vite + React + TypeScript.
- Add routing, minimal CSS tokens, error boundary, lint, formatting, and tests.
- Add Netlify build configuration and SPA redirect.
- Add PWA manifest/icons/service-worker shell and an installation help screen.
- Create a temporary `/import?url=` screen and “Save to Forkast” Shortcut
  instructions.
- Validate opening the import link from the Share Sheet on the wife's iPhone.
- Deploy a visible shell to `forkast.4dl.ca` and verify HTTPS/mobile install.

Exit criteria: the production URL serves Forkast, it can be installed, and the
iPhone handoff from Share Sheet to the correct import URL is acceptable.

### Milestone 1 — Firebase, household, and security

- Create separate Firebase production and local-emulator configuration.
- Initially enable email/password Auth for bootstrap and Firestore; do not
  enable Storage. This historical implementation step is superseded for launch
  by the Google-only migration in Section 13.
- Add sign-up, sign-in, sign-out, password reset, and persistent sessions.
- Add first-household creation, seed City Market and Costco, and implement the
  one-time spouse invite flow.
- Implement Firestore converters/schemas and security rules.
- Add emulator-backed rules and integration tests.
- Configure public Firebase client variables in Netlify and server credentials
  only for functions; never commit private keys.
- Add `forkast.4dl.ca`, the Netlify fallback hostname, and localhost/emulator
  origins to Firebase Auth's authorized-domain configuration as appropriate.

Exit criteria: two real accounts can share one household, another account cannot
read it, and all rules tests pass.

### Milestone 2 — Recipe library and Plan to Eat import

- Build recipe list, search, favorite toggle, details, manual create/edit/delete.
- Implement the ingredient adapter and retain raw lines.
- Implement Plan to Eat CSV selection, mapping, preview, duplicate decisions,
  batched writes, progress, and completion/error report.
- Test with a small synthetic fixture first, then a copy of the real export.
- Do not commit the household's export or recipe data.

Exit criteria: the existing library imports without silent loss, recipes are
searchable/editable, and repeated import does not create accidental duplicates.

### Milestone 3 — Website import

- Implement the authenticated Netlify function with SSRF protections.
- Parse common JSON-LD shapes: a single Recipe, `@graph`, arrays, and nested
  recipe nodes.
- Normalize durations, servings, ingredient lines, instruction strings and
  HowToStep/HowToSection structures, image variants, and canonical source URL.
- Build loading, editable review, save, failure, and manual-paste states.
- Test against a curated fixture corpus; do not make live third-party websites
  a required CI dependency.
- Validate a representative set of sites the household actually uses.

Exit criteria: the wife can Share a normal recipe page, review the clean recipe,
and save it in a few taps. Failures are recoverable without losing the URL.

### Milestone 4 — Serving scaling

- Add base servings to editor and recipe view.
- Implement pure scaling and fraction-formatting utilities with unit tests.
- Clearly distinguish saved base quantities from the temporary display size.
- Add scaled or selected ingredients to shopping.

Exit criteria: common household recipes scale correctly and ambiguous text is
left intact rather than guessed.

### Milestone 5 — City Market and Costco lists

- Build store tabs/sections, manual add, edit, move, check, uncheck, and clear
  checked.
- Add remembered exact-name store rules and the “remember this choice” control.
- Add recipe ingredients at the current serving scale.
- Combine only safe exact-name and compatible-unit matches.
- Enable Firestore persistence and display offline/syncing feedback.
- Test simultaneous changes from two browser contexts and an offline/reconnect
  cycle.

Exit criteria: both household members can update both lists without losing
different-item changes, including during a realistic grocery-store offline test.

### Milestone 6 — Export, hardening, and household launch

- Export all Forkast data as a timestamped JSON file.
- Export recipes as schema.org Recipe JSON-LD plus an image/source manifest.
- Add keyboard/focus checks, screen-reader labels, touch-target review, empty
  states, and reduced-motion behavior.
- Add production headers, CSP compatible with Firebase and source images, and
  dependency/security checks.
- Verify mobile performance and avoid loading editor/import code on first paint.
- Document Firebase/Netlify setup, local development, restore procedure, and the
  Shortcut installation.
- Run the household acceptance script below and fix blockers before declaring
  Plan to Eat replaced.

Exit criteria: export is restorable, all automated checks pass, and both users
complete the core loop on their phones.

## 11. Verification strategy

### Automated checks on every implementation change

- TypeScript typecheck
- ESLint
- Unit tests
- Production build
- Firestore rule tests when data access changes
- Playwright smoke tests for the critical browser flows

CI should run these on pushes to `main`. Keep CI small enough not to waste
Netlify production deploy credits; GitHub Actions can verify before or alongside
the Netlify build.

### Required test fixtures

- JSON-LD: single object, `@graph`, array, HowToStep, HowToSection, missing
  servings, multiple image representations, malformed JSON, and no Recipe
- Ingredients: integer, decimal, common fraction, Unicode fraction, mixed
  fraction, range, missing unit, “to taste,” and non-scalable text
- Plan to Eat: normal export, alternate capitalization, embedded newlines/quotes,
  blank fields, duplicate URLs/titles, unknown columns, and invalid rows
- Security: unauthenticated, valid member, non-member, cross-household, invalid
  store, unexpected fields, and attempted role escalation

### Household acceptance script

On the two actual iPhones:

1. Install Forkast and sign in with Google once; confirm the persistent session
   survives closing and reopening the installed PWA.
2. Share three real recipe websites through the Shortcut; include one expected
   failure and confirm manual recovery is tolerable.
3. Star a recipe and find it by search.
4. Change a 4-serving recipe to 6 and visually verify its quantities.
5. Add selected scaled ingredients to both stores.
6. Change an ingredient from City Market to Costco and remember the preference.
7. Put one phone offline; check/add items on both phones; reconnect and confirm
   the combined result.
8. Export all data and inspect the downloaded files.
9. Cook and shop from Forkast for one real week before cancelling Plan to Eat.

## 12. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| iOS capture is clumsy | Spike the actual Shortcut handoff first; keep Paste URL permanently available. |
| A site blocks fetching or lacks JSON-LD | Honest error, preserve URL, editable manual paste; no bot bypass. |
| Imported ingredients parse incorrectly | Preserve `rawText`, show review, and allow correction/non-scalable marking. |
| Firestore rules leak household data | Emulator rule tests are a release blocker and membership mutation stays server-side. |
| Import function can access internal hosts | Implement redirect-aware DNS/IP SSRF validation, timeouts, and size limits. |
| Two users overwrite list state | One document per shopping item; do not store a whole list as one array/document. |
| Offline data disappears on iOS | Firestore remains source of truth; local state is a cache; sync on foreground. |
| Third-party image URLs break | Graceful placeholder; consider Firebase Storage only after this becomes a real problem. |
| Free tiers change or are exhausted | Keep exports portable, monitor dashboards, keep Netlify recharge off, and avoid Storage/Blaze in MVP. |
| Plan to Eat export shape differs | Inspect the real CSV privately, preview mappings, preserve unknown fields, never commit the data. |
| Google migration locks out the owner | Link Google while the owner is signed in, verify the same UID and household after Google re-entry, and only then disable email/password. |
| Friends can see another household | Keep membership-based Firestore rules authoritative and verify a separate Google-created household cannot read the initial household. |
| Project expands before it is useful | Enforce the YAGNI boundary and milestone exit criteria; schedule deferred work only from observed use. |

## 13. Google-only launch authentication

The owner has replaced the earlier optional Stage 2 enhancement with a launch
requirement: Google is Forkast's only sign-in method. Forkast must not collect or
store passwords. The initial household is the owner and Marla, while friends may
sign in with Google and create their own isolated households.

This migration now precedes the remaining private/physical MVP acceptance. The
temporary email/password provider stays enabled only long enough to link the
owner's existing production account safely.

### Migration sequence

1. Record the existing owner's Firebase UID and `householdId` privately for
   before/after comparison. Never commit account identifiers.
2. Enable the Google provider in Firebase Authentication, configure the support
   email, and confirm `forkast.4dl.ca`, the Netlify fallback domain, and local
   development origins are authorized.
3. Ship an explicit **Link Google account** action for the already signed-in
   owner. Use Firebase credential linking, never a second account plus data copy.
4. After linking, sign out and sign back in with Google. Confirm the UID,
   household membership, recipes, stores, and data access are unchanged.
5. Replace the unauthenticated email/password form with one clear **Continue
   with Google** action. Use redirect on iPhone Safari/installed PWA and a popup
   only where it is demonstrably more reliable and accessible.
6. Have Marla sign in as a new Google user and redeem a fresh one-time invite.
   Confirm both members share the same household.
7. Verify a third Google user with no invite can create a separate household and
   cannot read either initial-household member's data. Remove any synthetic test
   household/account created solely for this check.
8. Disable the Firebase email/password provider and remove sign-up, password,
   reset-password, and password-fallback UI only after the owner has successfully
   re-entered through Google. Existing password credentials must not remain a
   supported login path.

### Implementation requirements

- Use the Firebase Web SDK's `GoogleAuthProvider`, redirect result handling, and
  credential-linking APIs. Request only the basic identity scopes Firebase needs;
  no Google API scopes are required.
- Preserve the existing owner's Firebase UID. Never rewrite household membership
  or copy recipes/shopping data to a new UID as a migration shortcut.
- Treat `auth/account-exists-with-different-credential` as a guided linking case,
  not permission to merge accounts or households automatically.
- Handle cancelled, blocked, expired, network, popup, redirect, and provider-
  collision failures with direct recovery copy that preserves the user's work.
- A new Google user without a `users/{uid}` document reaches onboarding and may
  either create an isolated household or redeem a valid invite.
- Keep Firestore membership enforcement unchanged: authentication proves
  identity; household documents and rules determine data access.
- Update auth error mapping, unit tests, browser tests, CSP if required,
  operational documentation, and production acceptance checks.
- Use Impeccable for the material authentication UI change, but do not rerun the
  already completed one-time detector merely because this handoff was updated.

Exit criteria: the owner signs in with Google and retains the exact existing UID,
household membership, and data access; Marla joins that household using Google;
an unrelated Google user can create a separate isolated household; email/password
is disabled in Firebase and absent from Forkast; persistent iPhone PWA sessions,
sign-out/sign-in, household bootstrap, and invite redemption all work.

### Evidence-led decision queue

After at least two weeks of household use, review evidence in this order:

1. If recipes are regularly planned ahead, add a simple week view with tap to
   place. Do not start with drag-and-drop.
2. If source images frequently disappear or personal photos are desired, enable
   Firebase Storage on Blaze with budget alerts and client-side resize to WebP.
3. If manual fallback is common, quantify failed source sites before considering
   a broader parser, headless browser, or optional LLM.
4. If store layouts matter in practice, add user-ordered aisle sections within
   each store.
5. If duplicate ingredient naming causes visible list pain, introduce aliases
   gradually from user corrections rather than importing a global ontology.
6. Consider pantry/freezer inventory only if the household repeatedly asks
   “what can we make with what we have?”
7. Nutrition, price tracking, OCR, social import, reminders, and grocery-order
   integrations stay last because they are costly, approximate, or fragile.

## 14. Definition of MVP complete

MVP is complete only when all of the following are true:

Current status: the software and automated criteria are implemented, production
credentials/rules are live, owner household bootstrap works, and the safe Google
migration stage is deployed. Provider support-email consent, owner linking and
Google re-entry, password retirement, the other Google accounts, and the remaining
household/physical acceptance criteria below are intentionally not claimed as
complete. See Section 1 for the exact continuation order.

- The owner and Marla can sign in only with Google and remain signed in on their
  iPhones; the owner's linked account retains its original Firebase UID and
  household access.
- A friend can create a separate household with Google and cannot access the
  initial household.
- The Plan to Eat recipe library has been imported with a reviewed error report.
- Website import succeeds on the household's common recipe sites through the
  Share Sheet Shortcut in a few taps.
- Recipes are clean, editable, searchable, favoritable, and correctly scalable
  for common quantities.
- Ingredients can be assigned to City Market or Costco and the preference is
  reused.
- Shopping changes synchronize between both users and survive a tested offline
  period.
- The app is installable and usable at `https://forkast.4dl.ca`.
- Firestore security tests and the automated verification suite pass.
- A complete export has been generated and inspected.
- The household has used Forkast for one real week without a switch-blocking
  problem.

## 15. Fresh-task kickoff

Use this prompt after clearing context:

> Continue the Forkast project in `/Users/adil/Code/Forkast`. Read `PRODUCT.md`,
> `PLAN.md`, `README.md`, and `/Users/adil/Code/AGENTS.md` completely before
> acting. Treat `PRODUCT.md` and `PLAN.md` as the product and implementation
> authorities. Begin with the **Continuation checklist** in Section 1; preserve
> completed milestone work and do not rerun Impeccable's one-time detector.
> Implement the Google-only launch migration in Section 13 before the remaining
> private/physical acceptance. Preserve the existing owner UID and household;
> disable email/password only after verified Google re-entry. Work autonomously
> until the full MVP definition of complete is satisfied; do
> not stop for routine questions or optional owner input. Use best judgment and
> the YAGNI boundary. Use Impeccable for any new material frontend change and
> visually re-verify affected flows. Make coherent atomic changes, verify each,
> commit with only my configured Git identity, and push directly to
> `origin/main` as you go. Never create a branch or pull request, never add
> Codex/AI/co-author attribution, and keep `main` deployable. Continue until
> complete; if a listed credential/private-data/physical-device blocker remains,
> finish every independent task and report the exact owner action needed.
