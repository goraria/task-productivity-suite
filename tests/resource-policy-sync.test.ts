import { resourcePolicyGrantsQuery } from "@/schemas/resource-policy-sync"
import { rawDispatchResourcePolicy } from "@/models/resource-policy-outbox"
import type { SQL } from "drizzle-orm"
import { PgDialect } from "drizzle-orm/pg-core"
import { beforeEach, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({
  execute: vi.fn(),
  transaction: vi.fn(),
  fetcher: vi.fn(),
  token: vi.fn(),
  origin: "https://resource.example.test",
  grants: [] as { pageId: string; subject: string; comment: boolean }[],
}))
vi.mock("@/database", () => ({
  getDatabase: () => ({
    execute: fixture.execute,
    transaction: fixture.transaction,
  }),
}))
vi.mock("@/utils/environment", () => ({
  get oauthResourceAudience() {
    return fixture.origin
  },
}))
vi.mock("@/utils/fetcher", () => ({ fetcher: fixture.fetcher }))
vi.mock("@/services/platform-client", () => ({
  rawGetBackendAccessToken: fixture.token,
}))
const dialect = new PgDialect()
beforeEach(() => {
  vi.resetAllMocks()
  fixture.token.mockResolvedValue("native-machine-token")
  fixture.origin = "https://resource.example.test"
  fixture.grants = [
    {
      pageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      subject: "central-subject",
      comment: true,
    },
  ]
  fixture.execute.mockResolvedValue([{ id: "task" }])
  fixture.transaction.mockImplementation(
    async (operation) =>
      await operation({
        select: () => ({
          from: async () => [
            {
              epoch: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              revision: 5n,
            },
          ],
        }),
        execute: async (query: SQL) =>
          dialect.sqlToQuery(query).sql.includes("extract(epoch")
            ? [{ issuedAt: String(Date.now()) }]
            : fixture.grants,
      })
  )
  fixture.fetcher.mockResolvedValue({ status: 200, data: { accepted: true } })
})
it("captures one consistent snapshot, uses OAuth and ACKs only after delivery", async () => {
  expect(await rawDispatchResourcePolicy()).toEqual({
    dispatched: true,
    revision: "5",
  })
  expect(fixture.transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  })
  const input = fixture.fetcher.mock.calls[0]![0]
  expect(input.url.href).toBe(
    "https://resource.example.test/resource/policy/task/snapshot"
  )
  const event = JSON.parse(input.body)
  expect(event).toMatchObject({
    source: "task",
    type: "snapshot",
    revision: "5",
    grants: fixture.grants,
  })
  expect(event.expiresAt - event.issuedAt).toBe(120_000)
  expect(input.headers.Authorization).toBe("Bearer native-machine-token")
  expect(fixture.token).toHaveBeenCalledWith("resource")
  expect(input.redirect).toBe("error")
  const claim = dialect.sqlToQuery(fixture.execute.mock.calls[0]![0])
  const ack = dialect.sqlToQuery(fixture.execute.mock.calls[1]![0])
  expect(claim.sql).toContain("dispatch_until <= clock_timestamp()")
  expect(ack.sql).toContain("greatest(delivered_revision")
  expect(ack.params).toContain(claim.params[0]) // Same ownership fence.
})
it("coalesces concurrent workers with a durable DB lease", async () => {
  fixture.execute.mockResolvedValueOnce([])
  expect(await rawDispatchResourcePolicy()).toEqual({
    dispatched: false,
    busy: true,
  })
  expect(fixture.fetcher).not.toHaveBeenCalled()
  expect(fixture.transaction).not.toHaveBeenCalled()
})
it("keeps changes pending on failed/lost delivery and successfully retries with a fresh snapshot", async () => {
  fixture.fetcher.mockRejectedValueOnce(
    new Error("Private provider diagnostic")
  )
  await expect(rawDispatchResourcePolicy()).rejects.toMatchObject({
    code: "policy_delivery_failed",
  })
  const failed = dialect.sqlToQuery(fixture.execute.mock.calls[1]![0])
  expect(failed.sql).not.toContain("delivered_revision")
  expect(failed.sql).toContain("last_error = 'policy_delivery_failed'")
  await expect(rawDispatchResourcePolicy()).resolves.toMatchObject({
    dispatched: true,
  })
  expect(fixture.fetcher).toHaveBeenCalledTimes(2)
})
it("sends empty snapshots to remove every prior grant", async () => {
  fixture.grants = []
  await rawDispatchResourcePolicy()
  expect(JSON.parse(fixture.fetcher.mock.calls[0]![0].body).grants).toEqual([])
})

it("reports missing/uninitialized outbox instead of a misleading busy worker", async () => {
  fixture.execute.mockResolvedValueOnce([]).mockResolvedValueOnce([])
  await expect(rawDispatchResourcePolicy()).rejects.toMatchObject({
    code: "policy_outbox_unavailable",
  })
  expect(fixture.fetcher).not.toHaveBeenCalled()
})
it("never silently truncates a snapshot at the capacity limit", async () => {
  fixture.grants = Array.from({ length: 20_001 }, () => fixture.grants[0]!)
  await expect(rawDispatchResourcePolicy()).rejects.toMatchObject({
    code: "policy_delivery_failed",
  })
  expect(fixture.fetcher).not.toHaveBeenCalled()
})
it("requires a fixed trusted Resource origin before requesting a native grant", async () => {
  fixture.origin = ""
  await expect(rawDispatchResourcePolicy()).rejects.toMatchObject({
    code: "policy_dispatch_not_configured",
  })
  fixture.origin = "http://untrusted.example.test"
  await expect(rawDispatchResourcePolicy()).rejects.toMatchObject({
    code: "invalid_policy_destination",
  })
  expect(fixture.execute).not.toHaveBeenCalled()
  expect(fixture.token).not.toHaveBeenCalled()
})
it("does not ACK if OAuth issuance fails", async () => {
  fixture.token.mockRejectedValue(new Error("private issuer diagnostic"))
  await expect(rawDispatchResourcePolicy()).rejects.toMatchObject({
    code: "policy_delivery_failed",
  })
  expect(fixture.fetcher).not.toHaveBeenCalled()
})
it("selects effective grants from Task ACLs, with status/archive checks and SSO-sub binding", () => {
  const query = dialect.sqlToQuery(resourcePolicyGrantsQuery).sql
  for (const fragment of [
    "u.external_user_id",
    "p.is_archived = false",
    "u.deleted_at is null",
    "u.ban_expires",
    "w.owner_id = u.id",
    "m.status = 'active'",
    "m.role in ('owner','admin')",
    "m.role = 'member'",
    "with recursive ancestors",
    "policy_page.id = p.id",
    "g.subject_type = 'user'",
    "g.level when 'full_access' then 4 when 'edit' then 3 when 'comment' then 2",
  ])
    expect(query).toContain(fragment)
})
