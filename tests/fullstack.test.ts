import { beforeEach, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({
  database: vi.fn(),
  credentials: vi.fn(),
  forward: vi.fn(),
}))
vi.mock("@/utils/environment", () => ({
  oauthCookiePrefix: "gorth",
  appUrl: "http://localhost:3034",
  authUrl: "http://localhost:3000",
  oauthClientId: "task",
  oauthClientSecret: "fixture-confidential-secret",
  oauthAudience: "http://localhost:3034",
  sessionSecret: "fixture-only-secret-at-least-32-bytes",
  isProduction: false,
  rateLimitEnabled: false,
  oauthReadScope: "task:read",
  oauthWriteScope: "task:write",
  oauthNotifyAudience: "http://localhost:5052",
  oauthResourceAudience: "http://localhost:5053",
  oauthDiscoveryAudience: "http://localhost:5054",
  oauthMediaAudience: "",
  oauthPaymentAudience: "",
  oauthBillingAudience: "",
  oauthInsightAudience: "",
}))
vi.mock("@/database", () => ({ getDatabase: fixture.database }))
vi.mock("@/lib/auth/server", () => ({
  authServer: {
    handler: () => Response.json({ status: "native-better-auth" }),
  },
}))
vi.mock("@/models/session", () => ({
  rawReadAppIdentity: fixture.credentials,
  rawReadAppCredentials: fixture.credentials,
}))
vi.mock("@/services/route", () => ({ rawForwardRouteRequest: fixture.forward }))
import { createApp } from "./http-app"
beforeEach(() => {
  vi.resetAllMocks()
  fixture.database.mockImplementation(() => {
    throw new Error("Unexpected DB access")
  })
  fixture.credentials.mockResolvedValue(null)
})
it("serves health/metadata in process without the retired Task server", async () => {
  const app = createApp()
  expect(await (await app.request("/health")).json()).toEqual({ status: "ok" })
  expect(
    await (await app.request("/.well-known/oauth-protected-resource")).json()
  ).toMatchObject({
    resource: "http://localhost:3034",
    scopes_supported: ["task:read", "task:write"],
  })
  expect(fixture.database).not.toHaveBeenCalled()
  expect(fixture.forward).not.toHaveBeenCalled()
})
it("mounts Better Auth locally and denies private calls without a native session", async () => {
  const app = createApp()
  expect(await (await app.request("/auth/ok")).json()).toEqual({
    status: "native-better-auth",
  })
  for (const path of [
    "/task/user/me",
    ...[
      "workspace",
      "workspace-member",
      "page",
      "block",
      "database",
      "database-property",
      "page-property-value",
      "database-view",
      "permission",
      "file",
      "comment",
      "favorite",
    ].map((domain) => "/task/" + domain),
    "/resource/state",
    "/notification",
    "/discovery/search",
  ])
    expect((await app.request(path)).status).toBe(401)
  expect(fixture.database).not.toHaveBeenCalled()
  expect(fixture.forward).not.toHaveBeenCalled()
})
it("rejects foreign-origin cookie mutations before forwarding", async () => {
  const response = await createApp().request(
    "http://localhost:3034/resource/state",
    {
      method: "POST",
      headers: {
        Origin: "https://evil.test",
        Cookie: "gorth.session_token=opaque",
      },
    }
  )
  expect(response.status).toBe(403)
  expect(fixture.forward).not.toHaveBeenCalled()
})
it("forwards the backend access token, strips upstream cookies and stops after logout", async () => {
  fixture.credentials.mockResolvedValue({
    credentials: { accessToken: "backend-access-token" },
  })
  fixture.forward.mockImplementation(async () =>
    Response.json(
      { ok: true },
      {
        headers: {
          "Set-Cookie": "foreign=value",
          Location: "https://evil.test",
        },
      }
    )
  )
  const app = createApp()
  const request = () =>
    app.request("http://localhost:3034/discovery/search?query=story", {
      headers: {
        Cookie: "gorth.session_token=opaque; gorth.access_token=untrusted",
        Authorization: "Bearer untrusted",
      },
    })
  const response = await request()
  expect(response.status).toBe(200)
  const options = fixture.forward.mock.calls[0][0]
  expect(options.url.origin).toBe("http://localhost:5054")
  expect(options.url.searchParams.get("application")).toBe("task")
  expect(options.headers.get("authorization")).toBe(
    "Bearer backend-access-token"
  )
  expect(options.headers.get("cookie")).toBeNull()
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("location")).toBeNull()
  fixture.credentials.mockResolvedValue(null)
  expect((await request()).status).toBe(401)
  expect(fixture.forward).toHaveBeenCalledTimes(1)
})
