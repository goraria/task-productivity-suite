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
import { pagesTable } from "@/database/schema"

const repository = createCrudRepository(
  "page",
  {
    table: pagesTable,
    keys: [crudKey("id", pagesTable.id)],
    createFields: [
      "workspaceId",
      "parentPageId",
      "databaseId",
      "createdById",
      "updatedById",
      "title",
      "icon",
      "cover",
      "position",
      "isArchived",
      "isPublished",
      "publishedAt",
    ],
    updateFields: [
      "parentPageId",
      "databaseId",
      "updatedById",
      "title",
      "icon",
      "cover",
      "position",
      "isArchived",
      "isPublished",
      "publishedAt",
    ],
    dateFields: ["publishedAt"],
    orderBy: pagesTable.updatedAt,
    touchUpdatedAt: true,
  },
  {
    readScope: (actor) => workspaceScope(pagesTable.workspaceId, actor),
    read: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
    create: async (payload, actor) => {
      await assertWorkspaceAccess(getWorkspaceId(payload), actor)
      assignActor(payload, "createdById", actor)
      assignActor(payload, "updatedById", actor)
    },
    mutate: async (row, actor) => {
      await assertWorkspaceAccess(getWorkspaceId(row), actor)
    },
  }
)

export async function listPages(actor: CrudActor, options?: CrudListOptions) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getPage(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createPage(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function updatePage(
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
export async function deletePage(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
