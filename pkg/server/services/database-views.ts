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
import { databaseViewsTable } from "@/database/schema"

const repository = createCrudRepository(
  "database view",
  {
    table: databaseViewsTable,
    keys: [crudKey("id", databaseViewsTable.id)],
    createFields: [
      "workspaceId",
      "databaseId",
      "createdById",
      "name",
      "type",
      "config",
      "isDefault",
      "position",
    ],
    updateFields: ["name", "type", "config", "isDefault", "position"],
    orderBy: databaseViewsTable.updatedAt,
    touchUpdatedAt: true,
  },
  {
    readScope: (actor) => workspaceScope(databaseViewsTable.workspaceId, actor),
    read: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
    create: async (payload, actor) => {
      await assertWorkspaceAccess(getWorkspaceId(payload), actor)
      assignActor(payload, "createdById", actor)
    },
    mutate: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
  }
)

export async function listDatabaseViews(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getDatabaseView(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createDatabaseView(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function updateDatabaseView(
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
export async function deleteDatabaseView(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
