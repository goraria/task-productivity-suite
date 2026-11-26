import { beforeEach, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({
  fetch: vi.fn(),
  page: vi.fn(),
  pages: vi.fn(),
  database: vi.fn(),
}))
vi.mock("@/utils/environment", () => ({
  oauthCookiePrefix: "gorth",
  oauthResourceAudience: "http://localhost:5053",
}))
vi.mock("@/utils/fetcher", () => ({ fetcher: fixture.fetch }))
vi.mock("@/models/page", () => ({
  rawListReadableResourcePages: fixture.pages,
}))
vi.mock("@/services/resource-policy", () => ({
  rawGetAuthorizedResourcePage: fixture.page,
}))
vi.mock("@/database", () => ({ getDatabase: fixture.database }))
import {
  rawCreatePageComment,
  rawDeletePageComment,
  rawCreateFavorite,
  rawDeleteFavorite,
  rawListFavorites,
} from "@/services/resource-interactions"
const actor = { userId: "local-user", isAdmin: false }
const page = { id: "page", workspaceId: "workspace" }
beforeEach(() => {
  vi.resetAllMocks()
  fixture.page.mockResolvedValue(page)
  fixture.fetch.mockResolvedValue({
    status: 200,
    data: {
      id: "comment",
      content: "hello",
      createdAt: "now",
      updatedAt: "now",
    },
  })
})
it("keeps OAuth credentials backend-only and binds the comment actor locally", async () => {
  const result = await rawCreatePageComment(actor, "server-access", {
    pageId: "page",
    workspaceId: "workspace",
    content: "hello",
  })
  expect(result.authorId).toBe(actor.userId)
  const options = fixture.fetch.mock.calls[0][0]
  expect(options.url.origin).toBe("http://localhost:5053")
  expect(options.params.id).toBe("page")
  expect(options.headers.Authorization).toBe("Bearer server-access")
  expect(options.headers.Cookie).toBeUndefined()
  expect(options.redirect).toBe("manual")
  expect(JSON.stringify(result)).not.toContain("server-access")
})
it("rejects workspace mismatch before contacting Resource", async () => {
  await expect(
    rawCreateFavorite(actor, "token", {
      pageId: "page",
      workspaceId: "wrong",
      position: 0,
    })
  ).rejects.toMatchObject({ code: "workspace_mismatch" })
  expect(fixture.fetch).not.toHaveBeenCalled()
})
it("cannot remove another local user's favorite", async () => {
  await expect(
    rawDeleteFavorite(actor, "token", "another-user", "page")
  ).rejects.toMatchObject({ code: "forbidden" })
  expect(fixture.fetch).not.toHaveBeenCalled()
})
it("binds comment deletion to its page and preserves permission errors", async () => {
  fixture.fetch.mockResolvedValue({ status: 403 })
  await expect(
    rawDeletePageComment(actor, "token", "page", "comment")
  ).rejects.toMatchObject({ status: 403 })
  expect(fixture.fetch.mock.calls[0][0].params).toEqual({
    id: "page",
    comment: "comment",
  })
})
it("removes unreadable pages and foreign app saves from the favorite response", async () => {
  fixture.fetch.mockResolvedValue({
    status: 200,
    data: [
      {
        resource: {
          application: "task",
          resourceType: "page",
          resourceId: "page",
        },
        save: { metadata: { position: 2 }, createdAt: "now" },
      },
      {
        resource: {
          application: "task",
          resourceType: "page",
          resourceId: "private",
        },
        save: { createdAt: "now" },
      },
      {
        resource: {
          application: "social",
          resourceType: "page",
          resourceId: "foreign",
        },
        save: { createdAt: "now" },
      },
    ],
  })
  fixture.pages.mockResolvedValue([page])
  expect((await rawListFavorites(actor, "token")).data).toEqual([
    {
      workspaceId: "workspace",
      userId: actor.userId,
      pageId: "page",
      position: 2,
      createdAt: "now",
    },
  ])
})

it("maps network failures to service unavailability without exposing tokens", async () => {
  fixture.fetch.mockRejectedValue(new Error("network failed"))
  await expect(
    rawCreatePageComment(actor, "secret-token", {
      pageId: "page",
      workspaceId: "workspace",
      content: "hi",
    })
  ).rejects.toMatchObject({ status: 503, code: "resource_unavailable" })
})
