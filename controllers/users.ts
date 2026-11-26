import type { Context } from "hono"
import type { ApiEnv } from "@/utils/interface"
import { parsePagination, resolveActor } from "@/utils/controller"
import {
  rawListUsers as listUsersServices,
  rawGetCurrentUser as getCurrentUserServices,
  rawGetUser as getUserServices,
  rawCreateUser as createUserServices,
  rawUpdateUser as updateUserServices,
  rawDeleteUser as deleteUserServices,
} from "@/models/user"
export async function actListUsers(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listUsersServices(await resolveActor(context), {
        limit: parsePagination(context.req.query("limit"), "limit"),
        offset: parsePagination(context.req.query("offset"), "offset"),
      }),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetCurrentUser(context: Context<ApiEnv>) {
  try {
    return context.json(
      { data: await getCurrentUserServices(await resolveActor(context)) },
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetUser(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getUserServices(
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
export async function actCreateUser(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createUserServices(
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
export async function actUpdateUser(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateUserServices(
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
export async function actDeleteUser(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deleteUserServices(
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
