import { beforeEach, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccessToken: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  revoked: vi.fn(),
  userinfo: vi.fn(),
  verify: vi.fn(),
}))
vi.mock("@/lib/auth/config", () => ({
  getAuthConfig: () => ({
    origin: "http://localhost:3034",
    clientId: "chat",
    ssoOrigin: "http://localhost:3000",
    issuer: "http://localhost:3000/auth",
  }),
}))
vi.mock("@/utils/environment", () => ({
  oauthCookiePrefix: "gorth",
  oauthAudience: "http://localhost:3034",
}))
vi.mock("@/lib/auth/server", () => ({
  authServer: {
    api: { getSession: mocks.getSession, getAccessToken: mocks.getAccessToken },
  },
}))
vi.mock("@/database", () => ({
  getDatabase: () => ({ select: mocks.select, update: mocks.update }),
}))
vi.mock("@/models/revocation", () => ({ rawIsSsoSessionRevoked: mocks.revoked }))
vi.mock("@/services/sso-userinfo", () => ({ rawGetSsoUserInfo: mocks.userinfo }))
vi.mock("better-auth/oauth2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("better-auth/oauth2")>()),
  verifyAccessTokenRequest: mocks.verify,
}))

import { rawReadAppCredentials } from "@/models/session"

const incoming = new Headers({
  Cookie: "gorth.session_token=opaque.native.signature",
})
const createdAt = new Date()
function rows(value: object[]) {
  return { from: () => ({ where: () => ({ limit: async () => value }) }) }
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.getSession.mockResolvedValue({
    user: { id: "local-id" },
    session: {
      id: "native-id",
      ssoSessionId: "central-sid",
      createdAt,
      expiresAt: new Date(Date.now() + 60_000),
    },
  })
  mocks.select
    .mockReturnValueOnce(
      rows([
        {
          id: "local-id",
          externalUserId: "central-sub",
          status: "active",
          bannedAt: null,
          deletedAt: null,
          syncedAt: new Date(),
        },
      ])
    )
    .mockReturnValueOnce(rows([{ id: "account-id" }]))
    .mockReturnValueOnce(rows([{ id: "native-id" }]))
  mocks.getAccessToken.mockResolvedValue({
    accessToken: "server-only-access-token",
  })
  mocks.verify.mockResolvedValue({
    sub: "central-sub",
    sid: "central-sid",
  })
  mocks.revoked.mockResolvedValue(false)
  mocks.userinfo.mockResolvedValue({ sub: "central-sub", status: "active" })
  mocks.update.mockReturnValue({
    set: () => ({ where: async () => undefined }),
  })
})

it("rejects anonymous requests without DB or provider calls", async () => {
  expect(await rawReadAppCredentials(new Headers())).toBeNull()
  expect(mocks.getSession).not.toHaveBeenCalled()
  expect(mocks.getAccessToken).not.toHaveBeenCalled()
})
it("reads native sessions directly and keeps routine reads offline within freshness", async () => {
  const session = await rawReadAppCredentials(incoming)
  expect(session?.subject).toBe("central-sub")
  expect(mocks.getSession).toHaveBeenCalledWith({
    headers: incoming,
    query: { disableCookieCache: true },
  })
  expect(mocks.getAccessToken).toHaveBeenCalledWith({
    headers: incoming,
    body: { accountId: "account-id" },
  })
  expect(mocks.userinfo).not.toHaveBeenCalled()
  expect(mocks.verify).toHaveBeenCalledWith(
    expect.objectContaining({
      authorizationHeader: "Bearer server-only-access-token",
    }),
    expect.objectContaining({
      jwksUrl: "http://localhost:3000/auth/jwks",
      verifyOptions: expect.objectContaining({
        issuer: "http://localhost:3000/auth",
        audience: "http://localhost:3034",
        typ: "at+jwt",
      }),
    })
  )
})
it("cannot substitute another subject or SID from the refreshed provider account", async () => {
  mocks.verify.mockResolvedValue({
    sub: "another-user",
    sid: "central-sid",
  })
  await expect(rawReadAppCredentials(incoming)).rejects.toMatchObject({
    code: "rejected",
  })
  mocks.select.mockReset()
  mocks.select
    .mockReturnValueOnce(
      rows([
        {
          id: "local-id",
          externalUserId: "central-sub",
          status: "active",
          syncedAt: new Date(),
        },
      ])
    )
    .mockReturnValueOnce(rows([{ id: "account-id" }]))
  mocks.verify.mockResolvedValue({
    sub: "central-sub",
    sid: "other-sid",
  })
  await expect(rawReadAppCredentials(incoming)).rejects.toMatchObject({
    code: "rejected",
  })
})
it("rejects durable revocation before requesting account tokens", async () => {
  mocks.revoked.mockResolvedValue(true)
  expect(await rawReadAppCredentials(incoming)).toBeNull()
  expect(mocks.getAccessToken).not.toHaveBeenCalled()
})
it("checks SSO directly for sensitive actions and fences a raced logout", async () => {
  mocks.select.mockReset()
  mocks.select
    .mockReturnValueOnce(
      rows([
        {
          id: "local-id",
          externalUserId: "central-sub",
          status: "active",
          syncedAt: new Date(),
        },
      ])
    )
    .mockReturnValueOnce(rows([{ id: "account-id" }]))
    .mockReturnValueOnce(rows([]))
  expect(await rawReadAppCredentials(incoming, true)).toBeNull()
  expect(mocks.userinfo).toHaveBeenCalledWith("server-only-access-token", {
    fresh: true,
  })
})
it("does not discard the app session when a live SSO check is unavailable", async () => {
  mocks.userinfo.mockRejectedValue(new Error("provider unavailable"))
  await expect(rawReadAppCredentials(incoming, true)).rejects.toThrow(
    "provider unavailable"
  )
  expect(mocks.update).not.toHaveBeenCalled()
})
