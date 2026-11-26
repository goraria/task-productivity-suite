import { listQuerySchema } from "@/schemas/productivity"
import {
  rawCreateFile as createFileServices,
  rawDeleteFile as deleteFileServices,
  rawGetFile as getFileServices,
  rawListFiles as listFilesServices,
  rawUpdateFile as updateFileServices,
} from "@/models/file"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actListFiles(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listFilesServices(
        await resolveActor(context),
        listQuerySchema.parse(context.req.query())
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetFile(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getFileServices(
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
export async function actCreateFile(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createFileServices(
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
export async function actUpdateFile(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateFileServices(
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
export async function actDeleteFile(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deleteFileServices(
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
