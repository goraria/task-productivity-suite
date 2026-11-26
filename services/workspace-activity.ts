import { assertAccess } from "@/database/authorization"
import type { CrudActor } from "@/database/crud"
import { rawPlatformRequest } from "@/services/platform-client"
import "server-only"
export async function rawWorkspaceActivity(
  actor: CrudActor,
  workspaceId: string,
  limit: number,
  offset: number
) {
  await assertAccess("workspace", workspaceId, actor, "manage")
  return rawPlatformRequest<{
    data: { id: string; action: string; outcome: string; occurredAt: string }[]
    pagination: { hasMore: boolean }
  }>("insight", "/insight/task/activity", "POST", {
    workspaceId,
    limit,
    offset,
  })
}
