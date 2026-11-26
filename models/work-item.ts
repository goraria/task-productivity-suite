import { getDatabase } from "@/database"
import { assertAccess, pageScope } from "@/database/authorization"
import { CrudError, type CrudActor } from "@/database/crud"
import {
  issueDependenciesTable,
  pagesTable,
  sprintsTable,
  taskEventsTable,
  userTable,
  workItemsTable,
  workspaceMembersTable,
  workspacesTable,
} from "@/database/schema"
import {
  canTransition,
  type IssueInput,
  type IssueUpdateInput,
  type SprintInput,
} from "@/schemas/work-management"
import { and, count, eq, ilike, isNull, lte, or, sql } from "drizzle-orm"
import "server-only"

async function checkIssueReferences(
  workspaceId: string,
  input: Partial<IssueInput>,
  database: Pick<ReturnType<typeof getDatabase>, "select"> = getDatabase()
) {
  if (input.sprintId) {
    const [sprint] = await database
      .select()
      .from(sprintsTable)
      .where(
        and(
          eq(sprintsTable.id, input.sprintId),
          eq(sprintsTable.workspaceId, workspaceId)
        )
      )
      .limit(1)
    if (!sprint || sprint.status === "completed")
      throw new CrudError(
        400,
        "invalid_sprint",
        "Choose an open sprint in this workspace"
      )
  }
  if (input.assigneeId) {
    const [user] = await database
      .select({ id: userTable.id })
      .from(userTable)
      .where(
        and(
          eq(userTable.id, input.assigneeId),
          eq(userTable.status, "active"),
          eq(userTable.ssoStatus, "active"),
          isNull(userTable.deletedAt),
          or(isNull(userTable.bannedAt), lte(userTable.banExpires, new Date()))
        )
      )
      .limit(1)
    if (!user)
      throw new CrudError(
        400,
        "invalid_assignee",
        "Assignee account is unavailable"
      )
    const [membership] = await database
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, input.assigneeId),
          eq(workspaceMembersTable.status, "active")
        )
      )
      .limit(1)
    const [owner] = await database
      .select()
      .from(workspacesTable)
      .where(
        and(
          eq(workspacesTable.id, workspaceId),
          eq(workspacesTable.ownerId, input.assigneeId)
        )
      )
      .limit(1)
    if (!membership && !owner)
      throw new CrudError(
        400,
        "invalid_assignee",
        "Assignee must be an active workspace member"
      )
  }
}

export async function rawCreateIssue(actor: CrudActor, input: IssueInput) {
  await assertAccess("workspace", input.workspaceId, actor, "edit")
  return getDatabase().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${input.workspaceId}, 0))`
    )
    await checkIssueReferences(input.workspaceId, input, tx)
    const [sequence] = await tx.execute<{ number: number }>(
      sql`select coalesce(max(number),0) + 1 as number from work_item where workspace_id = ${input.workspaceId}::uuid`
    )
    const { title, ...fields } = input
    const [page] = await tx
      .insert(pagesTable)
      .values({
        workspaceId: input.workspaceId,
        title,
        createdById: actor.userId,
        updatedById: actor.userId,
      })
      .returning()
    if (!page)
      throw new CrudError(
        500,
        "issue_create_failed",
        "Issue could not be created"
      )
    const [issue] = await tx
      .insert(workItemsTable)
      .values({
        ...fields,
        pageId: page.id,
        number: Number(sequence?.number ?? 1),
        completedAt: input.status === "done" ? new Date() : null,
      })
      .returning()
    await tx.insert(taskEventsTable).values({
      workspaceId: input.workspaceId,
      pageId: page.id,
      actorId: actor.userId,
      type: "issue.created",
      payload: { assigneeId: input.assigneeId ?? null },
    })
    return { ...issue, title: page.title, version: page.version }
  })
}

export async function rawListIssues(
  actor: CrudActor,
  workspaceId: string,
  limit: number,
  offset: number,
  options: { search?: string; status?: string } = {}
) {
  await assertAccess("workspace", workspaceId, actor)
  const where = and(
    eq(workItemsTable.workspaceId, workspaceId),
    eq(pagesTable.isArchived, false),
    pageScope(pagesTable.id, actor),
    options.search
      ? ilike(
          pagesTable.title,
          `%${options.search.replace(/[\\%_]/g, "\\$&")}%`
        )
      : undefined,
    options.status ? eq(workItemsTable.status, options.status) : undefined
  )
  const data = await getDatabase()
    .select({
      issue: workItemsTable,
      title: pagesTable.title,
      version: pagesTable.version,
    })
    .from(workItemsTable)
    .innerJoin(pagesTable, eq(pagesTable.id, workItemsTable.pageId))
    .where(where)
    .orderBy(workItemsTable.number)
    .limit(limit)
    .offset(offset)
  const [total] = await getDatabase()
    .select({ total: count() })
    .from(workItemsTable)
    .innerJoin(pagesTable, eq(pagesTable.id, workItemsTable.pageId))
    .where(where)
  return {
    data: data.map((row) => ({
      ...row.issue,
      title: row.title,
      version: row.version,
    })),
    pagination: { limit, offset, total: Number(total?.total ?? 0) },
  }
}

export async function rawUpdateIssue(
  actor: CrudActor,
  id: string,
  input: IssueUpdateInput,
  automation?: {
    automationIds: string[]
    sourceEventId: string
    leaseToken: string
  }
) {
  await assertAccess("page", id, actor, "edit")
  const [scope] = await getDatabase()
    .select({ workspaceId: pagesTable.workspaceId })
    .from(pagesTable)
    .where(eq(pagesTable.id, id))
    .limit(1)
  if (!scope) throw new CrudError(404, "issue_not_found", "Issue not found")
  return getDatabase().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${scope.workspaceId},0))`
    )
    const [page] = await tx
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.id, id))
      .for("update")
    const [issue] = await tx
      .select()
      .from(workItemsTable)
      .where(eq(workItemsTable.pageId, id))
      .for("update")
    if (!issue || !page)
      throw new CrudError(404, "issue_not_found", "Issue not found")
    if (page.version !== input.version)
      throw new CrudError(
        409,
        "version_conflict",
        "Reload the issue before saving"
      )
    if (input.status && !canTransition(issue.status, input.status))
      throw new CrudError(
        409,
        "invalid_transition",
        "This workflow transition is not allowed"
      )
    await checkIssueReferences(issue.workspaceId, input, tx)
    if (input.status === "done") {
      const blocked = await tx.execute(
        sql`select 1 from issue_dependency d join work_item i on i.page_id = d.depends_on_id where d.page_id = ${id}::uuid and i.status not in ('done','cancelled') limit 1`
      )
      if (blocked.length)
        throw new CrudError(
          409,
          "issue_blocked",
          "Finish dependencies before completing this issue"
        )
    }
    const { version, ...changes } = input
    const [updated] = await tx
      .update(workItemsTable)
      .set({
        ...changes,
        completedAt:
          input.status === "done"
            ? new Date()
            : input.status
              ? null
              : issue.completedAt,
      })
      .where(eq(workItemsTable.pageId, id))
      .returning()
    const saved = await tx
      .update(pagesTable)
      .set({
        version: version + 1,
        updatedById: actor.userId,
        updatedAt: new Date(),
      })
      .where(
        and(eq(pagesTable.id, id), pageScope(pagesTable.id, actor, "edit"))
      )
      .returning()
    if (!saved.length)
      throw new CrudError(403, "access_forbidden", "Write access was revoked")
    await tx.insert(taskEventsTable).values({
      workspaceId: issue.workspaceId,
      pageId: id,
      actorId: actor.userId,
      type: "issue.updated",
      payload: {
        assigneeId: updated?.assigneeId ?? null,
        beforeStatus: issue.status,
        afterStatus: updated?.status,
        ...(automation ? { automationIds: automation.automationIds } : {}),
      },
    })
    if (automation) {
      const [fence] = await tx.execute(
        sql`update task_event_outbox set payload = jsonb_set(payload,'{automationIds}',${JSON.stringify(automation.automationIds)}::jsonb) where id = ${automation.sourceEventId}::uuid and lease_token = ${automation.leaseToken}::uuid returning id`
      )
      if (!fence)
        throw new CrudError(409, "event_lease_lost", "Automation lease expired")
    }
    return { ...updated, title: page.title, version: version + 1 }
  })
}

export async function rawAddDependency(
  actor: CrudActor,
  id: string,
  dependsOnId: string
) {
  await assertAccess("page", id, actor, "edit")
  await assertAccess("page", dependsOnId, actor)
  return getDatabase().transaction(async (tx) => {
    const [issue] = await tx
      .select()
      .from(workItemsTable)
      .where(eq(workItemsTable.pageId, id))
      .limit(1)
    const [dependency] = await tx
      .select()
      .from(workItemsTable)
      .where(eq(workItemsTable.pageId, dependsOnId))
      .limit(1)
    if (!issue || !dependency || issue.workspaceId !== dependency.workspaceId)
      throw new CrudError(
        400,
        "invalid_dependency",
        "Dependencies must be issues in the same workspace"
      )
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${issue.workspaceId}, 0))`
    )
    const cycles = await tx.execute(
      sql`with recursive chain as (select depends_on_id from issue_dependency where page_id = ${dependsOnId}::uuid union select d.depends_on_id from issue_dependency d join chain c on d.page_id = c.depends_on_id) select 1 from chain where depends_on_id = ${id}::uuid`
    )
    if (id === dependsOnId || cycles.length)
      throw new CrudError(
        409,
        "dependency_cycle",
        "Dependency would create a cycle"
      )
    await tx
      .insert(issueDependenciesTable)
      .values({ pageId: id, dependsOnId })
      .onConflictDoNothing()
    return { pageId: id, dependsOnId }
  })
}

export async function rawListDependencies(actor: CrudActor, id: string) {
  await assertAccess("page", id, actor)
  return getDatabase()
    .select({
      pageId: issueDependenciesTable.pageId,
      dependsOnId: issueDependenciesTable.dependsOnId,
      title: pagesTable.title,
      status: workItemsTable.status,
    })
    .from(issueDependenciesTable)
    .innerJoin(
      pagesTable,
      eq(pagesTable.id, issueDependenciesTable.dependsOnId)
    )
    .innerJoin(workItemsTable, eq(workItemsTable.pageId, pagesTable.id))
    .where(
      and(
        eq(issueDependenciesTable.pageId, id),
        pageScope(pagesTable.id, actor)
      )
    )
}
export async function rawRemoveDependency(
  actor: CrudActor,
  id: string,
  dependsOnId: string
) {
  await assertAccess("page", id, actor, "edit")
  const [removed] = await getDatabase()
    .delete(issueDependenciesTable)
    .where(
      and(
        eq(issueDependenciesTable.pageId, id),
        eq(issueDependenciesTable.dependsOnId, dependsOnId)
      )
    )
    .returning()
  if (!removed)
    throw new CrudError(404, "dependency_not_found", "Dependency not found")
  return removed
}

export async function rawListSprints(actor: CrudActor, workspaceId: string) {
  await assertAccess("workspace", workspaceId, actor)
  return getDatabase()
    .select()
    .from(sprintsTable)
    .where(eq(sprintsTable.workspaceId, workspaceId))
    .orderBy(sprintsTable.createdAt)
}
export async function rawCreateSprint(actor: CrudActor, input: SprintInput) {
  await assertAccess("workspace", input.workspaceId, actor, "manage")
  const [sprint] = await getDatabase()
    .insert(sprintsTable)
    .values(input)
    .returning()
  return sprint
}
export async function rawTransitionSprint(
  actor: CrudActor,
  id: string,
  action: "start" | "complete"
) {
  const [sprint] = await getDatabase()
    .select()
    .from(sprintsTable)
    .where(eq(sprintsTable.id, id))
    .limit(1)
  if (!sprint) throw new CrudError(404, "sprint_not_found", "Sprint not found")
  await assertAccess("workspace", sprint.workspaceId, actor, "manage")
  return getDatabase().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${sprint.workspaceId}, 0))`
    )
    const [current] = await tx
      .select()
      .from(sprintsTable)
      .where(eq(sprintsTable.id, id))
      .for("update")
    if (current?.status !== (action === "start" ? "planned" : "active"))
      throw new CrudError(
        409,
        "invalid_sprint_transition",
        "Sprint state changed"
      )
    if (action === "start") {
      const active = await tx
        .select()
        .from(sprintsTable)
        .where(
          and(
            eq(sprintsTable.workspaceId, sprint.workspaceId),
            eq(sprintsTable.status, "active")
          )
        )
        .limit(1)
      if (active.length)
        throw new CrudError(
          409,
          "active_sprint_exists",
          "Complete the active sprint first"
        )
    } else {
      // Match the page -> issue lock order used by issue updates. Moving an
      // unfinished issue back to backlog changes its optimistic document version.
      const unfinished = await tx
        .select({ id: pagesTable.id })
        .from(pagesTable)
        .innerJoin(workItemsTable, eq(workItemsTable.pageId, pagesTable.id))
        .where(
          and(
            eq(workItemsTable.sprintId, id),
            sql`${workItemsTable.status} not in ('done','cancelled')`
          )
        )
        .orderBy(pagesTable.id)
        .for("update", { of: pagesTable })
      for (const page of unfinished) {
        await tx
          .update(workItemsTable)
          .set({ sprintId: null })
          .where(
            and(
              eq(workItemsTable.pageId, page.id),
              eq(workItemsTable.sprintId, id)
            )
          )
        await tx
          .update(pagesTable)
          .set({
            version: sql`${pagesTable.version}+1`,
            updatedById: actor.userId,
            updatedAt: new Date(),
          })
          .where(eq(pagesTable.id, page.id))
      }
    }
    const [updated] = await tx
      .update(sprintsTable)
      .set({
        status: action === "start" ? "active" : "completed",
        completedAt: action === "complete" ? new Date() : null,
      })
      .where(eq(sprintsTable.id, id))
      .returning()
    return updated
  })
}

export async function rawWorkReport(actor: CrudActor, workspaceId: string) {
  await assertAccess("workspace", workspaceId, actor)
  return getDatabase()
    .select({
      status: workItemsTable.status,
      issues: count(),
      points: sql<number>`coalesce(sum(${workItemsTable.estimate}),0)::int`,
    })
    .from(workItemsTable)
    .innerJoin(pagesTable, eq(pagesTable.id, workItemsTable.pageId))
    .where(
      and(
        eq(workItemsTable.workspaceId, workspaceId),
        eq(pagesTable.isArchived, false),
        pageScope(pagesTable.id, actor)
      )
    )
    .groupBy(workItemsTable.status)
}
