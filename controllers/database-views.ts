import { listQuerySchema } from "@/schemas/productivity"
import {
  rawCreateDatabaseView as createDatabaseViewServices,
  rawDeleteDatabaseView as deleteDatabaseViewServices,
  rawGetDatabaseView as getDatabaseViewServices,
  rawListDatabaseViews as listDatabaseViewsServices,
  rawUpdateDatabaseView as updateDatabaseViewServices,
} from "@/models/database-view"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actListDatabaseViews(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listDatabaseViewsServices(
        await resolveActor(context),
        listQuerySchema.parse(context.req.query())
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetDatabaseView(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getDatabaseViewServices(
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
export async function actCreateDatabaseView(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createDatabaseViewServices(
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
export async function actUpdateDatabaseView(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateDatabaseViewServices(
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
export async function actDeleteDatabaseView(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deleteDatabaseViewServices(
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
