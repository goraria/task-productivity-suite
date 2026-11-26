import { Hono } from "hono"
import { beforeEach, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({ verify: vi.fn() }))
vi.mock("@/lib/backend-oauth", () => ({ verifyBackendRequest: fixture.verify }))
import { requireMediaStorageClient } from "@/middlewares/storage-credential"
const app = new Hono().post(
  "/credential",
  requireMediaStorageClient() as never,
  (c) => c.json({ allowed: true })
)
beforeEach(() => vi.resetAllMocks())
it("uses only the narrowly scoped native Media storage grant", async () => {
  expect(
    (
      await app.request("/credential", {
        method: "POST",
        headers: { Authorization: "Bearer machine" },
      })
    ).status
  ).toBe(200)
  expect(fixture.verify).toHaveBeenCalledWith(
    expect.any(Request),
    "storage:task:credential",
    "/internal/storage/credential",
    120
  )
})
it("does not execute the credential handler when machine authorization rejects", async () => {
  fixture.verify.mockRejectedValue(new Error("denied"))
  app.onError((_, c) => c.json({ denied: true }, 403))
  const response = await app.request("/credential", { method: "POST" })
  expect(response.status).toBe(403)
  expect(await response.json()).toEqual({ denied: true })
})
