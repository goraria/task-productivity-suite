import type { MiddlewareHandler } from "hono"
import { verifyBackendRequest } from "@/lib/backend-oauth"
import type { ApiEnv } from "@/utils/interface"
export function requireResourcePolicyDispatcher(): MiddlewareHandler<ApiEnv> {
  return async (context, next) => {
    await verifyBackendRequest(context.req.raw, "task:dispatch")
    await next()
  }
}
