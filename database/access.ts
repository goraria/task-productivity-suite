import { and, eq, or, sql, type SQL } from "drizzle-orm"
import type { AnyPgColumn } from "drizzle-orm/pg-core"
import { getDatabase } from "@/database"
import { CrudError, readString, type CrudActor } from "@/database/crud"
import { workspaceMembersTable, workspacesTable } from "@/database/schema"

export function workspaceScope(
  column: AnyPgColumn,
  actor: CrudActor
): SQL | undefined {
  if (actor.isAdmin) return undefined
  return sql`exists (
    select 1 from ${workspacesTable}
    left join ${workspaceMembersTable}
      on ${workspaceMembersTable.workspaceId} = ${workspacesTable.id}
      and ${workspaceMembersTable.userId} = ${actor.userId}
      and ${workspaceMembersTable.status} = 'active'
    where ${workspacesTable.id} = ${column}
      and (${workspacesTable.ownerId} = ${actor.userId} or ${workspaceMembersTable.userId} = ${actor.userId})
  )`
}

export function ownedWorkspaceScope(actor: CrudActor): SQL | undefined {
  if (actor.isAdmin) return undefined
  return or(
    eq(workspacesTable.ownerId, actor.userId),
    sql`exists (select 1 from ${workspaceMembersTable} where ${workspaceMembersTable.workspaceId} = ${workspacesTable.id} and ${workspaceMembersTable.userId} = ${actor.userId} and ${workspaceMembersTable.status} = 'active')`
  )
}

export async function assertWorkspaceAccess(
  workspaceId: string | null,
  actor: CrudActor
) {
  if (actor.isAdmin) return
  if (!workspaceId)
    throw new CrudError(400, "missing_workspace", "workspaceId is required")
  const [workspace] = await getDatabase()
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .leftJoin(
      workspaceMembersTable,
      and(
        eq(workspaceMembersTable.workspaceId, workspacesTable.id),
        eq(workspaceMembersTable.userId, actor.userId),
        eq(workspaceMembersTable.status, "active")
      )
    )
    .where(
      and(
        eq(workspacesTable.id, workspaceId),
        or(
          eq(workspacesTable.ownerId, actor.userId),
          eq(workspaceMembersTable.userId, actor.userId)
        )
      )
    )
    .limit(1)
  if (!workspace)
    throw new CrudError(
      403,
      "workspace_forbidden",
      "Workspace access is required"
    )
}

export async function assertWorkspaceOwner(
  workspaceId: string | null,
  actor: CrudActor
) {
  if (actor.isAdmin) return
  if (!workspaceId)
    throw new CrudError(400, "missing_workspace", "workspaceId is required")
  const [workspace] = await getDatabase()
    .select({ id: workspacesTable.id })
    .from(workspacesTable)
    .where(
      and(
        eq(workspacesTable.id, workspaceId),
        eq(workspacesTable.ownerId, actor.userId)
      )
    )
    .limit(1)
  if (!workspace)
    throw new CrudError(
      403,
      "workspace_owner_required",
      "Workspace owner access is required"
    )
}

export function getWorkspaceId(record: Record<string, unknown>) {
  return readString(record, "workspaceId")
}

export function assignActor(
  record: Record<string, unknown>,
  field: string,
  actor: CrudActor
) {
  record[field] = actor.userId
}
