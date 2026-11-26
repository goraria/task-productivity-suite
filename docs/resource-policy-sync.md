# Task → Resource policy projection

> OAuth update — 2026-11-13: all confidential SSO token exchanges use fixed `client_secret_basic` in code; there is no auth-method environment selector. Business APIs keep `Bearer` tokens. Public PKCE clients keep `none`. A registered Post client needs a native Basic replacement and coordinated ID/secret/binding cutover.

> Runtime update (2026-11-06): standalone workers have been replaced by Vercel Queues. Worker-specific instructions below are historical. Use `bun dev` and the setup in [Managed background processing](https://github.com/gorth-io/ecosystem/blob/main/docs/managed-background-en.md), including Queue credentials and Cron recovery. Existing cross-service OAuth grants still apply.

Task remains the sole authority for workspace membership, page visibility/archive,
local user status/ban/admin role, and user-specific comment permissions.
Resource owns comments/saves and stores only effective `pageId + SSO sub` grants.

## Flow

1. Apply the reviewed Task SQL migration. Statement triggers advance a singleton
   coalescing outbox revision in the SAME transaction as ACL changes. Rollbacks
   cannot emit committed changes. Direct SQL changes are also captured.
2. Task captures revision and complete effective grants under REPEATABLE READ.
   The payload includes schema/source, durable epoch, revision, unique snapshot
   ID, capture/expiry times and every effective read/comment grant.
3. Task pushes an OAuth-authenticated POST to Resource. Resource never calls Task and has no
   Task URL configuration.
4. Resource verifies a native SSO machine JWT with `task:resource:policy`, validates the full
   envelope, and replaces grants + checkpoint atomically under a DB advisory lock.
5. Resource still verifies user JWT/audience/scopes through Better Auth. Resource
   policy checks use the verified SSO `sub`, not an app-local UUID.
6. Task schedules a best-effort `after()` push after successful ACL mutations and
   OAuth user provisioning. An authenticated worker runs at least every minute,
   retrying the outbox and renewing complete snapshots even without changes.

## Freshness, recovery and consistency

- A complete snapshot replaces all previous grants, including deletions. Missing
  intermediate revisions are safe because this is NOT a patch/delta stream.
- Old revisions/time-regressed events cannot overwrite newer state. Duplicate
  events do not renew the lease. Conflicting reuse of an ID is rejected.
- Checkpoint and grants are replaced in one transaction, and reads use one SQL
  statement. Failed replacement rolls back rather than exposing partial grants.
- Missing, expired, future-dated or unavailable projection fails closed (503).
  Missing effective permission in a fresh snapshot is denied (403).
- TTL is 120 seconds from Task's capture time, NOT Resource delivery time.
  Keep database/host clocks synchronized. A sender clock up to 5 seconds ahead
  is tolerated at ingestion, but the projection cannot authorize before issuedAt.
- This is bounded eventual consistency, not instantaneous revocation: a missed
  change can retain previous permissions until the prior snapshot expires.
  Resource cannot detect an unseen source change immediately without a roundtrip.
  New grants/pages can be denied until their snapshot is delivered.
- Retry jobs claim a 30-second durable lease. ACK/error updates are fenced by
  the worker token. Late/crashed workers cannot clear a successor's lease.
- A full capture/heartbeat rebuild repairs missed delivery and also reflects
  expired temporary bans. No network failure falls back to a stale grant.
- Restoring/replacing the Task DB can change epoch. Resource rejects automatic
  epoch changes to prevent authorized old streams resetting its version fence.
  For deliberate rebootstrap, STOP all dispatchers, expire/delete projection
  and grants in one Resource transaction, then resume ONE trusted Task stream.
  Never permit two independently restored Task authorities with the same source identity.

## Deployment (not executed in this change)

1. Review/apply Resource `database/migrations/20261014-task-policy.sql`.
2. Review/apply Task `database/migrations/20261014-resource-policy.sql`.
   These are standalone additive SQL migrations for the current fullstack
   baseline. Do not replay archived Drizzle history. `drizzle-kit push` alone
   does NOT install the outbox functions/triggers.
3. Reuse Task's existing confidential backend client via private
   `NEXT_OAUTH_CLIENT_ID` and `NEXT_OAUTH_CLIENT_SECRET`; set
   `client_secret_basic` to the existing registration method
   (`client_secret_basic`, fixed in code).
   Keep the public browser client and its login flow unchanged. Do not create a
   separate worker, scheduler or policy-signing identity.
4. In SSO, grant/link `task:resource:policy` for the Resource audience and
   `task:dispatch` for Task's existing audience on that confidential client.
   Configure explicit client_credentials_scopes and resource allowedScopes;
   ordinary delegated user scopes never authorize machine operations.
5. Restart/deploy Task and Resource together. Schedule GET or POST
   `/task/resource-policy/dispatch` at least every minute using a short-lived
   SSO client-credentials access token (Task audience, `task:dispatch`).
   `pnpm worker` obtains it through Better Auth's native request builder.
   Resource needs only its existing issuer/service origin, not a shared secret.
6. Manually invoke the authenticated dispatcher once to bootstrap, inspect its
   status and projection expiry, then enable Task-resource traffic.
   Monitor `resource_policy_outbox.revision/delivered_revision/delivered_at/last_error`
   and `task_policy_projection.expires_at`; alert before the lease expires.
7. Delete the obsolete Task-URL variable from deployment/local Resource config
   yourself if desired; the application no longer reads it.

## Security and operational limits

- Better Auth verifies signature/JWKS, issuer, audience, expiry, required scope
  and client_id. The receiver additionally requires subject == client_id and no
  user session claim. Browser cookies/Origin/Fetch headers are refused.
- SSO admin policy grants the policy scope only to Task's confidential backend.
  Tokens are bounded to 600 seconds; projection freshness remains 120 seconds.
  HTTPS is required outside loopback development; redirects are not followed.
- There is no legacy signature/static-token fallback. Coordinate sender/receiver
  deployment before the existing snapshot expires; failures remain closed.
- SHA-256 body digests still detect conflicting snapshot reuse; they are replay
  metadata, not an authentication secret or a replacement signature scheme.
- Membership and grants refer to SSO subjects. Local UUIDs remain only in Task DB.
  Public/other-app reads still cannot expose Task private metadata or saved pages.
- Current Task read policy requires workspace membership/ownership (or local
  admin/master). A standalone page permission does not grant workspace read.
  Guests need a user-specific comment/edit/full-access permission to comment.
  This migration preserves that existing policy rather than broadening it.
- v1 accepts at most 20,000 effective grant rows AND 1.5 MB JSON. Oversized
  snapshots fail without truncation, leave changes pending, and existing leases
  expire closed. Larger deployments need a reviewed sharded/staged snapshot
  protocol before increasing these limits; do not silently drop ACL rows.
- Normal app login/session/refresh/logout and service JWT verification stay native
  Better Auth. Policy events/outbox are ecosystem business logic, not a Better
  Auth plugin or a replacement OAuth engine.

## Verification scope

Offline tests cover native auth regressions, source policy/gateway, OAuth machine event
routes, scheduler isolation, worker retry/lease/ACK behavior, full-snapshot
replacement, rollback, revision/idempotency fences, expiry, direct resource
lookups and saved-page filtering. SQL triggers and real cross-database/network
delivery still require migration/deployment integration checks.
