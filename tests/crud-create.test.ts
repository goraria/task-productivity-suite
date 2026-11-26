import { beforeEach, expect, it, vi } from "vitest"
const fixture = vi.hoisted(() => ({ database: vi.fn(), values: vi.fn() }))
vi.mock("@/database", () => ({ getDatabase: fixture.database }))
import { createCrudRepository, crudKey } from "@/database/crud"
import { workspacesTable } from "@/database/schema"
const actor = { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", isAdmin: false }
const repository = createCrudRepository(
  "workspace",
  {
    table: workspacesTable,
    keys: [crudKey("id", workspacesTable.id)],
    createFields: ["ownerId", "name", "slug"],
    updateFields: ["name"],
    orderBy: workspacesTable.updatedAt,
  },
  {
    create: (payload, actor) => {
      payload.ownerId = actor.userId
    },
  }
)
beforeEach(() => {
  vi.resetAllMocks()
  fixture.values.mockImplementation((value) => ({
    returning: async () => [value],
  }))
  fixture.database.mockReturnValue({
    insert: () => ({ values: fixture.values }),
  })
})
it("assigns required actor fields before validating an insert", async () => {
  await expect(
    repository.create(actor, { name: "Work", slug: "work" })
  ).resolves.toMatchObject({ ownerId: actor.userId })
})
it("overwrites a caller-supplied owner with the verified local actor", async () => {
  await expect(
    repository.create(actor, {
      name: "Work",
      slug: "work",
      ownerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    })
  ).resolves.toMatchObject({ ownerId: actor.userId })
})
it("still rejects missing business fields without writing", async () => {
  await expect(
    repository.create(actor, { slug: "work" })
  ).rejects.toMatchObject({ code: "invalid_body" })
  expect(fixture.values).not.toHaveBeenCalled()
})
