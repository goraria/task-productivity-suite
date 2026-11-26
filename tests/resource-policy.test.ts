import {
  rawAuthorizePageResource,
  rawAuthorizePageResources,
  rawGetAuthorizedResourcePage,
} from "@/services/resource-policy"
import { rawListReadableResourcePages } from "@/models/page"
import { beforeEach, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({
  page: vi.fn(),
  access: vi.fn(),
  database: vi.fn(),
}))
vi.mock("server-only", () => ({}))
vi.mock("@/models/page", async (original) => ({
  ...(await original<typeof import("@/models/page")>()),
  rawGetPage: fixture.page,
}))
vi.mock("@/database", () => ({ getDatabase: fixture.database }))
vi.mock("@/database/authorization", () => ({
  assertAccess: fixture.access,
  pageScope: vi.fn(),
}))
const actor = { userId: "local-user", isAdmin: false }
beforeEach(() => {
  vi.resetAllMocks()
  fixture.page.mockResolvedValue({
    id: "page",
    workspaceId: "workspace",
    isArchived: false,
  })
  fixture.access.mockResolvedValue(undefined)
})
it("checks native page access before shared comments", async () => {
  fixture.page.mockRejectedValue(new Error("workspace_forbidden"))
  await expect(rawGetAuthorizedResourcePage(actor, "page")).rejects.toThrow(
    "workspace_forbidden"
  )
  expect(fixture.access).not.toHaveBeenCalled()
})
it("never permits archived pages", async () => {
  fixture.page.mockResolvedValue({ id: "page", isArchived: true })
  await expect(rawGetAuthorizedResourcePage(actor, "page")).rejects.toMatchObject({
    code: "page_archived",
  })
})
it.each(["read", "comment"] as const)(
  "uses the central effective ACL for %s",
  async (access) => {
    await rawGetAuthorizedResourcePage(actor, "page", access)
    expect(fixture.access).toHaveBeenCalledWith(
      "page",
      "page",
      actor,
      access === "read" ? "view" : "comment"
    )
  }
)
it("cannot bypass a restricted ancestor with a generic member role", async () => {
  fixture.access.mockRejectedValue(new Error("access_forbidden"))
  await expect(
    rawGetAuthorizedResourcePage(actor, "page", "comment")
  ).rejects.toThrow("access_forbidden")
})
it("enforces delegated read/write scopes before reading documents", async () => {
  await expect(
    rawAuthorizePageResource(actor, "page", "read", ["social:read"])
  ).rejects.toMatchObject({ code: "insufficient_scope" })
  expect(fixture.page).not.toHaveBeenCalled()
  await expect(
    rawAuthorizePageResource(actor, "page", "read", ["task:read"])
  ).resolves.toEqual({ allowed: true })
  await expect(
    rawAuthorizePageResource(actor, "page", "comment", ["task:read"])
  ).rejects.toMatchObject({ code: "insufficient_scope" })
})
it("denies batch Resource authorization without Task read scope", async () => {
  await expect(
    rawAuthorizePageResources(actor, ["page"], ["task:write"])
  ).rejects.toMatchObject({ code: "insufficient_scope" })
  expect(fixture.database).not.toHaveBeenCalled()
})
it("never queries for an empty favorite list", async () => {
  expect(await rawListReadableResourcePages(actor, [])).toEqual([])
  expect(fixture.database).not.toHaveBeenCalled()
})
