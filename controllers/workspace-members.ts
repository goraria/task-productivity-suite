import type { Context } from "hono"
import type { ApiEnv } from "@/utils/interface"
import { parsePagination, resolveActor } from "@/utils/controller"
import {
  rawListWorkspaceMembers as listWorkspaceMembersServices,
  rawGetWorkspaceMember as getWorkspaceMemberServices,
  rawCreateWorkspaceMember as createWorkspaceMemberServices,
  rawUpdateWorkspaceMember as updateWorkspaceMemberServices,
  rawDeleteWorkspaceMember as deleteWorkspaceMemberServices,
} from "@/models/workspace-member"
export async function actListWorkspaceMembers(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listWorkspaceMembersServices(await resolveActor(context), {
        limit: parsePagination(context.req.query("limit"), "limit"),
        offset: parsePagination(context.req.query("offset"), "offset"),
      }),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetWorkspaceMember(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getWorkspaceMemberServices(
          await resolveActor(context),
          context.req.param()
        ),
      },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actCreateWorkspaceMember(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createWorkspaceMemberServices(
          await resolveActor(context),
          await context.req.json()
        ),
      },
      201
    )
  } catch (error) {
    throw error
  }
}
export async function actUpdateWorkspaceMember(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateWorkspaceMemberServices(
          await resolveActor(context),
          context.req.param(),
          await context.req.json()
        ),
      },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actDeleteWorkspaceMember(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deleteWorkspaceMemberServices(
          await resolveActor(context),
          context.req.param()
        ),
      },
      200
    )
  } catch (error) {
    throw error
  }
}
