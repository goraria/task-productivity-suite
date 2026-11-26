# Task fullstack/auth migration

## Active structure

Next.js App Router and Hono share the root application and deployment. `app/(api)/[...route]/route.ts` adapts `app/api.ts` to Next.js with `@hono/vercel`. Backend `routes/`, `controllers/`, `services/`, `middlewares/`, `schemas/`, `database/` stay at root. Browser API hooks live in `queries/`.

Business APIs use singular paths under `/task`, e.g. `/task/workspace`, `/task/page`, `/task/database-property`. This avoids collisions with HTML routes such as `/workspace`, `/document`, `/database`. Shared platform proxy paths remain `/resource`, `/notification`, `/discovery`, etc., with backend-only access tokens.

The active frontend/page import graph and all Task business domains were migrated. Unused historical Clerk/Convex/Supabase experiments remain archived in `pkg/`; they are not alternate auth authorities. Original `caller.tsx` and `fetcher.ts` are preserved byte-for-byte. No obsolete `lib/utils` fallback is present.

## Better Auth owns OAuth and sessions

- Native `genericOAuth`, `signIn.social({ provider: "gorth" })`, `useSession()`, `getSession()`, `getAccessToken()`, `signOut()`.
- Central Gorth SSO remains the identity provider, not a second email/password database at Task.
- Native callback: `/auth/callback/gorth`; local issuer/audience for Task API: `http://localhost:3034`.
- `prompt: "select_account"` always asks SSO to select an account, even with one browser account.
- PKCE, state, nonce, discovery and verified ID-token identity are implemented by Better Auth. Verification metadata is required; failed discovery never falls back to unverified decoding.
- `disableProviderLogout: true` keeps logout local to Task. SSO's browser accounts remain logged in.
- Native `account` encrypts stored OAuth tokens. Browser token retrieval/refresh/linking and domain identity mutation endpoints are not exposed.
- Native `user` UUIDs and Task foreign keys remain local; `externalUserId` and native provider `accountId` bind the immutable SSO `sub`. Never merge different subjects by email.

Better Auth API mounting owns protocol/origin/CSRF/cookie behavior. Next proxy checks cookie presence optimistically only; every private Hono route independently validates its session or bearer and authorization. No HMAC BFF RPC, retired Task server, self-fetching auth proxy or periodic full-page auth reload remains.

See official [Generic OAuth](https://better-auth.com/docs/plugins/generic-oauth), [Next.js integration](https://better-auth.com/docs/integrations/next), [Hono integration](https://better-auth.com/docs/integrations/hono).

## App authorization remains app-specific

Protocol/session logic is native Better Auth; domain policy is deliberately not replaced with SSO roles. Task checks local role/status/ban/delete state and workspace membership. API access tokens require the Task audience, appropriate scopes and access-token type, not ID tokens. Signed SSO backchannel logout persists revocation and invalidates matching native sessions. DPoP replay reservations stay atomic where token verification requires them.

UI session caching and routine profile validation use 120 seconds; mutations/live-sensitive checks use SSO directly. Provider/profile checks are coalesced where appropriate. Native session storage is checked on protected backend operations, with a post-refresh logout fence. Local logout blocks future app proxy calls, but does not magically revoke an already-issued access token; SSO revocation/token expiry remains authoritative for standalone bearer APIs.

Productivity query caches and selected workspace storage are keyed by SSO subject. Server drafts no longer use synchronous state-reset effects. Refreshing auth in the background does not replace an already-rendered page with a loading screen.

## Resource comments/favorites

Task does not invent missing comment/favorite tables. Resource owns those records:

- Task `/task/comment` and `/task/favorite` require a current native app session and local page/workspace permission before forwarding a backend bearer.
- Comment authors use SSO subject across services, mapped to local Task user UUIDs for UI DTOs. Favorite ownership is derived from the verified actor, not the request body.
- Resource verifies its own audience/scopes/SSO identity, resolves actual comment/review/reference/entity relations, and checks its local Task policy projection. A query parameter cannot relabel a comment as belonging to another page.
- Read access requires current workspace access and a non-archived page. Commenting requires owner/admin/member or an explicit guest comment/edit/full-access grant.
- Resource has no Task URL. Task's transactional outbox and signed complete snapshots populate Resource's effective grants, with a 120-second freshness lease and authenticated periodic retry/rebuild.
- Resource public catalogs/collection resource lists exclude Task entries. Saved Task pages are filtered by projected workspace permissions in one local batch lookup, not a network call per bookmark.
- Legacy Task authorization endpoints remain authenticated but are no longer used by Resource. Deploy the migrations, dedicated event/scheduler secrets and worker schedule documented in [resource-policy-sync.md](resource-policy-sync.md); none were applied to cloud in this source-only change.

## Cloud migration

Approved cloud migration was applied successfully:

- Native `session/account/verification` schemas added; old auth tables archived as `legacy_session/legacy_verification`.
- Original `user` identities and counts of all ten Task domain tables were verified unchanged within the migration transaction. This database contained zero user records at migration time.
- Existing proof/revocation and rate-limit tables retained.
- Only SSO client `gorth-task-productivity-suite` callbacks and its local resource audience were changed: `/auth/callback/gorth`, port 3034. Secrets/scopes/other client fields and existing resource policies were preserved. Maintained SSO seeds match.

Use `pnpm db:migrate-auth` for the guarded idempotent migration on another configured database. Do not replay old archived Drizzle history against the newly migrated cloud database. Future schema migrations must use a reviewed baseline of the current schema rather than treating native tables as newly missing. Legacy rows are not converted into valid native sessions; sign in again after deployment.

## Verification

Task: typecheck, ESLint, native OAuth/session/backchannel/freshness tests, domain CRUD tests, Resource gateway/permission tests and standalone Tailwind/PostCSS compilation.
Resource: TypeScript, production Vite build, middleware/policy tests including alternate lookup paths, wrong app tokens, authorizer outage and batch save filtering.
SSO: typecheck and existing regression suite after the targeted registration/seed update.

The default `next build` was attempted, including a network-enabled retry. The managed runner blocks Turbopack/PostCSS worker socket creation with `Operation not permitted`; it did not complete a production Next build. The standalone CSS test passes and the build script remains `next build`. Run the production build on the local machine/CI before deployment.

In-process runtime smoke checks return 200 for health/native auth health/metadata and 401 for anonymous private APIs. SSO was not listening on localhost:3000 during that smoke check, so interactive real-account login and live Resource integration were not verified. Start SSO before Task (required discovery), configure/restart Resource, then exercise sign in, switch account, local logout and comment/favorite permissions.
