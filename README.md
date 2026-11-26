# Gorth Task

Root fullstack application: Next.js 16 (default Turbopack) + Hono + Drizzle + Better Auth 1.7.
The original client/server source and database migration history remain in `pkg/`. The active app does not import them.

## Run

```sh
pnpm dev
```

Task runs on `http://localhost:3034` and the environment example uses SSO at `https://gorth-auth.vercel.app`. Resource runs separately on port 5053 for comments/favorites; there is no separate Task backend on port 5054.

The current Task OAuth grant covers its own API plus Notify (5052), Resource (5053) and Discovery (5054). Leave Payment, Billing, Media and Insight audiences empty until SSO explicitly grants the required resource links and scopes. Configuring every service at once can block the whole sign-in with `invalid_target`. Restart Task and begin a new login after changing audiences.

Set root environment variables using [.env.example](.env.example). Only `utils/environment.ts` reads application environment values. Never expose the session secret or database URL through `NEXT_PUBLIC_*`.

## Verify

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm test:resource
pnpm build
```

`test:resource` runs the cooperating Resource policy tests from the sibling repository with Task's existing Vitest runner. It does not load secret env files.

See [auth and API architecture](docs/auth-structure.md) for the login flow, migration, access policy and verification limits.
