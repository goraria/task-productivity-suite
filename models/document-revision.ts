import { getDatabase } from "@/database"
import { assertAccess } from "@/database/authorization"
import { CrudError, type CrudActor } from "@/database/crud"
import {
  blocksTable,
  documentRevisionsTable,
  pagesTable,
  permissionsTable,
} from "@/database/schema"
import {
  safeUrlSchema,
  type importDocumentSchema,
} from "@/schemas/productivity"
import { rawUpdateBlock } from "@/models/block"
import { rawRequirePageById } from "@/models/page"
import { rawUpdatePage } from "@/models/page"
import type { z } from "@gorth-com/structure/cores/zod"
import { and, desc, eq, sql } from "drizzle-orm"
import "server-only"

export async function rawExportDocument(actor: CrudActor, id: string) {
  await assertAccess("page", id, actor)
  const page = await rawRequirePageById(id)
  const blocks = await getDatabase()
    .select()
    .from(blocksTable)
    .where(and(eq(blocksTable.pageId, id), eq(blocksTable.isArchived, false)))
    .orderBy(blocksTable.position, blocksTable.id)
  return {
    format: "gorth-document",
    schemaVersion: 1,
    title: page.title,
    blocks: blocks.map((block) => ({
      type: block.type,
      content: block.content,
    })),
  }
}

export async function rawImportDocument(
  actor: CrudActor,
  input: z.infer<typeof importDocumentSchema>
) {
  await assertAccess("workspace", input.workspaceId, actor, "edit")
  for (const block of input.blocks)
    if (block.content.url) safeUrlSchema.parse(block.content.url)
  return getDatabase().transaction(async (tx) => {
    const [page] = await tx
      .insert(pagesTable)
      .values({
        workspaceId: input.workspaceId,
        createdById: actor.userId,
        updatedById: actor.userId,
        title: input.title,
      })
      .returning()
    if (!page) throw new CrudError(500, "import_failed", "Import failed")
    if (input.blocks.length)
      await tx.insert(blocksTable).values(
        input.blocks.map((block, position) => ({
          ...block,
          pageId: page.id,
          workspaceId: page.workspaceId,
          createdById: actor.userId,
          updatedById: actor.userId,
          position,
        }))
      )
    return page
  })
}

export async function rawListDocumentRevisions(
  actor: CrudActor,
  id: string,
  limit: number,
  offset: number
) {
  await assertAccess("page", id, actor)
  return getDatabase()
    .select()
    .from(documentRevisionsTable)
    .where(eq(documentRevisionsTable.pageId, id))
    .orderBy(desc(documentRevisionsTable.createdAt), documentRevisionsTable.id)
    .limit(limit)
    .offset(offset)
}

export async function rawRestoreDocumentRevision(
  actor: CrudActor,
  id: string,
  revisionId: string,
  version: number
) {
  await assertAccess("page", id, actor, "edit")
  const [revision] = await getDatabase()
    .select()
    .from(documentRevisionsTable)
    .where(
      and(
        eq(documentRevisionsTable.id, revisionId),
        eq(documentRevisionsTable.pageId, id)
      )
    )
    .limit(1)
  if (!revision)
    throw new CrudError(404, "revision_not_found", "Revision not found")
  const snapshot = revision.snapshot
  if (revision.entityType === "page") {
    return rawUpdatePage(
      actor,
      { id },
      {
        version,
        title: snapshot.title,
        icon: snapshot.icon,
        cover: snapshot.cover,
        position: snapshot.position,
      }
    )
  }
  return rawUpdateBlock(
    actor,
    { id: revision.entityId },
    {
      version,
      content: snapshot.content,
      type: snapshot.type,
      position: snapshot.position,
      isArchived: false,
    }
  )
}

export async function rawReorderDocumentBlocks(
  actor: CrudActor,
  id: string,
  ids: string[]
) {
  await assertAccess("page", id, actor, "edit")
  if (new Set(ids).size !== ids.length)
    throw new CrudError(400, "duplicate_block", "Each block must appear once")
  return getDatabase().transaction(async (tx) => {
    // Same page lock serializes all reorders. Content updates use their own version locks.
    await tx
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, id))
      .for("update")
    const blocks = await tx
      .select()
      .from(blocksTable)
      .where(and(eq(blocksTable.pageId, id), eq(blocksTable.isArchived, false)))
      .for("update")
    if (
      blocks.length !== ids.length ||
      ids.some((key) => !blocks.some((block) => block.id === key))
    )
      throw new CrudError(
        409,
        "reorder_conflict",
        "Reload the full block list before reordering"
      )
    for (const [position, blockId] of ids.entries())
      await tx
        .update(blocksTable)
        .set({
          position,
          version: blocks.find((block) => block.id === blockId)!.version + 1,
          updatedById: actor.userId,
          updatedAt: new Date(),
        })
        .where(eq(blocksTable.id, blockId))
    return { reordered: true }
  })
}

export async function rawSetDocumentPublication(
  actor: CrudActor,
  id: string,
  published: boolean
) {
  await assertAccess("page", id, actor, "manage")
  return getDatabase().transaction(async (tx) => {
    const [page] = await tx
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, id))
      .for("update")
    if (!page || page.isArchived)
      throw new CrudError(404, "page_not_found", "Page not found")
    await tx
      .insert(documentRevisionsTable)
      .values({
        pageId: page.id,
        entityId: page.id,
        entityType: "page",
        version: page.version,
        snapshot: page,
        createdById: actor.userId,
      })
      .onConflictDoNothing()
    await tx
      .delete(permissionsTable)
      .where(
        and(
          eq(permissionsTable.pageId, id),
          eq(permissionsTable.subjectType, "public")
        )
      )
    if (published)
      await tx.insert(permissionsTable).values({
        workspaceId: page.workspaceId,
        pageId: id,
        subjectType: "public",
        level: "view",
        createdById: actor.userId,
      })
    const [updated] = await tx
      .update(pagesTable)
      .set({
        isPublished: published,
        publishedAt: published ? new Date() : null,
        version: page.version + 1,
        updatedAt: new Date(),
        updatedById: actor.userId,
      })
      .where(eq(pagesTable.id, id))
      .returning()
    return updated
  })
}

export async function rawSetDocumentAccessMode(
  actor: CrudActor,
  id: string,
  mode: "workspace" | "restricted"
) {
  await assertAccess("page", id, actor, "manage")
  return getDatabase().transaction(async (tx) => {
    const [page] = await tx
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, id))
      .for("update")
    if (!page) throw new CrudError(404, "page_not_found", "Page not found")
    await tx
      .insert(documentRevisionsTable)
      .values({
        pageId: page.id,
        entityId: page.id,
        entityType: "page",
        version: page.version,
        snapshot: page,
        createdById: actor.userId,
      })
      .onConflictDoNothing()
    if (mode === "restricted")
      await tx
        .delete(permissionsTable)
        .where(
          and(
            eq(permissionsTable.pageId, id),
            eq(permissionsTable.subjectType, "public")
          )
        )
    const [updated] = await tx
      .update(pagesTable)
      .set({
        accessMode: mode,
        ...(mode === "restricted"
          ? { isPublished: false, publishedAt: null }
          : {}),
        version: page.version + 1,
        updatedAt: new Date(),
        updatedById: actor.userId,
      })
      .where(eq(pagesTable.id, id))
      .returning()
    return updated
  })
}

export async function rawGetPublishedDocument(id: string) {
  const [row] = await getDatabase()
    .select({ title: pagesTable.title, icon: pagesTable.icon })
    .from(pagesTable)
    .innerJoin(
      permissionsTable,
      and(
        eq(permissionsTable.pageId, pagesTable.id),
        eq(permissionsTable.subjectType, "public"),
        eq(permissionsTable.level, "view")
      )
    )
    .where(
      and(
        eq(pagesTable.id, id),
        eq(pagesTable.isPublished, true),
        eq(pagesTable.isArchived, false),
        sql`not exists(with recursive ancestors as (select ancestor.id, ancestor.parent_page_id, ancestor.is_archived from page ancestor where ancestor.id = ${pagesTable.id} union select ancestor.id, ancestor.parent_page_id, ancestor.is_archived from page ancestor join ancestors a on ancestor.id = a.parent_page_id) select 1 from ancestors where is_archived)`
      )
    )
    .limit(1)
  if (!row) throw new CrudError(404, "page_not_found", "Page not found")
  const blocks = await getDatabase()
    .select({
      id: blocksTable.id,
      type: blocksTable.type,
      content: blocksTable.content,
    })
    .from(blocksTable)
    .where(and(eq(blocksTable.pageId, id), eq(blocksTable.isArchived, false)))
    .orderBy(blocksTable.position, blocksTable.id)
  // No members, grants, author identifiers, revisions or private attachment URLs.
  return {
    ...row,
    blocks: blocks.filter(
      (block) => !["file", "image", "video"].includes(block.type)
    ),
  }
}
