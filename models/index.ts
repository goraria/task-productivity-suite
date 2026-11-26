import { getDatabase } from "@/database"
import { assertAccess, type AccessAction } from "@/database/authorization"
import { CrudError, readString, type CrudActor } from "@/database/crud"
import { blocksTable, databasePropertiesTable, databasesTable, filesTable, pagesTable, workspaceMembersTable, workspacesTable } from "@/database/schema"
import { parsePropertyValue } from "@/schemas/productivity"
import { and, eq } from "drizzle-orm"
import { rawRequirePageById } from "@/models/page"

export async function rawAssertTargetAccess(
  row: Record<string, unknown>,
  actor: CrudActor,
  action: AccessAction = "view",
  kind?: "page" | "database"
) {
  const pageId =
    kind === "page" ? readString(row, "id") : readString(row, "pageId")
  const databaseId =
    kind === "database" ? readString(row, "id") : readString(row, "databaseId")
  await assertAccess(
    pageId ? "page" : databaseId ? "database" : "workspace",
    pageId ?? databaseId ?? readString(row, "workspaceId"),
    actor,
    action
  )
}

export async function rawValidateReferences(
  payload: Record<string, unknown>,
  actor: CrudActor,
  action: AccessAction = "edit",
  currentId?: string
) {
  const workspaceId = readString(payload, "workspaceId")
  for (const [field, table] of [
    ["pageId", pagesTable],
    ["parentPageId", pagesTable],
    ["databaseId", databasesTable],
    ["parentBlockId", blocksTable],
    ["blockId", blocksTable],
    ["propertyId", databasePropertiesTable],
  ] as const) {
    const id = readString(payload, field)
    if (!id) continue
    if (id === currentId && ["parentPageId", "parentBlockId"].includes(field))
      throw new CrudError(
        400,
        "hierarchy_cycle",
        "An item cannot contain itself"
      )
    const [target] = await getDatabase()
      .select()
      .from(table)
      .where(eq(table.id, id))
      .limit(1)
    if (!target || target.workspaceId !== workspaceId)
      throw new CrudError(
        400,
        "reference_mismatch",
        `${field} must belong to the same workspace`
      )
    await rawAssertTargetAccess(
      target,
      actor,
      action,
      table === pagesTable
        ? "page"
        : table === databasesTable
          ? "database"
          : undefined
    )
    if (
      "pageId" in target &&
      payload.pageId &&
      target.pageId !== payload.pageId
    )
      throw new CrudError(
        400,
        "reference_mismatch",
        "Block must belong to the same page"
      )
    if (field === "propertyId" && payload.pageId) {
      const page = await rawRequirePageById(String(payload.pageId))
      if (
        page.databaseId !==
        (target as typeof databasePropertiesTable.$inferSelect).databaseId
      )
        throw new CrudError(
          400,
          "reference_mismatch",
          "Property must belong to the page database"
        )
    }
  }
  if (payload.parentPageId && currentId) {
    const seen = new Set([currentId])
    let id: string | null = String(payload.parentPageId)
    while (id) {
      if (seen.has(id))
        throw new CrudError(
          400,
          "hierarchy_cycle",
          "Page hierarchy cannot contain a cycle"
        )
      seen.add(id)
      const parent = await rawRequirePageById(id)
      id = parent.parentPageId
    }
  }
  if (payload.parentBlockId && currentId) {
    const seen = new Set([currentId])
    let id: string | null = String(payload.parentBlockId)
    while (id) {
      if (seen.has(id))
        throw new CrudError(
          400,
          "hierarchy_cycle",
          "Block hierarchy cannot contain a cycle"
        )
      seen.add(id)
      const [parent] = await getDatabase()
        .select()
        .from(blocksTable)
        .where(eq(blocksTable.id, id))
        .limit(1)
      id = parent?.parentBlockId ?? null
    }
  }
}

export async function rawValidatePropertyPayload(
  payload: Record<string, unknown>,
  actor: CrudActor
) {
  const [property] = await getDatabase()
    .select()
    .from(databasePropertiesTable)
    .where(eq(databasePropertiesTable.id, String(payload.propertyId)))
    .limit(1)
  if (!property)
    throw new CrudError(404, "property_not_found", "Property not found")
  try {
    payload.value = {
      value: parsePropertyValue(
        property.type,
        payload.value,
        property.config as Record<string, unknown>
      ),
    }
  } catch {
    throw new CrudError(
      400,
      "invalid_property_value",
      "Property value does not match its type or options"
    )
  }
  const value = (payload.value as { value: unknown }).value
  if (property.type === "relation" && Array.isArray(value)) {
    for (const id of value) {
      const page = await rawRequirePageById(String(id))
      if (page.workspaceId !== payload.workspaceId)
        throw new CrudError(
          400,
          "reference_mismatch",
          "Related page must belong to the same workspace"
        )
      await assertAccess("page", page.id, actor)
    }
  }
  if (property.type === "person" && Array.isArray(value))
    for (const id of value) {
      const [member] = await getDatabase()
        .select()
        .from(workspaceMembersTable)
        .where(
          and(
            eq(workspaceMembersTable.workspaceId, String(payload.workspaceId)),
            eq(workspaceMembersTable.userId, String(id)),
            eq(workspaceMembersTable.status, "active")
          )
        )
        .limit(1)
      const [owner] = await getDatabase()
        .select()
        .from(workspacesTable)
        .where(
          and(
            eq(workspacesTable.id, String(payload.workspaceId)),
            eq(workspacesTable.ownerId, String(id))
          )
        )
        .limit(1)
      if (!member && !owner)
        throw new CrudError(
          400,
          "invalid_person",
          "Choose an active workspace member"
        )
    }
  if (property.type === "file" && Array.isArray(value))
    for (const id of value) {
      const [file] = await getDatabase()
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, String(id)))
        .limit(1)
      if (!file || file.workspaceId !== payload.workspaceId || !file.pageId)
        throw new CrudError(
          400,
          "invalid_file",
          "Choose a document attachment in this workspace"
        )
      await assertAccess("page", file.pageId, actor)
    }
}
