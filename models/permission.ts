import { getDatabase } from "@/database"
import { assignActor } from "@/database/access"
import { databaseScope, pageScope } from "@/database/authorization"
import {
  createCrudRepository,
  CrudError,
  crudKey,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import {
  permissionsTable,
  workspaceMembersTable,
  workspacesTable,
} from "@/database/schema"
import { validatePermission } from "@/schemas/productivity"
import { rawAssertTargetAccess, rawValidateReferences } from "@/models/index"
import { and, eq, sql } from "drizzle-orm"

async function validateSubject(payload: Record<string, unknown>) {
  validatePermission(payload)
  if (payload.subjectType === "user") {
    const database = getDatabase()
    const [workspace] = await database
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, String(payload.workspaceId)))
      .limit(1)
    const [member] = await database
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, String(payload.workspaceId)),
          eq(workspaceMembersTable.userId, String(payload.subjectId)),
          eq(workspaceMembersTable.status, "active")
        )
      )
      .limit(1)
    if (workspace?.ownerId !== payload.subjectId && !member)
      throw new CrudError(
        400,
        "invalid_grant_subject",
        "Share with an active member of this workspace"
      )
  }
}
const repository = createCrudRepository(
  "permission",
  {
    table: permissionsTable,
    keys: [crudKey("id", permissionsTable.id)],
    createFields: [
      "workspaceId",
      "pageId",
      "databaseId",
      "subjectType",
      "subjectId",
      "level",
      "createdById",
    ],
    updateFields: ["subjectType", "subjectId", "level"],
    orderBy: permissionsTable.updatedAt,
    touchUpdatedAt: true,
    filters: ["workspaceId", "pageId", "databaseId"],
  },
  {
    readScope: (actor) =>
      sql`(${permissionsTable.pageId} is not null and ${pageScope(permissionsTable.pageId, actor)}) or (${permissionsTable.databaseId} is not null and ${databaseScope(permissionsTable.databaseId, actor)})`,
    writeScope: (actor) =>
      sql`(${permissionsTable.pageId} is not null and ${pageScope(permissionsTable.pageId, actor, "manage")}) or (${permissionsTable.databaseId} is not null and ${databaseScope(permissionsTable.databaseId, actor, "manage")})`,
    read: (row, actor) => rawAssertTargetAccess(row, actor, "view"),
    create: async (payload, actor) => {
      await rawAssertTargetAccess(payload, actor, "manage")
      await rawValidateReferences(payload, actor)
      assignActor(payload, "createdById", actor)
      await validateSubject(payload)
    },
    mutate: (row, actor) => rawAssertTargetAccess(row, actor, "manage"),
    prepareUpdate: async (payload, row, actor) => {
      await rawValidateReferences(
        { ...row, ...payload },
        actor,
        "edit",
        String(row.id)
      )
      await validateSubject({ ...row, ...payload })
    },
  }
)

export async function rawListPermissions(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function rawGetPermission(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function rawCreatePermission(actor: CrudActor, input: unknown) {
  try {
    return (await repository.create(
      actor,
      input
    )) as typeof permissionsTable.$inferSelect
  } catch (error) {
    throw error
  }
}
export async function rawUpdatePermission(
  actor: CrudActor,
  params: Record<string, string | undefined>,
  input: unknown
) {
  try {
    return await repository.update(actor, params, input)
  } catch (error) {
    throw error
  }
}
export async function rawDeletePermission(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
