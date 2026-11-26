import { getDatabase } from "@/database"
import { pagesTable, workItemsTable, workspacesTable } from "@/database/schema"
import { workspaceSettingsSchema } from "@/schemas/automation"
import { rawUpdateIssue } from "@/models/work-item"
import { matchingAutomations } from "@/utils/automation"
import { eq } from "drizzle-orm"
import "server-only"
export async function rawApplyTaskAutomations(
  job: {
    id: string
    pageId: string | null
    workspaceId: string
    type: string
    payload: Record<string, unknown>
  },
  leaseToken: string
) {
  if (!job.pageId || !job.type.startsWith("issue.")) return
  const database = getDatabase()
  const [workspace] = await database
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, job.workspaceId))
    .limit(1)
  if (!workspace) return
  const settings = workspaceSettingsSchema.parse(workspace.settings)
  const trail = Array.isArray(job.payload.automationIds)
    ? job.payload.automationIds.filter(
        (id): id is string => typeof id === "string"
      )
    : []
  for (const rule of settings.automations ?? []) {
    const [issue] = await database
      .select()
      .from(workItemsTable)
      .where(eq(workItemsTable.pageId, job.pageId))
      .limit(1)
    const [page] = await database
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, job.pageId))
      .limit(1)
    if (
      !issue ||
      !page ||
      page.isArchived ||
      !matchingAutomations([rule], job.type, issue, trail).length
    )
      continue
    trail.push(rule.id)
    await rawUpdateIssue(
      { userId: workspace.ownerId, isAdmin: false },
      page.id,
      {
        version: page.version,
        ...(rule.action.kind === "assign"
          ? { assigneeId: rule.action.userId }
          : { status: rule.action.status }),
      },
      { automationIds: [...trail], sourceEventId: job.id, leaseToken }
    )
  }
}
