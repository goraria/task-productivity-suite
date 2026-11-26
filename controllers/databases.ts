import { listQuerySchema } from "@/schemas/productivity"
import {
  rawCreateDatabase as createDatabaseServices,
  rawDeleteDatabase as deleteDatabaseServices,
  rawGetDatabase as getDatabaseServices,
  rawListDatabases as listDatabasesServices,
  rawUpdateDatabase as updateDatabaseServices,
} from "@/models/database"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actListDatabases(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listDatabasesServices(
        await resolveActor(context),
        listQuerySchema.parse(context.req.query())
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetDatabase(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getDatabaseServices(
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
export async function actCreateDatabase(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createDatabaseServices(
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
export async function actUpdateDatabase(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateDatabaseServices(
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
export async function actDeleteDatabase(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deleteDatabaseServices(
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
