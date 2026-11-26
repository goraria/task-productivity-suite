import {
  assertWorkspaceAccess,
  getWorkspaceId,
  workspaceScope,
} from "@/database/access"
import {
  createCrudRepository,
  crudKey,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { databasePropertiesTable } from "@/database/schema"

const repository = createCrudRepository(
  "database property",
  {
    table: databasePropertiesTable,
    keys: [crudKey("id", databasePropertiesTable.id)],
    createFields: [
      "workspaceId",
      "databaseId",
      "name",
      "type",
      "config",
      "position",
    ],
    updateFields: ["name", "type", "config", "position"],
    orderBy: databasePropertiesTable.updatedAt,
    touchUpdatedAt: true,
  },
  {
    readScope: (actor) =>
      workspaceScope(databasePropertiesTable.workspaceId, actor),
    read: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
    create: (payload, actor) =>
      assertWorkspaceAccess(getWorkspaceId(payload), actor),
    mutate: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
  }
)

export async function listDatabaseProperties(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getDatabaseProperty(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createDatabaseProperty(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function updateDatabaseProperty(
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
export async function deleteDatabaseProperty(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
