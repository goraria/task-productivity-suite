import { sql } from "drizzle-orm"
import {
  bigint,
  check,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

// One durable, coalescing outbox stream. DB triggers advance revision in the
// same transaction as the owning ACL mutation; deliveredRevision never drives ACL.
export const resourcePolicyOutboxTable = pgTable(
  "resource_policy_outbox",
  {
    id: text("id").primaryKey(),
    epoch: uuid("epoch").notNull().defaultRandom(),
    revision: bigint("revision", { mode: "bigint" })
      .notNull()
      .default(sql`1`),
    deliveredRevision: bigint("delivered_revision", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    dispatchToken: uuid("dispatch_token"),
    dispatchUntil: timestamp("dispatch_until", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
  },
  (table) => [
    check("resource_policy_outbox_id_check", sql`${table.id} = 'task'`),
    check("resource_policy_outbox_revision_check", sql`${table.revision} > 0`),
  ]
)
