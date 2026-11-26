import { listQuerySchema } from "@/schemas/productivity"
import {
  rawCreatePage as createPageServices,
  rawDeletePage as deletePageServices,
  rawGetPage as getPageServices,
  rawListPages as listPagesServices,
  rawUpdatePage as updatePageServices,
} from "@/models/page"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actListPages(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listPagesServices(
        await resolveActor(context),
        listQuerySchema.parse(context.req.query())
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetPage(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getPageServices(
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
export async function actCreatePage(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createPageServices(
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
export async function actUpdatePage(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updatePageServices(
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
export async function actDeletePage(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deletePageServices(
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
