import {
  rawPlatformRequest,
  rawTrustedPlatformOrigin,
  rawGetBackendAccessToken,
} from "@/services/platform-client"
import { beforeEach, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({
  fetch: vi.fn(),
  request: vi.fn(),
}))
vi.mock("@/utils/environment", () => ({
  authUrl: "https://auth.example.test",
  isProduction: true,
  oauthAudience: "https://task-resource.example.test",
  oauthResourceAudience: "https://resource.example.test",
  oauthNotifyAudience: "https://notify.example.test",
  oauthDiscoveryAudience: "https://discovery.example.test",
  oauthMediaAudience: "https://media.example.test",
  oauthInsightAudience: "https://insight.example.test",
  oauthClientId: "task-machine",
  oauthClientSecret: "fixture-secret",
}))
vi.mock("@/utils/fetcher", () => ({ fetcher: fixture.fetch }))
vi.mock("better-auth/oauth2", () => ({
  clientCredentialsTokenRequest: fixture.request,
}))
beforeEach(() => {
  vi.resetAllMocks()
  fixture.request.mockResolvedValue({
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    headers: {
      Authorization: "Basic fixture",
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
})
it.each([
  "http://localhost:5057",
  "https://user:pass@media.example.test",
  "https://media.example.test/path",
  "https://media.example.test/?url=https://evil.test",
  "file:///tmp",
])("rejects untrusted origins %s", (value) => {
  expect(() => rawTrustedPlatformOrigin(value)).toThrow()
})
it("cannot be redirected by a browser-supplied absolute URL", async () => {
  await expect(
    rawPlatformRequest(
      "media",
      "https://evil.test/media/asset",
      "GET",
      undefined,
      "user-token"
    )
  ).rejects.toMatchObject({ code: "invalid_platform_path" })
  expect(fixture.fetch).not.toHaveBeenCalled()
})
it("delegates the authenticated user token only to the fixed Media registry origin", async () => {
  fixture.fetch.mockResolvedValue({ status: 200, data: { id: "asset" } })
  expect(
    await rawPlatformRequest(
      "media",
      "/media/asset/asset",
      "GET",
      undefined,
      "server-only-token"
    )
  ).toEqual({ id: "asset" })
  expect(fixture.fetch.mock.calls[0]?.[0]).toMatchObject({
    method: "GET",
    redirect: "error",
    headers: { Authorization: "Bearer server-only-token" },
  })
  expect(fixture.fetch.mock.calls[0]?.[0].url.origin).toBe(
    "https://media.example.test"
  )
})
it("uses the Better Auth client-credentials request builder without persisting secrets", async () => {
  fixture.fetch.mockResolvedValue({
    status: 200,
    data: {
      access_token: "machine-token",
      token_type: "Bearer",
      expires_in: 120,
    },
  })
  expect(await rawGetBackendAccessToken("notification")).toBe("machine-token")
  expect(fixture.request).toHaveBeenCalledWith(
    expect.objectContaining({
      tokenEndpoint: "https://auth.example.test/auth/oauth2/token",
      resource: "https://notify.example.test",
      scope: "task:notification:publish",
      tokenEndpointAuth: { method: "client_secret_basic" },
    })
  )
})
it("does not leak provider exceptions or credentials on a failed worker grant", async () => {
  fixture.fetch.mockRejectedValue(
    new Error("credential-bearing upstream exception")
  )
  await expect(rawGetBackendAccessToken("discovery")).rejects.toMatchObject({
    code: "worker_token_failed",
    status: 503,
  })
})

it("coalesces concurrent native machine grants for the same resource", async () => {
  fixture.fetch.mockResolvedValue({
    status: 200,
    data: {
      access_token: "media-machine-token",
      token_type: "Bearer",
      expires_in: 120,
    },
  })
  expect(
    await Promise.all([
      rawGetBackendAccessToken("media"),
      rawGetBackendAccessToken("media"),
    ])
  ).toEqual(["media-machine-token", "media-machine-token"])
  expect(fixture.request).toHaveBeenCalledOnce()
  expect(fixture.fetch).toHaveBeenCalledOnce()
})
it("invalidates a rejected machine token before the next attempt", async () => {
  fixture.fetch.mockResolvedValue({
    status: 401,
    data: { error: "unauthorized" },
  })
  await expect(
    rawPlatformRequest("media", "/media/task/asset-url", "POST", {})
  ).rejects.toMatchObject({ status: 401 })
  fixture.fetch.mockResolvedValue({
    status: 200,
    data: {
      access_token: "renewed-media-token",
      token_type: "Bearer",
      expires_in: 120,
    },
  })
  expect(await rawGetBackendAccessToken("media")).toBe("renewed-media-token")
  expect(fixture.request).toHaveBeenCalledOnce()
})
it("rejects normalized paths escaping the registered service domain", async () => {
  await expect(
    rawPlatformRequest(
      "media",
      "/media/../internal/credential",
      "GET",
      undefined,
      "user-token"
    )
  ).rejects.toMatchObject({ code: "invalid_platform_path" })
  expect(fixture.fetch).not.toHaveBeenCalled()
})

it("uses Basic credentials with the registered logical Task audience", async () => {
  fixture.fetch.mockResolvedValue({
    status: 200,
    data: {
      access_token: "dispatch-machine",
      token_type: "Bearer",
      expires_in: 120,
    },
  })
  expect(await rawGetBackendAccessToken("task")).toBe("dispatch-machine")
  expect(fixture.request).toHaveBeenCalledWith(
    expect.objectContaining({
      resource: "https://task-resource.example.test",
      scope: "task:dispatch",
      tokenEndpointAuth: { method: "client_secret_basic" },
    })
  )
})
