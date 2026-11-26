import { assignActor } from "@/database/access"
import { pageScope } from "@/database/authorization"
import {
  createCrudRepository,
  crudKey,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { blocksTable } from "@/database/schema"
import { blockContentSchema, safeUrlSchema } from "@/schemas/productivity"
import { rawAssertTargetAccess, rawValidateReferences } from "@/models/index"

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
    filters: ["workspaceId", "pageId", "databaseId"],
    revisionKind: "block",
  },
  {
    readScope: (actor) => pageScope(blocksTable.pageId, actor),
    writeScope: (actor) => pageScope(blocksTable.pageId, actor, "edit"),
    read: (row, actor) => rawAssertTargetAccess(row, actor, "view"),
    create: async (payload, actor) => {
      await rawAssertTargetAccess(payload, actor, "edit")
      await rawValidateReferences(payload, actor)
      const content = blockContentSchema.parse(payload.content ?? {})
      if (content.url) safeUrlSchema.parse(content.url)
      assignActor(payload, "createdById", actor)
      assignActor(payload, "updatedById", actor)
    },
    mutate: (row, actor) => rawAssertTargetAccess(row, actor, "edit"),
    prepareUpdate: async (payload, row, actor) => {
      await rawValidateReferences(
        { ...row, ...payload },
        actor,
        "edit",
        String(row.id)
      )
      if (payload.content) {
        const content = blockContentSchema.parse(payload.content)
        if (content.url) safeUrlSchema.parse(content.url)
      }
    },
  }
)

export async function rawListBlocks(actor: CrudActor, options?: CrudListOptions) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function rawGetBlock(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function rawCreateBlock(actor: CrudActor, input: unknown) {
  try {
    return (await repository.create(
      actor,
      input
    )) as typeof blocksTable.$inferSelect
  } catch (error) {
    throw error
  }
}
export async function rawUpdateBlock(
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
export async function rawDeleteBlock(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    const row = await repository.get(actor, params)
    return await repository.update(actor, params, {
      isArchived: true,
      version: row.version,
    })
  } catch (error) {
    throw error
  }
}
