import { listQuerySchema } from "@/schemas/productivity"
import {
  rawCreatePermission as createPermissionServices,
  rawDeletePermission as deletePermissionServices,
  rawGetPermission as getPermissionServices,
  rawListPermissions as listPermissionsServices,
  rawUpdatePermission as updatePermissionServices,
} from "@/models/permission"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actListPermissions(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listPermissionsServices(
        await resolveActor(context),
        listQuerySchema.parse(context.req.query())
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetPermission(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getPermissionServices(
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
export async function actCreatePermission(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createPermissionServices(
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
export async function actUpdatePermission(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updatePermissionServices(
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
export async function actDeletePermission(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deletePermissionServices(
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
