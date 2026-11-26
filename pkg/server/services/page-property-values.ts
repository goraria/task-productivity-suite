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
import { pagePropertyValuesTable } from "@/database/schema"

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
  },
  {
    readScope: (actor) =>
      workspaceScope(pagePropertyValuesTable.workspaceId, actor),
    read: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
    create: (payload, actor) =>
      assertWorkspaceAccess(getWorkspaceId(payload), actor),
    mutate: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
  }
)

export async function listPagePropertyValues(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getPagePropertyValue(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createPagePropertyValue(
  actor: CrudActor,
  input: unknown
) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function updatePagePropertyValue(
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
export async function deletePagePropertyValue(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
