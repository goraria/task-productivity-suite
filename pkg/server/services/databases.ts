import {
  assertWorkspaceAccess,
  assignActor,
  getWorkspaceId,
  workspaceScope,
} from "@/database/access"
import {
  createCrudRepository,
  crudKey,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { databasesTable } from "@/database/schema"

const repository = createCrudRepository(
  "database",
  {
    table: databasesTable,
    keys: [crudKey("id", databasesTable.id)],
    createFields: [
      "workspaceId",
      "createdById",
      "title",
      "description",
      "icon",
      "cover",
      "isArchived",
    ],
    updateFields: ["title", "description", "icon", "cover", "isArchived"],
    orderBy: databasesTable.updatedAt,
    touchUpdatedAt: true,
  },
  {
    readScope: (actor) => workspaceScope(databasesTable.workspaceId, actor),
    read: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
    create: async (payload, actor) => {
      await assertWorkspaceAccess(getWorkspaceId(payload), actor)
      assignActor(payload, "createdById", actor)
    },
    mutate: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
  }
)

export async function listDatabases(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getDatabase(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createDatabase(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function updateDatabase(
  actor: CrudActor,
  params: Record<string, string | undefined>,
  input: unknown
) {
  try {
    return await repository.update(actor, params, input)
  } catch (error) {
    throw error
  }
}
export async function deleteDatabase(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
