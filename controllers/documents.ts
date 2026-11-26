import {
  documentAccessModeSchema,
  importDocumentSchema,
  listQuerySchema,
  reorderBlockSchema,
  restoreRevisionSchema,
} from "@/schemas/productivity"
import {
  rawExportDocument as exportDocumentServices,
  rawImportDocument as importDocumentServices,
  rawListDocumentRevisions as listDocumentRevisionsServices,
  rawReorderDocumentBlocks as reorderDocumentBlocksServices,
  rawRestoreDocumentRevision as restoreDocumentRevisionServices,
  rawSetDocumentAccessMode as setDocumentAccessModeServices,
  rawSetDocumentPublication as setDocumentPublicationServices,
} from "@/models/document-revision"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import { z } from "@gorth-com/structure/cores/zod"
import type { Context } from "hono"

export async function actExportDocument(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await exportDocumentServices(
        await resolveActor(c),
        z.uuid().parse(c.req.param("id"))
      ),
    },
    200
  )
}
export async function actImportDocument(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await importDocumentServices(
        await resolveActor(c),
        importDocumentSchema.parse(await c.req.json())
      ),
    },
    201
  )
}
export async function actListDocumentRevisions(c: Context<ApiEnv>) {
  const query = listQuerySchema.parse(c.req.query())
  return c.json(
    {
      data: await listDocumentRevisionsServices(
        await resolveActor(c),
        z.uuid().parse(c.req.param("id")),
        query.limit,
        query.offset
      ),
    },
    200
  )
}
export async function actRestoreDocumentRevision(c: Context<ApiEnv>) {
  const input = restoreRevisionSchema.parse(await c.req.json())
  return c.json(
    {
      data: await restoreDocumentRevisionServices(
        await resolveActor(c),
        z.uuid().parse(c.req.param("id")),
        input.revisionId,
        input.version
      ),
    },
    200
  )
}
export async function actReorderDocumentBlocks(c: Context<ApiEnv>) {
  const input = reorderBlockSchema.parse(await c.req.json())
  return c.json(
    {
      data: await reorderDocumentBlocksServices(
        await resolveActor(c),
        z.uuid().parse(c.req.param("id")),
        input.ids
      ),
    },
    200
  )
}
export async function actSetDocumentPublication(c: Context<ApiEnv>) {
  const input = z.object({ published: z.boolean() }).parse(await c.req.json())
  return c.json(
    {
      data: await setDocumentPublicationServices(
        await resolveActor(c),
        z.uuid().parse(c.req.param("id")),
        input.published
      ),
    },
    200
  )
}
export async function actSetDocumentAccessMode(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await setDocumentAccessModeServices(
        await resolveActor(c),
        z.uuid().parse(c.req.param("id")),
        documentAccessModeSchema.parse(await c.req.json()).mode
      ),
    },
    200
  )
}
