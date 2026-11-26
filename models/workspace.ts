import { getDatabase } from "@/database"
import { assertWorkspaceAccess, ownedWorkspaceScope } from "@/database/access"
import { assertAccess } from "@/database/authorization"
import {
  createCrudRepository,
  crudKey,
  readString,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { workspaceMembersTable, workspacesTable } from "@/database/schema"
import { workspaceSettingsSchema } from "@/schemas/automation"
import { z } from "@gorth-com/structure/cores/zod"

const repository = createCrudRepository(
  "workspace",
  {
    table: workspacesTable,
    keys: [crudKey("id", workspacesTable.id)],
    createFields: ["ownerId", "name", "slug", "icon", "settings"],
    updateFields: ["name", "slug", "icon", "settings"],
    orderBy: workspacesTable.updatedAt,
    touchUpdatedAt: true,
  },
  {
    readScope: ownedWorkspaceScope,
    read: (row, actor) => assertWorkspaceAccess(readString(row, "id"), actor),
    create: (payload, actor) => {
      payload.ownerId = actor.userId
      if (payload.settings) workspaceSettingsSchema.parse(payload.settings)
    },
    mutate: (row, actor) =>
      assertAccess("workspace", readString(row, "id"), actor, "manage"),
    prepareUpdate: (payload) => {
      if (payload.settings) workspaceSettingsSchema.parse(payload.settings)
    },
  }
)

export async function rawListWorkspaces(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function rawGetWorkspace(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function rawCreateWorkspace(actor: CrudActor, input: unknown) {
  const value = z
    .object({
      name: z.string().trim().min(1).max(255),
      slug: z.string().trim().min(1).max(255),
      icon: z.string().max(255).nullable().optional(),
      settings: workspaceSettingsSchema.default({}),
    })
    .parse(input)
  return getDatabase().transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspacesTable)
      .values({ ...value, ownerId: actor.userId })
      .returning()
    await tx.insert(workspaceMembersTable).values({
      workspaceId: workspace!.id,
      userId: actor.userId,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
    })
    return workspace!
  })
}

export async function rawUpdateWorkspace(
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
export async function rawDeleteWorkspace(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
