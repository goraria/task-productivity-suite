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
import { blocksTable } from "@/database/schema"

const repository = createCrudRepository(
  "block",
  {
    table: blocksTable,
    keys: [crudKey("id", blocksTable.id)],
    createFields: [
      "workspaceId",
      "pageId",
      "parentBlockId",
      "createdById",
      "updatedById",
      "type",
      "content",
      "position",
      "isArchived",
    ],
    updateFields: [
      "pageId",
      "parentBlockId",
      "updatedById",
      "type",
      "content",
      "position",
      "isArchived",
    ],
    orderBy: blocksTable.updatedAt,
    touchUpdatedAt: true,
  },
  {
    readScope: (actor) => workspaceScope(blocksTable.workspaceId, actor),
    read: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
    create: async (payload, actor) => {
      await assertWorkspaceAccess(getWorkspaceId(payload), actor)
      assignActor(payload, "createdById", actor)
      assignActor(payload, "updatedById", actor)
    },
    mutate: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
  }
)

export async function listBlocks(actor: CrudActor, options?: CrudListOptions) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getBlock(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createBlock(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function updateBlock(
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
export async function deleteBlock(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
