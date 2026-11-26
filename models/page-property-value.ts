import { pageScope } from "@/database/authorization"
import {
  createCrudRepository,
  crudKey,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { pagePropertyValuesTable } from "@/database/schema"
import { rawAssertTargetAccess, rawValidatePropertyPayload, rawValidateReferences } from "@/models/index"

const repository = createCrudRepository(
  "page property value",
  {
    table: pagePropertyValuesTable,
    keys: [
      crudKey("pageId", pagePropertyValuesTable.pageId),
      crudKey("propertyId", pagePropertyValuesTable.propertyId),
    ],
    createFields: ["workspaceId", "pageId", "propertyId", "value"],
    updateFields: ["value"],
    orderBy: pagePropertyValuesTable.updatedAt,
    touchUpdatedAt: true,
    filters: ["workspaceId", "pageId", "databaseId"],
  },
  {
    readScope: (actor) => pageScope(pagePropertyValuesTable.pageId, actor),
    writeScope: (actor) =>
      pageScope(pagePropertyValuesTable.pageId, actor, "edit"),
    read: (row, actor) => rawAssertTargetAccess(row, actor, "view"),
    create: async (payload, actor) => {
      await rawAssertTargetAccess(payload, actor, "edit")
      await rawValidateReferences(payload, actor)
      await rawValidatePropertyPayload(payload, actor)
    },
    mutate: (row, actor) => rawAssertTargetAccess(row, actor, "edit"),
    prepareUpdate: async (payload, row, actor) => {
      await rawValidateReferences(
        { ...row, ...payload },
        actor,
        "edit",
        String(row.id)
      )
      const draft = { ...row, ...payload }
      await rawValidatePropertyPayload(draft, actor)
      payload.value = draft.value
    },
  }
)

export async function rawListPagePropertyValues(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function rawGetPagePropertyValue(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function rawCreatePagePropertyValue(
  actor: CrudActor,
  input: unknown
) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function rawUpdatePagePropertyValue(
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
export async function rawDeletePagePropertyValue(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
