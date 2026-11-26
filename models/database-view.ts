import { assignActor } from "@/database/access"
import { databaseScope } from "@/database/authorization"
import {
  createCrudRepository,
  crudKey,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { databaseViewsTable } from "@/database/schema"
import { rawAssertTargetAccess, rawValidateReferences } from "@/models/index"

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
    filters: ["workspaceId", "pageId", "databaseId"],
  },
  {
    readScope: (actor) => databaseScope(databaseViewsTable.databaseId, actor),
    writeScope: (actor) =>
      databaseScope(databaseViewsTable.databaseId, actor, "edit"),
    read: (row, actor) => rawAssertTargetAccess(row, actor, "view"),
    create: async (payload, actor) => {
      await rawAssertTargetAccess(payload, actor, "edit")
      await rawValidateReferences(payload, actor)
      assignActor(payload, "createdById", actor)
    },
    mutate: (row, actor) => rawAssertTargetAccess(row, actor, "edit"),
    prepareUpdate: async (payload, row, actor) => {
      await rawValidateReferences(
        { ...row, ...payload },
        actor,
        "edit",
        String(row.id)
      )
    },
  }
)

export async function rawListDatabaseViews(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function rawGetDatabaseView(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function rawCreateDatabaseView(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function rawUpdateDatabaseView(
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
export async function rawDeleteDatabaseView(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
