# Forkast

Forkast is a private household recipe manager and store-aware shopping PWA. It
captures clean recipes from ordinary websites, scales ingredient quantities,
and keeps City Market and Costco lists synchronized through Firebase.

## Local development

Requirements: Node 22 and Java 21 when running Firestore rule tests.

1. Copy `.env.example` to `.env.local` and add the public Firebase web config.
2. Run `npm install`.
3. Run `npm run dev` for the app, or `netlify dev` when testing functions.
4. Run `firebase emulators:start --only auth,firestore` and set
   `VITE_USE_FIREBASE_EMULATORS=true` for local Firebase work.

The complete verification commands are:

```sh
npm run check
npm run test:e2e
npm run test:rules
npm audit --audit-level=high
```

## Production setup

- Netlify site: `forkast-4dl`; build command `npm run build`; publish `dist`.
- Firebase project: `forkast-4dl`; Spark plan; Firestore region `us-west1`.
- The Google provider, support email, authorized domains, and OAuth redirect
  URIs are configured. Google is the only sign-in method Forkast ships; no
  password or account-linking code remains. Two owner steps are still open:
  verify an ordinary Google sign-in, then disable the email/password provider
  and delete the disposable password account and its test household. Disable the
  provider only after a Google sign-in has succeeded, or the household has no way
  in. Storage, Analytics, Gemini, and Firebase Hosting are intentionally
  disabled.
- Public `VITE_FIREBASE_*` values belong in Netlify. The downloaded Firebase
  service-account JSON belongs only in Netlify as the single-line
  `FIREBASE_SERVICE_ACCOUNT_JSON` environment variable. Never commit it.
- Set Netlify's `AWS_LAMBDA_JS_RUNTIME` environment variable to `nodejs24.x`.
  Forkast uses a Node-compatible Firebase Admin release for Netlify's function
  packaging path.
- Deploy Firestore changes with `firebase deploy --only firestore` after the
  emulator tests pass.
- Google sign-in uses full-page redirect on iPhone and the installed PWA. Netlify
  transparently proxies `/__/auth/*` to the Firebase auth helper so Safari does
  not depend on third-party storage. Keep
  `https://forkast.4dl.ca/__/auth/handler` and the equivalent Netlify fallback
  handler authorized for the Google OAuth client, and keep both hosts authorized
  in Firebase Authentication.
- The Content-Security-Policy in `netlify.toml` must keep allowing
  `https://apis.google.com` in `script-src` and `frame-src`. Firebase Auth loads
  its gapi bootstrap from that origin, and without it Google sign-in fails with
  `auth/internal-error` before the popup opens.
- Keep `/__/` in the service worker's `navigateFallbackDenylist` in
  `vite.config.ts`. The auth handler is proxied onto our own origin, so without
  that entry the service worker serves the app shell in its place and Google
  sign-in hangs on the boot screen with no error. `curl` cannot detect this;
  check it in a browser that already has the app installed.
- Response headers reach installed clients only when `index.html` changes,
  because the service worker precaches the document and replays its cached
  headers. Netlify's `COMMIT_REF` is stamped into the document as
  `<meta name="forkast-build">` so every deploy changes that hash. Do not remove
  the stamp; a header-only deploy would otherwise never reach an installed PWA.

The production custom domain is <https://forkast.4dl.ca>.

## Save to Forkast iPhone Shortcut

Create an iOS Shortcut named **Save to Forkast** that accepts URLs from the
Share Sheet, URL-encodes the Shortcut Input, appends it to
`https://forkast.4dl.ca/import?url=`, and opens the resulting URL. Install the
PWA with Safari's **Add to Home Screen** first so the persistent Firebase session
is reused.

## Plan to Eat import

Export the recipe book as CSV and open **Recipes → Import CSV**. Parsing stays
in the browser. Forkast previews recognized fields, retains unknown columns in
`importMetadata`, warns about duplicates or invalid rows, writes recipes one at
a time, and can download a completion report. Never commit the household CSV.

## Backup and restore

**Settings → Export all household data** downloads a complete versioned Forkast
JSON backup and schema.org Recipe JSON-LD. To restore, validate `schemaVersion`,
create or select the target household, then write each `data` collection with
fresh `createdAt`, `updatedAt`, and user IDs. Restore through a temporary local
script against the Firebase emulator first; the JSON export is the canonical
source and recipe JSON-LD is the portable fallback.

## Operational notes

Firestore supplies realtime listeners, persistent multi-tab cache, and queued
offline writes. The service worker precaches the app shell and conservatively
caches recipe images. Website import accepts only public HTTP(S) HTML, rechecks
redirects and DNS/IP ranges, caps time/size/redirects, requires a Firebase ID
token, and never bypasses bot protection.

The implementation authority and household acceptance script are in
[`PLAN.md`](PLAN.md). Durable product and visual decisions are in
[`PRODUCT.md`](PRODUCT.md) and [`DESIGN.md`](DESIGN.md).
