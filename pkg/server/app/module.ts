import { Hono } from "hono"
import { configureHono } from "@gorth/principle/configs/hono"
import { HTTPException } from "hono/http-exception"

import {
  getCorsOrigins,
  isProduction,
  rateLimitEnabled,
} from "@/utils/environment"
import { DatabaseRateLimitStore } from "@/lib/rate-limit/database-store"
import { getOAuthProtectedResourceMetadata } from "@/services/sso"
import backchannelRoutes from "@/routes/backchannel"
import authRoutes from "@/routes/auth"
import { blocksRoutes } from "@/routes/blocks"
import { databasePropertiesRoutes } from "@/routes/database-properties"
import { databaseViewsRoutes } from "@/routes/database-views"
import { databasesRoutes } from "@/routes/databases"
import { filesRoutes } from "@/routes/files"
import { pagePropertyValuesRoutes } from "@/routes/page-property-values"
import { pagesRoutes } from "@/routes/pages"
import { permissionsRoutes } from "@/routes/permissions"
import sharedRoutes from "@/routes/shared"
import { usersRoutes } from "@/routes/users"
import { workspaceMembersRoutes } from "@/routes/workspace-members"
import { workspacesRoutes } from "@/routes/workspaces"

export function createApp() {
  const app = new Hono()
  const corsOrigins = getCorsOrigins()

  configureHono(app, {
    development: !isProduction,
    cors: {
      origin: (origin) =>
        !isProduction || corsOrigins.includes(origin) ? origin : null,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "X-Request-Id", "DPoP"],
      exposeHeaders: [
        "Content-Length",
        "X-Request-Id",
        "Server-Timing",
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
        "Retry-After",
        "WWW-Authenticate",
        "DPoP-Nonce",
      ],
      credentials: true,
      maxAge: 86400,
    },
    csrf: {
      origin: (origin, context) =>
        corsOrigins.includes(origin) ||
        origin === new URL(context.req.url).origin,
      skip: (context) =>
        context.req.path === "/auth/backchannel-logout" ||
        context.req.header("authorization")?.startsWith("Bearer ") === true,
    },
    rateLimit: rateLimitEnabled
      ? {
          store: new DatabaseRateLimitStore(),
          keyGenerator: (context) =>
            context.req.header("x-real-ip") ??
            context.req.header("x-forwarded-for")?.split(",").at(-1)?.trim() ??
            "unknown",
          skip: (context) => context.req.path === "/health",
        }
      : false,
    bodyLimit: {
      maxSize: 50 * 1024 * 1024,
      onError: (context) => context.json({ error: "payload_too_large" }, 413),
    },
    compress: true,
  })

  app.route("/auth", backchannelRoutes)
  app.route("/auth", authRoutes.hono)
  app.route("/user", usersRoutes().hono)
  app.route("/workspace", workspacesRoutes().hono)
  app.route("/workspace-member", workspaceMembersRoutes().hono)
  app.route("/page", pagesRoutes().hono)
  app.route("/block", blocksRoutes().hono)
  app.route("/database", databasesRoutes().hono)
  app.route("/database-property", databasePropertiesRoutes().hono)
  app.route("/page-property-value", pagePropertyValuesRoutes().hono)
  app.route("/database-view", databaseViewsRoutes().hono)
  app.route("/permission", permissionsRoutes().hono)
  app.route("/file", filesRoutes().hono)
  app.route("/", sharedRoutes.hono)
  app.get("/.well-known/oauth-protected-resource", (context) =>
    context.json(getOAuthProtectedResourceMetadata())
  )

  app.get("/health", (context) =>
    context.json({ status: "ok", timestamp: new Date().toISOString() })
  )

  app.notFound((context) =>
    context.json(
      {
        error: "not_found",
        message: `Route ${context.req.method} ${context.req.path} not found`,
      },
      404
    )
  )
  app.onError((error, context) => {
    console.error("[server-error]", error)
    if (error instanceof HTTPException) return error.getResponse()
    return context.json(
      {
        error: "internal_server_error",
        message: isProduction ? undefined : error.message,
      },
      500
    )
  })

  return app
}

export default createApp
