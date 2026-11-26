import { handle } from "@hono/vercel"
import { Hono } from "hono"
import { http, httpError, httpNotFound, httpMethods } from "@/middlewares/http"
import { requireAppSession } from "@/middlewares/session"
import { actForwardPlatform } from "@/controllers/platform"
import { storageCredentialRoutes } from "@/routes/storage-credential"
import { metadataRoutes } from "@/routes/shared"

const router = new Hono()
router.use(http)
router.onError(httpError)
router.notFound(httpNotFound)
router.use(httpMethods(router))
router.route("/external", metadataRoutes)
router.route("/external/storage", storageCredentialRoutes)
router.on(
  ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
  [
    "/external/resource/*",
    "/external/discovery/*",
    "/external/notification/*",
    "/external/payment/*",
    "/external/billing/*",
    "/external/media/*",
    "/external/insight/*",
  ],
  requireAppSession(),
  actForwardPlatform
)

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const GET = handle(router)
export const HEAD = handle(router)
export const POST = handle(router)
export const PUT = handle(router)
export const PATCH = handle(router)
export const DELETE = handle(router)
export const OPTIONS = handle(router)
