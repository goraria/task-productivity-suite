import { beforeEach, expect, it, vi } from "vitest"
import { CrudError } from "@/database/crud"
const fixture = vi.hoisted(() => ({
  after: vi.fn(),
  dispatch: vi.fn(),
  verify: vi.fn(),
}))
vi.mock("next/server", () => ({ after: fixture.after }))
vi.mock("@/utils/environment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/environment")>()),
  appUrl: "https://task.test",
  rateLimitEnabled: false,
  oauthClientId: "existing-backend-client",
  oauthClientSecret: "fixture-secret",
}))
vi.mock("@/lib/backend-oauth", () => ({ verifyBackendRequest: fixture.verify }))
vi.mock("@/models/resource-policy-outbox", () => ({
  rawDispatchResourcePolicy: fixture.dispatch,
}))
import { scheduleResourcePolicyDispatch } from "@/lib/resource-policy-dispatch"
import { GET } from "@/app/(api)/task/resource-policy/dispatch/route"
beforeEach(() => {
  vi.resetAllMocks()
  fixture.dispatch.mockResolvedValue({ dispatched: true })
})
it.each(["workspace", "workspace-member", "permission", "page", "user"])(
  "schedules %s policy mutations after responding, not during the UI request",
  async (domain) => {
    scheduleResourcePolicyDispatch(
      new Request("https://task.test/internal/task/" + domain, { method: "PATCH" }),
      new Response(null)
    )
    expect(fixture.after).toHaveBeenCalledTimes(1)
    expect(fixture.dispatch).not.toHaveBeenCalled()
    await fixture.after.mock.calls[0]![0]()
    expect(fixture.dispatch).toHaveBeenCalledTimes(1)
  }
)
it("does not schedule reads, failed mutations, resource proxies or the worker itself", () => {
  for (const path of [
    "/internal/task/resource-policy/dispatch",
    "/internal/task/comment",
    "/internal/task/block",
  ])
    scheduleResourcePolicyDispatch(
      new Request("https://task.test" + path, { method: "POST" }),
      new Response(null)
    )
  scheduleResourcePolicyDispatch(
    new Request("https://task.test/internal/task/page"),
    new Response(null)
  )
  scheduleResourcePolicyDispatch(
    new Request("https://task.test/internal/task/page", { method: "PATCH" }),
    new Response(null, { status: 403 })
  )
  expect(fixture.after).not.toHaveBeenCalled()
})
it("schedules newly provisioned OAuth users without changing the Better Auth callback", () => {
  scheduleResourcePolicyDispatch(
    new Request("https://task.test/auth/callback/gorth"),
    new Response(null, { status: 302 })
  )
  expect(fixture.after).toHaveBeenCalledTimes(1)
})
it("leaves durable retry to the worker if an after-response push fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined)
  fixture.dispatch.mockRejectedValue(new Error("Fixture failure"))
  scheduleResourcePolicyDispatch(
    new Request("https://task.test/internal/task/page", { method: "PATCH" }),
    new Response(null)
  )
  await fixture.after.mock.calls[0]![0]()
  expect(console.error).toHaveBeenCalledWith(
    "[task-resource-policy] delivery pending; worker will retry"
  )
})
it("protects snapshot dispatch with the native machine policy instead of a static secret", async () => {
  const url = "https://task.test/task/resource-policy/dispatch"
  fixture.verify.mockRejectedValueOnce(
    new CrudError(403, "forbidden", "machine required")
  )
  expect(
    (
      await GET(new Request(url, {
        headers: { Cookie: "session=user" },
      }))
    ).status
  ).toBe(403)
  expect(fixture.dispatch).not.toHaveBeenCalled()
  fixture.verify.mockResolvedValue({ client_id: "existing-backend-client" })
  expect(
    (
      await GET(new Request(url, {
        headers: { Authorization: "Bearer short-lived-machine" },
      }))
    ).status
  ).toBe(200)
  expect(fixture.verify).toHaveBeenCalledWith(
    expect.any(Request),
    "task:dispatch"
  )
})
