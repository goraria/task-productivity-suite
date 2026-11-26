import { database } from "@/database"
import {
  assertWorkspaceAccess,
  assertWorkspaceOwner,
  ownedWorkspaceScope,
} from "@/database/access"
import {
  createCrudRepository,
  crudKey,
  readString,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { workspaceMembersTable, workspacesTable } from "@/database/schema"

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
    },
    mutate: (row, actor) => assertWorkspaceOwner(readString(row, "id"), actor),
  }
)

export async function listWorkspaces(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getWorkspace(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createWorkspace(actor: CrudActor, input: unknown) {
  try {
    const workspace = await repository.create(actor, input)
    await database
      .insert(workspaceMembersTable)
      .values({
        workspaceId: String((workspace as Record<string, unknown>).id),
        userId: actor.userId,
        role: "owner",
        status: "active",
        joinedAt: new Date(),
      })
      .onConflictDoNothing()
    return workspace
  } catch (error) {
    throw error
  }
}
export async function updateWorkspace(
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
export async function deleteWorkspace(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
