import type { Context } from "hono"
import type { ApiEnv } from "@/utils/interface"
import { parsePagination, resolveActor } from "@/utils/controller"
import {
  rawListWorkspaces as listWorkspacesServices,
  rawGetWorkspace as getWorkspaceServices,
  rawCreateWorkspace as createWorkspaceServices,
  rawUpdateWorkspace as updateWorkspaceServices,
  rawDeleteWorkspace as deleteWorkspaceServices,
} from "@/models/workspace"
export async function actListWorkspaces(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listWorkspacesServices(await resolveActor(context), {
        limit: parsePagination(context.req.query("limit"), "limit"),
        offset: parsePagination(context.req.query("offset"), "offset"),
      }),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetWorkspace(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getWorkspaceServices(
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
export async function actCreateWorkspace(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createWorkspaceServices(
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
export async function actUpdateWorkspace(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateWorkspaceServices(
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
export async function actDeleteWorkspace(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deleteWorkspaceServices(
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
