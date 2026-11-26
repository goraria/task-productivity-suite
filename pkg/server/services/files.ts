import {
  assertWorkspaceAccess,
  assignActor,
  getWorkspaceId,
  workspaceScope,
} from "@/database/access"
import {
  createCrudRepository,
  crudKey,
  requireOwnedField,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { filesTable } from "@/database/schema"

const repository = createCrudRepository(
  "file",
  {
    table: filesTable,
    keys: [crudKey("id", filesTable.id)],
    createFields: [
      "workspaceId",
      "pageId",
      "blockId",
      "uploadedById",
      "name",
      "mimeType",
      "size",
      "url",
      "storageKey",
      "metadata",
    ],
    updateFields: [
      "pageId",
      "blockId",
      "name",
      "mimeType",
      "size",
      "url",
      "storageKey",
      "metadata",
    ],
    orderBy: filesTable.createdAt,
    touchUpdatedAt: true,
  },
  {
    readScope: (actor) => workspaceScope(filesTable.workspaceId, actor),
    read: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
    create: async (payload, actor) => {
      await assertWorkspaceAccess(getWorkspaceId(payload), actor)
      assignActor(payload, "uploadedById", actor)
    },
    mutate: async (row, actor) => {
      await assertWorkspaceAccess(getWorkspaceId(row), actor)
      if (!actor.isAdmin) requireOwnedField(row, "uploadedById", actor)
    },
  }
)

export async function listFiles(actor: CrudActor, options?: CrudListOptions) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getFile(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createFile(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function updateFile(
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
export async function deleteFile(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
