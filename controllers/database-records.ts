import { recordQuerySchema } from "@/schemas/productivity"
import { rawListDatabaseRecords as listDatabaseRecordsServices } from "@/models/page"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import { z } from "@gorth-com/structure/cores/zod"
import type { Context } from "hono"
export async function actListDatabaseRecords(context: Context<ApiEnv>) {
  return context.json(
    await listDatabaseRecordsServices(
      await resolveActor(context),
      z.uuid().parse(context.req.param("id")),
      recordQuerySchema.parse(context.req.query())
    ),
    200
  )
}
