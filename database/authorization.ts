import { getDatabase } from "@/database"
import { CrudError } from "@/database/crud"
import { sql, type SQL } from "drizzle-orm"
import type { AnyPgColumn } from "drizzle-orm/pg-core"

interface PolicyActor {
  userId: string | SQL
  isAdmin: boolean
}

export type AccessAction = "view" | "comment" | "edit" | "manage"
const requiredLevel = { view: 1, comment: 2, edit: 3, manage: 4 } as const

// One policy for list, detail, writes and Resource snapshots. A suspended member
// cannot regain access through a stale grant. Restricted documents require explicit grants even after the last grant is revoked; every restricted ancestor must permit access as well.
export function workspaceLevel(
  workspace: SQL | AnyPgColumn,
  actor: PolicyActor
): SQL {
  if (actor.isAdmin) return sql`4`
  return sql`coalesce((select case when w.owner_id = ${actor.userId} then 4
    when m.role in ('owner','admin') then 4 when m.role = 'member' then 3 else 1 end
    from workspace w left join workspace_member m on m.workspace_id = w.id
      and m.user_id = ${actor.userId}::uuid and m.status = 'active'
    where w.id = ${workspace} and (w.owner_id = ${actor.userId}::uuid or m.user_id is not null)), 0)`
}

function permissionLevel(
  page: SQL | null,
  database: SQL | null,
  workspace: SQL,
  actor: PolicyActor,
  published: SQL = sql`false`
) {
  const target = page
    ? sql`g.page_id = ${page}`
    : sql`g.database_id = ${database} and g.page_id is null`
  return sql`coalesce((select max(case when g.subject_type = 'public' then 1 else case g.level when 'full_access' then 4 when 'edit' then 3 when 'comment' then 2 else 1 end end)
    from permission g where ${target} and ((g.subject_type = 'user' and g.subject_id = ${actor.userId}::uuid)
      or (g.subject_type = 'workspace' and g.subject_id = ${workspace}) or (g.subject_type = 'public' and ${published}))),0)`
}

export function databaseLevel(id: SQL | AnyPgColumn, actor: PolicyActor): SQL {
  if (actor.isAdmin) return sql`4`
  const base = workspaceLevel(sql`d.workspace_id`, actor)
  const grants = permissionLevel(null, sql`d.id`, sql`d.workspace_id`, actor)
  return sql`coalesce((select case when ${base} = 0 then 0
    when ${base} = 4 or d.created_by_id = ${actor.userId}::uuid then 4
    when d.is_archived then 0 when d.access_mode = 'restricted' then ${grants}
    else greatest(${base},${grants}) end from "database" d where d.id = ${id}),0)`
}

export function pageLevel(id: SQL | AnyPgColumn, actor: PolicyActor): SQL {
  if (actor.isAdmin) return sql`4`
  const base = workspaceLevel(sql`a.workspace_id`, actor)
  const grants = permissionLevel(
    sql`a.id`,
    null,
    sql`a.workspace_id`,
    actor,
    sql`a.is_published`
  )
  return sql`coalesce((with recursive ancestors as (
    select policy_page.id, policy_page.workspace_id, policy_page.parent_page_id, policy_page.database_id, policy_page.created_by_id, policy_page.is_published, policy_page.is_archived, policy_page.access_mode, array[policy_page.id] as path
    from page policy_page where policy_page.id = ${id}
    union all select policy_page.id, policy_page.workspace_id, policy_page.parent_page_id, policy_page.database_id, policy_page.created_by_id, policy_page.is_published, policy_page.is_archived, policy_page.access_mode, a.path || policy_page.id
    from page policy_page join ancestors a on policy_page.id = a.parent_page_id
    where not policy_page.id = any(a.path)
  ) select min(case when ${base} = 0 then 0 when ${base} = 4 then 4
    when a.is_archived and a.created_by_id <> ${actor.userId}::uuid then 0
    else least(case when a.created_by_id = ${actor.userId}::uuid then 4
      when a.access_mode = 'restricted' then ${grants} else greatest(${base},${grants}) end,
      case when a.database_id is null then 4 else ${databaseLevel(sql`a.database_id`, actor)} end)
    end) from ancestors a),0)`
}

export function pageScope(
  id: SQL | AnyPgColumn,
  actor: PolicyActor,
  action: AccessAction = "view"
) {
  return sql`${pageLevel(id, actor)} >= ${requiredLevel[action]}`
}
export function databaseScope(
  id: SQL | AnyPgColumn,
  actor: PolicyActor,
  action: AccessAction = "view"
) {
  return sql`${databaseLevel(id, actor)} >= ${requiredLevel[action]}`
}

export async function getAccessLevel(
  kind: "workspace" | "page" | "database",
  id: string,
  actor: PolicyActor
) {
  const level =
    kind === "page"
      ? pageLevel(sql`${id}::uuid`, actor)
      : kind === "database"
        ? databaseLevel(sql`${id}::uuid`, actor)
        : workspaceLevel(sql`${id}::uuid`, actor)
  const [result] = await getDatabase().execute<{ level: number }>(
    sql`select ${level} as level`
  )
  return Number(result?.level ?? 0)
}
export async function assertAccess(
  kind: "workspace" | "page" | "database",
  id: string | null,
  actor: PolicyActor,
  action: AccessAction = "view"
) {
  if (!id)
    throw new CrudError(400, "missing_target", "An access target is required")
  if ((await getAccessLevel(kind, id, actor)) < requiredLevel[action])
    throw new CrudError(403, "access_forbidden", `${action} access is required`)
}
