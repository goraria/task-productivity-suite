import { CrudError } from "@/database/crud"
import {
  documentAttachmentSchema,
  documentUploadSchema,
} from "@/schemas/productivity"
import * as services from "@/models/file"
import { rawReadAppCredentials } from "@/models/session"
import { resolveActor } from "@/utils/controller"
import type { ApiEnv } from "@/utils/interface"
import { z } from "@gorth-com/structure/cores/zod"
import type { Context } from "hono"
async function delegatedToken(context: Context<ApiEnv>) {
  const bearer = context.req.header("authorization")
  if (bearer?.startsWith("Bearer ")) return bearer.slice(7)
  const grant = await rawReadAppCredentials(context.req.raw.headers)
  if (!grant)
    throw new CrudError(
      401,
      "unauthorized",
      "A current app session is required"
    )
  return grant.credentials.accessToken
}
export async function actCreateDocumentUpload(context: Context<ApiEnv>) {
  return context.json(
    {
      data: await services.rawCreateDocumentUpload(
        await resolveActor(context),
        await delegatedToken(context),
        z.uuid().parse(context.req.param("id")),
        documentUploadSchema.parse(await context.req.json())
      ),
    },
    201
  )
}
export async function actAttachDocumentAsset(context: Context<ApiEnv>) {
  return context.json(
    {
      data: await services.rawAttachDocumentAsset(
        await resolveActor(context),
        await delegatedToken(context),
        z.uuid().parse(context.req.param("id")),
        documentAttachmentSchema.parse(await context.req.json()).assetId
      ),
    },
    201
  )
}
export async function actGetDocumentAssetUrl(context: Context<ApiEnv>) {
  const result = await services.rawGetDocumentAssetUrl(
    await resolveActor(context),
    z.uuid().parse(context.req.param("id")),
    z.uuid().parse(context.req.param("assetId"))
  )
  context.header("Cache-Control", "private, no-store")
  return context.redirect(result.url, 302)
}
