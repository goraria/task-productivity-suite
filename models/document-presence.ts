import "server-only"
import { and, eq, gt, sql } from "drizzle-orm"
import { getDatabase } from "@/database"
import { assertAccess, pageScope } from "@/database/authorization"
import type { CrudActor } from "@/database/crud"
import { documentPresenceTable, userTable } from "@/database/schema"
export async function rawDocumentPresence(actor: CrudActor, pageId: string) {
  await assertAccess("page", pageId, actor)
  const database = getDatabase()
  await database
    .insert(documentPresenceTable)
    .values({ pageId, userId: actor.userId, lastSeenAt: new Date() })
    .onConflictDoUpdate({
      target: [documentPresenceTable.pageId, documentPresenceTable.userId],
      set: { lastSeenAt: new Date() },
    })
  // Bounded active view; no cursor text or document content is stored.
  return database
    .select({ id: userTable.id, name: userTable.name, image: userTable.image })
    .from(documentPresenceTable)
    .innerJoin(userTable, eq(userTable.id, documentPresenceTable.userId))
    .where(
      and(
        eq(documentPresenceTable.pageId, pageId),
        gt(
          documentPresenceTable.lastSeenAt,
          sql`clock_timestamp()-interval '90 seconds'`
        ),
        eq(userTable.status, "active"),
        pageScope(sql`${pageId}::uuid`, {
          userId: sql`${userTable.id}`,
          isAdmin: false,
        })
      )
    )
    .orderBy(documentPresenceTable.userId)
    .limit(64)
}
