import { getDatabase } from "@/database"
import { assertWorkspaceAccess, getWorkspaceId, workspaceScope } from "@/database/access"
import { assertAccess } from "@/database/authorization"
import { createCrudRepository, CrudError, crudKey, type CrudActor, type CrudListOptions } from "@/database/crud"
import { workspaceMembersTable, workspacesTable, userTable } from "@/database/schema"
import { eq, and } from "drizzle-orm"
import "server-only"

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
    filters: ["workspaceId"],
  },
  {
    readScope: (actor) =>
      workspaceScope(workspaceMembersTable.workspaceId, actor),
    read: (row, actor) => assertWorkspaceAccess(getWorkspaceId(row), actor),
    create: async (payload, actor) => {
      await assertAccess("workspace", getWorkspaceId(payload), actor, "manage")
      if (payload.role === "owner")
        throw new CrudError(
          403,
          "owner_role_reserved",
          "Workspace ownership cannot be granted through membership"
        )
      payload.invitedById = actor.userId
    },
    mutate: async (row, actor) => {
      await assertAccess("workspace", getWorkspaceId(row), actor, "manage")
      const [workspace] = await getDatabase()
        .select()
        .from(workspacesTable)
        .where(eq(workspacesTable.id, String(row.workspaceId)))
        .limit(1)
      if (workspace?.ownerId === row.userId)
        throw new CrudError(
          403,
          "workspace_owner_protected",
          "The workspace owner cannot be removed or suspended"
        )
    },
    prepareUpdate: (payload) => {
      if (payload.role === "owner")
        throw new CrudError(
          403,
          "owner_role_reserved",
          "Workspace ownership cannot be granted through membership"
        )
    },
  }
)

export async function rawListWorkspaceMembers(
  actor: CrudActor,
  options?: CrudListOptions
) {
  try {
    return await repository.list(actor, options)
  } catch (error) {
    throw error
  }
}
export async function rawGetWorkspaceMember(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.get(actor, params)
  } catch (error) {
    throw error
  }
}
export async function rawCreateWorkspaceMember(actor: CrudActor, input: unknown) {
  try {
    return await repository.create(actor, input)
  } catch (error) {
    throw error
  }
}
export async function rawUpdateWorkspaceMember(
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
export async function rawDeleteWorkspaceMember(
  actor: CrudActor,
  params: Record<string, string | undefined>
) {
  try {
    return await repository.remove(actor, params)
  } catch (error) {
    throw error
  }
}

export async function rawWorkspaceDirectory(
  actor: CrudActor,
  workspaceId: string
) {
  await assertAccess("workspace", workspaceId, actor)
  const [workspace] = await getDatabase()
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .limit(1)
  const members = await getDatabase()
    .select({
      id: userTable.id,
      name: userTable.name,
      image: userTable.image,
      role: workspaceMembersTable.role,
      status: workspaceMembersTable.status,
    })
    .from(workspaceMembersTable)
    .innerJoin(userTable, eq(userTable.id, workspaceMembersTable.userId))
    .where(eq(workspaceMembersTable.workspaceId, workspaceId))
  const [owner] = await getDatabase()
    .select({ id: userTable.id, name: userTable.name, image: userTable.image })
    .from(userTable)
    .where(eq(userTable.id, workspace!.ownerId))
    .limit(1)
  if (owner && !members.some((member) => member.id === owner.id))
    members.push({ ...owner, role: "owner", status: "active" })
  const role =
    workspace?.ownerId === actor.userId
      ? "owner"
      : members.find((member) => member.id === actor.userId)?.role
  return {
    members,
    canManage: actor.isAdmin || role === "owner" || role === "admin",
  }
}

export async function rawInviteWorkspaceMember(
  actor: CrudActor,
  workspaceId: string,
  email: string,
  role: "member" | "guest"
) {
  await assertAccess("workspace", workspaceId, actor, "manage")
  const [user] = await getDatabase()
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, email), eq(userTable.status, "active")))
    .limit(1)
  if (!user)
    throw new CrudError(
      404,
      "account_not_available",
      "This account must open Task once before it can be invited"
    )
  const [workspace] = await getDatabase()
    .select()
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .limit(1)
  if (workspace?.ownerId === user.id)
    throw new CrudError(
      409,
      "already_member",
      "The workspace owner is already a member"
    )
  if (
    role === "guest" &&
    !(workspace?.settings as Record<string, unknown>).allowGuests
  )
    throw new CrudError(
      403,
      "guests_disabled",
      "Enable guests before inviting a guest"
    )
  const [member] = await getDatabase()
    .insert(workspaceMembersTable)
    .values({
      workspaceId,
      userId: user.id,
      role,
      status: "invited",
      invitedById: actor.userId,
    })
    .onConflictDoNothing()
    .returning()
  if (!member)
    throw new CrudError(
      409,
      "already_member",
      "A membership or invitation already exists"
    )
  return member
}

export async function rawAcceptWorkspaceInvitation(
  actor: CrudActor,
  workspaceId: string
) {
  const [member] = await getDatabase()
    .update(workspaceMembersTable)
    .set({ status: "active", joinedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, actor.userId),
        eq(workspaceMembersTable.status, "invited")
      )
    )
    .returning()
  if (!member)
    throw new CrudError(404, "invitation_not_found", "Invitation not found")
  return member
}
export async function rawListWorkspaceInvitations(actor: CrudActor) {
  return getDatabase()
    .select({
      workspaceId: workspacesTable.id,
      name: workspacesTable.name,
      role: workspaceMembersTable.role,
    })
    .from(workspaceMembersTable)
    .innerJoin(
      workspacesTable,
      eq(workspacesTable.id, workspaceMembersTable.workspaceId)
    )
    .where(
      and(
        eq(workspaceMembersTable.userId, actor.userId),
        eq(workspaceMembersTable.status, "invited")
      )
    )
}

export async function rawLeaveWorkspace(actor: CrudActor, workspaceId: string) {
  const [workspace] = await getDatabase()
    .select({ ownerId: workspacesTable.ownerId })
    .from(workspacesTable)
    .where(eq(workspacesTable.id, workspaceId))
    .limit(1)
  if (workspace?.ownerId === actor.userId)
    throw new CrudError(
      409,
      "owner_cannot_leave",
      "Transfer ownership before leaving"
    )
  const [removed] = await getDatabase()
    .delete(workspaceMembersTable)
    .where(
      and(
        eq(workspaceMembersTable.workspaceId, workspaceId),
        eq(workspaceMembersTable.userId, actor.userId)
      )
    )
    .returning()
  if (!removed)
    throw new CrudError(404, "membership_not_found", "Membership not found")
  return { left: true }
}

export async function rawTransferWorkspace(
  actor: CrudActor,
  workspaceId: string,
  ownerId: string
) {
  return getDatabase().transaction(async (tx) => {
    const [workspace] = await tx
      .select()
      .from(workspacesTable)
      .where(eq(workspacesTable.id, workspaceId))
      .for("update")
    if (!workspace || (!actor.isAdmin && workspace.ownerId !== actor.userId))
      throw new CrudError(
        403,
        "owner_required",
        "Only the workspace owner can transfer ownership"
      )
    const [target] = await tx
      .select()
      .from(workspaceMembersTable)
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, ownerId),
          eq(workspaceMembersTable.status, "active")
        )
      )
      .limit(1)
    const [user] = await tx
      .select()
      .from(userTable)
      .where(and(eq(userTable.id, ownerId), eq(userTable.status, "active")))
      .limit(1)
    if (!target || !user || target.role === "guest")
      throw new CrudError(
        400,
        "invalid_owner",
        "Choose an active workspace member"
      )
    if (ownerId === workspace.ownerId) return workspace
    // Legacy workspaces can have an owner without a membership row. Preserve
    // their access atomically when transferring ownership in either direction.
    await tx
      .insert(workspaceMembersTable)
      .values({
        workspaceId,
        userId: workspace.ownerId,
        role: "admin",
        status: "active",
        joinedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          workspaceMembersTable.workspaceId,
          workspaceMembersTable.userId,
        ],
        set: { role: "admin", status: "active", updatedAt: new Date() },
      })
    await tx
      .update(workspaceMembersTable)
      .set({ role: "owner", updatedAt: new Date() })
      .where(
        and(
          eq(workspaceMembersTable.workspaceId, workspaceId),
          eq(workspaceMembersTable.userId, ownerId)
        )
      )
    const [updated] = await tx
      .update(workspacesTable)
      .set({ ownerId, updatedAt: new Date() })
      .where(eq(workspacesTable.id, workspaceId))
      .returning()
    return updated
  })
}
