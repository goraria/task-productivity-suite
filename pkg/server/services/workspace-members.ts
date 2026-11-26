import {
  assertWorkspaceAccess,
  assertWorkspaceOwner,
  getWorkspaceId,
  workspaceScope,
} from "@/database/access"
import {
  createCrudRepository,
  crudKey,
  type CrudActor,
  type CrudListOptions,
} from "@/database/crud"
import { workspaceMembersTable } from "@/database/schema"

const repository = createCrudRepository(
  "workspace member",
  {
    table: workspaceMembersTable,
    keys: [
      crudKey("workspaceId", workspaceMembersTable.workspaceId),
      crudKey("userId", workspaceMembersTable.userId),
    ],
    createFields: [
      "workspaceId",
      "userId",
      "role",
      "status",
      "invitedById",
      "joinedAt",
    ],
    updateFields: ["role", "status", "invitedById", "joinedAt"],
    dateFields: ["joinedAt"],
    orderBy: workspaceMembersTable.createdAt,
    touchUpdatedAt: true,
  },
  {
    readScope: (actor) =>
      workspaceScope(workspaceMembersTable.workspaceId, actor),
    read: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
    create: async (payload, actor) => {
      await assertWorkspaceOwner(getWorkspaceId(payload), actor)
      payload.invitedById = actor.userId
    },
    mutate: (row, actor) => assertWorkspaceOwner(getWorkspaceId(row), actor),
  }
)

export async function listWorkspaceMembers(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function getWorkspaceMember(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function createWorkspaceMember(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function updateWorkspaceMember(
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
export async function deleteWorkspaceMember(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}
