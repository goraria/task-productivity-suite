import { beforeEach, expect, it, vi } from "vitest"
const state = vi.hoisted(() => ({ run: vi.fn(), send: vi.fn(), policy: vi.fn() }))
vi.mock("@vercel/queue", () => ({
  QueueClient: class {
    send = state.send
    handleCallback = (handler: unknown) => handler
  },
  registerDevConsumer: vi.fn(),
}))
vi.mock("@/models/task-event-outbox", () => ({ rawDispatchTaskEvents: state.run }))
vi.mock("@/models/resource-policy-outbox", () => ({ rawDispatchResourcePolicy: state.policy }))
import { rawProcessBackgroundJob } from "@/services/background"
beforeEach(() => {
  state.run.mockReset().mockResolvedValue({"claimed":0,"delivered":0,"failed":0})
  state.send.mockReset().mockResolvedValue({ messageId: "fixture" })
  state.policy.mockReset().mockResolvedValue({ dispatched: true })
})
it("rejects an unknown queue payload before accessing domain state", async () => {
  await expect(rawProcessBackgroundJob({ kind: "execute-arbitrary" })).rejects.toThrow("Invalid background job")
  expect(state.run).not.toHaveBeenCalled()
})
it("drains durable work without calling its own HTTP/OAuth endpoint", async () => {
  await rawProcessBackgroundJob({ kind: "drain" })
  expect(state.run).toHaveBeenCalledTimes(1)
  expect(state.run).toHaveBeenCalledWith()
})
it("propagates storage failure so the native Queue consumer retries", async () => {
  state.run.mockRejectedValueOnce(new Error("fixture storage offline"))
  await expect(rawProcessBackgroundJob({ kind: "drain" })).rejects.toThrow("fixture storage offline")
})
it("does not acknowledge a domain delivery that was deferred for retry", async () => {
  state.run.mockResolvedValueOnce({"claimed":1,"failed":1})
  await expect(rawProcessBackgroundJob({ kind: "drain" })).rejects.toThrow("Background delivery deferred")
})
