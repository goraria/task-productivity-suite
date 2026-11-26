import type { Context } from "hono"
import type { ApiEnv } from "@/utils/interface"
import { rawGetOAuthProtectedResourceMetadata } from "@/services/sso"
export function actHealth(context: Context<ApiEnv>) {
  return context.json({ status: "ok" })
}
export function actProtectedResourceMetadata(context: Context<ApiEnv>) {
  return context.json(rawGetOAuthProtectedResourceMetadata())
}
