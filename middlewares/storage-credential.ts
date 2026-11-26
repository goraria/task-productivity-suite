import type { MiddlewareHandler } from "hono"
import { verifyBackendRequest } from "@/lib/backend-oauth"
import type { ApiEnv } from "@/utils/interface"
// SSO grants this exact resource/scope only to the existing Media confidential client.
export function requireMediaStorageClient(): MiddlewareHandler<ApiEnv> {
  return async (context, next) => {
    await verifyBackendRequest(
      context.req.raw,
      "storage:task:credential",
      "/internal/storage/credential",
      120
    )
    await next()
  }
}
