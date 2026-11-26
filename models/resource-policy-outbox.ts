import "server-only"
import { randomUUID } from "node:crypto"
import { sql } from "drizzle-orm"
import { getDatabase } from "@/database"
import { CrudError } from "@/database/crud"
import { resourcePolicyOutboxTable } from "@/database/resource-policy"
import {
  resourcePolicySnapshotSchema,
  resourcePolicyGrantsQuery,
} from "@/schemas/resource-policy-sync"
import { oauthResourceAudience } from "@/utils/environment"
import { rawGetBackendAccessToken } from "@/services/platform-client"
import { fetcher } from "@/utils/fetcher"

// Recompute authoritative effective grants. Task's existing read policy requires
// workspace access BEFORE a user-specific comment grant; do not broaden shares.

export async function rawDispatchResourcePolicy() {
  if (!oauthResourceAudience)
    throw new CrudError(
      503,
      "policy_dispatch_not_configured",
      "Policy dispatcher is not configured"
    )
  let endpoint: URL
  try {
    const origin = new URL(oauthResourceAudience)
    if (
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/" ||
      (origin.protocol !== "https:" &&
        !(
          origin.protocol === "http:" &&
          ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
        ))
    )
      throw new Error()
    endpoint = new URL("/resource/policy/task/snapshot", origin)
  } catch {
    throw new CrudError(
      503,
      "invalid_policy_destination",
      "Invalid policy destination"
    )
  }
  const database = getDatabase()
  const token = randomUUID()
  // The durable lease fences concurrent/serverless workers, including late ACKs.
  let claimed: { id: string }[]
  try {
    claimed = Array.from(
      await database.execute<{ id: string }>(sql`
    update resource_policy_outbox set dispatch_token = ${token}::uuid,
      dispatch_until = clock_timestamp() + interval '30 seconds', attempts = attempts + 1
    where id = 'task' and (dispatch_until is null or dispatch_until <= clock_timestamp())
    returning id
    `)
    )
  } catch {
    throw new CrudError(
      503,
      "policy_outbox_unavailable",
      "Policy outbox is unavailable"
    )
  }
  if (!claimed.length) {
    const available = await database.execute(
      sql`select id from resource_policy_outbox where id = 'task'`
    )
    if (!available.length)
      throw new CrudError(
        503,
        "policy_outbox_unavailable",
        "Policy outbox has not been initialized"
      )
    return { dispatched: false, busy: true }
  }
  try {
    const event = await database.transaction(
      async (transaction) => {
        const [head] = await transaction
          .select()
          .from(resourcePolicyOutboxTable)
        if (!head) throw new Error("missing_outbox")
        const clock = await transaction.execute<{ issuedAt: string }>(sql`
        select (extract(epoch from transaction_timestamp()) * 1000)::bigint::text as "issuedAt"
      `)
        const issuedAt = Number(clock[0]?.issuedAt)
        const grants = await transaction.execute<{
          pageId: string
          subject: string
          comment: boolean
        }>(resourcePolicyGrantsQuery)
        return resourcePolicySnapshotSchema.parse({
          schemaVersion: 1,
          source: "task",
          type: "snapshot",
          epoch: head.epoch,
          revision: head.revision.toString(),
          snapshotId: randomUUID(),
          issuedAt,
          expiresAt: issuedAt + 120_000,
          grants: Array.from(grants),
        })
      },
      { isolationLevel: "repeatable read", accessMode: "read only" }
    )
    const body = JSON.stringify(event)
    if (Buffer.byteLength(body) > 1_500_000)
      throw new Error("snapshot_capacity_exceeded")
    const response = await fetcher<{ accepted?: boolean }>({
      url: endpoint,
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await rawGetBackendAccessToken("resource")}`,
      },
      cache: "no-store",
      redirect: "error",
      timeout: 10_000,
      validateStatus: () => true,
    })
    if (response.status !== 200 || response.data.accepted !== true)
      throw new Error("snapshot_delivery_failed")
    const acknowledged = await database.execute(sql`
      update resource_policy_outbox set
        delivered_revision = greatest(delivered_revision, ${event.revision}::bigint),
        delivered_at = clock_timestamp(), dispatch_token = null, dispatch_until = null,
        last_error = null
      where id = 'task' and dispatch_token = ${token}::uuid
      returning id
    `)
    if (!acknowledged.length) return { dispatched: false, lostLease: true }
    return { dispatched: true, revision: event.revision }
  } catch {
    // Never store tokens, response bodies, destination URL or secret in errors.
    await database.execute(sql`
      update resource_policy_outbox set dispatch_token = null, dispatch_until = null,
        last_error = 'policy_delivery_failed'
      where id = 'task' and dispatch_token = ${token}::uuid
    `)
    throw new CrudError(
      503,
      "policy_delivery_failed",
      "Policy synchronization failed"
    )
  }
}
