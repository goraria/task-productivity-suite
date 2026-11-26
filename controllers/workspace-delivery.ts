import { listQuerySchema } from "@/schemas/productivity"
import {
  rawRetryWorkspaceDelivery as retryWorkspaceDeliveryServices,
  rawWorkspaceDelivery as workspaceDeliveryServices,
} from "@/models/task-event-outbox"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import { z } from "@gorth-com/structure/cores/zod"
import type { Context } from "hono"
export async function actWorkspaceDelivery(context: Context<ApiEnv>) {
  const query = listQuerySchema.parse(context.req.query())
  return context.json(
    await workspaceDeliveryServices(
      await resolveActor(context),
      z.uuid().parse(context.req.param("id")),
      query.limit,
      query.offset
    ),
    200
  )
}
export async function actRetryWorkspaceDelivery(
  context: Context<ApiEnv>
) {
  return context.json(
    {
      data: await retryWorkspaceDeliveryServices(
        await resolveActor(context),
        z.uuid().parse(context.req.param("id")),
        z.uuid().parse(context.req.param("eventId"))
      ),
    },
    200
  )
}
