import type { Context } from "hono"
import { CrudError } from "@/database/crud"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import {
  createCommentSchema,
  createFavoriteSchema,
  pageResourceQuerySchema,
  resourceAuthorizationSchema,
  resourceBatchAuthorizationSchema,
} from "@/schemas/interactions"
import z from "@gorth-com/structure/cores/zod"
import {
  rawCreatePageComment as createPageCommentServices,
  rawDeletePageComment as deletePageCommentServices,
  rawListPageComments as listPageCommentsServices,
  rawListFavorites as listFavoritesServices,
  rawCreateFavorite as createFavoriteServices,
  rawDeleteFavorite as deleteFavoriteServices,
} from "@/services/resource-interactions"
import {
  rawAuthorizePageResource as authorizePageResourceServices,
  rawAuthorizePageResources as authorizePageResourcesServices,
} from "@/services/resource-policy"

function accessToken(context: Context<ApiEnv>) {
  const token = context.get("appCredentials")?.accessToken
  if (!token)
    throw new CrudError(
      401,
      "missing_app_session",
      "A local app session is required"
    )
  return token
}
export async function actAuthorizePageResource(
  context: Context<ApiEnv>
) {
  const { access } = resourceAuthorizationSchema.parse(context.req.query())
  const result = await authorizePageResourceServices(
    await resolveActor(context),
    z.uuid().parse(context.req.param("pageId")),
    access,
    context.get("auth").scopes
  )
  return context.json(result)
}
export async function actListPageComments(context: Context<ApiEnv>) {
  const { pageId } = pageResourceQuerySchema.parse(context.req.query())
  return context.json(
    await listPageCommentsServices(
      await resolveActor(context),
      accessToken(context),
      pageId
    )
  )
}
export async function actCreatePageComment(context: Context<ApiEnv>) {
  return context.json(
    {
      data: await createPageCommentServices(
        await resolveActor(context),
        accessToken(context),
        createCommentSchema.parse(await context.req.json())
      ),
    },
    201
  )
}
export async function actDeletePageComment(context: Context<ApiEnv>) {
  const { pageId } = pageResourceQuerySchema.parse(context.req.query())
  return context.json({
    data: await deletePageCommentServices(
      await resolveActor(context),
      accessToken(context),
      pageId,
      z.uuid().parse(context.req.param("id"))
    ),
  })
}
export async function actListFavorites(context: Context<ApiEnv>) {
  return context.json(
    await listFavoritesServices(
      await resolveActor(context),
      accessToken(context)
    )
  )
}
export async function actCreateFavorite(context: Context<ApiEnv>) {
  return context.json(
    {
      data: await createFavoriteServices(
        await resolveActor(context),
        accessToken(context),
        createFavoriteSchema.parse(await context.req.json())
      ),
    },
    201
  )
}
export async function actDeleteFavorite(context: Context<ApiEnv>) {
  return context.json({
    data: await deleteFavoriteServices(
      await resolveActor(context),
      accessToken(context),
      z.uuid().parse(context.req.param("userId")),
      z.uuid().parse(context.req.param("pageId"))
    ),
  })
}

export async function actAuthorizePageResources(
  context: Context<ApiEnv>
) {
  const { ids } = resourceBatchAuthorizationSchema.parse(context.req.query())
  return context.json(
    await authorizePageResourcesServices(
      await resolveActor(context),
      ids,
      context.get("auth").scopes
    )
  )
}
