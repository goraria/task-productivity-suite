import { assignActor, getWorkspaceId } from "@/database/access"
import {
  assertAccess,
  databaseScope,
  getAccessLevel,
} from "@/database/authorization"
import {
  createCrudRepository,
  crudKey,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { databasesTable } from "@/database/schema"
import { rawAssertTargetAccess, rawValidateReferences } from "@/models/index"

const repository = createCrudRepository(
  "database",
  {
    table: databasesTable,
    keys: [crudKey("id", databasesTable.id)],
    createFields: [
      "workspaceId",
      "createdById",
      "title",
      "accessMode",
      "description",
      "icon",
      "cover",
      "isArchived",
    ],
    updateFields: [
      "title",
      "description",
      "icon",
      "cover",
      "isArchived",
      "accessMode",
    ],
    orderBy: databasesTable.updatedAt,
    touchUpdatedAt: true,
    filters: ["workspaceId", "pageId", "databaseId", "isArchived"],
    searchField: "title",
  },
  {
    readScope: (actor) => databaseScope(databasesTable.id, actor),
    writeScope: (actor) => databaseScope(databasesTable.id, actor, "edit"),
    read: (row, actor) => rawAssertTargetAccess(row, actor, "view", "database"),
    create: async (payload, actor) => {
      await assertAccess("workspace", getWorkspaceId(payload), actor, "edit")
      await rawValidateReferences(payload, actor)
      assignActor(payload, "createdById", actor)
    },
    mutate: (row, actor) => rawAssertTargetAccess(row, actor, "edit", "database"),
    prepareUpdate: async (payload, row, actor) => {
      await rawValidateReferences(
        { ...row, ...payload },
        actor,
        "edit",
        String(row.id)
      )
      if (payload.accessMode !== undefined)
        await rawAssertTargetAccess(row, actor, "manage", "database")
    },
  }
)

export async function rawListDatabases(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, { isArchived: false, ...options })
  } catch (error) {
    throw error
  }
}
export async function rawGetDatabase(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    const database = await repository.get(actor, params)
    return {
      ...database,
      accessLevel: await getAccessLevel("database", String(database.id), actor),
    }
  } catch (error) {
    throw error
  }
}
export async function rawCreateDatabase(actor: CrudActor, input: unknown) {
  try {
    return (await repository.create(
      actor,
      input
    )) as typeof databasesTable.$inferSelect
  } catch (error) {
    throw error
  }
}
export async function rawUpdateDatabase(
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
export async function rawDeleteDatabase(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.update(actor, params, { isArchived: true })
  } catch (error) {
    throw error
  }
}
