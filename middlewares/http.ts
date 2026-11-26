import { CrudError, getDatabaseError } from "@/database/crud"
import { createDatabaseRateLimitStore } from "@/lib/rate-limit/database-store"

import { appUrl, isProduction, rateLimitEnabled } from "@/utils/environment"
import type { ApiEnv } from "@/utils/interface"
import { configureHono } from "@gorth-com/principle/configs/hono"
import { ZodError } from "@gorth-com/structure/cores/zod"
import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { methodNotAllowed } from "hono/method-not-allowed"
import "server-only"
import type { MiddlewareHandler, ErrorHandler, NotFoundHandler } from "hono"
import { every } from "hono/combine"

import { after } from "next/server"
import { rawEnqueueBackgroundJob } from "@/services/background"
const background: MiddlewareHandler<ApiEnv> = async (context, next) => {
  await next()
  if (
    context.res.ok &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(context.req.method) &&
    !context.req.path.startsWith("/auth/")
  ) {
    after(async () => {
      try {
        await rawEnqueueBackgroundJob()
      } catch {
        console.error(
          "[background] enqueue_failed; outbox retained for recovery"
        )
      }
    })
  }
}

const policies = new Hono()
configureHono(policies, {
  development: !isProduction,
  logger: false,
  cors: false,
  csrf: {
    origin: (origin) => Boolean(appUrl) && origin === new URL(appUrl).origin,
    // Better Auth owns its endpoints; signed backchannel events use their own
    // token authentication. Custom cookie mutations remain CSRF protected.
    skip: (context) =>
      (context.req.path.startsWith("/auth/") &&
        context.req.path !== "/auth/sync-user") ||
      context.req.header("authorization")?.startsWith("Bearer ") === true,
  },
  rateLimit: rateLimitEnabled
    ? {
        store: createDatabaseRateLimitStore(),
        keyGenerator: () => "task",
        skip: (context) => ["/health", "/internal/health"].includes(context.req.path),
      }
    : false,
  bodyLimit: {
    maxSize: 50 * 1024 * 1024,
    onError: (context) => context.json({ error: "payload_too_large" }, 413),
  },
  compress: false,
  etag: false,
})
const noStore: MiddlewareHandler<ApiEnv> = async (context, next) => {
  await next()
  context.header("Cache-Control", "no-store")
}
export const http: MiddlewareHandler<ApiEnv> = every(
  background,
  ...policies.routes.map((route) => route.handler),
  noStore
)
export const httpError: ErrorHandler = (error, context) => {
  if (error instanceof CrudError)
    return context.json(
      { error: error.code, message: error.message },
      error.status as 400 | 401 | 403 | 404 | 409 | 428 | 503
    )
  const databaseError = getDatabaseError(error)
  if (databaseError === "23505")
    return context.json({ error: "resource_conflict" }, 409)
  if (databaseError === "23503")
    return context.json({ error: "foreign_key_conflict" }, 409)
  if (["23502", "23514", "22P02", "22P03"].includes(databaseError))
    return context.json({ error: "invalid_resource_data" }, 400)
  if (error instanceof HTTPException) return error.getResponse()
  if (error instanceof ZodError)
    return context.json(
      { error: "validation_failed", issues: error.issues },
      400
    )
  if (error instanceof SyntaxError)
    return context.json({ error: "invalid_json" }, 400)
  return context.json({ error: "internal_server_error" }, 500)
}
export const httpNotFound: NotFoundHandler = (context) =>
  context.json({ error: "not_found" }, 404)
export function httpMethods(app: Hono) {
  return methodNotAllowed({
    app,
    onMethodNotAllowed: (context, methods) =>
      context.json({ error: "method_not_allowed" }, 405, {
        Allow: methods.join(", "),
      }),
  })
}
