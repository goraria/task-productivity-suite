import {
  workspaceIdSchema,
  workspaceInvitationSchema,
  workspaceTransferSchema,
} from "@/schemas/workspace-membership"
import * as services from "@/models/workspace-member"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actWorkspaceDirectory(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawWorkspaceDirectory(
        await resolveActor(c),
        workspaceIdSchema.parse(c.req.param("id"))
      ),
    },
    200
  )
}
export async function actInviteWorkspaceMember(c: Context<ApiEnv>) {
  const input = workspaceInvitationSchema.parse(await c.req.json())
  return c.json(
    {
      data: await services.rawInviteWorkspaceMember(
        await resolveActor(c),
        workspaceIdSchema.parse(c.req.param("id")),
        input.email,
        input.role
      ),
    },
    201
  )
}
export async function actAcceptWorkspaceInvitation(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawAcceptWorkspaceInvitation(
        await resolveActor(c),
        workspaceIdSchema.parse(c.req.param("id"))
      ),
    },
    200
  )
}
export async function actListWorkspaceInvitations(c: Context<ApiEnv>) {
  return c.json(
    { data: await services.rawListWorkspaceInvitations(await resolveActor(c)) },
    200
  )
}
export async function actLeaveWorkspace(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawLeaveWorkspace(
        await resolveActor(c),
        workspaceIdSchema.parse(c.req.param("id"))
      ),
    },
    200
  )
}
export async function actTransferWorkspace(c: Context<ApiEnv>) {
  return c.json(
    {
      data: await services.rawTransferWorkspace(
        await resolveActor(c),
        workspaceIdSchema.parse(c.req.param("id")),
        workspaceTransferSchema.parse(await c.req.json()).ownerId
      ),
    },
    200
  )
}
