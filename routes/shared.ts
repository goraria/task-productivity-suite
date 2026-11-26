import { Hono } from "hono"
import { actHealth, actProtectedResourceMetadata } from "@/controllers/shared"
export const sharedRoutes = new Hono()
sharedRoutes.get("/health", actHealth)

export const metadataRoutes = new Hono()
metadataRoutes.get(
  "/.well-known/oauth-protected-resource",
  actProtectedResourceMetadata
)
