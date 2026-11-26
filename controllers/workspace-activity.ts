import { listQuerySchema } from "@/schemas/productivity"
import { workspaceIdSchema } from "@/schemas/workspace-membership"
import { rawWorkspaceActivity as workspaceActivityServices } from "@/services/workspace-activity"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actWorkspaceActivity(context: Context<ApiEnv>) {
  const query = listQuerySchema.parse(context.req.query())
  return context.json(
    await workspaceActivityServices(
      await resolveActor(context),
      workspaceIdSchema.parse(context.req.param("id")),
      query.limit,
      query.offset
    ),
    200
  )
}
