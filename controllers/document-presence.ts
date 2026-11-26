import type { Context } from "hono"
import { z } from "@gorth-com/structure/cores/zod"
import type { ApiEnv } from "@/utils/interface"
import { resolveActor } from "@/utils/controller"
import { rawDocumentPresence as documentPresenceServices } from "@/models/document-presence"
export async function actDocumentPresence(context: Context<ApiEnv>) {
  return context.json(
    {
      data: await documentPresenceServices(
        await resolveActor(context),
        z.uuid().parse(context.req.param("id"))
      ),
    },
    200
  )
}
