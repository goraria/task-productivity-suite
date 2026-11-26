import { listQuerySchema } from "@/schemas/productivity"
import {
  rawCreatePagePropertyValue as createPagePropertyValueServices,
  rawDeletePagePropertyValue as deletePagePropertyValueServices,
  rawGetPagePropertyValue as getPagePropertyValueServices,
  rawListPagePropertyValues as listPagePropertyValuesServices,
  rawUpdatePagePropertyValue as updatePagePropertyValueServices,
} from "@/models/page-property-value"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import type { Context } from "hono"
export async function actListPagePropertyValues(context: Context<ApiEnv>) {
  try {
    return context.json(
      await listPagePropertyValuesServices(
        await resolveActor(context),
        listQuerySchema.parse(context.req.query())
      ),
      200
    )
  } catch (error) {
    throw error
  }
}
export async function actGetPagePropertyValue(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await getPagePropertyValueServices(
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
export async function actCreatePagePropertyValue(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await createPagePropertyValueServices(
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
export async function actUpdatePagePropertyValue(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await updatePagePropertyValueServices(
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
export async function actDeletePagePropertyValue(context: Context<ApiEnv>) {
  try {
    return context.json(
      {
        data: await deletePagePropertyValueServices(
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
