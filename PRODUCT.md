# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Forkast initially serves the owner and Marla in one private household. Friends
may also sign in and create their own completely isolated households; Forkast is
not a public recipe-sharing network. The primary usage contexts are saving a
recipe while browsing on an iPhone, cooking from a clean recipe view, and
checking a shared grocery list in City Market or Costco—sometimes with
unreliable connectivity.

The owner's wife is the decisive MVP user. Success means she prefers Forkast's
core workflow to Plan to Eat without needing technical assistance.

## Product Purpose

Forkast is a low-maintenance household recipe and grocery-list PWA. It makes it
fast to capture the useful parts of a recipe without ads or backstory, adjust
quantities for the people being served, and turn ingredients into synchronized,
store-aware shopping lists.

The product succeeds when both household members can import their existing
recipes, save new recipes from an iPhone in a few taps, and complete a real week
of cooking and grocery shopping without a switch-blocking problem.

## Positioning

Forkast is not a general kitchen-management suite. Its distinguishing mechanism
is a short household loop: capture a clean recipe, scale it, and send its
ingredients to the store where this household actually buys them. Remembered
ingredient-to-store choices make the next shopping trip faster without asking
the users to maintain a formal ingredient taxonomy.

## Operating Context

- The production PWA lives at <https://forkast.4dl.ca> and is hosted by Netlify.
- Authentication uses Google sign-in through Firebase Authentication. Forkast
  does not collect or store passwords. Household data uses Firestore.
- The PWA is installed from Safari rather than distributed through the App
  Store.
- iOS does not provide the PWA Web Share Target API, so website capture uses a
  user-installed “Save to Forkast” Shortcut that opens Forkast's import route.
- Each household defines its own stores. This one uses City Market and Costco.
- The household's existing recipes come from a Plan to Eat CSV export.
- The grocery list must remain readable and editable with weak or absent mobile
  service, then synchronize when the app returns online.
- Recipe websites are untrusted input. Import can extract ordinary structured
  recipe data but must not bypass login walls, CAPTCHAs, or bot protection.

## Capabilities and Constraints

- MVP capabilities are recipe URL capture and review, manual recipe editing,
  favorites, title/ingredient search, serving scaling, Plan to Eat recipe CSV
  import, two synchronized store lists, remembered store assignments, manual
  grocery items, offline persistence, and full data export.
- The stack is React, TypeScript, Vite, Netlify, and Firebase.
- The product is a responsive PWA, not a native app.
- Google is the only launch sign-in method. There are no production users or
  production household data to migrate; the temporary email/password account
  and its test household are disposable and must not keep migration or linking
  code in the launch product.
- Any Google user may create an isolated household or redeem a valid invite to
  join an existing household. Data never crosses household boundaries.
- The expected operating cost is $0/month at household usage. MVP preserves
  source image URLs instead of enabling Firebase Storage, which now requires a
  Blaze billing account.
- Data ownership is non-negotiable: recipes export as schema.org Recipe JSON-LD
  and the complete household exports as Forkast JSON.
- The implementation favors boring, well-supported dependencies and simple,
  reversible choices over speculative architecture.
- Meal calendars, nutrition, pantry inventory, OCR, LLM parsing, social-site
  scraping, price tracking, and native apps are explicitly deferred.
- The actual Plan to Eat CSV remains private and must never be committed.
- The exact visual system is deliberately delegated to the Impeccable workflow
  and the implementing agent's judgment. It must fit the operating context and
  preserve task clarity; no further owner input is required to select it.

## Brand Commitments

- Product name: Forkast.
- The experience should feel purpose-built for this household rather than like a
  generic SaaS dashboard.
- Voice is direct, calm, useful, and honest about import or synchronization
  failures. Avoid hype, gamification, guilt, and cute copy that slows a task.

No logo, palette, typography, or other visual asset is currently binding. The
implementing agent is authorized to establish them through Impeccable and record
the durable result in `DESIGN.md` before shipping the first real interface.

## Evidence on Hand

- The validated MVP requirements came directly from a household conversation.
- The detailed implementation and YAGNI decisions are in `PLAN.md`.
- The original adopt-vs-build research was reviewed when creating that plan, but
  it is not stored in the repository and is not the source of truth.
- The production domain, Cloudflare CNAME, Netlify site, GitHub repository, and
  valid HTTPS routing already exist.
- There are no approved screenshots, logos, testimonials, usage analytics, or
  production recipe examples. Future work must not fabricate social proof or
  product claims.

## Product Principles

1. Optimize for the wife-at-the-store and wife-on-an-iPhone scenarios first.
2. Preserve user control: imports are reviewable, parsing is correctable, and
   all household data is exportable.
3. Guess less: leave ambiguous quantities intact and fail recoverably instead
   of presenting invented precision.
4. Make the common loop exceptionally fast before adding kitchen-suite breadth.
5. Keep operations and architecture small enough to remain dependable for years.

## Accessibility & Inclusion

The app must support keyboard navigation, visible focus, screen-reader labels,
semantic controls, reduced motion, sufficient contrast, Dynamic Type/browser
text enlargement, and comfortable touch targets. Grocery use can involve one
hand, glare, distraction, and poor connectivity, so essential state and actions
must remain obvious without relying on subtle color or motion alone.
