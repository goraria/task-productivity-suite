import { getDatabase } from "@/database"
import { pageScope, assertAccess } from "@/database/authorization"
import { CrudError, type CrudActor } from "@/database/crud"
import { pagesTable, taskEventsTable, userTable, workItemsTable } from "@/database/schema"
import { rawApplyTaskAutomations } from "@/services/automation"
import { rawPlatformRequest } from "@/services/platform-client"
import { appUrl } from "@/utils/environment"
import { and, eq, sql, desc, isNull, lte, or } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import "server-only"

async function dispatchTaskEventBatch(workspaceId?: string) {
  const database = getDatabase()
  const leaseToken = randomUUID()
  const jobs = await database.execute<{
    id: string
    workspaceId: string
    pageId: string | null
    actorId: string | null
    type: string
    payload: Record<string, unknown>
    attempts: number
    occurredAt: string
  }>(sql`
    update task_event_outbox set lease_token = ${leaseToken}::uuid,
      lease_until = clock_timestamp() + interval '90 seconds', attempts = attempts + 1
    where id in (select id from task_event_outbox where delivered_at is null and attempts < 20
      ${workspaceId ? sql`and workspace_id = ${workspaceId}::uuid` : sql``}
      and available_at <= clock_timestamp() and (lease_until is null or lease_until <= clock_timestamp())
      order by case when type like 'issue.%' then 0 else 1 end,created_at,id limit 3 for update skip locked)
    returning id, workspace_id as "workspaceId", page_id as "pageId", actor_id as "actorId", type, payload, attempts, created_at as "occurredAt"
  `)
  let delivered = 0
  let failed = 0
  await Promise.allSettled(
    jobs.map(async (job) => {
      try {
        let automationFailure: unknown
        try {
          await rawApplyTaskAutomations(job, leaseToken)
        } catch (cause) {
          automationFailure = cause
        }
        const operations: (() => Promise<unknown>)[] = []
        const [page] = job.pageId
          ? await database
              .select()
              .from(pagesTable)
              .where(eq(pagesTable.id, job.pageId))
              .limit(1)
          : []
        const [actor] = job.actorId
          ? await database
              .select({ subject: userTable.externalUserId })
              .from(userTable)
              .where(eq(userTable.id, job.actorId))
              .limit(1)
          : []
        if (job.pageId) {
          // One SQL snapshot pairs current publication state with its newest durable
          // sequence/UUID. Retrying an old job never reuses its id for changed data.
          const [snapshot] = await database.execute<{
            eventId: string
            sequence: string
            title: string | null
            updatedAt: string | null
            published: boolean
          }>(sql`
          select event.id as "eventId", event.sequence, p.title, to_char(p.updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as "updatedAt",
            coalesce(p.is_published and not p.is_archived and exists(select 1 from permission g where g.page_id=p.id and g.subject_type='public' and g.level='view')
              and not exists(with recursive ancestors as (
                select id,parent_page_id,is_archived from page where id=p.id
                union select a.id,a.parent_page_id,a.is_archived from page a join ancestors b on a.id=b.parent_page_id
              ) select 1 from ancestors where is_archived),false) as published
          from task_event_outbox event left join page p on p.id=event.page_id
          where event.page_id=${job.pageId}::uuid order by event.sequence desc limit 1
        `)
          if (snapshot)
            operations.push(() =>
              rawPlatformRequest("discovery", "/discovery/sync", "POST", [
                {
                  id: snapshot.eventId,
                  resourceType: "page",
                  resourceId: job.pageId,
                  revision: Number(snapshot.sequence),
                  operation: snapshot.published ? "upsert" : "delete",
                  ...(snapshot.published
                    ? {
                        document: {
                          title: snapshot.title?.slice(0, 500) || "Untitled",
                          visibility: "public",
                          canonicalUrl: new URL(
                            `/preview/${job.pageId}`,
                            appUrl
                          ).href,
                          sourceUpdatedAt: snapshot.updatedAt,
                        },
                      }
                    : {}),
                },
              ])
            )
        }
        // Never send the document body, ACLs or attachment URLs as analytics properties.
        operations.push(() =>
          rawPlatformRequest("insight", "/insight/task/event", "POST", {
            name: job.type,
            idempotencyKey: job.id,
            occurredAt: job.occurredAt,
            actorExternalUserId: actor?.subject,
            resourceType: "page",
            resourceId: job.pageId ?? undefined,
            properties: {
              workspaceId: job.workspaceId,
              version: Number(job.payload.revision ?? 0) || null,
              ...(typeof job.payload.beforeStatus === "string"
                ? { beforeStatus: job.payload.beforeStatus }
                : {}),
              ...(typeof job.payload.afterStatus === "string"
                ? { afterStatus: job.payload.afterStatus }
                : {}),
            },
          })
        )
        if (page && job.type.startsWith("issue.")) {
          const [issue] = await database
            .select()
            .from(workItemsTable)
            .where(eq(workItemsTable.pageId, page.id))
            .limit(1)
          if (issue?.assigneeId && issue.assigneeId !== job.actorId) {
            // Re-evaluate current access, not the grant/assignee at enqueue time.
            const [recipient] = await database
              .select({
                subject: userTable.externalUserId,
                name: userTable.name,
                email: userTable.email,
              })
              .from(userTable)
              .where(
                and(
                  eq(userTable.id, issue.assigneeId),
                  eq(userTable.status, "active"),
                  eq(userTable.ssoStatus, "active"),
                  sql`${userTable.deletedAt} is null and (${userTable.bannedAt} is null or ${userTable.banExpires} <= clock_timestamp())`,
                  sql`${pageScope(sql`${page.id}::uuid`, { userId: issue.assigneeId, isAdmin: false })}`
                )
              )
              .limit(1)
            if (recipient)
              operations.push(() =>
                rawPlatformRequest("notification", "/notification/event", "POST", {
                  recipientExternalUserId: recipient.subject,
                  recipientProfile: {
                    name: recipient.name,
                    email: recipient.email,
                  },
                  deduplicationKey: `task:${job.id}`,
                  type: job.type,
                  title: "An assigned task has changed",
                  body: "Open your workspace to view the update.",
                  actionUrl: `/document/${page.id}`,
                  resourceType: "page",
                  resourceId: page.id,
                  channels: [],
                })
              )
          }
        }
        const outcomes = await Promise.allSettled(
          operations.map((operation) => Promise.resolve().then(operation))
        )
        const rejected = outcomes.find(
          (outcome) => outcome.status === "rejected"
        )
        if (automationFailure) throw automationFailure
        if (rejected?.status === "rejected") throw rejected.reason
        const acknowledged = await database
          .update(taskEventsTable)
          .set({
            deliveredAt: new Date(),
            leaseUntil: null,
            leaseToken: null,
            lastError: null,
          })
          .where(
            and(
              eq(taskEventsTable.id, job.id),
              eq(taskEventsTable.leaseToken, leaseToken)
            )
          )
          .returning({ id: taskEventsTable.id })
        if (acknowledged.length) delivered++
      } catch (cause) {
        failed++
        const delay = Math.min(3600, 2 ** Math.min(job.attempts, 12))
        await database
          .update(taskEventsTable)
          .set({
            lastError:
              cause instanceof CrudError ? cause.code : "delivery_failed",
            leaseUntil: null,
            leaseToken: null,
            availableAt: new Date(Date.now() + delay * 1000),
          })
          .where(
            and(
              eq(taskEventsTable.id, job.id),
              eq(taskEventsTable.leaseToken, leaseToken)
            )
          )
      }
    })
  )
  return { claimed: jobs.length, delivered, failed }
}

// Lease only a small batch at a time; healthy queues drain multiple batches
// within one request, while an outage breaks the loop rather than hammering it.
export async function rawDispatchTaskEvents(workspaceId?: string) {
  const started = Date.now()
  const total = { claimed: 0, delivered: 0, failed: 0 }
  for (let batch = 0; batch < 20 && Date.now() - started < 20000; batch++) {
    const result = await dispatchTaskEventBatch(workspaceId)
    total.claimed += result.claimed
    total.delivered += result.delivered
    total.failed += result.failed
    if (result.claimed < 3 || result.failed) break
  }
  return total
}

export async function rawWorkspaceDelivery(
  actor: CrudActor,
  workspaceId: string,
  limit: number,
  offset: number
) {
  await assertAccess("workspace", workspaceId, actor, "manage")
  const data = await getDatabase()
    .select({
      id: taskEventsTable.id,
      type: taskEventsTable.type,
      attempts: taskEventsTable.attempts,
      availableAt: taskEventsTable.availableAt,
      deliveredAt: taskEventsTable.deliveredAt,
      lastError: taskEventsTable.lastError,
      createdAt: taskEventsTable.createdAt,
    })
    .from(taskEventsTable)
    .where(eq(taskEventsTable.workspaceId, workspaceId))
    .orderBy(desc(taskEventsTable.createdAt), taskEventsTable.id)
    .limit(limit)
    .offset(offset)
  return { data, pagination: { limit, offset, hasMore: data.length === limit } }
}
export async function rawRetryWorkspaceDelivery(
  actor: CrudActor,
  workspaceId: string,
  eventId: string
) {
  await assertAccess("workspace", workspaceId, actor, "manage")
  const [row] = await getDatabase()
    .update(taskEventsTable)
    .set({
      attempts: 0,
      lastError: null,
      availableAt: new Date(),
      leaseToken: null,
      leaseUntil: null,
    })
    .where(
      and(
        eq(taskEventsTable.id, eventId),
        eq(taskEventsTable.workspaceId, workspaceId),
        isNull(taskEventsTable.deliveredAt),
        or(
          isNull(taskEventsTable.leaseUntil),
          lte(taskEventsTable.leaseUntil, new Date())
        )
      )
    )
    .returning({ id: taskEventsTable.id })
  if (!row)
    throw new CrudError(
      409,
      "delivery_not_retryable",
      "Delivery is complete, running or unavailable"
    )
  return row
}
