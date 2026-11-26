import { listQuerySchema } from "@/schemas/productivity"
import {
  rawCreateDatabaseProperty as createDatabasePropertyServices,
  rawDeleteDatabaseProperty as deleteDatabasePropertyServices,
  rawGetDatabaseProperty as getDatabasePropertyServices,
  rawListDatabaseProperties as listDatabasePropertiesServices,
  rawUpdateDatabaseProperty as updateDatabasePropertyServices,
} from "@/models/database-property"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actListDatabaseProperties(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listDatabasePropertiesServices(
        await resolveActor(context),
        listQuerySchema.parse(context.req.query())
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetDatabaseProperty(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getDatabasePropertyServices(
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
export async function actCreateDatabaseProperty(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createDatabasePropertyServices(
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
export async function actUpdateDatabaseProperty(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateDatabasePropertyServices(
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
export async function actDeleteDatabaseProperty(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deleteDatabasePropertyServices(
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
