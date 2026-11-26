import "server-only"
import { assertAccess } from "@/database/authorization"
import { CrudError, type CrudActor } from "@/database/crud"
import type { pagesTable } from "@/database/schema"
import { rawGetPage, rawListReadableResourcePages } from "@/models/page"

export async function rawGetAuthorizedResourcePage(
  actor: CrudActor,
  pageId: string,
  access: "read" | "comment" = "read"
) {
  const page = (await rawGetPage(actor, {
    id: pageId,
  })) as typeof pagesTable.$inferSelect
  if (page.isArchived)
    throw new CrudError(403, "page_archived", "Page is archived")
  await assertAccess(
    "page",
    page.id,
    actor,
    access === "read" ? "view" : "comment"
  )
  return page
}
export async function rawAuthorizePageResource(
  actor: CrudActor,
  pageId: string,
  access: "read" | "comment",
  scopes: string[]
) {
  if (!scopes.includes(access === "comment" ? "task:write" : "task:read"))
    throw new CrudError(
      403,
      "insufficient_scope",
      "Required Task scope is missing"
    )
  await rawGetAuthorizedResourcePage(actor, pageId, access)
  return { allowed: true }
}

export async function rawAuthorizePageResources(
  actor: CrudActor,
  ids: string[],
  scopes: string[]
) {
  if (!scopes.includes("task:read"))
    throw new CrudError(
      403,
      "insufficient_scope",
      "Required Task scope is missing"
    )
  const pages = await rawListReadableResourcePages(actor, [...new Set(ids)])
  return { allowedIds: pages.map((page) => page.id) }
}
