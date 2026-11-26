import { getDatabase } from "@/database"
import { assertAccess, pageScope, workspaceLevel } from "@/database/authorization"
import { CrudError, type CrudActor, createCrudRepository, crudKey, type CrudListOptions } from "@/database/crud"
import { filesTable } from "@/database/schema"
import { type documentUploadSchema, safeUrlSchema } from "@/schemas/productivity"
import { rawRequirePageById } from "@/models/page"
import { rawAssertTargetAccess, rawValidateReferences } from "@/models/index"
import { rawPlatformRequest } from "@/services/platform-client"
import { type z } from "@gorth-com/structure/cores/zod"
import { and, eq, sql } from "drizzle-orm"
import "server-only"
import { assignActor } from "@/database/access"

export async function rawCreateDocumentUpload(
  actor: CrudActor,
  token: string,
  pageId: string,
  input: z.infer<typeof documentUploadSchema>
) {
  await assertAccess("page", pageId, actor, "edit")
  const result = await rawPlatformRequest<{
    asset: { id: string }
    upload: {
      id: string
      url: string
      method: string
      headers: Record<string, string>
    }
  }>(
    "media",
    "/media/upload",
    "POST",
    {
      ...input,
      type: "attachment",
      visibility: "private",
      resourceType: "page",
      resourceId: pageId,
      multipart: false,
    },
    token
  )
  return { assetId: result.asset.id, upload: result.upload }
}
export async function rawAttachDocumentAsset(
  actor: CrudActor,
  token: string,
  pageId: string,
  assetId: string
) {
  await assertAccess("page", pageId, actor, "edit")
  const page = await rawRequirePageById(pageId)
  const asset = await rawPlatformRequest<{
    id: string
    application: string
    resourceType: string
    resourceId: string
    status: string
    originalFilename: string
    mimeType: string
    bytes: number
  }>("media", `/media/asset/${assetId}`, "GET", undefined, token)
  if (
    asset.application !== "task" ||
    asset.resourceType !== "page" ||
    asset.resourceId !== pageId ||
    asset.status !== "ready"
  )
    throw new CrudError(
      400,
      "invalid_attachment",
      "Upload must be ready and belong to this page"
    )
  return getDatabase().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`attachment:${pageId}:${asset.id}`},0))`
    )
    const [existing] = await tx
      .select()
      .from(filesTable)
      .where(
        and(eq(filesTable.pageId, pageId), eq(filesTable.storageKey, asset.id))
      )
      .limit(1)
    if (existing) return existing
    const [binding] = await tx
      .insert(filesTable)
      .values({
        workspaceId: page.workspaceId,
        pageId,
        uploadedById: actor.userId,
        name: asset.originalFilename,
        mimeType: asset.mimeType,
        size: asset.bytes,
        storageKey: asset.id,
        url: `/internal/task/document/${pageId}/attachment/${asset.id}`,
        metadata: { mediaAssetId: asset.id },
      })
      .returning()
    return binding
  })
}
export async function rawGetDocumentAssetUrl(
  actor: CrudActor,
  pageId: string,
  assetId: string
) {
  await assertAccess("page", pageId, actor)
  const [binding] = await getDatabase()
    .select({ id: filesTable.id })
    .from(filesTable)
    .where(
      and(eq(filesTable.pageId, pageId), eq(filesTable.storageKey, assetId))
    )
    .limit(1)
  if (!binding)
    throw new CrudError(404, "attachment_not_found", "Attachment not found")
  return rawPlatformRequest<{ url: string }>(
    "media",
    "/media/task/asset-url",
    "POST",
    { assetId, pageId }
  )
}

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
    filters: ["workspaceId", "pageId", "databaseId"],
  },
  {
    readScope: (actor) =>
      sql`(${filesTable.pageId} is not null and ${pageScope(filesTable.pageId, actor)}) or (${filesTable.pageId} is null and ${workspaceLevel(filesTable.workspaceId, actor)} >= 1)`,
    writeScope: (actor) =>
      sql`(${filesTable.pageId} is not null and ${pageScope(filesTable.pageId, actor, "edit")}) or (${filesTable.pageId} is null and ${workspaceLevel(filesTable.workspaceId, actor)} >= 3)`,
    read: (row, actor) => rawAssertTargetAccess(row, actor, "view"),
    create: async (payload, actor) => {
      await rawAssertTargetAccess(payload, actor, "edit")
      await rawValidateReferences(payload, actor)
      safeUrlSchema.parse(payload.url)
      assignActor(payload, "uploadedById", actor)
    },
    mutate: (row, actor) => rawAssertTargetAccess(row, actor, "edit"),
    prepareUpdate: async (payload, row, actor) => {
      await rawValidateReferences(
        { ...row, ...payload },
        actor,
        "edit",
        String(row.id)
      )
      if (payload.url) safeUrlSchema.parse(payload.url)
    },
  }
)

export async function rawListFiles(actor: CrudActor, options?: CrudListOptions) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function rawGetFile(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function rawCreateFile(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function rawUpdateFile(
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
export async function rawDeleteFile(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
