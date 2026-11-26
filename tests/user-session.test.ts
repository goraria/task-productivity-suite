import { beforeEach, expect, it, vi } from "vitest"
import { Hono } from "hono"
import { getTableName, type SQL } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"
const state = vi.hoisted(() => ({
  revoked: false,
  databaseFailure: false,
  getSession: vi.fn(),
  getAccessToken: vi.fn(),
  user: vi.fn(),
}))
vi.mock("@/utils/environment", () => ({
  oauthCookiePrefix: "gorth",
  appUrl: "http://localhost:3034",
  oauthAudience: "http://localhost:3034",
  authUrl: "https://gorth-auth.vercel.app",
  oauthClientId: "gorth-task-productivity-suite",
  oauthClientSecret: "fixture-confidential-secret",
  sessionSecret: "fixture-session-key-at-least-32-characters",
  oauthReadScope: "task:read",
  oauthWriteScope: "task:write",
  oauthNotifyAudience: "",
  oauthResourceAudience: "",
  oauthDiscoveryAudience: "",
  oauthPaymentAudience: "",
  oauthBillingAudience: "",
  oauthMediaAudience: "",
  oauthInsightAudience: "",
}))
vi.mock("@/lib/auth/server", () => ({
  authServer: {
    api: { getSession: state.getSession, getAccessToken: state.getAccessToken },
  },
}))
vi.mock("@/models/user", () => ({
  rawGetUserByExternalId: state.user,
  rawGetCurrentUser: state.user,
  rawCreateUser: vi.fn(),
  rawDeleteUser: vi.fn(),
  rawGetUser: vi.fn(),
  rawListUsers: vi.fn(),
  rawUpdateUser: vi.fn(),
}))
vi.mock("@/database", () => ({
  getDatabase: () => ({
    select: () => ({
      from: (table: Parameters<typeof getTableName>[0]) => ({
        where: (condition: SQL) => ({
          limit: async () => {
            const compiled = new PgDialect().sqlToQuery(condition)
            // Reproduce the serializer failure on the old query, without network/real DB.
            for (const parameter of compiled.params)
              if (parameter instanceof Date)
                Buffer.byteLength(parameter as never)
            if (getTableName(table) === "revocation") {
              if (state.databaseFailure)
                throw Object.assign(new Error("private-database-url"), {
                  code: "ECONNRESET",
                })
              return state.revoked ? [{ id: "logout-receipt" }] : []
            }
            return [account()]
          },
        }),
      }),
    }),
  }),
}))
import { usersRoutes } from "@/routes/users"

const app = new Hono().route("/task/user", usersRoutes)
function account() {
  return {
    id: "local-id",
    externalUserId: "sso-sub",
    name: "task user",
    email: "task@example.test",
    username: "task-user",
    image: null,
    status: "active",
    role: "user",
    bannedAt: null,
    banExpires: null,
    deletedAt: null,
    syncedAt: new Date(),
  }
}
const request = () =>
  app.request("http://localhost:3034/task/user/me", {
    headers: { Cookie: "gorth.session_token=native-session-fixture" },
  })
beforeEach(() => {
  state.revoked = false
  state.databaseFailure = false
  state.getSession.mockReset().mockResolvedValue({
    user: { id: "local-id" },
    session: {
      id: "native-session",
      ssoSessionId: "sso-sid",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
    },
  })
  state.getAccessToken.mockReset()
  state.user.mockReset().mockResolvedValue(account())
  vi.spyOn(console, "error").mockImplementation(() => {})
})
it("returns /task/user/me through real session/revocation middleware without a Date serialization 503", async () => {
  const response = await request()
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    data: { externalUserId: "sso-sub" },
  })
  expect(state.getSession).toHaveBeenCalledWith(
    expect.objectContaining({ query: { disableCookieCache: true } })
  )
  expect(state.getAccessToken).not.toHaveBeenCalled()
})
it("continues to reject a revoked session before reaching the controller", async () => {
  state.revoked = true
  expect((await request()).status).toBe(401)
  expect(state.user).not.toHaveBeenCalled()
})
it("keeps DB failures fail-closed with a safe stage diagnostic rather than bypassing revocation", async () => {
  state.databaseFailure = true
  const response = await request()
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: "auth_unavailable" })
  expect(console.error).toHaveBeenCalledWith(
    "[auth/session]",
    expect.objectContaining({ stage: "revocation", code: "ECONNRESET" })
  )
  expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
    "private-database-url"
  )
  expect(state.user).not.toHaveBeenCalled()
})
