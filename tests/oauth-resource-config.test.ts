import { getAuthConfig } from "@/lib/auth/config"
import { readFileSync } from "node:fs"
import { beforeEach, expect, it, vi } from "vitest"

const fixture = vi.hoisted(() => ({ values: {} as Record<string, string> }))
vi.mock("@/utils/environment", () => fixture.values)

beforeEach(() => {
  const sample = Object.fromEntries(
    readFileSync(new URL("../.env.example", import.meta.url), "utf8")
      .split("\n")
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => [
        line.slice(0, line.indexOf("=")),
        line.slice(line.indexOf("=") + 1),
      ])
  )
  Object.assign(fixture.values, {
    appUrl: sample.NEXT_PUBLIC_APP_URL,
    authUrl: sample.NEXT_PUBLIC_AUTH_URL,
    oauthClientId: sample.NEXT_OAUTH_CLIENT_ID,
    oauthClientSecret: "fixture-confidential-secret",
    oauthCookiePrefix: sample.NEXT_OAUTH_COOKIE_PREFIX,
    sessionSecret: "fixture-session-secret-at-least-32-characters",
    oauthAudience: sample.NEXT_OAUTH_AUDIENCE,
    oauthNotifyAudience: sample.NEXT_OAUTH_NOTIFY_AUDIENCE,
    oauthResourceAudience: sample.NEXT_OAUTH_RESOURCE_AUDIENCE,
    oauthDiscoveryAudience: sample.NEXT_OAUTH_DISCOVERY_AUDIENCE,
    oauthPaymentAudience: sample.NEXT_OAUTH_PAYMENT_AUDIENCE,
    oauthBillingAudience: sample.NEXT_OAUTH_BILLING_AUDIENCE,
    oauthMediaAudience: sample.NEXT_OAUTH_MEDIA_AUDIENCE,
    oauthInsightAudience: sample.NEXT_OAUTH_INSIGHT_AUDIENCE,
  })
})
it("uses the existing auth logic with all seven configured platform resources", () => {
  const config = getAuthConfig()
  expect(config.issuer).toBe("https://gorth-auth.vercel.app/auth")
  expect(config.redirectUri).toBe("http://localhost:3034/auth/callback/gorth")
  expect(config.clientId).toBe(fixture.values.oauthClientId)
  expect(config.resources).toEqual([
    "http://localhost:3034",
    "http://localhost:5052",
    "http://localhost:5053",
    "http://localhost:5054",
    "http://localhost:5055",
    "http://localhost:5056",
    "http://localhost:5057",
    "http://localhost:5058",
  ])
  expect(config.resources.some((url) => /:707[2-8]/.test(url))).toBe(false)
})
