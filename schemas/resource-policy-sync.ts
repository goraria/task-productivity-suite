import { pageLevel, pageScope } from "@/database/authorization"
import { z } from "@gorth-com/structure/cores/zod"
import { sql } from "drizzle-orm"

export const resourcePolicySnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: z.literal("task"),
    type: z.literal("snapshot"),
    epoch: z.uuid(),
    revision: z
      .string()
      .regex(/^[1-9][0-9]{0,18}$/)
      .refine((value) => BigInt(value) <= 9223372036854775807n),
    snapshotId: z.uuid(),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
    grants: z
      .array(
        z
          .object({
            pageId: z.uuid(),
            subject: z.string().min(1).max(255),
            comment: z.boolean(),
          })
          .strict()
      )
      .max(20_000),
  })
  .strict()

export const resourcePolicyGrantsQuery = sql`
  select p.id::text as "pageId", u.external_user_id as subject,
    (u.role in ('admin','master') or ${pageLevel(sql`p.id`, { userId: sql`u.id`, isAdmin: false })} >= 2) as comment
  from page p cross join "user" u
  where p.is_archived = false and u.status = 'active' and u.sso_status = 'active'
    and u.deleted_at is null and not (u.banned_at is not null and (u.ban_expires is null or u.ban_expires > transaction_timestamp()))
    and (u.role in ('admin','master') or ${pageScope(sql`p.id`, { userId: sql`u.id`, isAdmin: false })})
  order by p.id, u.external_user_id limit 20001
`
