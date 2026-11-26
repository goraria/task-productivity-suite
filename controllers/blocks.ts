import { listQuerySchema } from "@/schemas/productivity"
import {
  rawCreateBlock as createBlockServices,
  rawDeleteBlock as deleteBlockServices,
  rawGetBlock as getBlockServices,
  rawListBlocks as listBlocksServices,
  rawUpdateBlock as updateBlockServices,
} from "@/models/block"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actListBlocks(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listBlocksServices(
        await resolveActor(context),
        listQuerySchema.parse(context.req.query())
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetBlock(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getBlockServices(
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
export async function actCreateBlock(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createBlockServices(
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
export async function actUpdateBlock(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updateBlockServices(
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
export async function actDeleteBlock(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deleteBlockServices(
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
